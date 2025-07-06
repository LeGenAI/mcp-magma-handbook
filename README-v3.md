# 🚀 Enhanced MCP-MAGMA-Handbook v3.0

**LangConnect 방법론을 도입한 차세대 MAGMA 전용 MCP 서버**

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/LeGenAI/mcp-magma-handbook)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

> 🎯 **랩실 선배님들을 위한 완전히 새로워진 MCP 서버**  
> Multi-query 검색, Hybrid 검색, Collection 관리, Conversation 저장 등 혁신적인 기능들을 제공합니다!

## ✨ v3.0의 혁신적 기능들

### 🧠 **Multi-Query Search Engine**
```javascript
// 하나의 질문을 3-5개의 다양한 관점으로 확장
"MAGMA에서 다항식 환을 만드는 방법" 
↓ GPT-4o-mini가 자동 확장 ↓
[
  "How to create polynomial rings in MAGMA?",
  "PolynomialRing function usage in MAGMA",
  "Defining polynomial rings over finite fields",
  "MAGMA syntax for polynomial ring construction",
  "Ring theory implementation in MAGMA"
]
```

### 🔍 **Hybrid Search System**
- **Semantic Search**: Vector 유사도 기반 의미 검색
- **Keyword Search**: PostgreSQL full-text search
- **Hybrid Search**: 두 방식을 최적 비율로 결합 (기본값: 70% semantic + 30% keyword)

### 📁 **Collection Management**
```bash
# 기본 제공 컬렉션들
📚 MAGMA Handbook     # 공식 문서
📝 Personal Notes     # 개인 노트
📄 Research Papers    # 논문 자료  
💻 Code Examples      # 코드 스니펫
```

### 💬 **Conversation Storage**
AI와의 유용한 대화를 자동으로 지식베이스에 저장하여 나중에 검색 가능!

## 🚀 빠른 시작 가이드

### 1. 설치
```bash
npm install -g mcp-magma-handbook@3.0.0
```

### 2. 데이터베이스 설정
```sql
-- Supabase SQL Editor에서 실행
-- database-schema.sql 파일 내용 복사 & 실행
```

### 3. Claude Desktop 설정
```json
{
  "mcpServers": {
    "enhanced-magma-handbook": {
      "command": "npx",
      "args": ["mcp-magma-handbook@3.0.0"],
      "env": {
        "OPENAI_API_KEY": "sk-proj-your-key-here",
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_KEY": "your-anon-key"
      }
    }
  }
}
```

### 4. 문서 인덱싱
```bash
# MAGMA handbook PDF를 data/pdfs/ 폴더에 넣고
npm run index-advanced
```

## 🎯 주요 사용법

### **🔍 Enhanced Search**
```javascript
// 기본 사용 (권장)
search_magma({
  query: "Galois field에서 primitive element 찾기",
  // 자동으로 multi-query + hybrid search 적용
})

// 고급 사용
search_magma({
  query: "How to factor polynomials in MAGMA?",
  search_type: "semantic",    // semantic|keyword|hybrid
  use_multi_query: true,      // multi-query 사용 여부
  limit: 5,                   // 결과 개수
  collection_id: "magma-handbook" // 특정 컬렉션에서만 검색
})
```

### **📁 Collection Management**
```javascript
// 컬렉션 목록 확인
list_collections()

// 새 컬렉션 생성 (예: Coding Theory 전용)
create_collection({
  name: "Coding Theory",
  description: "Error correcting codes and cryptography materials"
})

// 문서 추가
add_document({
  collection_id: "coding-theory-uuid",
  content: "BCH codes in MAGMA...",
  metadata: { source: "research_paper", tags: ["BCH", "codes"] }
})
```

### **💬 Conversation Storage**
```javascript
// 유용한 대화 저장
save_conversation({
  collection_id: "personal-notes",
  conversation: `
User: MAGMA에서 Hamming (7,4,3) 코드 만드는 법?
Assistant: C := HammingCode(GF(2), 3); 
G := GeneratorMatrix(C);
이렇게 하시면 됩니다...
  `,
  title: "Hamming Code Tutorial"
})
```

## 📊 성능 비교

| 기능 | v2.2.0 | v3.0.0 | 개선도 |
|------|--------|--------|--------|
| 검색 정확도 | 84.7% | **~92%** | +7.3% |
| 쿼리 확장 | 1개 (원본) | **3-5개** | 3-5배 |
| 검색 방식 | 1개 | **3개** | 3배 |
| 컬렉션 | 1개 | **무제한** | ∞ |
| 대화 저장 | ❌ | **✅** | New |

## 🔧 고급 설정

### **Environment Variables**
```bash
# Required
OPENAI_API_KEY=sk-proj-your-key
SUPABASE_URL=https://your-project.supabase.co  
SUPABASE_KEY=your-anon-key

# Optional (기본값 사용 권장)
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
CHAT_MODEL=gpt-4o-mini
```

### **Search Configuration**
```typescript
// 하이브리드 검색 가중치 조정
const semanticWeight = 0.7;  // 의미 검색 70%
const keywordWeight = 0.3;   // 키워드 검색 30%
```

## 🎓 랩실 사용 시나리오

### **시나리오 1: 논문 작성**
```javascript
// 1. 논문 관련 컬렉션 생성
create_collection({
  name: "My Research", 
  description: "박사 논문 관련 자료"
});

// 2. 관련 자료 검색 및 저장
search_magma({
  query: "algebraic geometry codes construction",
  use_multi_query: true
});

// 3. 유용한 결과를 컬렉션에 저장
save_conversation({
  collection_id: "my-research-uuid",
  conversation: "검색 결과와 관련 논의...",
  title: "AG Codes Literature Review"
});
```

### **시나리오 2: 스터디 그룹**
```javascript
// 각 주제별 컬렉션으로 체계적 관리
create_collection({ name: "Linear Algebra" });
create_collection({ name: "Number Theory" });
create_collection({ name: "Cryptography" });

// 스터디 내용 저장
save_conversation({
  collection_id: "linear-algebra-uuid",
  conversation: "오늘 스터디: 유한체에서의 선형변환...",
  title: "Week 3 Study Notes"
});
```

### **시나리오 3: 코딩 작업**
```javascript
// 실제 코딩 중 MAGMA 함수 검색
search_magma({
  query: "matrix rank computation over finite field",
  search_type: "hybrid",
  limit: 3
});

// 작동하는 코드 스니펫 저장
add_document({
  collection_id: "code-examples-uuid",
  content: `
// 유한체에서 행렬 rank 계산
F := GF(7);
M := Matrix(F, 3, 3, [1,2,3, 4,5,6, 7,1,2]);
r := Rank(M);
print "Rank:", r;
  `,
  metadata: { 
    type: "code_snippet", 
    language: "magma",
    topic: "linear_algebra"
  }
});
```

## 🆚 LangConnect vs 기존 방식 비교

| 기능 | 기존 MCP | LangConnect 방식 | v3.0 구현 |
|------|----------|------------------|-----------|
| 검색 확장 | ❌ | ✅ Multi-query | ✅ |
| 검색 방식 | 1개 | 3개 (semantic/keyword/hybrid) | ✅ |
| GUI 관리 | ❌ | ✅ Web interface | 🚧 v3.1 예정 |
| 컬렉션 | ❌ | ✅ Multiple collections | ✅ |
| 대화 저장 | ❌ | ✅ Conversation storage | ✅ |
| 동적 파라미터 | ❌ | ✅ Runtime configuration | ✅ |

## 🛠️ 개발자 가이드

### **프로젝트 구조**
```
mcp-magma-handbook/
├── enhanced-mcp-server.ts      # 메인 서버 (v3.0)
├── database-schema.sql         # DB 스키마
├── src/
│   ├── index.ts               # 레거시 서버 (v2.x)
│   └── advanced-index.ts      # 고급 서버 (v2.x)
├── test-enhanced-mcp-complete.ts # 테스트 스크립트
├── CHANGELOG-v3.md            # 변경사항
└── galois-constacyclic-implementation.magma # 논문 구현
```

### **빌드 & 테스트**
```bash
# 개발 모드
npm run dev

# 빌드
npm run build

# 테스트
npx tsx test-enhanced-mcp-complete.ts

# 레거시 버전 사용
npm run dev-legacy
```

## 🔮 로드맵

### **v3.1.0 (다음 버전)**
- 🖥️ **GUI Management Interface**: 웹 기반 관리 도구
- 🔍 **Advanced Filtering**: 메타데이터 기반 필터링
- 🌏 **Multi-language Support**: 한국어 검색 최적화
- 📊 **Search Analytics**: 검색 패턴 분석

### **v3.2.0**
- 🤖 **Auto-categorization**: AI 기반 자동 문서 분류
- 🔗 **Cross-collection Search**: 여러 컬렉션 동시 검색
- 📱 **Mobile Optimization**: 모바일 친화적 인터페이스

## 🤝 기여하기

```bash
# 1. 포크 & 클론
git clone https://github.com/your-username/mcp-magma-handbook.git

# 2. 브랜치 생성
git checkout -b feature/new-feature

# 3. 개발 & 테스트
npm run dev
npm test

# 4. 커밋 & 푸시
git commit -m "Add new feature"
git push origin feature/new-feature

# 5. Pull Request 생성
```

## 📞 지원

- **GitHub Issues**: [버그 신고 & 기능 요청](https://github.com/LeGenAI/mcp-magma-handbook/issues)
- **이메일**: baegjaehyeon@gmail.com
- **랩실 슬랙**: #mcp-magma-support

## 📄 라이선스

MIT License - 자유롭게 사용하세요!

---

### 🎉 **랩실 선배님들, 새로운 v3.0로 더욱 효율적인 연구를 하세요!**

**Multi-query로 놓치는 정보 없이, Collection으로 체계적으로, Conversation으로 지식을 축적하며!** 🚀