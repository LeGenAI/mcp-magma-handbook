// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { SupabaseMagmaKnowledgeBase } from './dist/supabase-knowledge-base.js';
import { config } from 'dotenv';

config();

async function searchQualityTest() {
  console.log('🔍 Search Quality Analysis...\n');
  
  try {
    const kb = new SupabaseMagmaKnowledgeBase();
    await kb.initialize();
    
    // Test specific coding theory queries
    const codingTheoryTests = [
      'Hamming code generator matrix',
      'Reed Solomon code',
      'BCH code construction',
      'Cyclic code polynomial',
      'Linear code minimum distance'
    ];
    
    console.log('📝 Coding Theory Search Test:');
    for (const query of codingTheoryTests) {
      console.log(`\nQuery: "${query}"`);
      const results = await kb.search(query, 5);
      
      results.forEach((result, i) => {
        console.log(`  ${i+1}. [${result.score.toFixed(3)}] ${result.content.substring(0, 100).replace(/\n/g, ' ')}...`);
      });
    }
    
    // Test specific function searches
    console.log('\n\n🔧 Function Search Test:');
    const functionTests = [
      'HammingCode',
      'LinearCode', 
      'GeneratorMatrix',
      'MinimumDistance',
      'CyclicCode'
    ];
    
    for (const func of functionTests) {
      console.log(`\nFunction: ${func}`);
      const results = await kb.search(func, 3, 'function');
      console.log(`  Found ${results.length} function-category results`);
      
      // Also try general search
      const generalResults = await kb.search(func, 3);
      console.log(`  Found ${generalResults.length} general results`);
      
      if (generalResults.length > 0) {
        console.log(`    Best match: [${generalResults[0].score.toFixed(3)}] ${generalResults[0].content.substring(0, 80)}...`);
      }
    }
    
    // Test mathematical concept searches
    console.log('\n\n🧮 Mathematical Concept Test:');
    const mathTests = [
      'finite field arithmetic',
      'polynomial ring operations',
      'group homomorphism',
      'matrix eigenvalues',
      'number theory factorization'
    ];
    
    for (const query of mathTests) {
      const results = await kb.search(query, 3);
      console.log(`\n"${query}": ${results.length} results, best score: ${results[0]?.score.toFixed(3) || 'N/A'}`);
      if (results[0]) {
        console.log(`  "${results[0].content.substring(0, 100).replace(/\n/g, ' ')}..."`);
      }
    }
    
  } catch (error) {
    console.error('❌ Search quality test failed:', error);
  }
}

searchQualityTest();