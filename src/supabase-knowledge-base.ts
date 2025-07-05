// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MagmaDocument {
  content: string;
  metadata: {
    source: string;
    page: number;
    category: string;
    section?: string;
    subsection?: string;
  };
}

interface SearchResult extends MagmaDocument {
  score: number;
}

export class SupabaseMagmaKnowledgeBase {
  private supabase: SupabaseClient;
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;
  private isInitialized = false;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY must be set');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small', // Advanced와 동일한 모델
      dimensions: 1536, // Advanced와 동일한 차원
    });
    
    // MAGMA 코드에 최적화된 텍스트 분할기
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000, // 더 큰 청크로 맥락 보존
      chunkOverlap: 400, // 더 많은 오버랩
      separators: [
        '\n\n\n\n', // 챕터 구분
        '\n\n\n',   // 섹션 구분  
        '\n\n',     // 단락 구분
        '\n>',      // MAGMA 명령 시작
        ';',        // MAGMA 문장 종료
        '\n',       // 줄 구분
        '.',        // 일반 문장
        ' ',        // 공백
        ''
      ],
    });
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // 테이블 생성 (pgvector 확장 필요)
      await this.createTables();
      
      // 문서 수 확인
      const { count } = await this.supabase
        .from('magma_documents')
        .select('*', { count: 'exact', head: true });

      if (count === 0) {
        console.error('No documents in database. Please run indexing first.');
        console.error('Place MAGMA_HANDBOOK.pdf in data/pdfs/ and run: npm run index');
      } else {
        console.error(`Loaded database with ${count} documents`);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize knowledge base:', error);
      throw error;
    }
  }

  private async createTables() {
    // 테이블 존재 확인 (RPC 호출 대신 직접 접근)
    const { error } = await this.supabase
      .from('magma_documents')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Tables not found. Please run the SQL schema in Supabase Dashboard first.');
      console.error('Error:', error.message);
      throw new Error('Database tables not initialized. Please run supabase/schema.sql in Supabase Dashboard.');
    }
  }

  async indexPDF(pdfPath: string) {
    console.log(`Indexing PDF: ${pdfPath}`);
    
    // Load PDF
    const loader = new PDFLoader(pdfPath);
    const docs = await loader.load();
    
    // Split documents
    const splitDocs = await this.textSplitter.splitDocuments(docs);
    
    // 임베딩 생성
    const contents = splitDocs.map(doc => doc.pageContent);
    const embeddings = await this.embeddings.embedDocuments(contents);
    
    // 문서 처리
    const processedDocs = splitDocs.map((doc, index) => ({
      content: doc.pageContent,
      embedding: embeddings[index],
      metadata: {
        ...doc.metadata,
        category: this.categorizeContent(doc.pageContent),
        indexed_at: new Date().toISOString(),
      }
    }));

    // 배치 삽입
    const batchSize = 50;
    for (let i = 0; i < processedDocs.length; i += batchSize) {
      const batch = processedDocs.slice(i, i + batchSize);
      const { error } = await this.supabase
        .from('magma_documents')
        .insert(batch);
      
      if (error) {
        console.error('Error inserting batch:', error);
        throw error;
      }
      
      console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(processedDocs.length/batchSize)}`);
    }

    console.log(`Indexed ${processedDocs.length} documents from ${pdfPath}`);
  }

  private categorizeContent(content: string): string {
    const lowerContent = content.toLowerCase();
    
    // MAGMA 함수 패턴 감지
    const functionPatterns = [
      /^[A-Z][a-zA-Z]*\s*\(/m, // 함수 시그니처
      /intrinsic\s+[A-Z]/i,    // intrinsic 선언
      /procedure\s+[A-Z]/i,    // procedure 선언
      /function\s+[A-Z]/i      // function 선언
    ];
    
    // 예제 패턴 감지  
    const examplePatterns = [
      /example\s+h\d+e\d+/i,   // Example H120E1 패턴
      /^>\s+/m,                // MAGMA 명령 프롬프트
      /^> [A-Z]/m              // MAGMA 명령
    ];
    
    // 함수 검사
    if (functionPatterns.some(pattern => pattern.test(content))) {
      return 'function';
    }
    
    // 예제 검사
    if (examplePatterns.some(pattern => pattern.test(content))) {
      return 'example';
    }
    
    // 키워드 기반 분류
    if (lowerContent.includes('syntax') || lowerContent.includes('::=') || 
        lowerContent.includes('grammar')) {
      return 'syntax';
    } else if (lowerContent.includes('algorithm') || 
               lowerContent.includes('procedure') || 
               lowerContent.includes('method')) {
      return 'algorithm';
    } else if (lowerContent.includes('theorem') || 
               lowerContent.includes('lemma') || 
               lowerContent.includes('proposition')) {
      return 'theory';
    }
    
    return 'general';
  }

  async search(
    query: string, 
    limit: number = 5, 
    category: string = 'all'
  ): Promise<SearchResult[]> {
    // 쿼리 임베딩 생성
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    // Supabase 벡터 검색 (더 높은 품질 임계값)
    let rpcQuery = this.supabase.rpc('search_magma_documents', {
      query_embedding: queryEmbedding,
      similarity_threshold: 0.4, // 더 엄격한 임계값
      match_count: limit * 2 // 더 많이 가져와서 필터링
    });

    // 카테고리 필터링
    if (category !== 'all') {
      rpcQuery = rpcQuery.eq('metadata->>category', category);
    }

    const { data, error } = await rpcQuery;
    
    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    return data.map((doc: any) => ({
      content: doc.content,
      metadata: doc.metadata,
      score: doc.similarity,
    }));
  }

  async getExamples(topic: string, complexity: string = 'basic'): Promise<any[]> {
    // Search for examples related to the topic
    const searchResults = await this.search(
      `${topic} example code`,
      10,
      'example'
    );

    // Extract and format MAGMA code examples
    const examples = searchResults
      .map(result => {
        const codeMatches = result.content.match(/```magma([\s\S]*?)```|>(.*?)$/gm);
        if (codeMatches) {
          return {
            title: this.extractTitle(result.content),
            code: this.cleanMagmaCode(codeMatches[0]),
            explanation: this.extractExplanation(result.content),
            complexity: this.assessComplexity(codeMatches[0]),
            source: result.metadata.source,
            page: result.metadata.page,
          };
        }
        return null;
      })
      .filter(Boolean)
      .filter(ex => complexity === 'all' || ex?.complexity === complexity);

    return examples;
  }

  async explainCode(code: string, context?: string): Promise<string> {
    // Search for relevant documentation about the functions used in the code
    const functions = this.extractFunctions(code);
    const searchPromises = functions.map(func => 
      this.search(`${func} function syntax usage`, 3, 'function')
    );
    
    const searchResults = await Promise.all(searchPromises);
    const relevantDocs = searchResults.flat();

    // Build explanation
    let explanation = '# MAGMA Code Explanation\n\n';
    explanation += '## Code:\n```magma\n' + code + '\n```\n\n';
    
    if (context) {
      explanation += `## Context:\n${context}\n\n`;
    }

    explanation += '## Analysis:\n';
    
    // Parse and explain the code structure
    const lines = code.split('\n').filter(line => line.trim());
    for (const line of lines) {
      if (line.trim().startsWith('//')) continue;
      
      const analysis = this.analyzeLine(line, relevantDocs);
      if (analysis) {
        explanation += `- ${analysis}\n`;
      }
    }

    // Add relevant function documentation
    if (functions.length > 0) {
      explanation += '\n## Related Functions:\n';
      const uniqueFunctions = [...new Set(functions)];
      for (const func of uniqueFunctions) {
        const funcDocs = relevantDocs.filter(doc => 
          doc.content.toLowerCase().includes(func.toLowerCase())
        );
        if (funcDocs.length > 0) {
          explanation += `\n### ${func}\n`;
          explanation += funcDocs[0].content.substring(0, 300) + '...\n';
        }
      }
    }

    return explanation;
  }

  private extractFunctions(code: string): string[] {
    const functionPattern = /([A-Z][a-zA-Z0-9]*)\s*\(/g;
    const matches = code.match(functionPattern) || [];
    return matches.map(m => m.replace('(', '').trim());
  }

  private analyzeLine(line: string, docs: any[]): string | null {
    const trimmed = line.trim();
    
    if (trimmed.includes(':=')) {
      const [varName, value] = trimmed.split(':=').map(s => s.trim());
      return `\`${varName}\` is assigned the value/result of \`${value}\``;
    }
    
    const funcMatch = trimmed.match(/([A-Z][a-zA-Z0-9]*)\s*\(/);
    if (funcMatch) {
      return `Calls function \`${funcMatch[1]}\``;
    }
    
    if (trimmed.startsWith('if') || trimmed.startsWith('while') || trimmed.startsWith('for')) {
      return `Control structure: ${trimmed.split(' ')[0]}`;
    }
    
    return null;
  }

  private extractTitle(content: string): string {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.trim() && !line.startsWith('>') && line.length < 100) {
        return line.trim();
      }
    }
    return 'MAGMA Example';
  }

  private cleanMagmaCode(code: string): string {
    return code
      .replace(/```magma/g, '')
      .replace(/```/g, '')
      .replace(/^>\s*/gm, '')
      .trim();
  }

  private extractExplanation(content: string): string {
    const parts = content.split(/```magma[\s\S]*?```|>.*$/gm);
    return parts
      .map(p => p.trim())
      .filter(p => p.length > 20)
      .join(' ')
      .substring(0, 200);
  }

  private assessComplexity(code: string): string {
    const lines = code.split('\n').length;
    const hasLoops = /for|while/.test(code);
    const hasFunctions = /function|procedure/.test(code);
    const complexFunctions = /Factorization|IsIrreducible|GaloisGroup/.test(code);
    
    if (complexFunctions || (hasLoops && hasFunctions) || lines > 20) {
      return 'advanced';
    } else if (hasLoops || hasFunctions || lines > 10) {
      return 'intermediate';
    }
    return 'basic';
  }
}