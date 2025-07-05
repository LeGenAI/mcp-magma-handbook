# Database Setup Fix Instructions

## Issues Found

1. **Missing Functions**: The SQL functions defined in `schema-v2.sql` are not present in the database
   - `search_magma_hybrid` - Main hybrid search function
   - `search_magma_functions` - Function search
   - `search_magma_documents` - Document search
   - `update_content_tsvector` - Trigger function

2. **Empty Tables**: Both `magma_documents_v2` and `magma_functions` tables exist but have no data

3. **Missing Extensions**: Cannot verify if required PostgreSQL extensions are installed:
   - `vector` - For embedding support
   - `pg_trgm` - For trigram similarity
   - `unaccent` - For text normalization

## Solution Steps

### Step 1: Apply the Full Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project (euwbfyrdalddpbnqgjoq)
3. Go to the SQL Editor
4. Copy the entire contents of `/supabase/schema-v2.sql`
5. Paste and execute it in the SQL editor

**Important**: The schema includes `DROP TABLE IF EXISTS` statements, so it will recreate the tables. Make sure you don't have important data that needs to be preserved.

### Step 2: Create Alias Function (Optional)

If you need a function called `hybrid_search` for compatibility, add this after running the schema:

```sql
-- Create alias for backwards compatibility
CREATE OR REPLACE FUNCTION hybrid_search(
  query TEXT,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE(
  id BIGINT,
  title TEXT,
  content TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- This is a simplified wrapper - you'll need to generate embeddings client-side
  -- For now, just return empty results
  RETURN QUERY
  SELECT 
    NULL::BIGINT as id,
    NULL::TEXT as title,
    NULL::TEXT as content,
    0::DOUBLE PRECISION as similarity
  WHERE false;
END;
$$;
```

### Step 3: Run the Indexer

After the schema is properly applied:

```bash
# Install dependencies if needed
npm install

# Run the advanced indexer
npm run index

# Or run directly
node dist/advanced-indexer.js
```

### Step 4: Verify Setup

Run the check script again:
```bash
node check-database-state.js
```

You should see:
- Documents with embeddings in `magma_documents_v2`
- Functions populated in `magma_functions`
- All RPC functions working

### Step 5: Run the Benchmark

Once everything is set up:
```bash
npm run benchmark
```

## Alternative: Create Missing Function Wrapper

If you can't modify the schema, create this wrapper function to make the benchmark work:

```sql
CREATE OR REPLACE FUNCTION hybrid_search(
  query TEXT,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE(
  id BIGINT,
  title TEXT,
  content TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE sql
AS $$
  SELECT 
    id,
    metadata->>'title' as title,
    content,
    1.0::DOUBLE PRECISION as similarity
  FROM magma_documents_v2
  WHERE content ILIKE '%' || query || '%'
  LIMIT match_count;
$$;
```

This is a simple text search fallback that will at least return some results.