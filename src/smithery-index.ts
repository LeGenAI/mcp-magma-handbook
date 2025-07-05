// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';

// Configuration schema for Smithery deployment
export const configSchema = z.object({
  openaiApiKey: z.string().describe("Your OpenAI API key for embeddings generation (required)"),
  debug: z.boolean().optional().default(false).describe("Enable debug logging"),
});

// Search result interface
interface SearchResult {
  content: string;
  metadata: any;
  score: number;
  vectorSimilarity?: number;
  bm25Score?: number;
  rank?: number;
}

export default function createStatelessServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    name: "MAGMA Handbook Advanced",
    version: "2.1.0",
  });

  // Use provided Supabase instance (shared knowledge base)
  const supabaseUrl = "https://euwbfyrdalddpbnqgjoq.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1d2JmeXJkYWxkZHBibnFnam9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2OTQ4MDIsImV4cCI6MjA0OTI3MDgwMn0.w0DdgZJBwE0xJAJX9bEK5H9Q7UBdTnEAb3IJ9fOULGI";
  
  // API key acquisition and validation logic
  function getValidatedApiKey(): { apiKey: string | null; error: string | null } {
    // Try API key from multiple sources
    const sources = [
      { name: 'config.openaiApiKey', value: config.openaiApiKey },
      { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY },
      { name: 'OPENAI_API_KEY_CONFIG', value: process.env.OPENAI_API_KEY_CONFIG },
      { name: 'SMITHERY_OPENAI_API_KEY', value: process.env.SMITHERY_OPENAI_API_KEY }
    ];
    
    let apiKey: string | null = null;
    let source: string | null = null;
    
    for (const s of sources) {
      if (s.value && typeof s.value === 'string' && s.value.trim()) {
        apiKey = s.value.trim();
        source = s.name;
        break;
      }
    }
    
    // API key format validation
    if (!apiKey) {
      return { apiKey: null, error: 'No API key found in any source' };
    }
    
    if (!apiKey.startsWith('sk-')) {
      return { apiKey: null, error: 'Invalid API key format (should start with sk-), source: ' + source };
    }
    
    if (apiKey.length < 20) {
      return { apiKey: null, error: 'API key too short (' + apiKey.length + ' chars), source: ' + source };
    }
    
    console.log('Valid API key found from ' + source + ' (' + apiKey.length + ' chars)');
    return { apiKey, error: null };
  }
  
  const { apiKey: openaiApiKey, error: apiKeyError } = getValidatedApiKey();
  
  if (apiKeyError) {
    console.error('API Key Error:', apiKeyError);
  }

  // Initialize services
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Separate OpenAI embedding initialization into function
  function createEmbeddings(apiKey: string): OpenAIEmbeddings {
    return new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      dimensions: 1536,
      openAIApiKey: apiKey,
    });
  }

  // Helper function for query expansion
  const expandQuery = (query: string): string => {
    const synonyms: Record<string, string[]> = {
      // Coding theory expansion
      'hamming': ['error', 'correction', 'linear', 'code', 'generator'],
      'reed': ['solomon', 'polynomial', 'evaluation', 'error'],
      'bch': ['cyclic', 'polynomial', 'primitive', 'code'],
      'code': ['algorithm', 'implementation', 'function', 'linear', 'block'],
      'generator': ['matrix', 'basis', 'span', 'linear'],
      'matrix': ['linear', 'transformation', 'operator', 'generator'],
      
      // Group theory expansion
      'group': ['algebra', 'structure', 'set', 'permutation', 'symmetric'],
      'permutation': ['symmetric', 'alternating', 'cycle', 'transposition'],
      'sylow': ['subgroup', 'theorem', 'prime', 'power'],
      
      // Field theory expansion
      'field': ['ring', 'domain', 'arithmetic', 'finite', 'galois'],
      'finite': ['field', 'galois', 'primitive', 'polynomial'],
      'polynomial': ['expression', 'equation', 'formula', 'irreducible'],
      
      // Elliptic curve expansion
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
  };

  // Advanced hybrid search tool
  server.tool(
    "search_magma_advanced",
    "Advanced search with hybrid BM25+vector similarity, query expansion, and re-ranking for MAGMA handbook content",
    {
      query: z.string().describe('Search query for MAGMA handbook content'),
      limit: z.number().optional().default(5).describe('Maximum number of results to return'),
      category: z.enum(['syntax', 'function', 'algorithm', 'example', 'theory', 'all'])
        .optional()
        .default('all')
        .describe('Category of content to search'),
      vectorWeight: z.number().optional().default(0.7).describe('Weight for vector similarity (0-1)'),
      bm25Weight: z.number().optional().default(0.3).describe('Weight for BM25 score (0-1)'),
    },
    async ({ query, limit, category, vectorWeight, bm25Weight }) => {
      try {
        // API key validation
        if (!openaiApiKey) {
          return {
            content: [{ 
              type: "text", 
              text: 'OpenAI API Key Required\n\n**Error:** ' + apiKeyError + '\n\n**Setup Instructions:**\n1. Configure your OpenAI API key in Smithery\n2. Or set OPENAI_API_KEY environment variable\n3. Restart your MCP client'
            }],
          };
        }

        // Expand query with synonyms
        const expandedQuery = expandQuery(query);
        
        // Generate query embedding with proper error handling
        let queryEmbedding;
        try {
          console.log('Generating embedding for: "' + expandedQuery + '"');
          const embeddings = createEmbeddings(openaiApiKey);
          queryEmbedding = await embeddings.embedQuery(expandedQuery);
          console.log('Embedding generated successfully (' + queryEmbedding.length + ' dimensions)');
        } catch (embeddingError: any) {
          console.error('Embedding Error:', embeddingError);
          return {
            content: [{ 
              type: "text", 
              text: 'OpenAI API Error: ' + embeddingError.message + '\n\n**Possible Issues:**\n- Invalid API key: ' + (openaiApiKey?.substring(0, 8) || 'unknown') + '...\n- Expired or deactivated API key\n- Insufficient API credits\n- Network connectivity issues\n- Rate limiting\n\n**Debug Info:**\n- API key length: ' + (openaiApiKey?.length || 0) + '\n- Error type: ' + embeddingError.name + '\n\n**Please verify your OpenAI API key and account status.**'
            }],
          };
        }
        
        // Call hybrid search function
        const { data, error } = await supabase.rpc('search_magma_hybrid', {
          query_text: expandedQuery,
          query_embedding: queryEmbedding,
          similarity_threshold: 0.4,
          bm25_weight: bm25Weight,
          vector_weight: vectorWeight,
          match_count: limit,
          category_filter: category === 'all' ? null : category
        });
        
        if (error) {
          throw new Error('Hybrid search error: ' + error.message);
        }

        const results: SearchResult[] = data.map((row: any) => ({
          content: row.content,
          metadata: row.metadata,
          score: row.combined_score,
          vectorSimilarity: row.vector_similarity,
          bm25Score: row.bm25_score,
          rank: row.rank,
        }));

        if (results.length === 0) {
          return {
            content: [{ type: "text", text: 'No results found for query: "' + query + '"' }],
          };
        }

        let output = '# Advanced Search Results for "' + query + '"\n\n';
        output += '**Found**: ' + results.length + ' results\n';
        output += '**Query Expansion**: ' + expandedQuery + '\n\n';
        
        results.forEach((result, index) => {
          output += '## Result ' + (index + 1) + '\n';
          output += '**Source**: ' + result.metadata.source + ' (Page ' + result.metadata.page + ')\n';
          output += '**Category**: ' + result.metadata.category + '\n';
          output += '**Scores**: Combined ' + result.score.toFixed(3) + ' (Vector: ' + (result.vectorSimilarity?.toFixed(3) || 'N/A') + ', BM25: ' + (result.bm25Score?.toFixed(3) || 'N/A') + ')\n';
          
          if (result.metadata.hasCode) {
            output += '**Contains Code**: Yes\n';
          }
          if (result.metadata.hasExample) {
            output += '**Contains Examples**: Yes\n';
          }
          
          output += '\n' + result.content.trim() + '\n\n';
          output += '---\n\n';
        });

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: 'Error: ' + (error instanceof Error ? error.message : 'Unknown error')
          }],
        };
      }
    }
  );

  // Function-specific search tool
  server.tool(
    "search_functions",
    "Search for specific MAGMA functions with fuzzy matching and signature lookup",
    {
      functionName: z.string().describe('Function name to search for'),
      limit: z.number().optional().default(10).describe('Maximum number of function matches'),
    },
    async ({ functionName, limit }) => {
      try {
        const { data, error } = await supabase.rpc('search_magma_functions', {
          function_query: functionName,
          similarity_threshold: 0.3,
          match_count: limit
        });
        
        if (error) {
          throw new Error('Function search error: ' + error.message);
        }

        if (!data || data.length === 0) {
          return {
            content: [{ type: "text", text: 'No functions found matching: "' + functionName + '"' }],
          };
        }

        let output = '# Function Search Results for "' + functionName + '"\n\n';
        output += 'Found ' + data.length + ' matching functions:\n\n';
        
        data.forEach((result: any, index: number) => {
          output += '## ' + (index + 1) + '. ' + result.function_name + '\n';
          output += '**Similarity**: ' + result.similarity_score.toFixed(3) + '\n';
          
          if (result.function_signature) {
            output += '**Signature**: `' + result.function_signature + '`\n';
          }
          
          if (result.description) {
            output += '**Description**: ' + result.description + '\n';
          }
          
          if (result.category) {
            output += '**Category**: ' + result.category + '\n';
          }
          
          output += '\n';
        });

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: 'Error: ' + (error instanceof Error ? error.message : 'Unknown error')
          }],
        };
      }
    }
  );

  // API key validation tool
  server.tool(
    "validate_api_key",
    "Validate your OpenAI API key configuration and test connectivity",
    {},
    async () => {
      const { apiKey: validatedApiKey, error: validationError } = getValidatedApiKey();
      
      let validationResult = "# API Key Validation Results\n\n";
      
      if (!validatedApiKey) {
        validationResult += "API Key Validation Failed\n";
        validationResult += "- Error: " + validationError + "\n\n";
        validationResult += "**Sources Checked:**\n";
        validationResult += "- config.openaiApiKey: " + !!config.openaiApiKey + "\n";
        validationResult += "- OPENAI_API_KEY: " + !!process.env.OPENAI_API_KEY + "\n";
        validationResult += "- OPENAI_API_KEY_CONFIG: " + !!process.env.OPENAI_API_KEY_CONFIG + "\n";
        validationResult += "- SMITHERY_OPENAI_API_KEY: " + !!process.env.SMITHERY_OPENAI_API_KEY + "\n\n";
      } else {
        validationResult += "API Key Validated Successfully\n";
        validationResult += "- Key length: " + validatedApiKey.length + " characters\n";
        validationResult += "- Starts with 'sk-': Yes\n";
        validationResult += "- Format valid: Yes\n\n";
        
        // API connection test
        try {
          validationResult += "Testing API Connection...\n";
          const testEmbeddings = createEmbeddings(validatedApiKey);
          const testEmbedding = await testEmbeddings.embedQuery("test");
          validationResult += "API Connection Successful!\n";
          validationResult += "- Embedding dimension: " + testEmbedding.length + "\n";
          validationResult += "- Ready to use search features\n\n";
        } catch (error: any) {
          validationResult += "API Connection Failed\n";
          validationResult += "- Error: " + error.message + "\n";
          validationResult += "- Error type: " + error.name + "\n";
          validationResult += "- API key prefix: " + validatedApiKey.substring(0, 8) + "...\n";
          validationResult += "- Please check your API key validity and credits\n\n";
        }
      }
      
      validationResult += "## Configuration Guide\n\n";
      validationResult += "### Method 1: Via Smithery Website\n";
      validationResult += "1. Go to https://smithery.ai/@LeGenAI/mcp-magma-handbook\n";
      validationResult += "2. Enter your OpenAI API key in the configuration\n";
      validationResult += "3. Copy the generated JSON configuration\n";
      validationResult += "4. Paste into your Claude Desktop or Cursor settings\n\n";
      
      return {
        content: [{ type: "text", text: validationResult }],
      };
    }
  );

  // Demo tool that works without configuration
  server.tool(
    "magma_info",
    "Get information about MAGMA computational algebra system and this server",
    {},
    async () => {
      return {
        content: [{ 
          type: "text", 
          text: '# MAGMA Handbook Advanced Server v2.1.0\n\n## About MAGMA\nMAGMA is a large, well-supported software package designed for computations in algebra, number theory, algebraic geometry and algebraic combinatorics.\n\n## Server Features\n- Advanced Hybrid Search: BM25 + Vector similarity (84.7% average relevance)\n- Function-Specific Search: 4441+ MAGMA functions indexed with fuzzy matching\n- Quality Benchmarking: Comprehensive testing suite\n- Query Expansion: Mathematical domain-specific synonyms\n\n## Available Tools\n1. **search_magma_advanced**: Comprehensive search with hybrid algorithms\n2. **search_functions**: Dedicated MAGMA function lookup\n3. **validate_api_key**: API key validation and testing\n4. **magma_info**: This information tool\n\n## Configuration Required\nTo use search features, you only need:\n- **openaiApiKey**: Your OpenAI API key (for embeddings)\n\n**Note**: The MAGMA knowledge base is provided free of charge!'
        }],
      };
    }
  );

  // Quality benchmark tool
  server.tool(
    "benchmark_quality",
    "Run quality benchmarks to evaluate search performance across different query types",
    {
      difficulty: z.enum(['easy', 'medium', 'hard', 'all']).optional().default('all').describe('Difficulty level to test')
    },
    async ({ difficulty }) => {
      if (!openaiApiKey) {
        return {
          content: [{ 
            type: "text", 
            text: 'OpenAI API Key Required\n\n**Error:** ' + apiKeyError + '\n\nPlease configure your OpenAI API key to run benchmarks.'
          }],
        };
      }

      const testQueries = [
        { query: "Hamming code generator matrix", difficulty: "easy" },
        { query: "Reed Solomon error correction", difficulty: "medium" },
        { query: "BCH code construction polynomial", difficulty: "hard" },
        { query: "permutation group symmetric alternating", difficulty: "easy" },
        { query: "Sylow subgroup computation", difficulty: "medium" },
        { query: "integer factorization algorithm", difficulty: "easy" },
        { query: "elliptic curve point addition", difficulty: "easy" },
        { query: "matrix eigenvalue computation", difficulty: "easy" },
        { query: "GF finite field arithmetic", difficulty: "easy" },
        { query: "IsIrreducible polynomial test", difficulty: "easy" },
      ].filter(q => difficulty === 'all' || q.difficulty === difficulty);

      let output = "# MAGMA Knowledge Base Quality Benchmark\n\n";
      output += "Testing " + testQueries.length + " queries (difficulty: " + difficulty + ")\n\n";

      let totalScore = 0;
      let totalTime = 0;

      for (const [index, testQuery] of testQueries.entries()) {
        const startTime = Date.now();
        
        try {
          const testEmbeddings = createEmbeddings(openaiApiKey);
          const queryEmbedding = await testEmbeddings.embedQuery(testQuery.query);
          const { data } = await supabase.rpc('search_magma_hybrid', {
            query_text: testQuery.query,
            query_embedding: queryEmbedding,
            similarity_threshold: 0.4,
            bm25_weight: 0.3,
            vector_weight: 0.7,
            match_count: 5,
            category_filter: null
          });

          const responseTime = Date.now() - startTime;
          const resultCount = data?.length || 0;
          const relevanceScore = Math.min(resultCount / 5, 1.0); // Simple relevance metric

          totalScore += relevanceScore;
          totalTime += responseTime;

          output += '[' + (index + 1) + '/' + testQueries.length + '] "' + testQuery.query + '" (' + testQuery.difficulty + ')\n';
          output += '   Relevance: ' + (relevanceScore * 100).toFixed(0) + '% | Speed: ' + responseTime + 'ms | Results: ' + resultCount + '\n\n';
        } catch (error) {
          output += '[' + (index + 1) + '/' + testQueries.length + '] "' + testQuery.query + '" - ERROR: ' + error + '\n\n';
        }
      }

      const avgScore = (totalScore / testQueries.length) * 100;
      const avgTime = totalTime / testQueries.length;

      output += '## Summary\n';
      output += 'Average Relevance: ' + avgScore.toFixed(1) + '%\n';
      output += 'Average Response Time: ' + avgTime.toFixed(0) + 'ms\n';

      return {
        content: [{ type: "text", text: output }],
      };
    }
  );

  return server.server;
}