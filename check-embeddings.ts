#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkEmbeddings() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

  try {
    // 데이터베이스 스키마 확인
    console.log('🔍 Checking database connection...');

    // magma_documents 테이블 확인
    console.log('\n🔍 Checking magma_documents table...');
    const { data: docs, error: docsError } = await supabase
      .from('magma_documents')
      .select('id, content, embedding')
      .limit(1);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      return;
    }

    if (docs && docs.length > 0) {
      console.log('📄 Sample document:', {
        id: docs[0].id,
        content_length: docs[0].content?.length || 0,
        embedding_dimension: docs[0].embedding?.length || 0
      });
    }

    // 총 문서 수 확인
    const { count, error: countError } = await supabase
      .from('magma_documents')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`📊 Total documents: ${count}`);
    }

    // 임베딩 차원 통계
    console.log('\n🔍 Checking embedding dimensions...');
    const { data: embeddingStats, error: statsError } = await supabase
      .rpc('get_embedding_dimensions');

    if (statsError) {
      console.log('No embedding dimension function, checking manually...');
      
      // 수동으로 몇 개 문서의 임베딩 차원 확인
      const { data: sampleDocs, error: sampleError } = await supabase
        .from('magma_documents')
        .select('embedding')
        .limit(5);

      if (!sampleError && sampleDocs) {
        sampleDocs.forEach((doc, idx) => {
          console.log(`Document ${idx + 1} embedding dimension: ${doc.embedding?.length || 0}`);
        });
      }
    } else {
      console.log('Embedding dimension stats:', embeddingStats);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkEmbeddings().catch(console.error);