// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';

// Configuration schema for required environment variables
export const configSchema = z.object({
  supabaseUrl: z.string().describe("Supabase project URL"),
  supabaseKey: z.string().describe("Supabase anon key"),
  openaiApiKey: z.string().describe("OpenAI API key"),
  debug: z.boolean().default(false).describe("Enable debug logging"),
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
    version: "2.0.0",
  });

  // Initialize Supabase and OpenAI
  const supabase = createClient(config.supabaseUrl, config.supabaseKey);
  const embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
    dimensions: 1536,
    openAIApiKey: config.openaiApiKey,
  });

  // Helper function for query expansion
  const expandQuery = (query: string): string => {
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
        // Expand query with synonyms
        const expandedQuery = expandQuery(query);
        
        // Generate query embedding
        const queryEmbedding = await embeddings.embedQuery(expandedQuery);
        
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
          throw new Error(`Hybrid search error: ${error.message}`);
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
            content: [{ type: "text", text: `No results found for query: "${query}"` }],
          };
        }

        let output = `# Advanced Search Results for "${query}"\n\n`;
        output += `**Found**: ${results.length} results\n`;
        output += `**Query Expansion**: ${expandedQuery}\n\n`;
        
        results.forEach((result, index) => {
          output += `## Result ${index + 1}\n`;
          output += `**Source**: ${result.metadata.source} (Page ${result.metadata.page})\n`;
          output += `**Category**: ${result.metadata.category}\n`;
          output += `**Scores**: Combined ${result.score.toFixed(3)} (Vector: ${result.vectorSimilarity?.toFixed(3)}, BM25: ${result.bm25Score?.toFixed(3)})\n`;
          
          if (result.metadata.hasCode) {
            output += `**Contains Code**: ✅\n`;
          }
          if (result.metadata.hasExample) {
            output += `**Contains Examples**: ✅\n`;
          }
          
          output += `\n${result.content.trim()}\n\n`;
          output += '---\n\n';
        });

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
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
          throw new Error(`Function search error: ${error.message}`);
        }

        if (!data || data.length === 0) {
          return {
            content: [{ type: "text", text: `No functions found matching: "${functionName}"` }],
          };
        }

        let output = `# Function Search Results for "${functionName}"\n\n`;
        output += `Found ${data.length} matching functions:\n\n`;
        
        data.forEach((result: any, index: number) => {
          output += `## ${index + 1}. ${result.function_name}\n`;
          output += `**Similarity**: ${result.similarity_score.toFixed(3)}\n`;
          
          if (result.function_signature) {
            output += `**Signature**: \`${result.function_signature}\`\n`;
          }
          
          if (result.description) {
            output += `**Description**: ${result.description}\n`;
          }
          
          if (result.category) {
            output += `**Category**: ${result.category}\n`;
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
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
        };
      }
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
      output += `Testing ${testQueries.length} queries (difficulty: ${difficulty})\n\n`;

      let totalScore = 0;
      let totalTime = 0;

      for (const [index, testQuery] of testQueries.entries()) {
        const startTime = Date.now();
        
        try {
          const queryEmbedding = await embeddings.embedQuery(testQuery.query);
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

          output += `[${index + 1}/${testQueries.length}] "${testQuery.query}" (${testQuery.difficulty})\n`;
          output += `   Relevance: ${(relevanceScore * 100).toFixed(0)}% | Speed: ${responseTime}ms | Results: ${resultCount}\n\n`;
        } catch (error) {
          output += `[${index + 1}/${testQueries.length}] "${testQuery.query}" - ERROR: ${error}\n\n`;
        }
      }

      const avgScore = (totalScore / testQueries.length) * 100;
      const avgTime = totalTime / testQueries.length;

      output += `## Summary\n`;
      output += `Average Relevance: ${avgScore.toFixed(1)}%\n`;
      output += `Average Response Time: ${avgTime.toFixed(0)}ms\n`;

      return {
        content: [{ type: "text", text: output }],
      };
    }
  );

  return server.server;
}