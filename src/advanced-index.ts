// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { config } from 'dotenv';
import { AdvancedMagmaKnowledgeBase } from './advanced-knowledge-base.js';

// Load environment variables
config();

// Enhanced tool schemas with more options
const SearchMagmaSchema = z.object({
  query: z.string().describe('Search query for MAGMA handbook content'),
  limit: z.number().optional().default(5).describe('Maximum number of results to return'),
  category: z.enum(['syntax', 'function', 'algorithm', 'example', 'theory', 'all'])
    .optional()
    .default('all')
    .describe('Category of content to search'),
  searchType: z.enum(['hybrid', 'vector', 'bm25'])
    .optional()
    .default('hybrid')
    .describe('Type of search to perform'),
  vectorWeight: z.number().optional().default(0.7).describe('Weight for vector similarity (0-1)'),
  bm25Weight: z.number().optional().default(0.3).describe('Weight for BM25 score (0-1)')
});

const SearchFunctionsSchema = z.object({
  functionName: z.string().describe('Function name to search for'),
  limit: z.number().optional().default(10).describe('Maximum number of function matches'),
  fuzzy: z.boolean().optional().default(true).describe('Enable fuzzy matching')
});

const GetMagmaExampleSchema = z.object({
  topic: z.string().describe('Mathematical topic or MAGMA function name'),
  complexity: z.enum(['basic', 'intermediate', 'advanced', 'all'])
    .optional()
    .default('basic')
    .describe('Complexity level of examples'),
  includeCode: z.boolean().optional().default(true).describe('Include executable code in examples')
});

const ExplainMagmaCodeSchema = z.object({
  code: z.string().describe('MAGMA code to explain'),
  context: z.string().optional().describe('Additional context about the code'),
  includeRelated: z.boolean().optional().default(true).describe('Include related function documentation')
});

const BenchmarkQualitySchema = z.object({
  runFull: z.boolean().optional().default(false).describe('Run full benchmark suite (may take several minutes)'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'all']).optional().default('all').describe('Difficulty level to test')
});

export class AdvancedMagmaHandbookServer {
  private server: Server;
  private knowledgeBase: AdvancedMagmaKnowledgeBase;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-magma-handbook-advanced',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.knowledgeBase = new AdvancedMagmaKnowledgeBase();
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_magma_advanced',
          description: 'Advanced search with hybrid BM25+vector similarity, query expansion, and re-ranking',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' },
              category: { 
                type: 'string', 
                enum: ['syntax', 'function', 'algorithm', 'example', 'theory', 'all'] 
              },
              searchType: {
                type: 'string',
                enum: ['hybrid', 'vector', 'bm25']
              },
              vectorWeight: { type: 'number', minimum: 0, maximum: 1 },
              bm25Weight: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['query']
          }
        } as Tool,
        {
          name: 'search_functions',
          description: 'Search for specific MAGMA functions with fuzzy matching and signature lookup',
          inputSchema: {
            type: 'object',
            properties: {
              functionName: { type: 'string' },
              limit: { type: 'number' },
              fuzzy: { type: 'boolean' }
            },
            required: ['functionName']
          }
        } as Tool,
        {
          name: 'get_magma_example_advanced',
          description: 'Get comprehensive MAGMA code examples with enhanced filtering and explanations',
          inputSchema: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              complexity: { 
                type: 'string', 
                enum: ['basic', 'intermediate', 'advanced', 'all'] 
              },
              includeCode: { type: 'boolean' }
            },
            required: ['topic']
          }
        } as Tool,
        {
          name: 'explain_magma_code_advanced',
          description: 'Provide detailed explanation of MAGMA code with function documentation and context',
          inputSchema: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              context: { type: 'string' },
              includeRelated: { type: 'boolean' }
            },
            required: ['code']
          }
        } as Tool,
        {
          name: 'benchmark_quality',
          description: 'Run quality benchmarks to evaluate search performance across different query types',
          inputSchema: {
            type: 'object',
            properties: {
              runFull: { type: 'boolean' },
              difficulty: {
                type: 'string',
                enum: ['easy', 'medium', 'hard', 'all']
              }
            },
            required: []
          }
        } as Tool
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_magma_advanced': {
            const params = SearchMagmaSchema.parse(args);
            
            let results;
            if (params.searchType === 'hybrid') {
              results = await this.knowledgeBase.hybridSearch(
                params.query,
                params.limit,
                params.category,
                params.vectorWeight,
                params.bm25Weight
              );
            } else {
              // Fall back to enhanced search for other types
              results = await this.knowledgeBase.enhancedSearch(
                params.query,
                params.limit,
                params.category
              );
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatAdvancedSearchResults(results, params),
                },
              ],
            };
          }

          case 'search_functions': {
            const params = SearchFunctionsSchema.parse(args);
            const results = await this.knowledgeBase.searchFunctions(
              params.functionName,
              params.limit
            );
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatFunctionResults(results, params.functionName),
                },
              ],
            };
          }

          case 'get_magma_example_advanced': {
            const params = GetMagmaExampleSchema.parse(args);
            const examples = await this.knowledgeBase.getExamples(
              params.topic,
              params.complexity
            );
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatAdvancedExamples(examples, params),
                },
              ],
            };
          }

          case 'explain_magma_code_advanced': {
            const params = ExplainMagmaCodeSchema.parse(args);
            const explanation = await this.knowledgeBase.explainCode(
              params.code,
              params.context
            );
            return {
              content: [
                {
                  type: 'text',
                  text: explanation,
                },
              ],
            };
          }

          case 'benchmark_quality': {
            const params = BenchmarkQualitySchema.parse(args);
            
            // Import and run benchmark
            const { QualityBenchmark } = await import('./quality-benchmark.js');
            const benchmark = new QualityBenchmark();
            
            // Capture benchmark output
            let benchmarkOutput = '';
            const originalLog = console.log;
            console.log = (...args) => {
              benchmarkOutput += args.join(' ') + '\n';
              originalLog(...args);
            };
            
            try {
              await benchmark.runBenchmark();
            } finally {
              console.log = originalLog;
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: `# Quality Benchmark Results\n\n\`\`\`\n${benchmarkOutput}\n\`\`\``,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    });
  }

  private formatAdvancedSearchResults(results: any[], params: any): string {
    if (results.length === 0) {
      return `No results found for query: "${params.query}"`;
    }

    let output = `# Advanced Search Results for "${params.query}"\n\n`;
    output += `**Search Type**: ${params.searchType}\n`;
    output += `**Category Filter**: ${params.category}\n`;
    output += `**Found**: ${results.length} results\n\n`;
    
    results.forEach((result, index) => {
      output += `## Result ${index + 1}\n`;
      output += `**Source**: ${result.metadata.source} (Page ${result.metadata.page})\n`;
      output += `**Category**: ${result.metadata.category}\n`;
      
      if (result.vectorSimilarity !== undefined && result.bm25Score !== undefined) {
        output += `**Scores**: Combined ${result.score.toFixed(3)} (Vector: ${result.vectorSimilarity.toFixed(3)}, BM25: ${result.bm25Score.toFixed(3)})\n`;
      } else {
        output += `**Relevance Score**: ${result.score.toFixed(3)}\n`;
      }
      
      if (result.metadata.hasCode) {
        output += `**Contains Code**: ✅\n`;
      }
      if (result.metadata.hasExample) {
        output += `**Contains Examples**: ✅\n`;
      }
      
      output += `\n${result.content.trim()}\n\n`;
      output += '---\n\n';
    });

    return output;
  }

  private formatFunctionResults(results: any[], functionName: string): string {
    if (results.length === 0) {
      return `No functions found matching: "${functionName}"`;
    }

    let output = `# Function Search Results for "${functionName}"\n\n`;
    output += `Found ${results.length} matching functions:\n\n`;
    
    results.forEach((result, index) => {
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

    return output;
  }

  private formatAdvancedExamples(examples: any[], params: any): string {
    if (examples.length === 0) {
      return `No examples found for topic: "${params.topic}" (complexity: ${params.complexity})`;
    }

    let output = `# MAGMA Examples for "${params.topic}"\n\n`;
    output += `**Complexity Level**: ${params.complexity}\n`;
    output += `**Found**: ${examples.length} examples\n\n`;
    
    examples.forEach((example, index) => {
      output += `## Example ${index + 1}: ${example.title}\n`;
      output += `**Complexity**: ${example.complexity}\n`;
      output += `**Source**: ${example.source} (Page ${example.page})\n\n`;
      
      if (params.includeCode && example.code) {
        output += '```magma\n';
        output += example.code;
        output += '\n```\n\n';
      }
      
      if (example.explanation) {
        output += `**Explanation**: ${example.explanation}\n\n`;
      }
      
      if (example.output) {
        output += `**Expected Output**:\n\`\`\`\n${example.output}\n\`\`\`\n\n`;
      }
      
      output += '---\n\n';
    });

    return output;
  }

  async start() {
    // Initialize advanced knowledge base
    await this.knowledgeBase.initialize();
    
    // Start server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Advanced MAGMA Handbook MCP server started');
  }
}

// Start the advanced server
const server = new AdvancedMagmaHandbookServer();
server.start().catch(console.error);