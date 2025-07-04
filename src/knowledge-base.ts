import { ChromaClient, Collection } from 'chromadb';
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

export class MagmaKnowledgeBase {
  private client: ChromaClient;
  private collection?: Collection;
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;
  private isInitialized = false;

  constructor() {
    this.client = new ChromaClient();
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
    });
    
    // MAGMA 코드에 최적화된 텍스트 분할기
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 200,
      separators: [
        '\n\n\n', // 섹션 구분
        '\n\n',   // 단락 구분
        '\n',     // 줄 구분
        ';',      // MAGMA 문장 종료
        '.',      // 일반 문장
        ' ',      // 공백
        ''
      ],
    });
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create or get collection
      this.collection = await this.client.getOrCreateCollection({
        name: 'magma_handbook',
        embeddingFunction: {
          generate: async (texts: string[]) => {
            const embeddings = await this.embeddings.embedDocuments(texts);
            return embeddings;
          }
        }
      });

      // Check if indexing is needed
      const count = await this.collection.count();
      if (count === 0) {
        console.error('No documents in collection. Please run indexing first.');
        console.error('Place MAGMA_HANDBOOK.pdf in data/pdfs/ and run: npm run index');
      } else {
        console.error(`Loaded collection with ${count} documents`);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize knowledge base:', error);
      throw error;
    }
  }

  async indexPDF(pdfPath: string) {
    console.log(`Indexing PDF: ${pdfPath}`);
    
    // Load PDF
    const loader = new PDFLoader(pdfPath);
    const docs = await loader.load();
    
    // Split documents
    const splitDocs = await this.textSplitter.splitDocuments(docs);
    
    // Process and categorize documents
    const processedDocs = splitDocs.map((doc, index) => ({
      id: `magma_${index}`,
      content: doc.pageContent,
      metadata: {
        ...doc.metadata,
        category: this.categorizeContent(doc.pageContent),
        indexed_at: new Date().toISOString(),
      }
    }));

    // Add to collection
    if (this.collection) {
      await this.collection.add({
        ids: processedDocs.map(d => d.id),
        documents: processedDocs.map(d => d.content),
        metadatas: processedDocs.map(d => d.metadata),
      });
    }

    console.log(`Indexed ${processedDocs.length} documents from ${pdfPath}`);
  }

  private categorizeContent(content: string): string {
    const lowerContent = content.toLowerCase();
    
    // MAGMA 특화 카테고리 분류
    if (lowerContent.includes('syntax') || lowerContent.includes('::=')) {
      return 'syntax';
    } else if (lowerContent.includes('function') || lowerContent.includes('intrinsic')) {
      return 'function';
    } else if (lowerContent.includes('algorithm') || lowerContent.includes('procedure')) {
      return 'algorithm';
    } else if (lowerContent.includes('example') || content.includes('>')) {
      return 'example';
    } else if (lowerContent.includes('theorem') || lowerContent.includes('lemma')) {
      return 'theory';
    }
    
    return 'general';
  }

  async search(
    query: string, 
    limit: number = 5, 
    category: string = 'all'
  ): Promise<SearchResult[]> {
    if (!this.collection) {
      throw new Error('Knowledge base not initialized');
    }

    // Build filter
    const where = category !== 'all' ? { category: category } : undefined;

    // Search
    const results = await this.collection.query({
      queryTexts: [query],
      nResults: limit,
      where: where,
    });

    // Format results
    return results.ids[0].map((id, index) => ({
      content: results.documents[0][index] || '',
      metadata: results.metadatas[0][index] as any,
      score: results.distances ? 1 - results.distances[0][index] : 0.5,
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
    // MAGMA 함수 패턴 매칭
    const functionPattern = /([A-Z][a-zA-Z0-9]*)\s*\(/g;
    const matches = code.match(functionPattern) || [];
    return matches.map(m => m.replace('(', '').trim());
  }

  private analyzeLine(line: string, docs: any[]): string | null {
    const trimmed = line.trim();
    
    // 변수 할당
    if (trimmed.includes(':=')) {
      const [varName, value] = trimmed.split(':=').map(s => s.trim());
      return `\`${varName}\` is assigned the value/result of \`${value}\``;
    }
    
    // 함수 호출
    const funcMatch = trimmed.match(/([A-Z][a-zA-Z0-9]*)\s*\(/);
    if (funcMatch) {
      return `Calls function \`${funcMatch[1]}\``;
    }
    
    // 제어 구조
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
    // Extract explanation text between code blocks
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