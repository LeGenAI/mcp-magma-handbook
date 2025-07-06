#!/usr/bin/env node

/**
 * Enhanced MCP-MAGMA-Handbook Server v3.0
 * Based on LangConnect methodology with multiple improvements:
 * - Multi-query search capabilities
 * - Dynamic search types (semantic, keyword, hybrid)
 * - Collection management
 * - Conversation storage
 * - Better error handling and logging
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

// Environment configuration
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY!,
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_KEY!,
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  chatModel: 'gpt-4o-mini',
};

// Initialize clients
const openai = new OpenAI({ apiKey: config.openaiApiKey });
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

// Enhanced embeddings with configurable dimensions
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: config.openaiApiKey,
  modelName: config.embeddingModel,
  dimensions: config.embeddingDimensions,
});

// Chat model for multi-query generation
const chatModel = new ChatOpenAI({
  openAIApiKey: config.openaiApiKey,
  modelName: config.chatModel,
  temperature: 0,
});

// Text splitter for document processing
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

/**
 * Collection management functions
 */
class CollectionManager {
  async listCollections(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error listing collections:', error);
      return [];
    }
  }

  async createCollection(name: string, description?: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .insert([{
          name,
          description,
          created_at: new Date().toISOString(),
          metadata: { source: 'mcp-magma-handbook-v3' }
        }])
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  }

  async deleteCollection(collectionId: string): Promise<void> {
    try {
      // Delete associated documents first
      await supabase
        .from('documents')
        .delete()
        .eq('collection_id', collectionId);

      // Delete collection
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }
}

/**
 * Enhanced search functionality
 */
class EnhancedSearchManager {
  private vectorStores: Map<string, SupabaseVectorStore> = new Map();

  async getVectorStore(collectionId: string): Promise<SupabaseVectorStore> {
    if (!this.vectorStores.has(collectionId)) {
      const vectorStore = new SupabaseVectorStore(embeddings, {
        client: supabase,
        tableName: 'documents',
        queryName: 'match_documents',
        filter: { collection_id: collectionId },
      });
      this.vectorStores.set(collectionId, vectorStore);
    }
    return this.vectorStores.get(collectionId)!;
  }

  async generateMultiQuery(question: string): Promise<string[]> {
    try {
      const prompt = PromptTemplate.fromTemplate(`
        You are an AI assistant. Generate 3-5 different versions of the given user question 
        to retrieve relevant documents from a vector database. By generating multiple perspectives 
        on the user question, help overcome limitations of distance-based similarity search.
        
        Provide alternative questions separated by newlines. Do not number them.
        Focus on MAGMA computational algebra system if the question is related to mathematics.
        
        Original question: {question}
      `);

      const chain = prompt.pipe(chatModel);
      const result = await chain.invoke({ question });
      
      const queries = result.content
        .toString()
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0);

      return queries.slice(0, 5); // Limit to 5 queries
    } catch (error) {
      console.error('Error generating multi-query:', error);
      return [question]; // Fallback to original question
    }
  }

  async searchDocuments(
    collectionId: string,
    query: string,
    limit: number = 5,
    searchType: 'semantic' | 'keyword' | 'hybrid' = 'semantic'
  ): Promise<any[]> {
    try {
      const vectorStore = await this.getVectorStore(collectionId);
      
      let results: any[] = [];

      switch (searchType) {
        case 'semantic':
          results = await vectorStore.similaritySearchWithScore(query, limit);
          break;
          
        case 'keyword':
          // Implement keyword search using Supabase full-text search
          const { data, error } = await supabase
            .from('documents')
            .select('*, similarity')
            .eq('collection_id', collectionId)
            .textSearch('content', query)
            .limit(limit);
          
          if (error) throw error;
          results = data?.map(doc => [doc, doc.similarity || 0]) || [];
          break;
          
        case 'hybrid':
          // Combine semantic and keyword search
          const semanticResults = await vectorStore.similaritySearchWithScore(query, Math.ceil(limit / 2));
          
          const { data: keywordData, error: keywordError } = await supabase
            .from('documents')
            .select('*')
            .eq('collection_id', collectionId)
            .textSearch('content', query)
            .limit(Math.ceil(limit / 2));
          
          if (keywordError) throw keywordError;
          
          // Merge and deduplicate results
          const keywordResults = keywordData?.map(doc => [doc, 0.5]) || [];
          results = [...semanticResults, ...keywordResults];
          
          // Remove duplicates and sort by score
          const uniqueResults = new Map();
          results.forEach(([doc, score]) => {
            const id = doc.metadata?.id || doc.id;
            if (!uniqueResults.has(id) || uniqueResults.get(id)[1] < score) {
              uniqueResults.set(id, [doc, score]);
            }
          });
          
          results = Array.from(uniqueResults.values())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
          break;
      }

      return results.map(([doc, score], index) => ({
        id: doc.metadata?.id || doc.id || `result_${index}`,
        content: doc.pageContent || doc.content,
        metadata: doc.metadata || {},
        score: typeof score === 'number' ? score : 0,
        search_type: searchType,
      }));
    } catch (error) {
      console.error(`Error in ${searchType} search:`, error);
      return [];
    }
  }

  async multiQuerySearch(
    collectionId: string,
    question: string,
    limit: number = 5,
    searchType: 'semantic' | 'keyword' | 'hybrid' = 'hybrid'
  ): Promise<any[]> {
    try {
      // Generate multiple queries
      const queries = await this.generateMultiQuery(question);
      console.error(`Generated ${queries.length} queries for: "${question}"`);

      // Search with each query
      const allResults: any[] = [];
      for (const query of queries) {
        const results = await this.searchDocuments(collectionId, query, Math.ceil(limit / 2), searchType);
        allResults.push(...results);
      }

      // Deduplicate and re-rank results
      const uniqueResults = new Map();
      allResults.forEach(result => {
        const id = result.id;
        if (!uniqueResults.has(id)) {
          uniqueResults.set(id, { ...result, query_count: 1 });
        } else {
          const existing = uniqueResults.get(id);
          existing.score = Math.max(existing.score, result.score);
          existing.query_count += 1;
        }
      });

      // Sort by score and query frequency
      return Array.from(uniqueResults.values())
        .sort((a, b) => {
          const scoreWeight = 0.7;
          const frequencyWeight = 0.3;
          return (b.score * scoreWeight + b.query_count * frequencyWeight) - 
                 (a.score * scoreWeight + a.query_count * frequencyWeight);
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error in multi-query search:', error);
      // Fallback to single query search
      return this.searchDocuments(collectionId, question, limit, searchType);
    }
  }
}

/**
 * Document management
 */
class DocumentManager {
  async addDocument(
    collectionId: string,
    content: string,
    metadata: any = {}
  ): Promise<string> {
    try {
      // Split document into chunks
      const docs = await textSplitter.createDocuments([content]);
      
      // Add metadata
      const documentsWithMetadata = docs.map(doc => new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...metadata,
          collection_id: collectionId,
          created_at: new Date().toISOString(),
          source: metadata.source || 'mcp-input',
        },
      }));

      // Get vector store for collection
      const searchManager = new EnhancedSearchManager();
      const vectorStore = await searchManager.getVectorStore(collectionId);

      // Add documents to vector store
      const ids = await vectorStore.addDocuments(documentsWithMetadata);
      
      console.error(`Added ${ids.length} document chunks to collection ${collectionId}`);
      return `Successfully added document with ${ids.length} chunks`;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  async deleteDocument(collectionId: string, documentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('collection_id', collectionId)
        .eq('metadata->id', documentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
}

// Initialize managers
const collectionManager = new CollectionManager();
const searchManager = new EnhancedSearchManager();
const documentManager = new DocumentManager();

/**
 * MCP Server setup
 */
const server = new Server(
  {
    name: 'enhanced-magma-handbook',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools: Tool[] = [
  {
    name: 'list_collections',
    description: 'List all available collections in the knowledge base',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_collection',
    description: 'Create a new collection for organizing documents',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the collection' },
        description: { type: 'string', description: 'Optional description of the collection' },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_collection',
    description: 'Delete a collection and all its documents',
    inputSchema: {
      type: 'object',
      properties: {
        collection_id: { type: 'string', description: 'ID of the collection to delete' },
      },
      required: ['collection_id'],
    },
  },
  {
    name: 'search_magma',
    description: 'Search MAGMA documentation using advanced multi-query and hybrid search',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        collection_id: { type: 'string', description: 'Collection ID to search in (optional, defaults to MAGMA)' },
        limit: { type: 'number', description: 'Maximum number of results (default: 5)' },
        search_type: { 
          type: 'string', 
          enum: ['semantic', 'keyword', 'hybrid'],
          description: 'Type of search to perform (default: hybrid)' 
        },
        use_multi_query: { 
          type: 'boolean', 
          description: 'Whether to use multi-query generation (default: true)' 
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'add_document',
    description: 'Add a text document to a collection',
    inputSchema: {
      type: 'object',
      properties: {
        collection_id: { type: 'string', description: 'ID of the collection' },
        content: { type: 'string', description: 'Document content' },
        metadata: { type: 'object', description: 'Optional metadata for the document' },
      },
      required: ['collection_id', 'content'],
    },
  },
  {
    name: 'save_conversation',
    description: 'Save conversation content to a collection for future reference',
    inputSchema: {
      type: 'object',
      properties: {
        collection_id: { type: 'string', description: 'ID of the collection to save to' },
        conversation: { type: 'string', description: 'Conversation content to save' },
        title: { type: 'string', description: 'Optional title for the conversation' },
      },
      required: ['collection_id', 'conversation'],
    },
  },
  {
    name: 'get_health_status',
    description: 'Check the health status of the enhanced MCP server',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_collections': {
        const collections = await collectionManager.listCollections();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                collections: collections.map(c => ({
                  id: c.id,
                  name: c.name,
                  description: c.description,
                  created_at: c.created_at,
                })),
                count: collections.length,
              }, null, 2),
            },
          ],
        };
      }

      case 'create_collection': {
        const { name, description } = args as { name: string; description?: string };
        const collectionId = await collectionManager.createCollection(name, description);
        return {
          content: [
            {
              type: 'text',
              text: `Collection "${name}" created with ID: ${collectionId}`,
            },
          ],
        };
      }

      case 'delete_collection': {
        const { collection_id } = args as { collection_id: string };
        await collectionManager.deleteCollection(collection_id);
        return {
          content: [
            {
              type: 'text',
              text: `Collection ${collection_id} deleted successfully`,
            },
          ],
        };
      }

      case 'search_magma': {
        const {
          query,
          collection_id = 'magma-handbook',
          limit = 5,
          search_type = 'hybrid',
          use_multi_query = true,
        } = args as {
          query: string;
          collection_id?: string;
          limit?: number;
          search_type?: 'semantic' | 'keyword' | 'hybrid';
          use_multi_query?: boolean;
        };

        let results;
        if (use_multi_query) {
          results = await searchManager.multiQuerySearch(collection_id, query, limit, search_type);
        } else {
          results = await searchManager.searchDocuments(collection_id, query, limit, search_type);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'add_document': {
        const { collection_id, content, metadata = {} } = args as {
          collection_id: string;
          content: string;
          metadata?: any;
        };

        const result = await documentManager.addDocument(collection_id, content, metadata);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'save_conversation': {
        const { collection_id, conversation, title } = args as {
          collection_id: string;
          conversation: string;
          title?: string;
        };

        const metadata = {
          type: 'conversation',
          title: title || `Conversation ${new Date().toISOString()}`,
          saved_at: new Date().toISOString(),
        };

        const result = await documentManager.addDocument(collection_id, conversation, metadata);
        return {
          content: [
            {
              type: 'text',
              text: `Conversation saved: ${result}`,
            },
          ],
        };
      }

      case 'get_health_status': {
        const status = {
          status: 'healthy',
          version: '3.0.0',
          features: [
            'Multi-query search',
            'Hybrid search (semantic + keyword)',
            'Collection management',
            'Conversation storage',
            'Dynamic search types',
          ],
          embedding_model: config.embeddingModel,
          chat_model: config.chatModel,
          supabase_connected: !!config.supabaseUrl,
          openai_connected: !!config.openaiApiKey,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error in ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  console.error('🚀 Enhanced MCP-MAGMA-Handbook Server v3.0 starting...');
  console.error('✨ Features: Multi-query, Hybrid search, Collections, Conversation storage');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ Server connected and ready!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}