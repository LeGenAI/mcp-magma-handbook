#!/usr/bin/env tsx

// MCP 서버를 직접 테스트하는 간단한 스크립트
import dotenv from 'dotenv';
dotenv.config();

// 검색 함수 직접 가져오기
async function testSearch() {
  const { searchHandbook } = await import('./src/tools/search.js');
  
  console.log('🔍 Testing MAGMA Handbook Search...\n');
  
  // 테스트 쿼리들
  const queries = [
    'Hamming code generator matrix',
    'Latin squares orthogonal',
    'finite field arithmetic',
    'Groebner basis computation'
  ];
  
  for (const query of queries) {
    console.log(`\n📌 Query: "${query}"`);
    console.log('─'.repeat(50));
    
    try {
      const results = await searchHandbook(query);
      const parsedResults = JSON.parse(results);
      
      console.log(`Found ${parsedResults.length} results:`);
      
      parsedResults.slice(0, 3).forEach((result: any, idx: number) => {
        console.log(`\n${idx + 1}. Section ${result.section_number}: ${result.title}`);
        console.log(`   Relevance: ${(result.relevance_score * 100).toFixed(1)}%`);
        console.log(`   Preview: ${result.content.substring(0, 150)}...`);
      });
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }
}

// 섹션 가져오기 테스트
async function testGetSection() {
  const { getSection } = await import('./src/tools/search.js');
  
  console.log('\n\n📄 Testing Get Section...\n');
  
  try {
    const section = await getSection('1.1');
    const content = JSON.parse(section);
    
    console.log(`Section 1.1: ${content[0].title}`);
    console.log(`Content preview: ${content[0].content.substring(0, 300)}...`);
  } catch (error) {
    console.error(`❌ Error: ${error}`);
  }
}

// 테스트 실행
async function runTests() {
  await testSearch();
  await testGetSection();
}

runTests().catch(console.error);