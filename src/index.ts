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
import { SupabaseMagmaKnowledgeBase } from './supabase-knowledge-base.js';

// Load environment variables
config();

// Tool schemas
const SearchMagmaSchema = z.object({
  query: z.string().describe('Search query for MAGMA handbook content'),
  limit: z.number().optional().default(5).describe('Maximum number of results to return'),
  category: z.enum(['syntax', 'function', 'algorithm', 'example', 'theory', 'all'])
    .optional()
    .default('all')
    .describe('Category of content to search')
});

const GetMagmaExampleSchema = z.object({
  topic: z.string().describe('Mathematical topic or MAGMA function name'),
  complexity: z.enum(['basic', 'intermediate', 'advanced'])
    .optional()
    .default('basic')
    .describe('Complexity level of examples')
});

const ExplainMagmaCodeSchema = z.object({
  code: z.string().describe('MAGMA code to explain'),
  context: z.string().optional().describe('Additional context about the code')
});

export class MagmaHandbookServer {
  private server: Server;
  private knowledgeBase: SupabaseMagmaKnowledgeBase;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-magma-handbook',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.knowledgeBase = new SupabaseMagmaKnowledgeBase();
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_magma',
          description: 'Search MAGMA handbook for specific topics, functions, or algorithms',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' },
              category: { 
                type: 'string', 
                enum: ['syntax', 'function', 'algorithm', 'example', 'theory', 'all'] 
              }
            },
            required: ['query']
          }
        } as Tool,
        {
          name: 'get_magma_example',
          description: 'Get MAGMA code examples for specific mathematical topics',
          inputSchema: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              complexity: { 
                type: 'string', 
                enum: ['basic', 'intermediate', 'advanced'] 
              }
            },
            required: ['topic']
          }
        } as Tool,
        {
          name: 'explain_magma_code',
          description: 'Explain what a piece of MAGMA code does',
          inputSchema: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              context: { type: 'string' }
            },
            required: ['code']
          }
        } as Tool
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_magma': {
            const params = SearchMagmaSchema.parse(args);
            const results = await this.knowledgeBase.search(
              params.query,
              params.limit,
              params.category
            );
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatSearchResults(results, params.query),
                },
              ],
            };
          }

          case 'get_magma_example': {
            const params = GetMagmaExampleSchema.parse(args);
            const examples = await this.knowledgeBase.getExamples(
              params.topic,
              params.complexity
            );
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatExamples(examples, params.topic),
                },
              ],
            };
          }

          case 'explain_magma_code': {
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

  private formatSearchResults(results: any[], query: string): string {
    if (results.length === 0) {
      return `No results found for query: "${query}"`;
    }

    let output = `Found ${results.length} results for "${query}":\n\n`;
    
    results.forEach((result, index) => {
      output += `## Result ${index + 1}\n`;
      output += `**Source**: ${result.metadata.source} (Page ${result.metadata.page})\n`;
      output += `**Category**: ${result.metadata.category}\n`;
      output += `**Relevance Score**: ${result.score.toFixed(3)}\n\n`;
      output += `${result.content}\n\n`;
      output += '---\n\n';
    });

    return output;
  }

  private formatExamples(examples: any[], topic: string): string {
    if (examples.length === 0) {
      return `No examples found for topic: "${topic}"`;
    }

    let output = `# MAGMA Examples for "${topic}"\n\n`;
    
    examples.forEach((example, index) => {
      output += `## Example ${index + 1}: ${example.title}\n`;
      output += `**Level**: ${example.complexity}\n\n`;
      output += '```magma\n';
      output += example.code;
      output += '\n```\n\n';
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
    // Initialize knowledge base
    await this.knowledgeBase.initialize();
    
    // Start server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MAGMA Handbook MCP server started');
  }
}

// Start the server
const server = new MagmaHandbookServer();
server.start().catch(console.error);