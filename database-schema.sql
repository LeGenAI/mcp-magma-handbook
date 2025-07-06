-- Enhanced MCP-MAGMA-Handbook Database Schema v3.0
-- This schema supports collections, improved document management, and conversation storage

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Collections table for organizing documents
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enhanced documents table with collection support
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimensions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_collection_id ON documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_documents_content_gin ON documents USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin ON documents USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);

-- Full-text search configuration
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents USING gin(to_tsvector('english', content));

-- Function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at 
    BEFORE UPDATE ON collections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enhanced similarity search function
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_count INT DEFAULT 5,
    filter JSONB DEFAULT '{}'::jsonb,
    collection_filter UUID DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        documents.id,
        documents.content,
        documents.metadata,
        1 - (documents.embedding <=> query_embedding) AS similarity
    FROM documents
    WHERE 
        (collection_filter IS NULL OR documents.collection_id = collection_filter)
        AND (filter = '{}'::jsonb OR documents.metadata @> filter)
    ORDER BY documents.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Hybrid search function (semantic + keyword)
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding VECTOR(1536),
    match_count INT DEFAULT 5,
    collection_filter UUID DEFAULT NULL,
    semantic_weight FLOAT DEFAULT 0.7,
    keyword_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE(
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT,
    keyword_rank FLOAT,
    hybrid_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH semantic_search AS (
        SELECT
            d.id,
            d.content,
            d.metadata,
            1 - (d.embedding <=> query_embedding) AS similarity
        FROM documents d
        WHERE 
            (collection_filter IS NULL OR d.collection_id = collection_filter)
        ORDER BY d.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    keyword_search AS (
        SELECT
            d.id,
            d.content,
            d.metadata,
            ts_rank_cd(to_tsvector('english', d.content), plainto_tsquery('english', query_text)) AS keyword_rank
        FROM documents d
        WHERE 
            (collection_filter IS NULL OR d.collection_id = collection_filter)
            AND to_tsvector('english', d.content) @@ plainto_tsquery('english', query_text)
        ORDER BY keyword_rank DESC
        LIMIT match_count * 2
    )
    SELECT
        COALESCE(s.id, k.id) AS id,
        COALESCE(s.content, k.content) AS content,
        COALESCE(s.metadata, k.metadata) AS metadata,
        COALESCE(s.similarity, 0) AS similarity,
        COALESCE(k.keyword_rank, 0) AS keyword_rank,
        (COALESCE(s.similarity, 0) * semantic_weight + COALESCE(k.keyword_rank, 0) * keyword_weight) AS hybrid_score
    FROM semantic_search s
    FULL OUTER JOIN keyword_search k ON s.id = k.id
    ORDER BY hybrid_score DESC
    LIMIT match_count;
END;
$$;

-- Insert default MAGMA collection if it doesn't exist
INSERT INTO collections (id, name, description, metadata)
VALUES (
    'magma-handbook'::uuid,
    'MAGMA Handbook',
    'Official MAGMA Computational Algebra System documentation and examples',
    '{"source": "official", "type": "documentation", "version": "3.0"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Create additional useful collections
INSERT INTO collections (name, description, metadata)
VALUES 
    ('Personal Notes', 'Personal notes and conversations', '{"type": "personal"}'::jsonb),
    ('Research Papers', 'Academic papers and research materials', '{"type": "research"}'::jsonb),
    ('Code Examples', 'Code snippets and programming examples', '{"type": "code"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Grant necessary permissions (adjust based on your setup)
-- GRANT ALL ON collections TO your_user;
-- GRANT ALL ON documents TO your_user;

-- Performance monitoring view
CREATE OR REPLACE VIEW collection_stats AS
SELECT 
    c.id,
    c.name,
    c.description,
    COUNT(d.id) AS document_count,
    AVG(LENGTH(d.content)) AS avg_content_length,
    MAX(d.created_at) AS last_document_added,
    c.created_at,
    c.updated_at
FROM collections c
LEFT JOIN documents d ON c.id = d.collection_id
GROUP BY c.id, c.name, c.description, c.created_at, c.updated_at
ORDER BY c.created_at DESC;