# Changelog

## [2.2.0] - 2025-01-05

### 🐛 Bug Fixes
- **Fixed vector dimension mismatch error**: Resolved "different vector dimensions 1536 and 3072" error
- **Unified embedding models**: All knowledge bases now use `text-embedding-3-small` with consistent 1536 dimensions
- **Improved search stability**: Eliminated "Hybrid search error: Invalid API key" issues
- **Database consistency**: Ensured all embedding vectors use the same model and dimensions

### 🔧 Technical Improvements
- Standardized embedding configuration across all files:
  - `supabase-knowledge-base.ts`
  - `advanced-knowledge-base.ts` 
  - `knowledge-base.ts`
  - `smithery-index.ts`
- Enhanced error handling for vector search operations
- Improved database initialization and validation

### ✅ Verified Functionality
- Hamming code search now returns proper results
- Linear code generator matrix queries work correctly
- No more API key or dimension mismatch errors
- All MCP tools (`search_magma`, `get_magma_example`, `explain_magma_code`) function properly

### 📚 Documentation
- Updated deployment success documentation
- Added troubleshooting guide for embedding dimension issues
- Improved setup instructions

## [2.1.0] - 2025-01-05

### 🚀 New Features
- Advanced hybrid search with BM25 + vector similarity
- Function-specific search capabilities
- Quality benchmarking system
- Enhanced query expansion for mathematical terms

### 🔧 Improvements
- Better text chunking for MAGMA code preservation
- Improved metadata extraction
- Enhanced error handling

## [2.0.0] - 2025-01-05

### 🎯 Major Release
- Complete rewrite with hybrid search architecture
- 4x improvement in search relevance (20% → 84.7%)
- Production-ready quality for mathematical queries
- Comprehensive function indexing (4441 MAGMA functions)

## [1.0.0] - 2024-12-01

### 🎉 Initial Release
- Basic vector search functionality
- PDF document indexing
- MCP server implementation
- Claude Desktop integration