// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MagmaDocument {
  content: string;
  metadata: {
    source: string;
    page: number;
    category: string;
    chapter?: string;
    section?: string;
    hasCode?: boolean;
    hasExample?: boolean;
    wordCount?: number;
  };
}

interface SearchResult extends MagmaDocument {
  score: number;
  vectorSimilarity?: number;
  bm25Score?: number;
  rank?: number;
}

interface MagmaFunction {
  functionName: string;
  signature: string;
  description: string;
  category: string;
  chapter: string;
  usageExamples: string[];
  relatedFunctions: string[];
}

export class AdvancedMagmaKnowledgeBase {
  private supabase: SupabaseClient;
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;
  private isInitialized = false;

  // Cache for frequent queries
  private queryCache = new Map<string, any>();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY must be set');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small', // Supabase 호환성을 위해 small 사용
      dimensions: 1536,
    });
    
    // Advanced text splitter for better context preservation
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 400,
      separators: [
        '\n\n\n\n',   // Chapter breaks
        '\n\n\n',     // Section breaks  
        '\n\n',       // Paragraph breaks
        '\nExample ', // Example sections
        '\n>',        // MAGMA command prompts
        '\nFunction ', // Function definitions
        '\nIntrinsic ', // Intrinsic definitions
        ';',          // MAGMA statement ends
        '\n',         // Line breaks
        '.',          // Sentence ends
        ' ',          // Word breaks
        ''
      ],
    });
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Test connection with new schema
      const { error } = await this.supabase
        .from('magma_documents_v2')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('V2 schema not found. Please run schema-v2.sql first.');
        console.error('Error:', error.message);
        throw new Error('Database schema v2 not initialized. Please run supabase/schema-v2.sql');
      }

      // Check document count
      const { count } = await this.supabase
        .from('magma_documents_v2')
        .select('*', { count: 'exact', head: true });

      if (count === 0) {
        console.error('No documents in v2 database. Please run advanced indexing.');
      } else {
        console.error(`Loaded advanced database with ${count} documents`);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize advanced knowledge base:', error);
      throw error;
    }
  }

  async indexPDF(pdfPath: string) {
    console.log(`Advanced indexing PDF: ${pdfPath}`);
    
    // Load and process PDF
    const loader = new PDFLoader(pdfPath);
    const docs = await loader.load();
    
    // Split documents with enhanced chunking
    const splitDocs = await this.textSplitter.splitDocuments(docs);
    
    // Generate embeddings in batches
    const batchSize = 50;
    const allProcessedDocs = [];
    
    for (let i = 0; i < splitDocs.length; i += batchSize) {
      const batch = splitDocs.slice(i, i + batchSize);
      const contents = batch.map(doc => this.cleanText(doc.pageContent));
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(splitDocs.length/batchSize)}`);
      
      // Generate embeddings for batch
      const embeddings = await this.embeddings.embedDocuments(contents);
      
      // Process documents with enhanced metadata
      const processedBatch = batch.map((doc, batchIndex) => {
        const cleanContent = contents[batchIndex];
        const enhanced = this.enhanceMetadata(doc, cleanContent);
        
        return {
          content: doc.pageContent,
          content_clean: cleanContent,
          embedding: embeddings[batchIndex],
          metadata: enhanced.metadata,
          chapter: enhanced.chapter,
          section: enhanced.section,
          category: enhanced.category,
          has_code: enhanced.hasCode,
          has_example: enhanced.hasExample,
          word_count: enhanced.wordCount,
        };
      });
      
      allProcessedDocs.push(...processedBatch);
    }

    // Insert in batches
    const insertBatchSize = 25;
    for (let i = 0; i < allProcessedDocs.length; i += insertBatchSize) {
      const insertBatch = allProcessedDocs.slice(i, i + insertBatchSize);
      
      const { error } = await this.supabase
        .from('magma_documents_v2')
        .insert(insertBatch);
      
      if (error) {
        console.error('Error inserting batch:', error);
        throw error;
      }
      
      console.log(`Inserted batch ${Math.floor(i/insertBatchSize) + 1}/${Math.ceil(allProcessedDocs.length/insertBatchSize)}`);
    }

    // Extract and index functions
    await this.extractAndIndexFunctions(allProcessedDocs);
    
    console.log(`Advanced indexing completed: ${allProcessedDocs.length} documents`);
  }

  private cleanText(content: string): string {
    return content
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/[^\w\s\-\+\*\/\(\)\[\]{}.:;,]/g, ' ') // Remove special chars
      .replace(/\d{4,}/g, ' ')        // Remove long numbers
      .trim();
  }

  private enhanceMetadata(doc: Document, cleanContent: string) {
    const content = doc.pageContent;
    const lowerContent = content.toLowerCase();
    const words = cleanContent.split(' ').filter(w => w.length > 2);
    
    // Extract chapter and section info
    const chapterMatch = content.match(/Chapter\s+(\d+[\w\s]*)/i) || 
                        content.match(/Ch\.\s*(\d+[\w\s]*)/i);
    const sectionMatch = content.match(/(\d+\.\d+(?:\.\d+)?)\s+([A-Z][^.]*)/);
    
    // Detect code and examples
    const hasCode = /^>\s+/m.test(content) || 
                   /intrinsic|procedure|function/i.test(content);
    const hasExample = /example\s+h\d+e\d+/i.test(content) || 
                      /^>\s+[A-Z]/m.test(content);
    
    return {
      metadata: {
        ...doc.metadata,
        chapter: chapterMatch?.[1]?.trim(),
        section: sectionMatch?.[0]?.trim(),
        hasCode,
        hasExample,
        wordCount: words.length,
        indexed_at: new Date().toISOString(),
      },
      chapter: chapterMatch?.[1]?.trim() || 'Unknown',
      section: sectionMatch?.[0]?.trim() || '',
      category: this.categorizeContent(content),
      hasCode,
      hasExample,
      wordCount: words.length,
    };
  }

  private categorizeContent(content: string): string {
    const lowerContent = content.toLowerCase();
    
    // Advanced pattern matching for categories
    const patterns = {
      function: [
        /intrinsic\s+[A-Z][a-zA-Z]*\s*\(/,
        /procedure\s+[A-Z][a-zA-Z]*\s*\(/,
        /function\s+[A-Z][a-zA-Z]*\s*\(/,
        /^[A-Z][a-zA-Z]*\s*\([^)]*\)\s*$/m,
      ],
      example: [
        /example\s+h\d+e\d+/i,
        /^>\s+[A-Z]/m,
        /^> /m,
      ],
      syntax: [
        /::=/,
        /grammar/i,
        /syntax/i,
        /<[a-z-]+>/,
      ],
      algorithm: [
        /algorithm/i,
        /procedure/i,
        /method/i,
        /step\s+\d+/i,
      ],
      theory: [
        /theorem/i,
        /lemma/i,
        /proposition/i,
        /proof/i,
        /corollary/i,
      ]
    };

    for (const [category, patternList] of Object.entries(patterns)) {
      if (patternList.some(pattern => pattern.test(content))) {
        return category;
      }
    }
    
    return 'general';
  }

  private async extractAndIndexFunctions(documents: any[]) {
    console.log('Extracting function definitions...');
    
    const functions: any[] = [];
    
    for (const doc of documents) {
      const functionMatches = this.extractFunctionDefinitions(doc.content);
      
      for (const func of functionMatches) {
        functions.push({
          function_name: func.name,
          function_signature: func.signature,
          description: func.description,
          category: func.category,
          chapter: doc.chapter,
          usage_examples: func.examples,
          related_functions: func.related,
          document_id: null, // Will be set after document insertion
        });
      }
    }

    if (functions.length > 0) {
      const { error } = await this.supabase
        .from('magma_functions')
        .insert(functions);
      
      if (error) {
        console.error('Error inserting functions:', error);
      } else {
        console.log(`Indexed ${functions.length} function definitions`);
      }
    }
  }

  private extractFunctionDefinitions(content: string): any[] {
    const functions = [];
    
    // Pattern for intrinsic definitions
    const intrinsicPattern = /intrinsic\s+([A-Z][a-zA-Z]*)\s*\(([^)]*)\)\s*->?\s*([^{]*)\s*\{([^}]*)\}/gi;
    let match: RegExpExecArray | null;
    
    while ((match = intrinsicPattern.exec(content)) !== null) {
      functions.push({
        name: match[1],
        signature: `${match[1]}(${match[2]})`,
        description: match[4].trim(),
        category: 'intrinsic',
        examples: [],
        related: [],
      });
    }
    
    // Pattern for function calls in examples
    const examplePattern = />\s+([A-Z][a-zA-Z]*)\s*\([^)]*\)/g;
    let exampleMatch: RegExpExecArray | null;
    while ((exampleMatch = examplePattern.exec(content)) !== null) {
      const functionName = exampleMatch[1];
      const fullMatch = exampleMatch[0];
      
      if (functionName && !functions.some(f => f.name === functionName)) {
        functions.push({
          name: functionName,
          signature: fullMatch.replace('> ', ''),
          description: 'Function found in examples',
          category: 'function',
          examples: [fullMatch],
          related: [],
        });
      }
    }
    
    return functions;
  }

  // Hybrid search combining vector similarity and BM25
  async hybridSearch(
    query: string,
    limit: number = 5,
    category: string = 'all',
    vectorWeight: number = 0.6, // BM25를 더 중요하게 (코딩 이론에서는 키워드가 중요)
    bm25Weight: number = 0.4
  ): Promise<SearchResult[]> {
    const cacheKey = `hybrid:${query}:${limit}:${category}:${vectorWeight}:${bm25Weight}`;
    
    // Check cache first
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.results;
      }
    }

    // Generate query embedding
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    // Call hybrid search function
    const { data, error } = await this.supabase.rpc('search_magma_hybrid', {
      query_text: query,
      query_embedding: queryEmbedding,
      similarity_threshold: 0.4,
      bm25_weight: bm25Weight,
      vector_weight: vectorWeight,
      match_count: limit,
      category_filter: category === 'all' ? null : category
    });
    
    if (error) {
      console.error('Hybrid search error:', error);
      throw error;
    }

    const results = data.map((row: any) => ({
      content: row.content,
      metadata: row.metadata,
      score: row.combined_score,
      vectorSimilarity: row.vector_similarity,
      bm25Score: row.bm25_score,
      rank: row.rank,
    }));

    // Cache results
    this.queryCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
    });

    return results;
  }

  // Function-specific search with fuzzy matching
  async searchFunctions(
    functionQuery: string,
    limit: number = 10
  ): Promise<any[]> {
    const { data, error } = await this.supabase.rpc('search_magma_functions', {
      function_query: functionQuery,
      similarity_threshold: 0.3,
      match_count: limit
    });
    
    if (error) {
      console.error('Function search error:', error);
      throw error;
    }

    return data || [];
  }

  // Enhanced search with query expansion
  async enhancedSearch(
    query: string,
    limit: number = 5,
    category: string = 'all'
  ): Promise<SearchResult[]> {
    // Expand query with synonyms and related terms
    const expandedQuery = this.expandQuery(query);
    
    // Perform hybrid search
    const results = await this.hybridSearch(expandedQuery, limit * 2, category);
    
    // Re-rank results based on additional criteria
    const rerankedResults = this.rerankResults(results, query);
    
    return rerankedResults.slice(0, limit);
  }

  private expandQuery(query: string): string {
    const synonyms: Record<string, string[]> = {
      // 코딩 이론 확장
      'hamming': ['error', 'correction', 'linear', 'code', 'generator'],
      'reed': ['solomon', 'polynomial', 'evaluation', 'error'],
      'bch': ['cyclic', 'polynomial', 'primitive', 'code'],
      'code': ['algorithm', 'implementation', 'function', 'linear', 'block'],
      'generator': ['matrix', 'basis', 'span', 'linear'],
      'matrix': ['linear', 'transformation', 'operator', 'generator'],
      
      // 군론 확장  
      'group': ['algebra', 'structure', 'set', 'permutation', 'symmetric'],
      'permutation': ['symmetric', 'alternating', 'cycle', 'transposition'],
      'sylow': ['subgroup', 'theorem', 'prime', 'power'],
      
      // 체론 확장
      'field': ['ring', 'domain', 'arithmetic', 'finite', 'galois'],
      'finite': ['field', 'galois', 'primitive', 'polynomial'],
      'polynomial': ['expression', 'equation', 'formula', 'irreducible'],
      
      // 타원곡선 확장
      'elliptic': ['curve', 'point', 'addition', 'weierstrass', 'jacobian'],
      'curve': ['elliptic', 'algebraic', 'geometry', 'point', 'rational'],
    };

    let expanded = query;
    const words = query.toLowerCase().split(' ');
    
    for (const word of words) {
      if (synonyms[word]) {
        expanded += ' ' + synonyms[word].join(' ');
      }
    }
    
    return expanded;
  }

  private rerankResults(results: SearchResult[], originalQuery: string): SearchResult[] {
    return results.map(result => {
      let bonusScore = 0;
      
      // Bonus for exact function name matches
      const queryWords = originalQuery.toLowerCase().split(' ');
      for (const word of queryWords) {
        if (result.content.includes(word + '(')) {
          bonusScore += 0.1;
        }
      }
      
      // Bonus for code examples
      if (result.metadata.hasCode) {
        bonusScore += 0.05;
      }
      
      // Bonus for examples
      if (result.metadata.hasExample) {
        bonusScore += 0.03;
      }
      
      return {
        ...result,
        score: result.score + bonusScore,
      };
    }).sort((a, b) => b.score - a.score);
  }

  // Backwards compatibility
  async search(
    query: string,
    limit: number = 5,
    category: string = 'all'
  ): Promise<SearchResult[]> {
    return this.enhancedSearch(query, limit, category);
  }

  async getExamples(topic: string, complexity: string = 'basic'): Promise<any[]> {
    const results = await this.hybridSearch(`${topic} example code`, 10, 'example');
    
    return results
      .map(result => this.extractExampleFromContent(result, topic))
      .filter(Boolean)
      .filter(ex => complexity === 'all' || ex?.complexity === complexity);
  }

  async explainCode(code: string, context?: string): Promise<string> {
    const functions = this.extractFunctions(code);
    
    // Search for function documentation
    const functionSearches = await Promise.all(
      functions.map(func => this.searchFunctions(func))
    );
    
    const functionDocs = functionSearches.flat();
    
    // Search for contextual information
    const contextResults = await this.hybridSearch(
      `${code} ${context || ''}`,
      5,
      'function'
    );

    return this.buildCodeExplanation(code, functionDocs, contextResults, context);
  }

  private extractExampleFromContent(result: SearchResult, topic: string): any {
    // Implementation for extracting examples (similar to previous version)
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
  }

  private extractFunctions(code: string): string[] {
    const functionPattern = /([A-Z][a-zA-Z0-9]*)\s*\(/g;
    const matches = code.match(functionPattern) || [];
    return [...new Set(matches.map(m => m.replace('(', '').trim()))];
  }

  private buildCodeExplanation(
    code: string,
    functionDocs: any[],
    contextResults: SearchResult[],
    context?: string
  ): string {
    let explanation = '# MAGMA Code Explanation\n\n';
    explanation += '## Code:\n```magma\n' + code + '\n```\n\n';
    
    if (context) {
      explanation += `## Context:\n${context}\n\n`;
    }

    explanation += '## Analysis:\n';
    
    const lines = code.split('\n').filter(line => line.trim());
    for (const line of lines) {
      if (line.trim().startsWith('//')) continue;
      
      const analysis = this.analyzeLine(line, functionDocs);
      if (analysis) {
        explanation += `- ${analysis}\n`;
      }
    }

    if (functionDocs.length > 0) {
      explanation += '\n## Function Documentation:\n';
      const uniqueFunctions = [...new Set(functionDocs.map(f => f.function_name))];
      for (const func of uniqueFunctions.slice(0, 5)) {
        const funcDoc = functionDocs.find(f => f.function_name === func);
        if (funcDoc) {
          explanation += `\n### ${func}\n`;
          explanation += `**Signature**: \`${funcDoc.function_signature}\`\n`;
          explanation += `**Description**: ${funcDoc.description}\n`;
        }
      }
    }

    return explanation;
  }

  private analyzeLine(line: string, functionDocs: any[]): string | null {
    const trimmed = line.trim();
    
    if (trimmed.includes(':=')) {
      const [varName, value] = trimmed.split(':=').map(s => s.trim());
      return `Assigns \`${value}\` to variable \`${varName}\``;
    }
    
    const funcMatch = trimmed.match(/([A-Z][a-zA-Z0-9]*)\s*\(/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const funcDoc = functionDocs.find(f => f.function_name === funcName);
      if (funcDoc) {
        return `Calls \`${funcName}\`: ${funcDoc.description.substring(0, 100)}...`;
      }
      return `Calls function \`${funcName}\``;
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