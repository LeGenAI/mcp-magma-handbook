# 🚀 MAGMA Handbook MCP Server - Smithery 설정 가이드

## ✨ 간편한 설치 방법

### 1. Smithery 웹사이트에서 설치 (권장)

1. **Smithery 방문**: https://smithery.ai/@LeGenAI/mcp-magma-handbook
2. **API 키 입력**: OpenAI API 키를 설정 필드에 입력
3. **JSON 복사**: 자동 생성된 설정 JSON 복사
4. **클라이언트에 붙여넣기**: Claude Desktop 또는 Cursor 설정에 붙여넣기

### 2. 설정 JSON 예시

**Claude Desktop:**
```json
{
  "mcpServers": {
    "magma-handbook": {
      "command": "npx",
      "args": ["-y", "@smithery/cli@latest", "run", "@LeGenAI/mcp-magma-handbook"],
      "env": {
        "OPENAI_API_KEY": "sk-your-openai-api-key-here"
      }
    }
  }
}
```

**Cursor:**
```json
{
  "mcpServers": {
    "magma-handbook": {
      "command": "npx",
      "args": ["-y", "@smithery/cli@latest", "run", "@LeGenAI/mcp-magma-handbook"],
      "env": {
        "OPENAI_API_KEY": "sk-your-openai-api-key-here"
      }
    }
  }
}
```

## 🔧 설정 파일 위치

### Claude Desktop
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

### Cursor
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\rooveterinaryinc.roo-cline\settings\mcp_settings.json`

## 💡 중요 사항

### 💰 비용 모델
- **MAGMA 지식베이스**: 무료 제공 (5000+ 페이지)
- **OpenAI API**: 사용자 부담 (매우 저렴, 쿼리당 ~$0.0001)

### 🔑 API 키 요구사항
- OpenAI API 키만 필요
- Supabase 설정 불필요 (공유 지식베이스)
- `sk-`로 시작하는 유효한 키 형식

### 🛠️ 사용 가능한 도구
1. **search_magma_advanced**: 하이브리드 검색 (BM25 + 벡터)
2. **search_functions**: MAGMA 함수 전용 검색
3. **validate_api_key**: API 키 검증 및 연결 테스트
4. **benchmark_quality**: 검색 품질 벤치마크
5. **magma_info**: 서버 정보 및 도움말

## 🔍 문제 해결

### API 키 오류 시
1. `validate_api_key` 도구 실행
2. API 키 형식 확인 (sk- 시작)
3. OpenAI 계정 크레딧 확인
4. 클라이언트 재시작

### 연결 문제 시
1. 인터넷 연결 확인
2. 방화벽 설정 확인
3. npx 캐시 클리어: `npx clear-npx-cache`
4. 클라이언트 완전 재시작

## 📈 성능 지표

- **검색 품질**: 84.7% 평균 관련성 (4배 개선)
- **응답 시간**: 평균 1.1초
- **"Hamming code generator matrix"**: 80% 관련성
- **지원 함수**: 4441개 MAGMA 함수 인덱싱

## 🌟 성공 사례

```
쿼리: "Hamming code generator matrix"
결과: 정확한 MAGMA 문법과 예제 코드 제공
관련성: 80% (이전 0%에서 대폭 개선)
```

---

**🎯 목표**: 전 세계 수학자와 개발자들이 MAGMA를 더 쉽게 사용할 수 있도록 지원