#!/usr/bin/env tsx

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testMCPServer() {
  // MCP 서버 프로세스 시작
  const serverProcess = spawn('tsx', ['src/index.ts'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY
    }
  });

  // MCP 클라이언트 설정
  const transport = new StdioClientTransport({
    command: 'tsx',
    args: ['src/index.ts'],
    env: process.env
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);

  try {
    // 사용 가능한 도구 확인
    console.log('\n📋 Available tools:');
    const tools = await client.listTools();
    tools.tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });

    // 검색 테스트
    console.log('\n🔍 Testing search...');
    const searchResult = await client.callTool('search_handbook', {
      query: 'Hamming code generator matrix'
    });
    
    console.log('\n📖 Search results:');
    console.log(JSON.stringify(searchResult, null, 2));

    // 특정 섹션 가져오기 테스트
    console.log('\n📄 Testing get_section...');
    const sectionResult = await client.callTool('get_section', {
      sectionNumber: '1.1'
    });
    
    console.log('\n📑 Section content preview:');
    const content = JSON.parse(sectionResult.content);
    console.log(content[0].content.substring(0, 200) + '...');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

// 환경 변수 로드
import dotenv from 'dotenv';
dotenv.config();

// 테스트 실행
testMCPServer().catch(console.error);