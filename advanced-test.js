// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { SupabaseMagmaKnowledgeBase } from './dist/supabase-knowledge-base.js';
import { config } from 'dotenv';

config();

async function advancedTest() {
  console.log('🔬 Advanced MAGMA Query Testing...\n');
  
  try {
    const kb = new SupabaseMagmaKnowledgeBase();
    await kb.initialize();
    
    // Test 1: Complex mathematical concepts
    console.log('📐 Testing: Galois Theory');
    const galoisResults = await kb.search('Galois group polynomial field extension', 5);
    console.log(`Found ${galoisResults.length} results:`);
    galoisResults.forEach((result, i) => {
      console.log(`  ${i+1}. [${result.score.toFixed(3)}] ${result.content.substring(0, 80)}...`);
    });
    
    console.log('\n📊 Testing: Group Theory');
    const groupResults = await kb.search('permutation group symmetric alternating', 5);
    console.log(`Found ${groupResults.length} results:`);
    groupResults.forEach((result, i) => {
      console.log(`  ${i+1}. [${result.score.toFixed(3)}] ${result.content.substring(0, 80)}...`);
    });
    
    console.log('\n🔢 Testing: Number Theory');
    const numberResults = await kb.search('prime factorization quadratic residue', 5);
    console.log(`Found ${numberResults.length} results:`);
    numberResults.forEach((result, i) => {
      console.log(`  ${i+1}. [${result.score.toFixed(3)}] ${result.content.substring(0, 80)}...`);
    });
    
    // Test 2: Specific MAGMA functions
    console.log('\n🧮 Testing: MAGMA Functions');
    const functions = ['IsIrreducible', 'FactorInteger', 'EllipticCurve', 'PermutationGroup'];
    
    for (const func of functions) {
      const results = await kb.search(func, 2, 'function');
      console.log(`${func}: ${results.length} results found`);
    }
    
    // Test 3: Code complexity analysis
    console.log('\n⚙️ Testing: Code Analysis');
    const complexCode = `
    K := GF(101);
    E := EllipticCurve([K | 1, 2]);
    P := RandomPoint(E);
    for i in [1..10] do
      Q := i * P;
      if IsZero(Q) then
        print "Order divides", i;
      end if;
    end for;
    `;
    
    const explanation = await kb.explainCode(complexCode);
    console.log('Complex code explanation generated:', explanation.length > 100 ? '✅' : '❌');
    
    console.log('\n🎯 Advanced testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Advanced test failed:', error);
  }
}

advancedTest();