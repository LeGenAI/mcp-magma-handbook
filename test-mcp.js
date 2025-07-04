// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { SupabaseMagmaKnowledgeBase } from './dist/supabase-knowledge-base.js';
import { config } from 'dotenv';

config();

async function testMCP() {
  console.log('🧪 Testing MCP MAGMA Handbook functionality...\n');
  
  try {
    const kb = new SupabaseMagmaKnowledgeBase();
    await kb.initialize();
    
    // Test 1: Search functionality
    console.log('1️⃣ Testing search...');
    const searchResults = await kb.search('elliptic curve definition', 3);
    console.log(`Found ${searchResults.length} results:`);
    searchResults.forEach((result, i) => {
      console.log(`  ${i+1}. Score: ${result.score.toFixed(3)} - ${result.content.substring(0, 100)}...`);
    });
    
    // Test 2: Get examples
    console.log('\n2️⃣ Testing examples...');
    const examples = await kb.getExamples('elliptic curve', 'basic');
    console.log(`Found ${examples.length} examples:`);
    examples.forEach((ex, i) => {
      console.log(`  ${i+1}. ${ex.title} (${ex.complexity})`);
    });
    
    // Test 3: Code explanation
    console.log('\n3️⃣ Testing code explanation...');
    const explanation = await kb.explainCode('E := EllipticCurve([1, 2]);');
    console.log('Explanation:', explanation.substring(0, 200) + '...');
    
    console.log('\n✅ All tests passed! MCP server is ready.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMCP();