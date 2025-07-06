#!/usr/bin/env node

/**
 * Test script for Enhanced MCP-MAGMA-Handbook Server v3.0
 */

import { spawn } from 'child_process';
import readline from 'readline';

console.log('🧪 Enhanced MCP-MAGMA-Handbook v3.0 테스트 시작...\n');

const serverProcess = spawn('npx', ['tsx', 'enhanced-mcp-server.ts'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY
  }
});

serverProcess.stderr.on('data', (data) => {
  console.log(`📋 Server: ${data.toString().trim()}`);
});

function sendRequest(method: string, params: any = {}) {
  const request = { jsonrpc: '2.0', id: Date.now(), method, params };
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
}

const rl = readline.createInterface({
  input: serverProcess.stdout,
  terminal: false
});

let testResults: any[] = [];
let currentTest = '';

rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    if (response.result) {
      console.log(`\n✅ ${currentTest} 성공:`);
      if (response.result.content?.[0]?.text) {
        try {
          const parsed = JSON.parse(response.result.content[0].text);
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          console.log(response.result.content[0].text);
        }
      }
      testResults.push({ test: currentTest, status: 'success' });
    }
  } catch (e) {
    console.log(`📋 Server: ${line}`);
  }
});

setTimeout(() => {
  console.log('\n🚀 테스트 시퀀스 시작...\n');
  
  sendRequest('initialize', {
    protocolVersion: '1.0.0',
    capabilities: {},
    clientInfo: { name: 'enhanced-mcp-test', version: '3.0.0' }
  });
  
  // 1. Health check
  setTimeout(() => {
    currentTest = 'Health Status 확인';
    console.log(`\n🔍 테스트 1: ${currentTest}`);
    sendRequest('tools/call', {
      name: 'get_health_status',
      arguments: {}
    });
  }, 1000);
  
  // 2. Collections
  setTimeout(() => {
    currentTest = 'Collections 목록';
    console.log(`\n🔍 테스트 2: ${currentTest}`);
    sendRequest('tools/call', {
      name: 'list_collections',
      arguments: {}
    });
  }, 3000);
  
  // 3. Multi-query search
  setTimeout(() => {
    currentTest = 'Multi-Query Hybrid Search';
    console.log(`\n🔍 테스트 3: ${currentTest}`);
    sendRequest('tools/call', {
      name: 'search_magma',
      arguments: {
        query: 'How to create polynomial rings in MAGMA?',
        limit: 3,
        search_type: 'hybrid',
        use_multi_query: true
      }
    });
  }, 5000);
  
  // 4. Save conversation
  setTimeout(() => {
    currentTest = 'Conversation 저장';
    console.log(`\n🔍 테스트 4: ${currentTest}`);
    sendRequest('tools/call', {
      name: 'save_conversation',
      arguments: {
        collection_id: 'magma-handbook',
        conversation: 'User: MAGMA에서 다항식 환을 어떻게 만드나요?\nAssistant: MAGMA에서 다항식 환은 PolynomialRing 함수를 사용합니다.',
        title: 'Enhanced MCP Test Conversation'
      }
    });
  }, 8000);
  
  // Summary
  setTimeout(() => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 테스트 결과 요약:');
    console.log('='.repeat(60));
    
    console.log(`\n✅ 완료된 테스트: ${testResults.length}개`);
    console.log('\n🚀 Enhanced MCP v3.0 주요 기능:');
    console.log('  ✨ Multi-query 검색 - 여러 관점에서 질문 생성');
    console.log('  🔍 Hybrid 검색 - 시맨틱 + 키워드 검색 결합');
    console.log('  📁 Collection 관리 - 주제별 문서 분류');
    console.log('  💬 Conversation 저장 - AI 대화 내용 저장');
    console.log('  ⚡ 동적 검색 타입 - semantic/keyword/hybrid 선택');
    
    console.log('\n🎯 랩실 사용법:');
    console.log('1. search_magma: 향상된 검색 (기본적으로 multi-query + hybrid)');
    console.log('2. list_collections: 사용 가능한 컬렉션 확인');
    console.log('3. save_conversation: 유용한 대화 내용 저장');
    console.log('4. create_collection: 새로운 주제별 컬렉션 생성');
    
    serverProcess.kill();
    process.exit(0);
  }, 12000);
}, 2000);

process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit(0);
});