// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { SupabaseMagmaKnowledgeBase } from './supabase-knowledge-base.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function indexHandbook() {
  console.log('Starting MAGMA Handbook indexing...');
  
  const kb = new SupabaseMagmaKnowledgeBase();
  await kb.initialize();
  
  // PDF 디렉토리 확인
  const pdfDir = path.join(__dirname, '..', 'data', 'pdfs');
  
  try {
    const files = await fs.readdir(pdfDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.error('No PDF files found in data/pdfs/');
      console.error('Please place MAGMA_HANDBOOK.pdf in the data/pdfs/ directory');
      process.exit(1);
    }
    
    // 모든 PDF 파일 인덱싱
    for (const pdfFile of pdfFiles) {
      const pdfPath = path.join(pdfDir, pdfFile);
      console.log(`Indexing: ${pdfFile}`);
      await kb.indexPDF(pdfPath);
    }
    
    console.log('Indexing complete!');
    
    // 테스트 검색
    console.log('\nTesting search functionality...');
    const testResults = await kb.search('elliptic curve', 3);
    console.log(`Found ${testResults.length} results for "elliptic curve"`);
    
  } catch (error) {
    console.error('Error during indexing:', error);
    process.exit(1);
  }
}

// Run indexer
indexHandbook().catch(console.error);