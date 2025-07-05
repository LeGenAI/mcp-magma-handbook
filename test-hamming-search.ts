#!/usr/bin/env node

// Hamming code 검색 테스트
import { spawn } from 'child_process';
import readline from 'readline';

console.log('🔍 Testing Hamming code search with MCP server...');

// MCP 서버 프로세스 시작
const serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY
  }
});

// 서버 로그 출력
serverProcess.stderr.on('data', (data) => {
  console.log(`📋 Server: ${data.toString().trim()}`);
});

// JSON-RPC 요청 보내기
function sendRequest(method: string, params: any = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  };
  
  const requestStr = JSON.stringify(request) + '\n';
  console.log(`\n🔍 Searching: ${JSON.stringify(params, null, 2)}`);
  serverProcess.stdin.write(requestStr);
}

// 서버 응답 처리
const rl = readline.createInterface({
  input: serverProcess.stdout,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    if (response.result && response.result.content) {
      console.log('\n📖 Found content:');
      const content = JSON.parse(response.result.content);
      content.forEach((item: any, idx: number) => {
        console.log(`\n${idx + 1}. ${item.content.substring(0, 300)}...`);
        console.log(`   Source: ${item.source || 'N/A'}`);
      });
    } else if (response.result && response.result.tools) {
      console.log('\n🛠️ Available tools:', response.result.tools.map((t: any) => t.name));
    } else {
      console.log('\n📥 Response:', JSON.stringify(response, null, 2));
    }
  } catch (e) {
    console.log(`📋 Server: ${line}`);
  }
});

// 테스트 시퀀스
setTimeout(() => {
  console.log('\n🚀 Starting Hamming code search test...\n');
  
  // Initialize
  sendRequest('initialize', {
    protocolVersion: '1.0.0',
    capabilities: {},
    clientInfo: { name: 'hamming-test', version: '1.0.0' }
  });
  
  // 1. Search for Hamming code
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'search_magma',
      arguments: {
        query: 'Hamming code generator matrix',
        limit: 3,
        category: 'all'
      }
    });
  }, 1000);
  
  // 2. Search for linear codes
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'search_magma',
      arguments: {
        query: 'linear code generator',
        limit: 3,
        category: 'function'
      }
    });
  }, 3000);
  
  // 3. Get examples
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'get_magma_example',
      arguments: {
        topic: 'Hamming code',
        complexity: 'basic'
      }
    });
  }, 5000);
  
  // 종료
  setTimeout(() => {
    console.log('\n✅ Test completed. Results above show what MCP found.');
    serverProcess.kill();
    process.exit(0);
  }, 8000);
  
}, 2000);

// 프로세스 종료 처리
process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit(0);
});