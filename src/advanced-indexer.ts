// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { AdvancedMagmaKnowledgeBase } from './advanced-knowledge-base.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function advancedIndexing() {
  console.log('🚀 Starting Advanced MAGMA Handbook Indexing...\n');
  
  const kb = new AdvancedMagmaKnowledgeBase();
  await kb.initialize();
  
  // PDF 디렉토리 확인
  const pdfDir = path.join(__dirname, '..', 'data', 'pdfs');
  
  try {
    const files = await fs.readdir(pdfDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.error('❌ No PDF files found in data/pdfs/');
      console.error('Please place MAGMA_HANDBOOK.pdf in the data/pdfs/ directory');
      process.exit(1);
    }
    
    console.log(`📚 Found ${pdfFiles.length} PDF file(s) to index:`);
    pdfFiles.forEach(file => console.log(`  - ${file}`));
    console.log('');
    
    // Index all PDF files with advanced processing
    for (const pdfFile of pdfFiles) {
      const pdfPath = path.join(pdfDir, pdfFile);
      console.log(`🔄 Advanced indexing: ${pdfFile}`);
      
      const startTime = Date.now();
      await kb.indexPDF(pdfPath);
      const endTime = Date.now();
      
      console.log(`✅ Completed ${pdfFile} in ${(endTime - startTime) / 1000}s\n`);
    }
    
    console.log('🎉 Advanced indexing complete!\n');
    
    // Advanced testing
    console.log('🧪 Running advanced search tests...');
    
    // Test 1: Hybrid search
    console.log('\n1️⃣ Testing hybrid search...');
    const hybridResults = await kb.hybridSearch('Hamming code generator matrix', 3);
    console.log(`   Found ${hybridResults.length} results:`);
    hybridResults.forEach((result, i) => {
      console.log(`   ${i+1}. [Combined: ${result.score?.toFixed(3)}, Vector: ${result.vectorSimilarity?.toFixed(3)}, BM25: ${result.bm25Score?.toFixed(3)}]`);
      console.log(`      "${result.content.substring(0, 80).replace(/\n/g, ' ')}..."`);
    });
    
    // Test 2: Function search
    console.log('\n2️⃣ Testing function search...');
    const functionResults = await kb.searchFunctions('EllipticCurve', 3);
    console.log(`   Found ${functionResults.length} function matches:`);
    functionResults.forEach((result, i) => {
      console.log(`   ${i+1}. ${result.function_name} (${result.similarity_score?.toFixed(3)})`);
      console.log(`      Signature: ${result.function_signature || 'N/A'}`);
    });
    
    // Test 3: Enhanced search with query expansion
    console.log('\n3️⃣ Testing enhanced search...');
    const enhancedResults = await kb.enhancedSearch('polynomial factorization', 3);
    console.log(`   Found ${enhancedResults.length} enhanced results:`);
    enhancedResults.forEach((result, i) => {
      console.log(`   ${i+1}. [${result.score?.toFixed(3)}] ${result.content.substring(0, 80).replace(/\n/g, ' ')}...`);
    });
    
    // Test 4: Code explanation
    console.log('\n4️⃣ Testing code explanation...');
    const testCode = 'G := HammingCode(GF(2), 3);';
    const explanation = await kb.explainCode(testCode);
    console.log(`   Code: ${testCode}`);
    console.log(`   Explanation generated: ${explanation.length > 100 ? '✅' : '❌'} (${explanation.length} chars)`);
    
    console.log('\n🎯 Advanced testing completed successfully!');
    console.log('\n💡 The advanced knowledge base is ready for production use!');
    
  } catch (error) {
    console.error('❌ Advanced indexing failed:', error);
    process.exit(1);
  }
}

// Run advanced indexer
advancedIndexing().catch(console.error);