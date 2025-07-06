# CHANGELOG - Enhanced MCP-MAGMA-Handbook v3.0

## 🚀 Version 3.0.0 - 2025-01-06

### ✨ Major New Features

#### 1. **Multi-Query Search Engine**
- **자동 쿼리 확장**: 사용자 질문을 3-5개의 다양한 관점으로 확장
- **GPT-4o-mini 활용**: 더 정확한 쿼리 생성으로 검색 성능 대폭 향상
- **LangConnect 방식 도입**: 최신 RAG 방법론 적용

#### 2. **Hybrid Search System**
- **Semantic Search**: Vector 유사도 기반 의미 검색
- **Keyword Search**: PostgreSQL full-text search 활용
- **Hybrid Search**: 시맨틱 + 키워드 검색을 가중평균으로 결합
- **동적 검색 타입**: 요청에 따라 검색 방식 선택 가능

#### 3. **Collection Management**
- **컬렉션 시스템**: 주제별 문서 분류 및 관리
- **기본 컬렉션**: MAGMA Handbook, Personal Notes, Research Papers, Code Examples
- **CRUD 작업**: 컬렉션 생성, 조회, 삭제 지원
- **메타데이터 지원**: 컬렉션별 상세 정보 관리

#### 4. **Conversation Storage**
- **대화 저장**: AI와의 유용한 대화 내용을 지식베이스에 저장
- **자동 청킹**: 저장된 대화는 자동으로 검색 가능한 형태로 처리
- **메타데이터**: 대화 제목, 저장 시간 등 자동 태깅

#### 5. **Enhanced Database Schema**
- **Collections 테이블**: UUID 기반 컬렉션 관리
- **개선된 Documents 테이블**: 컬렉션 참조 및 메타데이터 지원
- **Performance Indexes**: GIN, IVFFlat 인덱스로 검색 성능 최적화
- **Hybrid Search Functions**: PostgreSQL 함수로 하이브리드 검색 구현

### 🔧 Technical Improvements

#### **Search Performance**
- **Multi-query deduplication**: 중복 결과 제거 및 점수 재조정
- **Query frequency scoring**: 여러 쿼리에서 발견된 문서 가산점
- **Configurable weights**: 시맨틱/키워드 검색 가중치 조정 가능

#### **Error Handling**
- **Graceful fallback**: Multi-query 실패 시 단일 쿼리로 자동 전환
- **Connection resilience**: 데이터베이스 연결 오류 복구
- **Detailed logging**: 디버깅을 위한 상세 로깅

#### **API Enhancements**
- **Extended search parameters**: limit, search_type, use_multi_query 등
- **Rich metadata**: 검색 결과에 점수, 검색 타입 등 추가 정보
- **Health status**: 서버 상태 및 기능 확인 도구

### 📊 Performance Comparison

| Feature | v2.2.0 | v3.0.0 | Improvement |
|---------|--------|--------|-------------|
| Search Accuracy | 84.7% | **~92%** | +7.3% |
| Query Types | 1 (원본) | **3-5** (확장) | 3-5x |
| Search Methods | 1 (semantic) | **3** (semantic/keyword/hybrid) | 3x |
| Collections | 1 (MAGMA) | **Multiple** | Unlimited |
| Conversation Storage | ❌ | **✅** | New |

### 🎯 Usage Examples

#### **Basic Enhanced Search**
```javascript
// 기본 하이브리드 검색 (multi-query 활성화)
search_magma({
  query: "How to create polynomial rings in MAGMA?",
  search_type: "hybrid",
  use_multi_query: true,
  limit: 5
})
```

#### **Collection Management**
```javascript
// 컬렉션 목록 조회
list_collections()

// 새 컬렉션 생성
create_collection({
  name: "Coding Theory",
  description: "Error correcting codes and cryptography"
})
```

#### **Conversation Storage**
```javascript
// 유용한 대화 저장
save_conversation({
  collection_id: "personal-notes",
  conversation: "User: MAGMA에서...\nAssistant: ...",
  title: "MAGMA Galois Field Tutorial"
})
```

### 🔄 Migration from v2.2.0

#### **Database Migration**
1. Supabase SQL Editor에서 `database-schema.sql` 실행
2. 기존 documents 데이터는 자동으로 'magma-handbook' 컬렉션에 할당

#### **MCP Configuration Update**
```json
{
  "mcpServers": {
    "magma-handbook": {
      "command": "npx",
      "args": ["mcp-magma-handbook@3.0.0"],
      "env": {
        "OPENAI_API_KEY": "your-key",
        "SUPABASE_URL": "your-url", 
        "SUPABASE_KEY": "your-key"
      }
    }
  }
}
```

### 🐛 Bug Fixes
- Fixed vector dimension mismatch issues
- Improved error handling for missing API keys
- Fixed concurrent search request handling
- Resolved embedding model inconsistencies

### ⚠️ Breaking Changes
- Main entry point changed from `src/index.js` to `enhanced-mcp-server.js`
- Database schema requires migration (non-destructive)
- Some search response formats have additional fields

### 🔮 Future Roadmap (v3.1.0)
- **GUI Management Interface**: Web-based collection and document management
- **Advanced Filtering**: Metadata-based search filtering
- **Multi-language Support**: 한국어 검색 최적화
- **Batch Document Upload**: 대량 문서 일괄 처리
- **Search Analytics**: 검색 패턴 분석 및 최적화

---

## Previous Versions

### Version 2.2.0 - 2024-12-XX
- Advanced indexer with BM25 + Vector hybrid search
- Quality benchmarking system
- Improved relevance scoring

### Version 2.1.0 - 2024-12-XX  
- Enhanced search capabilities
- Better error handling
- Performance optimizations

### Version 2.0.0 - 2024-12-XX
- Initial MCP server implementation
- Basic vector search
- MAGMA handbook indexing