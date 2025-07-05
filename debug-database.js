// Polyfill fetch for Node.js
import fetch, { Headers, Request, Response } from 'node-fetch';
global.fetch = fetch;
global.Headers = Headers;
global.Request = Request;
global.Response = Response;

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Debugging Supabase database issues...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
  try {
    console.log('\n1. Checking table structure of magma_documents_v2...');
    // Try to get columns info
    const { data: tableInfo, error: tableError } = await supabase
      .from('magma_documents_v2')
      .select()
      .limit(0); // Just get structure, no data
    
    if (tableError) {
      console.log('Error accessing table:', tableError.message);
    } else {
      console.log('Table exists and is accessible');
    }

    console.log('\n2. Checking if functions exist in database...');
    // List all functions
    const functionsToCheck = [
      'search_magma_hybrid',
      'search_magma_functions', 
      'search_magma_documents',
      'update_content_tsvector',
      'cleanup_search_cache',
      'hybrid_search' // The one benchmark is looking for
    ];

    for (const funcName of functionsToCheck) {
      try {
        // Try to call with minimal params to see if it exists
        const { error } = await supabase.rpc(funcName, {});
        if (error) {
          if (error.message.includes('Could not find the function')) {
            console.log(`❌ Function '${funcName}' does not exist`);
          } else {
            console.log(`✅ Function '${funcName}' exists (error: ${error.message})`);
          }
        } else {
          console.log(`✅ Function '${funcName}' exists and returned data`);
        }
      } catch (e) {
        console.log(`❌ Function '${funcName}' check failed:`, e.message);
      }
    }

    console.log('\n3. Checking if schema needs to be applied...');
    const { data: extensions, error: extError } = await supabase
      .rpc('pg_extension', {})
      .select('extname')
      .in('extname', ['vector', 'pg_trgm', 'unaccent']);
    
    if (extError) {
      console.log('Cannot check extensions:', extError.message);
    } else {
      console.log('Installed extensions:', extensions);
    }

    console.log('\n4. Creating a simple test function to verify RPC works...');
    // This won't work without direct SQL access, but we can test if other functions work

    console.log('\n5. Recommendations:');
    console.log('- The schema-v2.sql file needs to be applied to the database');
    console.log('- Run the schema through Supabase Dashboard SQL editor');
    console.log('- After schema is applied, run the indexer to populate documents');
    console.log('- The benchmark is looking for "hybrid_search" but schema has "search_magma_hybrid"');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

debugDatabase().then(() => {
  console.log('\n✅ Debug complete!');
});