-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create magma_documents table
CREATE TABLE IF NOT EXISTS magma_documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embedding dimension
  metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
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

-- Create function to initialize tables (called from code)
CREATE OR REPLACE FUNCTION create_magma_tables()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Tables are created above, this is just for consistency
  RAISE NOTICE 'MAGMA tables already exist or have been created';
END;
$$;