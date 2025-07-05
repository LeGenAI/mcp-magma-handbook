# Database Setup Issues and Solutions

## Current Status

After checking your Supabase database, I found the following issues:

### 1. **Tables Exist But Are Empty**
- ✅ `magma_documents_v2` table exists
- ✅ `magma_functions` table exists  
- ❌ Both tables have 0 records

### 2. **SQL Functions Are Missing**
- ❌ `search_magma_hybrid` - Main hybrid search function (NOT FOUND)
- ❌ `search_magma_functions` - Function search (NOT FOUND)
- ❌ `search_magma_documents` - Document search (NOT FOUND)
- ❌ `update_content_tsvector` - Trigger function (NOT FOUND)
- ✅ `cleanup_search_cache` - Only this function exists

### 3. **No Documents Have Embeddings**
- The benchmark is getting 0 results because:
  1. No documents are indexed
  2. The search functions don't exist

## Root Cause

The `schema-v2.sql` file was only partially applied. It seems only the table definitions were created, but the functions, triggers, and indexes were not created.

## Solution

### Option 1: Complete Schema Setup (Recommended)

1. **Apply the complete schema via Supabase Dashboard:**
   ```bash
   # Go to: https://supabase.com/dashboard/project/euwbfyrdalddpbnqgjoq
   # Navigate to: SQL Editor
   # Copy and paste the entire contents of: supabase/schema-v2.sql
   # Execute the SQL
   ```

2. **Run the advanced indexer to populate data:**
   ```bash
   npm run index-advanced
   ```

3. **Verify the setup:**
   ```bash
   node check-database-state.js
   ```

4. **Run the benchmark:**
   ```bash
   npm run benchmark
   ```

### Option 2: Quick Fix for Testing

If you just want to test that the connection works, create a simple wrapper:

```sql
-- Run this in Supabase SQL Editor
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
    COALESCE(metadata->>'title', 'Document ' || id) as title,
    content,
    1.0::DOUBLE PRECISION as similarity
  FROM magma_documents_v2
  WHERE content ILIKE '%' || query || '%'
  LIMIT match_count;
$$;
```

## Commands Summary

```bash
# 1. Build the project
npm run build

# 2. Index the handbook (after schema is fixed)
npm run index-advanced

# 3. Check database state
node check-database-state.js

# 4. Run quality benchmark
npm run benchmark
```

## Expected Results After Fix

When everything is working correctly, you should see:

1. **check-database-state.js output:**
   - Total documents: > 0
   - Total functions: > 0
   - hybrid_search function works
   - Documents have embeddings

2. **Benchmark results:**
   - Average Relevance Score: > 70%
   - Results per query: > 0
   - No errors calling hybrid_search

The main issue is that the SQL functions defined in `schema-v2.sql` need to be executed in your Supabase database. Once that's done and documents are indexed, the benchmark should work correctly.