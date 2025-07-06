# 🚀 Enhanced MCP-MAGMA-Handbook v3.0 설정 가이드

**LangConnect 방법론 기반 차세대 MAGMA MCP 서버 완벽 설정법**

## 🎯 설정 개요

v3.0은 기존 v2.x와 완전히 다른 아키텍처를 사용합니다:
- **Multi-query 검색 엔진** (GPT-4o-mini 활용)
- **Hybrid 검색 시스템** (Vector + Keyword)
- **Collection 관리** (주제별 분류)
- **Conversation 저장** (대화 내용 축적)

## 📋 사전 준비사항

### 1. **시스템 요구사항**
- Node.js ≥ 18.0.0
- npm 또는 yarn
- Supabase 계정
- OpenAI API 키

### 2. **필수 계정 설정**

#### **Supabase 설정**
1. [supabase.com](https://supabase.com) 접속
2. 새 프로젝트 생성
3. **Project URL**과 **anon public key** 기록
4. SQL Editor에서 데이터베이스 스키마 설정 (아래 참조)

#### **OpenAI API 키**
1. [platform.openai.com](https://platform.openai.com) 접속
2. API Keys 섹션에서 새 키 생성
3. `sk-proj-...` 형태의 키 저장

## 🗄️ 데이터베이스 설정

### **Step 1: Supabase Extensions 활성화**
Supabase 대시보드 → SQL Editor → 새 쿼리:

```sql
-- 필수 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### **Step 2: 스키마 생성**
프로젝트의 `database-schema.sql` 파일 내용을 Supabase SQL Editor에 복사하여 실행:

```bash
# 로컬에서 파일 확인
cat database-schema.sql
```

### **Step 3: 스키마 검증**
```sql
-- 테이블 생성 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('collections', 'documents');

-- 함수 생성 확인  
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('match_documents', 'hybrid_search');
```

## 📦 패키지 설치 및 설정

### **Method 1: Global 설치 (권장)**
```bash
# 전역 설치
npm install -g mcp-magma-handbook@3.0.0

# 설치 확인
mcp-magma-handbook --version
```

### **Method 2: 프로젝트 클론**
```bash
# 저장소 클론
git clone https://github.com/LeGenAI/mcp-magma-handbook.git
cd mcp-magma-handbook

# 의존성 설치
npm install

# 빌드
npm run build
```

## 🔧 환경 변수 설정

### **Option 1: .env 파일 생성**
```bash
# 프로젝트 루트에 .env 파일 생성
cat > .env << EOF
# Required
OPENAI_API_KEY=sk-proj-your-actual-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-public-key-here

# Optional (기본값 사용 권장)
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
CHAT_MODEL=gpt-4o-mini
EOF
```

### **Option 2: Claude Desktop 설정에서 직접**
환경 변수를 Claude Desktop 설정에서 직접 지정 (아래 참조)

## 🖥️ Claude Desktop 통합

### **Step 1: Claude Desktop MCP 설정**

**macOS 경로**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows 경로**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "enhanced-magma-handbook": {
      "command": "npx",
      "args": ["mcp-magma-handbook@3.0.0"],
      "env": {
        "OPENAI_API_KEY": "sk-proj-your-actual-key-here",
        "SUPABASE_URL": "https://your-project-id.supabase.co",
        "SUPABASE_KEY": "your-anon-public-key-here"
      }
    }
  }
}
```

### **Step 2: Claude Desktop 재시작**
- Claude Desktop 완전 종료
- 다시 실행
- 새 대화에서 MCP 도구 확인

## 📚 문서 인덱싱

### **MAGMA Handbook 준비**
1. MAGMA 공식 문서 PDF 다운로드
2. `data/pdfs/` 폴더에 저장
3. 파일명: `Handbook.pdf` (권장)

### **인덱싱 실행**
```bash
# 고급 인덱서 사용 (권장)
npm run index-advanced

# 기본 인덱서 사용
npm run index

# 인덱싱 진행 상황 모니터링
tail -f indexing.log
```

### **인덱싱 검증**
```sql
-- Supabase에서 문서 수 확인
SELECT 
  c.name,
  COUNT(d.id) as document_count,
  AVG(LENGTH(d.content)) as avg_content_length
FROM collections c 
LEFT JOIN documents d ON c.id = d.collection_id 
GROUP BY c.id, c.name;
```

## 🧪 설정 테스트

### **Step 1: 서버 단독 테스트**
```bash
# 개발 모드로 서버 실행
npm run dev

# 다른 터미널에서 테스트 실행
npx tsx test-enhanced-mcp-complete.ts
```

### **Step 2: Claude Desktop 테스트**
Claude Desktop에서 다음 명령어들을 테스트:

```
1. 도구 목록 확인
사용 가능한 MCP 도구를 보여주세요.

2. 상태 확인  
get_health_status 도구를 사용해서 서버 상태를 확인해주세요.

3. 컬렉션 조회
list_collections 도구로 사용 가능한 컬렉션을 보여주세요.

4. 검색 테스트
search_magma 도구를 사용해서 "polynomial ring" 을 검색해주세요.
```

## 🔧 고급 설정

### **Multi-Query 설정 최적화**
```typescript
// enhanced-mcp-server.ts에서 수정 가능
const multiQueryConfig = {
  maxQueries: 5,        // 최대 쿼리 수
  temperature: 0,       // GPT 창의성 (0 = 정확도 우선)
  fallbackEnabled: true // multi-query 실패 시 단일 쿼리로 전환
};
```

### **Hybrid Search 가중치 조정**
```typescript
// 검색 방식별 가중치 (합계 = 1.0)
const searchWeights = {
  semantic: 0.7,    // 의미 검색 70%
  keyword: 0.3      // 키워드 검색 30%
};
```

### **Performance Tuning**
```sql
-- Supabase에서 인덱스 최적화
REINDEX INDEX idx_documents_embedding;
VACUUM ANALYZE documents;

-- 벡터 검색 최적화 (lists 값 조정)
DROP INDEX IF EXISTS idx_documents_embedding;
CREATE INDEX idx_documents_embedding ON documents 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);  -- 문서 수에 따라 조정
```

## 🚨 문제 해결

### **일반적인 문제들**

#### **1. OpenAI API 키 오류**
```
Error: The OPENAI_API_KEY environment variable is missing
```
**해결**: 
- API 키 형식 확인 (`sk-proj-` 시작)
- 환경 변수 설정 재확인
- Claude Desktop 재시작

#### **2. Supabase 연결 오류**
```
Error: Invalid Supabase URL or Key
```
**해결**:
- Project URL 형식: `https://project-id.supabase.co`
- anon public key 사용 (service_role 아님)
- Supabase 프로젝트 활성화 상태 확인

#### **3. Vector 검색 실패**
```
Error: relation "documents" does not exist
```
**해결**:
- `database-schema.sql` 재실행
- Extensions 설치 확인
- 테이블 권한 확인

#### **4. Multi-query 실패**
```
Error: Failed to generate queries
```
**해결**:
- OpenAI API 크레딧 확인
- 네트워크 연결 확인
- Fallback 모드로 자동 전환됨

### **디버깅 도구**

#### **로그 레벨 설정**
```bash
# 상세 로그 활성화
DEBUG=* npm run dev
```

#### **데이터베이스 상태 확인**
```sql
-- 컬렉션 통계
SELECT * FROM collection_stats;

-- 최근 검색 성능
EXPLAIN ANALYZE 
SELECT * FROM match_documents(
  array_to_vector(array_fill(0, array[1536])), 
  5
);
```

## 📊 성능 모니터링

### **검색 성능 벤치마크**
```bash
# 품질 벤치마크 실행
npm run test-quality

# 결과 예시:
# Average Relevance Score: 92.3%
# Multi-query Improvement: +7.8%
# Hybrid Search Accuracy: 94.1%
```

### **시스템 리소스 모니터링**
```bash
# 메모리 사용량
ps aux | grep node

# 네트워크 사용량  
netstat -i

# 디스크 I/O
iostat -x 1
```

## 🔄 업그레이드 가이드

### **v2.x → v3.0 마이그레이션**

#### **1. 백업 생성**
```sql
-- 기존 documents 테이블 백업
CREATE TABLE documents_backup AS SELECT * FROM documents;
```

#### **2. 스키마 업그레이드**
```bash
# 새 스키마 적용
psql -f database-schema.sql
```

#### **3. 설정 파일 업데이트**
```bash
# 기존 설정 백업
cp ~/.config/claude/claude_desktop_config.json claude_config_backup.json

# 새 설정 적용
# (위의 Claude Desktop 설정 참조)
```

#### **4. 호환성 확인**
```bash
# 테스트 실행으로 모든 기능 검증
npm run test-quality
```

## ✅ 설정 완료 체크리스트

- [ ] Node.js ≥ 18.0.0 설치됨
- [ ] Supabase 프로젝트 생성 및 설정됨
- [ ] OpenAI API 키 발급됨
- [ ] `database-schema.sql` 실행됨
- [ ] 패키지 설치됨 (`npm install -g mcp-magma-handbook@3.0.0`)
- [ ] 환경 변수 설정됨
- [ ] Claude Desktop 설정 업데이트됨
- [ ] MAGMA 문서 인덱싱 완료됨
- [ ] 테스트 통과됨
- [ ] 기본 검색 동작 확인됨

## 📞 추가 지원

설정 중 문제가 발생하면:

1. **GitHub Issues**: [문제 신고](https://github.com/LeGenAI/mcp-magma-handbook/issues)
2. **이메일**: baegjaehyeon@gmail.com  
3. **문서**: [상세 가이드](https://github.com/LeGenAI/mcp-magma-handbook/blob/main/README-v3.md)

---

**🎉 설정 완료! 이제 Enhanced MCP v3.0의 강력한 기능들을 마음껏 활용하세요!** 🚀