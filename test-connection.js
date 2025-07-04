import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey?.length);

const supabase = createClient(supabaseUrl, supabaseKey);

// Test basic connection
async function testConnection() {
  try {
    console.log('\n1. Testing basic connection...');
    const { data, error } = await supabase.auth.getSession();
    console.log('Auth test result:', { error: error?.message, hasData: !!data });

    console.log('\n2. Testing database access...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('pg_tables')
      .select('tablename');
    
    if (tablesError) {
      console.log('RPC error (expected):', tablesError.message);
    } else {
      console.log('RPC success:', tables);
    }

    console.log('\n3. Testing simple query...');
    const { data: version, error: versionError } = await supabase
      .rpc('version');
    
    if (versionError) {
      console.log('Version error:', versionError.message);
    } else {
      console.log('Version success:', version);
    }

  } catch (error) {
    console.error('Connection test failed:', error);
  }
}

testConnection();