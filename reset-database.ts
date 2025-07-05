#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function resetDatabase() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

  console.log('🗑️ Resetting database tables...');

  try {
    // 기존 데이터 삭제 (테이블 구조는 유지)
    console.log('Clearing existing data...');
    
    const { error: clearError } = await supabase
      .from('magma_documents')
      .delete()
      .neq('id', 0); // 모든 레코드 삭제
    
    if (clearError) {
      console.log('Clear error (expected if table doesn\'t exist):', clearError);
    }

    const { error: clearAdvancedError } = await supabase
      .from('magma_documents_advanced')
      .delete()
      .neq('id', 0); // 모든 레코드 삭제
    
    if (clearAdvancedError) {
      console.log('Clear advanced error (expected if table doesn\'t exist):', clearAdvancedError);
    }

    console.log('✅ Database cleared successfully!');
    console.log('🔄 Now run: npm run index-advanced');

  } catch (error) {
    console.error('❌ Reset error:', error);
  }
}

resetDatabase().catch(console.error);