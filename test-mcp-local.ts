#!/usr/bin/env node

// MCP 프로토콜을 통해 로컬 서버와 통신하는 테스트
import { spawn } from 'child_process';
import readline from 'readline';

// MCP 서버 프로세스 시작
console.log('🚀 Starting MCP server...');
const serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY
  }
});

// 서버 에러 출력
serverProcess.stderr.on('data', (data) => {
  console.error(`Server error: ${data}`);
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
  console.log('\n📤 Sending:', request);
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
    console.log('\n📥 Response:', JSON.stringify(response, null, 2));
  } catch (e) {
    // 서버 시작 메시지 등은 JSON이 아닐 수 있음
    console.log('Server:', line);
  }
});

// 서버가 시작되길 기다린 후 테스트 시작
setTimeout(() => {
  console.log('\n🧪 Starting tests...\n');
  
  // 1. Initialize
  sendRequest('initialize', {
    protocolVersion: '1.0.0',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  });
  
  // 2. List tools (1초 후)
  setTimeout(() => {
    sendRequest('tools/list');
  }, 1000);
  
  // 3. Search test (2초 후)
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'search_magma',
      arguments: {
        query: 'Hamming code generator matrix',
        limit: 3
      }
    });
  }, 2000);
  
  // 4. 종료 (5초 후)
  setTimeout(() => {
    console.log('\n✅ Test completed. Shutting down...');
    serverProcess.kill();
    process.exit(0);
  }, 5000);
  
}, 2000);

// 프로세스 종료 처리
process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit(0);
});