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

console.log('Checking Supabase database state...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseState() {
  try {
    console.log('\n1. Checking magma_documents_v2 table...');
    const { data: documents, error: docError, count: docCount } = await supabase
      .from('magma_documents_v2')
      .select('*', { count: 'exact', head: false })
      .limit(5);
    
    if (docError) {
      console.log('❌ Error querying magma_documents_v2:', docError.message);
    } else {
      console.log('✅ magma_documents_v2 table exists');
      console.log(`   Total documents: ${docCount || documents.length}`);
      if (documents && documents.length > 0) {
        console.log('   Sample document:', {
          id: documents[0].id,
          title: documents[0].title,
          content_preview: documents[0].content?.substring(0, 100) + '...'
        });
      }
    }

    console.log('\n2. Checking magma_functions table...');
    const { data: functions, error: funcError, count: funcCount } = await supabase
      .from('magma_functions')
      .select('*', { count: 'exact', head: false })
      .limit(5);
    
    if (funcError) {
      console.log('❌ Error querying magma_functions:', funcError.message);
    } else {
      console.log('✅ magma_functions table exists');
      console.log(`   Total functions: ${funcCount || functions.length}`);
      if (functions && functions.length > 0) {
        console.log('   Sample function:', {
          id: functions[0].id,
          name: functions[0].name,
          description_preview: functions[0].description?.substring(0, 100) + '...'
        });
      }
    }

    console.log('\n3. Testing hybrid search function...');
    // First, let's check if the function exists
    const { data: searchResult, error: searchError } = await supabase
      .rpc('hybrid_search', {
        query: 'introduction',
        match_count: 5
      });
    
    if (searchError) {
      console.log('❌ Error calling hybrid_search:', searchError.message);
      console.log('   Full error:', searchError);
    } else {
      console.log('✅ hybrid_search function exists and works');
      console.log(`   Results found: ${searchResult?.length || 0}`);
      if (searchResult && searchResult.length > 0) {
        console.log('   First result:', {
          id: searchResult[0].id,
          title: searchResult[0].title,
          similarity: searchResult[0].similarity,
          content_preview: searchResult[0].content?.substring(0, 100) + '...'
        });
      }
    }

    console.log('\n4. Testing with different search queries...');
    const testQueries = ['handbook', 'function', 'documentation', 'api', 'getting started'];
    
    for (const query of testQueries) {
      const { data, error } = await supabase
        .rpc('hybrid_search', {
          query: query,
          match_count: 3
        });
      
      if (error) {
        console.log(`   ❌ "${query}": Error - ${error.message}`);
      } else {
        console.log(`   ✅ "${query}": Found ${data?.length || 0} results`);
      }
    }

    console.log('\n5. Checking embeddings...');
    const { data: embeddingCheck, error: embError } = await supabase
      .from('magma_documents_v2')
      .select('id, title, embedding')
      .not('embedding', 'is', null)
      .limit(5);
    
    if (embError) {
      console.log('❌ Error checking embeddings:', embError.message);
    } else {
      const withEmbeddings = embeddingCheck?.filter(doc => doc.embedding !== null).length || 0;
      console.log(`✅ Documents with embeddings: ${withEmbeddings}`);
      if (withEmbeddings === 0) {
        console.log('   ⚠️  No documents have embeddings! This is why search returns no results.');
      }
    }

    console.log('\n6. Checking if tables need initialization...');
    if (docCount === 0 || funcCount === 0) {
      console.log('⚠️  Tables are empty. You need to run the indexer to populate them.');
      console.log('   Run: npm run index');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkDatabaseState().then(() => {
  console.log('\n✅ Database check complete!');
}).catch(err => {
  console.error('\n❌ Database check failed:', err);
});