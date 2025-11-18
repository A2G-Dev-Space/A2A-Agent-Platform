# Test LangChain Agent for A2A Platform

LangChain 기반 FastAPI 애플리케이션으로 A2A Platform의 LLM Proxy와 Trace 기능을 테스트합니다.

## 설정

이 에이전트는 다음 설정을 사용합니다:

- **API Key**: `a2g_75a669be0d569905e08cf51b53ff3f8723a0027a6db653706a0a6dd8f07f5490`
- **Trace Endpoint**: `http://localhost:9050/api/llm/trace/b8f5b410-1cf5-4b61-84e8-7a9d9f126aae/v1`
- **Model**: `openai/gpt-oss-20b`
- **Trace ID**: `b8f5b410-1cf5-4b61-84e8-7a9d9f126aae`

## 실행 방법

### uv run으로 실행

```bash
cd test_langchain
uv run main.py
```

서버가 `http://localhost:6040`에서 실행됩니다.

## API 엔드포인트

### 1. GET `/` - Health Check

```bash
curl http://localhost:6040/
```

### 2. POST `/invoke` - 일반 응답

```bash
curl -X POST http://localhost:6040/invoke \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "message": "안녕하세요!",
  "system_prompt": "You are a helpful AI assistant."
}
EOF
```

### 3. POST `/stream` - 스트리밍 응답

```bash
curl -X POST http://localhost:6040/stream \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "message": "1부터 10까지 세어주세요.",
  "system_prompt": "You are a helpful AI assistant."
}
EOF
```

## A2A Platform 통합

1. **Chat Playground Config**에 입력:
   - Host: `http://localhost:6040`
   - Endpoint: `/invoke` 또는 `/stream`
   - Input Schema: `{"message": "{{message}}", "system_prompt": "You are a helpful AI assistant."}`

2. **Connection Test** 실행

3. **Trace 확인**:
   - Trace ID: `b8f5b410-1cf5-4b61-84e8-7a9d9f126aae`로 실시간 이벤트 확인

## API 문서

서버 실행 후 http://localhost:6040/docs 에서 Swagger UI를 확인할 수 있습니다.
