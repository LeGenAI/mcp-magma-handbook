// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { SupabaseMagmaKnowledgeBase } from './dist/supabase-knowledge-base.js';
import { config } from 'dotenv';

config();

async function performanceTest() {
  console.log('⚡ Performance & Accuracy Testing...\n');
  
  try {
    const kb = new SupabaseMagmaKnowledgeBase();
    await kb.initialize();
    
    // Test queries with expected relevance
    const testQueries = [
      { query: 'define finite field GF', expectedTerms: ['finite', 'field', 'GF'] },
      { query: 'elliptic curve point addition', expectedTerms: ['elliptic', 'curve', 'point'] },
      { query: 'polynomial factorization', expectedTerms: ['polynomial', 'factor'] },
      { query: 'group theory permutation', expectedTerms: ['group', 'permutation'] },
      { query: 'matrix operations linear algebra', expectedTerms: ['matrix', 'linear'] }
    ];
    
    console.log('🎯 Relevance Testing:');
    let totalRelevant = 0;
    let totalQueries = testQueries.length;
    
    for (const test of testQueries) {
      const startTime = Date.now();
      const results = await kb.search(test.query, 3);
      const endTime = Date.now();
      
      // Check relevance - does at least one result contain expected terms?
      const relevant = results.some(result => 
        test.expectedTerms.some(term => 
          result.content.toLowerCase().includes(term.toLowerCase())
        )
      );
      
      if (relevant) totalRelevant++;
      
      console.log(`  Query: "${test.query}"`);
      console.log(`    Time: ${endTime - startTime}ms`);
      console.log(`    Results: ${results.length}`);
      console.log(`    Relevant: ${relevant ? '✅' : '❌'}`);
      console.log(`    Top score: ${results[0]?.score.toFixed(3) || 'N/A'}`);
      console.log('');
    }
    
    console.log('📊 Performance Summary:');
    console.log(`  Relevance Rate: ${totalRelevant}/${totalQueries} (${(totalRelevant/totalQueries*100).toFixed(1)}%)`);
    
    // Speed test with multiple concurrent queries
    console.log('\n🚀 Concurrent Query Speed Test:');
    const speedTestQueries = Array(5).fill('elliptic curve');
    
    const concurrentStart = Date.now();
    const concurrentResults = await Promise.all(
      speedTestQueries.map(query => kb.search(query, 3))
    );
    const concurrentEnd = Date.now();
    
    console.log(`  5 concurrent queries: ${concurrentEnd - concurrentStart}ms`);
    console.log(`  Average per query: ${(concurrentEnd - concurrentStart) / 5}ms`);
    console.log(`  Total results returned: ${concurrentResults.flat().length}`);
    
    // Category filtering test
    console.log('\n🏷️ Category Filtering Test:');
    const categories = ['function', 'example', 'syntax', 'algorithm'];
    
    for (const category of categories) {
      const results = await kb.search('elliptic curve', 3, category);
      console.log(`  ${category}: ${results.length} results`);
    }
    
    console.log('\n✅ Performance testing completed!');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

performanceTest();