-- Advanced MAGMA Handbook Search Schema v2.0
-- Supports hybrid search with BM25 + vector similarity

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For trigram similarity
CREATE EXTENSION IF NOT EXISTS unaccent; -- For text normalization

-- Drop existing tables if upgrading (handle foreign key constraints)
DROP TABLE IF EXISTS magma_search_cache;
DROP TABLE IF EXISTS magma_functions CASCADE;
DROP TABLE IF EXISTS magma_documents_v2 CASCADE;

-- Main documents table with enhanced structure
CREATE TABLE magma_documents_v2 (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  content_clean TEXT NOT NULL, -- Cleaned text for BM25
  embedding vector(1536), -- text-embedding-3-small dimension (Supabase limit)
  metadata JSONB NOT NULL,
  
  -- Enhanced metadata fields for better filtering
  chapter TEXT,
  section TEXT, 
  category VARCHAR(50) NOT NULL,
  has_code BOOLEAN DEFAULT FALSE,
  has_example BOOLEAN DEFAULT FALSE,
  word_count INTEGER,
  
  -- Full-text search support
  content_tsvector tsvector,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dedicated function reference table
CREATE TABLE magma_functions (
  id BIGSERIAL PRIMARY KEY,
  function_name VARCHAR(200) NOT NULL,
  function_signature TEXT,
  description TEXT,
  category TEXT,
  chapter TEXT,
  page_number INTEGER,
  usage_examples TEXT[],
  related_functions TEXT[],
  document_id BIGINT REFERENCES magma_documents_v2(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search result caching table
CREATE TABLE magma_search_cache (
  id BIGSERIAL PRIMARY KEY,
  query_hash VARCHAR(64) NOT NULL,
  query_text TEXT NOT NULL,
  search_type VARCHAR(20) NOT NULL, -- 'vector', 'hybrid', 'function'
  results JSONB NOT NULL,
  result_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- Indexes for performance
CREATE INDEX magma_documents_v2_embedding_idx 
  ON magma_documents_v2 USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200);

CREATE INDEX magma_documents_v2_metadata_idx 
  ON magma_documents_v2 USING GIN (metadata);

CREATE INDEX magma_documents_v2_category_idx 
  ON magma_documents_v2 (category);

CREATE INDEX magma_documents_v2_chapter_idx 
  ON magma_documents_v2 (chapter) WHERE chapter IS NOT NULL;

CREATE INDEX magma_documents_v2_tsvector_idx 
  ON magma_documents_v2 USING GIN (content_tsvector);

CREATE INDEX magma_functions_name_idx 
  ON magma_functions (function_name);

CREATE INDEX magma_functions_name_trgm_idx 
  ON magma_functions USING GIN (function_name gin_trgm_ops);

CREATE INDEX magma_search_cache_hash_idx 
  ON magma_search_cache (query_hash);

CREATE INDEX magma_search_cache_expires_idx 
  ON magma_search_cache (expires_at);

-- Function to update tsvector automatically
CREATE OR REPLACE FUNCTION update_content_tsvector() RETURNS trigger AS $$
BEGIN
  NEW.content_tsvector := to_tsvector('english', NEW.content_clean);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic tsvector updates
CREATE TRIGGER tsvector_update_trigger
  BEFORE INSERT OR UPDATE ON magma_documents_v2
  FOR EACH ROW EXECUTE FUNCTION update_content_tsvector();

-- Advanced hybrid search function
CREATE OR REPLACE FUNCTION search_magma_hybrid(
  query_text TEXT,
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.4,
  bm25_weight FLOAT DEFAULT 0.3,
  vector_weight FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 10,
  category_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  id BIGINT,
  content TEXT,
  metadata JSONB,
  vector_similarity DOUBLE PRECISION,
  bm25_score DOUBLE PRECISION,
  combined_score DOUBLE PRECISION,
  rank INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT 
      d.id,
      d.content,
      d.metadata,
      (1 - (d.embedding <=> query_embedding))::double precision AS vec_sim
    FROM magma_documents_v2 d
    WHERE 
      (category_filter IS NULL OR d.category = category_filter)
      AND 1 - (d.embedding <=> query_embedding) > similarity_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  bm25_search AS (
    SELECT 
      d.id,
      d.content,
      d.metadata,
      ts_rank_cd(d.content_tsvector, plainto_tsquery('english', query_text), 32)::double precision AS bm25_sc
    FROM magma_documents_v2 d
    WHERE 
      (category_filter IS NULL OR d.category = category_filter)
      AND d.content_tsvector @@ plainto_tsquery('english', query_text)
    ORDER BY bm25_sc DESC
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT 
      COALESCE(v.id, b.id) AS id,
      COALESCE(v.content, b.content) AS content,
      COALESCE(v.metadata, b.metadata) AS metadata,
      COALESCE(v.vec_sim, 0) AS vector_similarity,
      COALESCE(b.bm25_sc, 0) AS bm25_score,
      (COALESCE(v.vec_sim, 0) * vector_weight + COALESCE(b.bm25_sc, 0) * bm25_weight) AS combined_score
    FROM vector_search v
    FULL OUTER JOIN bm25_search b ON v.id = b.id
  )
  SELECT 
    c.id,
    c.content,
    c.metadata,
    c.vector_similarity,
    c.bm25_score,
    c.combined_score,
    ROW_NUMBER() OVER (ORDER BY c.combined_score DESC)::INTEGER AS rank
  FROM combined c
  WHERE c.combined_score > 0
  ORDER BY c.combined_score DESC
  LIMIT match_count;
END;
$$;

-- Function search with fuzzy matching
CREATE OR REPLACE FUNCTION search_magma_functions(
  function_query TEXT,
  similarity_threshold FLOAT DEFAULT 0.3,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  id BIGINT,
  function_name VARCHAR(200),
  function_signature TEXT,
  description TEXT,
  similarity_score DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.function_name,
    f.function_signature,
    f.description,
    GREATEST(
      similarity(f.function_name, function_query),
      similarity(f.function_signature, function_query)
    )::double precision AS similarity_score
  FROM magma_functions f
  WHERE 
    GREATEST(
      similarity(f.function_name, function_query),
      similarity(f.function_signature, function_query)
    ) > similarity_threshold
  ORDER BY similarity_score DESC
  LIMIT match_count;
END;
$$;

-- Cache cleanup function
CREATE OR REPLACE FUNCTION cleanup_search_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM magma_search_cache 
  WHERE expires_at < NOW();
END;
$$;

-- Create helper functions for backwards compatibility
CREATE OR REPLACE FUNCTION search_magma_documents(
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.4,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE(
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    (1 - (d.embedding <=> query_embedding))::double precision AS similarity
  FROM magma_documents_v2 d
  WHERE 1 - (d.embedding <=> query_embedding) > similarity_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;