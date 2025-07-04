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

console.log('Testing Supabase connection with fetch polyfill...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n1. Testing table query...');
    const { data, error } = await supabase
      .from('magma_documents')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('Table error:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('✅ Connection works! Table just needs to be created.');
        return true;
      }
    } else {
      console.log('✅ Connection successful!', data);
      return true;
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Supabase connection is working!');
  } else {
    console.log('\n💥 Connection still failing.');
  }
});