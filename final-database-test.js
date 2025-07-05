// Polyfill fetch for Node.js
import fetch, { Headers, Request, Response } from 'node-fetch';
global.fetch = fetch;
global.Headers = Headers;
global.Request = Request;
global.Response = Response;

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('🔍 Final Database Test for MCP MAGMA Handbook');
console.log('=' .repeat(50));

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFinalTest() {
  try {
    console.log('\n📊 1. Database Connection Test');
    const { data: connectionTest, error: connError } = await supabase
      .from('magma_documents_v2')
      .select('count')
      .limit(1);
    
    if (connError) {
      console.log('❌ Connection failed:', connError.message);
      return;
    }
    console.log('✅ Database connection successful');

    console.log('\n📋 2. Table Status Check');
    const { count: docCount } = await supabase
      .from('magma_documents_v2')
      .select('*', { count: 'exact', head: true });
    
    const { count: funcCount } = await supabase
      .from('magma_functions')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   📄 Documents: ${docCount || 0}`);
    console.log(`   ⚙️  Functions: ${funcCount || 0}`);

    console.log('\n🔧 3. Required Functions Check');
    const requiredFunctions = [
      'search_magma_hybrid',
      'search_magma_functions',
      'search_magma_documents',
      'update_content_tsvector',
      'cleanup_search_cache'
    ];

    let functionsExist = 0;
    for (const funcName of requiredFunctions) {
      try {
        const { error } = await supabase.rpc(funcName, {});
        if (error && !error.message.includes('Could not find the function')) {
          console.log(`   ✅ ${funcName} exists`);
          functionsExist++;
        } else {
          console.log(`   ❌ ${funcName} missing`);
        }
      } catch (e) {
        console.log(`   ❌ ${funcName} error: ${e.message.substring(0, 50)}...`);
      }
    }

    console.log('\n📝 4. Schema Status Summary');
    const schemaComplete = functionsExist === requiredFunctions.length;
    const dataExists = (docCount || 0) > 0;

    console.log(`   Schema Complete: ${schemaComplete ? '✅' : '❌'} (${functionsExist}/${requiredFunctions.length} functions)`);
    console.log(`   Data Indexed: ${dataExists ? '✅' : '❌'} (${docCount || 0} documents)`);

    console.log('\n🎯 5. Next Steps');
    if (!schemaComplete) {
      console.log('   1. Apply schema-v2.sql in Supabase Dashboard SQL Editor');
      console.log('   2. Ensure all PostgreSQL extensions are enabled (vector, pg_trgm, unaccent)');
    }
    
    if (!dataExists) {
      console.log('   3. Run: npm run index-advanced');
      console.log('   4. Wait for indexing to complete');
    }
    
    if (schemaComplete && dataExists) {
      console.log('   🎉 Ready to run benchmark: npm run benchmark');
    }

    console.log('\n📋 6. File Status');
    console.log(`   📄 PDF exists: ${fs.existsSync('/Users/baegjaehyeon/mcp-magma-handbook/data/pdfs/Handbook.pdf') ? '✅' : '❌'}`);
    console.log(`   📄 Schema file: ${fs.existsSync('/Users/baegjaehyeon/mcp-magma-handbook/supabase/schema-v2.sql') ? '✅' : '❌'}`);

    console.log('\n🔧 7. Commands to Run');
    console.log('   Build: npm run build');
    console.log('   Index: npm run index-advanced');
    console.log('   Test: node final-database-test.js');
    console.log('   Benchmark: npm run benchmark');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runFinalTest().then(() => {
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Final test completed!');
}).catch(err => {
  console.error('❌ Test error:', err);
});