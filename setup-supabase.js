import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function setupSupabase() {
  console.log('Setting up Supabase database...');
  
  try {
    // Create the schema
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Enable pgvector extension
        CREATE EXTENSION IF NOT EXISTS vector;

        -- Create magma_documents table
        CREATE TABLE IF NOT EXISTS magma_documents (
          id BIGSERIAL PRIMARY KEY,
          content TEXT NOT NULL,
          embedding vector(1536),
          metadata JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS magma_documents_embedding_idx 
          ON magma_documents USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100);

        CREATE INDEX IF NOT EXISTS magma_documents_metadata_idx 
          ON magma_documents USING GIN (metadata);

        CREATE INDEX IF NOT EXISTS magma_documents_category_idx 
          ON magma_documents USING BTREE ((metadata->>'category'));

        -- Create search function
        CREATE OR REPLACE FUNCTION search_magma_documents(
          query_embedding vector(1536),
          similarity_threshold float DEFAULT 0.3,
          match_count int DEFAULT 5
        )
        RETURNS TABLE(
          id bigint,
          content text,
          metadata jsonb,
          similarity float
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN QUERY
          SELECT
            magma_documents.id,
            magma_documents.content,
            magma_documents.metadata,
            1 - (magma_documents.embedding <=> query_embedding) AS similarity
          FROM magma_documents
          WHERE 1 - (magma_documents.embedding <=> query_embedding) > similarity_threshold
          ORDER BY magma_documents.embedding <=> query_embedding
          LIMIT match_count;
        END;
        $$;

        -- Create helper function
        CREATE OR REPLACE FUNCTION create_magma_tables()
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RAISE NOTICE 'MAGMA tables initialized';
        END;
        $$;
      `
    });

    if (error) {
      console.error('Error setting up database:', error);
      throw error;
    }

    console.log('Database setup completed successfully!');
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupSupabase();