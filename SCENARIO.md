# A2G Agent Platform - Test Scenarios & User Journey

**Version**: 2.0 | **Last Updated**: 2025-11-06

> 실제 사용자가 플랫폼에서 수행해야 할 테스트 시나리오와 사용자 여정을 정리한 문서입니다.

---

## 🎭 User Personas

### 1. **신규 사용자 (김개발)**
- SSO를 통해 처음 로그인
- 승인 대기 상태 (PENDING)
- 플랫폼 사용 불가

### 2. **AI 에이전트 개발자 (이개발)**
- 승인된 USER 권한
- Workbench에서 에이전트 개발/테스트
- 자신의 에이전트만 관리 가능

### 3. **일반 사용자 (박사용)**
- 승인된 USER 권한
- Hub에서 프로덕션 에이전트 사용
- 채팅 및 작업 수행

### 4. **관리자 (최관리)**
- ADMIN 권한
- 사용자 관리, LLM 관리
- 플랫폼 통계 모니터링

---

## 🚀 End-to-End Test Scenarios

### 📌 시나리오 0: **[CRITICAL]** 완전한 Workbench 워크플로우 검증
**Priority**: 🔴 HIGHEST | **Status**: ❌ NOT TESTED | **Tool**: Playwright MCP
**목표**: LLM 프록시, WebSocket 트레이스, A2A 통신, 사용자 격리를 포함한 전체 에이전트 개발 워크플로우 검증

> **⚠️ 중요**: 이 시나리오는 **단 하나의 예외 없이** 모든 단계가 순서대로 성공해야 합니다. 각 단계는 실제 사용자 경험을 정확히 모방해야 하며, 모든 UI 인터랙션, API 응답, WebSocket 이벤트가 밀리초 단위로 검증되어야 합니다.

#### **환경 준비**
```bash
# 1. 모든 서비스 실행 확인
./start-dev.sh full

# 2. Frontend 실행
cd frontend && npm run dev

# 3. 테스트 에이전트 디렉토리 준비
cd test_agents

# 4. Playwright MCP Tool 실행 준비
# Playwright를 사용하여 아래 모든 단계를 자동화 검증
```

#### **Phase 1: 환경 초기화 (에이전트 삭제)**

| 단계 | Playwright 액션 | 예상 결과 | 검증 포인트 | 실패 시 조치 |
|------|----------------|-----------|-------------|-------------|
| 1.1 | `page.goto('http://localhost:9060/workbench')` | Workbench 페이지 로드 | 타이틀: "Workbench" | 재시도 3회 |
| 1.2 | `page.locator('.agent-card').count()` | 기존 에이전트 수 확인 | N개 에이전트 표시 | 0개면 Phase 2로 |
| 1.3 | `page.locator('.agent-card button[aria-label="Delete"]').first().click()` | 삭제 버튼 클릭 | 확인 모달 표시 | **CRITICAL** UI 안정성 확인 |
| 1.4 | `page.locator('button:has-text("확인")').click()` | 삭제 확인 | 에이전트 카드 사라짐 | API 응답 200 확인 |
| 1.5 | 1.3-1.4 반복 | 모든 에이전트 삭제 | `count() === 0` | 에이전트 0개 상태 |
| 1.6 | `page.locator('text=에이전트가 없습니다').isVisible()` | Empty state 표시 | 텍스트 렌더링 확인 | **CRITICAL** |

**Database 확인**:
```sql
SELECT COUNT(*) FROM agents WHERE owner_id = ${TEST_USER_ID} AND deleted_at IS NULL;
-- Expected: 0
```

#### **Phase 2: 사용자 API 키 발급**

| 단계 | Playwright 액션 | 예상 결과 | 검증 포인트 | 저장 변수 |
|------|----------------|-----------|-------------|----------|
| 2.1 | `page.locator('.user-dropdown').click()` | 드롭다운 오픈 | "Settings" 옵션 표시 | - |
| 2.2 | `page.locator('text=Settings').click()` | Settings 페이지 이동 | URL: `/settings/general` | - |
| 2.3 | `page.locator('button:has-text("Generate Platform Key")').click()` | 키 생성 요청 | API POST 호출 | - |
| 2.4 | `await page.waitForSelector('.api-key-display')` | 생성된 키 표시 | 형식: `a2g_[64-hex]` | `API_KEY` |
| 2.5 | `const apiKey = await page.locator('.api-key-display').textContent()` | 키 복사 | 환경 변수 저장 | `PLATFORM_API_KEY` |
| 2.6 | **검증**: `apiKey.startsWith('a2g_') && apiKey.length === 68` | 키 형식 검증 | Boolean true | **MUST PASS** |

**키 저장**:
```javascript
// Playwright context에 저장
await page.evaluate((key) => {
  window.sessionStorage.setItem('TEST_PLATFORM_API_KEY', key);
}, apiKey);
```

#### **Phase 3: 신규 에이전트 생성**

| 단계 | Playwright 액션 | 예상 결과 | 검증 포인트 | 저장 변수 |
|------|----------------|-----------|-------------|----------|
| 3.1 | `page.goto('http://localhost:9060/workbench')` | Workbench로 복귀 | Empty state 표시 | - |
| 3.2 | `page.locator('button:has-text("New Agent")').click()` | 모달 오픈 | `AddAgentModal` 렌더 | - |
| 3.3 | `page.fill('input[name="name"]', 'math agent')` | 이름 입력 | 실시간 유효성 검사 | - |
| 3.4 | `page.fill('textarea[name="description"]', '수학 계산 에이전트')` | 설명 입력 | - | - |
| 3.5 | `page.selectOption('select[name="framework"]', 'ADK')` | ADK 프레임워크 선택 | 동적 필드 표시 | - |
| 3.6 | `page.locator('button:has-text("Create")').click()` | 에이전트 생성 | API POST `/api/agents` | - |
| 3.7 | `await page.waitForSelector('.agent-card:has-text("math agent")')` | 생성 완료 확인 | 리스트에 표시 | `AGENT_ID` |
| 3.8 | `const agentId = await page.locator('.agent-card').getAttribute('data-agent-id')` | Agent ID 추출 | 숫자 ID | `TEST_AGENT_ID` |

**Database 확인**:
```sql
SELECT id, name, status FROM agents WHERE name = 'math agent';
-- Expected: status = 'DEVELOPMENT'
```

#### **Phase 4: Platform LLM Endpoint 확인**

| 단계 | Playwright 액션 | 예상 결과 | 검증 포인트 | 저장 변수 |
|------|----------------|-----------|-------------|----------|
| 4.1 | `page.locator('.agent-card:has-text("math agent")').click()` | 에이전트 선택 | Chat&Debug 페이지 로드 | - |
| 4.2 | `await page.waitForSelector('.config-panel')` | Configuration Panel 표시 | 패널 렌더링 확인 | - |
| 4.3 | `await page.locator('.openai-compatible-endpoint-label').isVisible()` | 엔드포인트 라벨 확인 | "OpenAI Compatible Endpoint" 표시 | - |
| 4.4 | `const endpoint = await page.locator('.openai-endpoint-display').textContent()` | 엔드포인트 URL 읽기 | 형식 검증 | `LLM_ENDPOINT` |
| 4.5 | **검증**: `endpoint === \`http://localhost:9050/api/llm/agent/${agentId}/v1\`` | **/v1 suffix 확인** | **CRITICAL** | **MUST PASS** |
| 4.6 | `page.locator('button[aria-label="Copy endpoint"]').click()` | 클립보드 복사 | Toast: "Copied!" | - |

**Endpoint 저장**:
```javascript
// 환경 변수로 저장
await page.evaluate((endpoint) => {
  window.sessionStorage.setItem('TEST_LLM_ENDPOINT', endpoint);
}, endpoint);
```

#### **Phase 5: ADK 에이전트 구성 및 Hosting**

| 단계 | Bash/Python 액션 | 예상 결과 | 검증 포인트 |
|------|-----------------|-----------|-------------|
| 5.1 | `cd test_agents/math_agent` | 에이전트 디렉토리 이동 | - |
| 5.2 | `export PLATFORM_LLM_ENDPOINT="${LLM_ENDPOINT}"` | 환경 변수 설정 | Phase 4에서 추출한 URL |
| 5.3 | `export PLATFORM_API_KEY="${API_KEY}"` | API 키 설정 | Phase 2에서 생성한 키 |
| 5.4 | `export AGENT_ID="math-agent-${TEST_AGENT_ID}"` | 에이전트 ID 설정 | - |
| 5.5 | `uv run math_agent/agent.py &` | 에이전트 실행 (백그라운드) | Port 8011 리스닝 |
| 5.6 | `curl http://localhost:8011/.well-known/agent.json` | Agent Card 확인 | HTTP 200, JSON 응답 |
| 5.7 | **검증**: Agent Card에 `capabilities`, `description` 포함 | 메타데이터 검증 | **MUST PASS** |

**Agent Card 예시**:
```json
{
  "name": "math_agent",
  "description": "수학 계산 에이전트",
  "capabilities": ["math", "calculation"],
  "a2a_version": "2.0"
}
```

#### **Phase 6: 에이전트 연결 테스트**

| 단계 | Playwright 액션 | 예상 결과 | 검증 포인트 |
|------|----------------|-----------|-------------|
| 6.1 | `page.goto(\`http://localhost:9060/workbench/agents/${TEST_AGENT_ID}/chat\`)` | Chat&Debug UI 로드 | Configuration Panel 표시 |
| 6.2 | `page.fill('input[name="agentEndpoint"]', 'http://localhost:8011')` | Hosted endpoint 입력 | 입력 필드 업데이트 |
| 6.3 | `page.locator('button:has-text("Connect")').click()` | 연결 요청 | WebSocket handshake |
| 6.4 | `await page.waitForSelector('.connection-status:has-text("Connected")')` | 연결 성공 표시 | **CRITICAL** 상태 인디케이터 |
| 6.5 | **검증**: Network 탭에서 `GET /.well-known/agent.json` 호출 확인 | Agent Card fetch | HTTP 200 |
| 6.6 | **검증**: `page.locator('.agent-info').textContent()` 포함: "수학 계산 에이전트" | 에이전트 정보 표시 | - |

#### **Phase 7: Chat & Trace 동시 검증 (CRITICAL)**

| 단계 | Playwright 액션 | 예상 결과 | 검증 포인트 | 타임아웃 |
|------|----------------|-----------|-------------|---------|
| 7.1 | **Setup**: `const traceMonitor = new TraceWebSocketMonitor(page)` | Trace WebSocket 리스너 초기화 | - | - |
| 7.2 | `page.fill('textarea[name="chatInput"]', '2+2는?')` | 메시지 입력 | 입력 필드 업데이트 | - |
| 7.3 | `page.locator('button:has-text("Send")').click()` | 메시지 전송 | A2A `sendMessage` 호출 | 5s |
| 7.4 | `await page.waitForSelector('.chat-message.user:has-text("2+2는?")')` | 사용자 메시지 표시 | Chat window 업데이트 | 1s |
| 7.5 | **CRITICAL**: Trace 패널 동시 모니터링 시작 | WebSocket 이벤트 수신 | `ws://localhost:9050/ws/trace/${TRACE_ID}` | - |
| 7.6 | **Chat 검증**: `await page.waitForSelector('.chat-message.assistant')` | 에이전트 응답 스트리밍 | 토큰별 표시 | 10s |
| 7.7 | **Chat 검증**: 최종 응답 `page.locator('.chat-message.assistant').last().textContent()` | "4" 또는 "2+2는 4입니다" 포함 | **MUST CONTAIN "4"** | - |
| 7.8 | **Trace 검증**: `traceMonitor.getEntries().length > 0` | 트레이스 로그 수신 확인 | 최소 1개 이상 | - |
| 7.9 | **Trace 검증**: 각 entry 검증 | `{type: 'llm_call', request: {...}, response: {...}}` | Request/Response 쌍 존재 | - |
| 7.10 | **Trace 검증**: `traceMonitor.getEntries().every(e => e.agent_id === TEST_AGENT_ID)` | **격리 검증** | **NO CROSS-CONTAMINATION** | - |

**Trace WebSocket Monitor 예시**:
```typescript
class TraceWebSocketMonitor {
  private entries: TraceEntry[] = [];

  constructor(page: Page) {
    page.on('websocket', ws => {
      if (ws.url().includes('/ws/trace/')) {
        ws.on('framereceived', event => {
          const data = JSON.parse(event.payload);
          if (data.type === 'trace_log') {
            this.entries.push(data.log);
          }
        });
      }
    });
  }

  getEntries() {
    return this.entries;
  }
}
```

#### **Phase 8: 대화 히스토리 & 격리 검증**

| 단계 | Playwright 액션 | 예상 결과 | 검증 포인트 |
|------|----------------|-----------|-------------|
| 8.1 | `page.fill('textarea[name="chatInput"]', '이전 대화 내용을 기억해?')` | 후속 질문 입력 | - |
| 8.2 | `page.locator('button:has-text("Send")').click()` | 메시지 전송 | A2A with history |
| 8.3 | **Chat 검증**: `await page.waitForSelector('.chat-message.assistant')` | 에이전트 응답 | "2+2", "4" 등 언급 |
| 8.4 | **Chat 검증**: 대화 스레드 유지 | 3개 메시지 표시 (사용자2, 에이전트2) | - |
| 8.5 | **Trace 검증**: 새로운 트레이스 로그 추가 | `traceMonitor.getEntries().length` 증가 | 이전 로그 유지 |
| 8.6 | **Trace 검증**: 모든 로그의 `session_id` 동일 | 같은 세션 내 통신 | **MUST BE SAME** |
| 8.7 | **격리 검증**: 다른 브라우저 탭에서 다른 에이전트 테스트 | 트레이스 로그 절대 섞이지 않음 | **CRITICAL** |

#### **최종 성공 조건**

모든 단계가 통과해야 하며, 다음 조건을 만족해야 함:

1. ✅ **에이전트 삭제**: UI에서 안정적으로 작동
2. ✅ **API 키 생성**: `a2g_[64-hex]` 형식 준수
3. ✅ **에이전트 생성**: Database에 올바르게 저장
4. ✅ **Endpoint 표시**: `/v1` suffix 자동 포함
5. ✅ **ADK Hosting**: Agent Card 접근 가능
6. ✅ **연결 성공**: WebSocket handshake 완료
7. ✅ **Chat 동작**: A2A 프로토콜로 응답 수신
8. ✅ **Trace 실시간**: WebSocket으로 로그 스트리밍
9. ✅ **완벽한 격리**: 에이전트/사용자 간 데이터 혼합 없음
10. ✅ **히스토리 유지**: 대화 문맥 기억

**실패 시 보고사항**:
- 실패한 Phase 번호
- 구체적인 오류 메시지
- 스크린샷 (UI 문제 시)
- Network 로그 (API/WebSocket 문제 시)
- Database 상태 (데이터 불일치 시)

---

### 📌 시나리오 1: 신규 사용자 온보딩
**목표**: SSO 로그인부터 승인까지의 전체 프로세스 테스트

```bash
# 테스트 준비
./start-dev.sh full
cd frontend && npm run dev
```

| 단계 | 액션 | 예상 결과 | 검증 포인트 |
|------|------|-----------|-------------|
| 1 | http://localhost:9060 접속 | 로그인 페이지 표시 | UI 렌더링 |
| 2 | "Login with SSO" 클릭 | Mock SSO 페이지로 리다이렉트 | URL: http://localhost:9999 |
| 3 | Mock SSO에서 새 프로필 선택 | 플랫폼으로 리다이렉트 | /callback?id_token=... |
| 4 | 자동 리다이렉트 | "Pending Approval" 페이지 | localStorage에 JWT 저장 |
| 5 | /workbench 접근 시도 | 접근 거부, Pending 페이지로 리다이렉트 | 403 에러 |

**Database 확인**:
```sql
docker exec -it a2g-postgres-dev psql -U dev_user -d user_service_db
SELECT username, role, status, created_at FROM users ORDER BY created_at DESC;
```

### 📌 시나리오 2: 관리자의 사용자 승인
**목표**: PENDING 사용자를 USER로 승인

| 단계 | 액션 | 예상 결과 | 검증 포인트 |
|------|------|-----------|-------------|
| 1 | 관리자 계정으로 로그인 | 대시보드 접속 | Settings 메뉴 표시 |
| 2 | Settings > User Management | 사용자 목록 표시 | PENDING 사용자 표시 |
| 3 | PENDING 사용자 "Approve" 클릭 | 상태가 USER로 변경 | Success toast |
| 4 | 승인된 사용자 재로그인 | Workbench/Hub 접근 가능 | 정상 라우팅 |

**API 테스트**:
```bash
# 사용자 목록 조회
curl -X GET http://localhost:9050/api/v1/users \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# 사용자 승인
curl -X PUT http://localhost:9050/api/v1/users/${USER_ID}/approve \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

### 📌 시나리오 3: Workbench에서 Agno OS 에이전트 생성
**목표**: Well-known 프레임워크 에이전트 등록 및 테스트

| 단계 | 액션 | 예상 결과 | 검증 포인트 |
|------|------|-----------|-------------|
| 1 | Workbench 접속 | 에이전트 목록 표시 | 빈 리스트 or 기존 에이전트 |
| 2 | "Add New Agent" 클릭 | 모달 창 오픈 | AddAgentModal 렌더링 |
| 3 | Framework: "Agno OS" 선택 | 동적 폼 변경 | Base URL, Agent ID 필드 표시 |
| 4 | 입력: <br>- Name: "고객 상담봇"<br>- Base URL: http://localhost:8100<br>- Agent ID: customer_bot | 자동 엔드포인트 생성 표시 | http://localhost:8100/agents/customer_bot/runs |
| 5 | "Create" 클릭 | 에이전트 생성 완료 | 리스트에 추가 |
| 6 | 생성된 에이전트 선택 | Playground 오픈 | 채팅 인터페이스 표시 |
| 7 | "안녕하세요" 메시지 전송 | 스트리밍 응답 | 토큰별 표시 |

**Database 확인**:
```sql
docker exec -it a2g-postgres-dev psql -U dev_user -d agent_service_db
SELECT name, framework, original_endpoint, status FROM agents;
```

### 📌 시나리오 4: Google ADK 에이전트 (A2A Native) 테스트
**목표**: 프록시 없이 직접 통신하는 A2A Native 에이전트 테스트

| 단계 | 액션 | 예상 결과 | 검증 포인트 |
|------|------|-----------|-------------|
| 1 | "Add New Agent" 모달 오픈 | 폼 표시 | UI |
| 2 | Framework: "Google ADK" 선택 | Base URL만 표시 | Agent ID 필드 숨김 |
| 3 | Base URL: http://localhost:8080 입력 | 폼 완성 | |
| 4 | "Create" 클릭 | Agent Card Discovery 수행 | Network: GET /.well-known/agent-card.json |
| 5 | Playground에서 메시지 전송 | **직접 통신** | Network: 프록시 거치지 않음 |

**Network 검증** (브라우저 개발자 도구):
```
✅ ADK: http://localhost:8080/tasks/send (직접)
❌ Agno: http://localhost:9050/api/a2a/proxy/... (프록시 경유)
```

### 📌 시나리오 5: Hub에서 프로덕션 에이전트 사용
**목표**: 일반 사용자의 Hub 사용 경험

| 단계 | 액션 | 예상 결과 | 검증 포인트 |
|------|------|-----------|-------------|
| 1 | Hub 페이지 접속 | PRODUCTION 에이전트만 표시 | DEVELOPMENT 숨김 |
| 2 | 검색: "코드 리뷰" | 필터링된 결과 | 검색 API 동작 |
| 3 | "Code Reviewer" 에이전트 클릭 | 채팅 인터페이스 | |
| 4 | 코드 블록 전송:<br>```python<br>def add(a,b):<br>  return a+b<br>``` | 리뷰 응답 | 코드 하이라이팅 |
| 5 | 다른 에이전트로 전환 | 새 세션 시작 | 이전 대화 유지 |

### 📌 시나리오 6: 실시간 추적 (Tracing)
**목표**: 에이전트 호출 시 실시간 로그 확인

| 단계 | 액션 | 예상 결과 | 검증 포인트 |
|------|------|-----------|-------------|
| 1 | Workbench에서 에이전트 선택 | 3-panel 레이아웃 | |
| 2 | Trace 패널 활성화 | "Waiting for logs..." | WebSocket 연결 |
| 3 | 채팅 메시지 전송 | 실시간 로그 스트리밍 | |
| 4 | 로그 레벨 필터 (ERROR만) | ERROR 로그만 표시 | |

**WebSocket 이벤트 확인** (브라우저 콘솔):
```javascript
// 개발자 도구 콘솔에서
const ws = new WebSocket('ws://localhost:9050/ws/trace');
ws.onmessage = (e) => console.log('Trace:', JSON.parse(e.data));
```

### 📌 시나리오 7: LLM 모델 관리 (Admin)
**목표**: 새 LLM 모델 등록 및 설정

| 단계 | 액션 | 예상 결과 | 검증 포인트 |
|------|------|-----------|-------------|
| 1 | Settings > LLM Management | 모델 목록 표시 | GPT-4, Claude 등 |
| 2 | "Add New Model" 클릭 | 모달 오픈 | |
| 3 | 입력:<br>- Provider: OpenAI<br>- Model: gpt-4o<br>- API Key: sk-... | 폼 완성 | |
| 4 | "Test Connection" 클릭 | 연결 성공 | ✅ Connected |
| 5 | "Save" 클릭 | 모델 추가 완료 | 리스트 업데이트 |

### 📌 시나리오 8: 통계 대시보드
**목표**: 플랫폼 사용 현황 모니터링

| 단계 | 액션 | 예상 결과 | 검증 포인트 |
|------|------|-----------|-------------|
| 1 | Settings > Statistics | 대시보드 표시 | |
| 2 | 기간 필터: "Last 7 Days" | 데이터 업데이트 | 차트 변경 |
| 3 | "Top Token Consumers" 확인 | 사용자별 토큰 사용량 | Bar chart |
| 4 | Export CSV 클릭 | 데이터 다운로드 | statistics.csv |

---

## 🧪 API Testing Commands

### 1. Authentication Flow
```bash
# 1. SSO 로그인 시작
curl -X POST http://localhost:9050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri": "http://localhost:9060/callback"}'

# 2. Callback 처리 (ID token from Mock SSO)
curl -X POST http://localhost:9050/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"id_token": "eyJ..."}'
```

### 2. Agent Management
```bash
# 에이전트 목록 조회
curl -X GET http://localhost:9050/api/agents \
  -H "Authorization: Bearer ${TOKEN}"

# 에이전트 생성 (Agno OS)
curl -X POST http://localhost:9050/api/agents \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "description": "Test Description",
    "framework": "Agno",
    "base_url": "http://localhost:8100",
    "agent_id": "test_agent"
  }'

# A2A Proxy 호출
curl -X POST http://localhost:9050/api/a2a/proxy/1/tasks/send \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "sendMessage",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"text": "Hello"}]
      }
    },
    "id": "test-001"
  }'
```

### 3. WebSocket Testing
```bash
# wscat 설치
npm install -g wscat

# Chat WebSocket
wscat -c ws://localhost:9050/ws/chat?token=${TOKEN}
> {"type": "message", "content": "Hello"}

# Trace WebSocket
wscat -c ws://localhost:9050/ws/trace?session_id=test-session&token=${TOKEN}
```

### 4. Worker Service (Celery)
```bash
# Flower UI 접속
open http://localhost:5555

# Health check 수동 트리거
docker exec -it a2g-worker-service celery -A app.tasks call app.tasks.health_check_agents

# Beat scheduler 상태 확인
docker exec -it a2g-worker-service celery -A app.tasks inspect scheduled
```

---

## 🐛 Common Issues & Troubleshooting

### Issue 1: WebSocket 연결 실패
**증상**: Chat이나 Trace가 작동하지 않음
```bash
# 해결
docker restart a2g-chat-service
docker logs a2g-chat-service --tail 50
```

### Issue 2: 에이전트 응답 없음
**증상**: A2A Proxy 호출 시 timeout
```bash
# 네트워크 확인
docker network inspect a2g-network
# 에이전트 서비스 로그
docker logs a2g-agent-service --tail 100
```

### Issue 3: PENDING 사용자 승인 안됨
**증상**: Approve 버튼 클릭해도 상태 변경 안됨
```sql
-- 수동 업데이트
docker exec -it a2g-postgres-dev psql -U dev_user -d user_service_db
UPDATE users SET role = 'USER' WHERE username = 'testuser';
```

### Issue 4: Mock SSO 작동 안함
```bash
# Mock SSO 재시작
docker restart a2g-mock-sso
# 로그 확인
docker logs a2g-mock-sso
```

---

## 📊 Performance Testing

### Load Test with K6
```javascript
// k6/test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,  // 10 virtual users
  duration: '30s',
};

export default function() {
  // 1. Login
  let loginRes = http.post('http://localhost:9050/api/auth/login',
    JSON.stringify({redirect_uri: 'http://localhost:9060/callback'}),
    {headers: {'Content-Type': 'application/json'}}
  );

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  // 2. Get agents
  let agentsRes = http.get('http://localhost:9050/api/agents', {
    headers: {'Authorization': `Bearer ${TOKEN}`}
  });

  check(agentsRes, {
    'agents retrieved': (r) => r.status === 200,
  });
}
```

실행:
```bash
k6 run k6/test.js
```

---

## ✅ Test Coverage Checklist

### User Service
- [ ] SSO login flow
- [ ] User role management
- [ ] API key generation
- [ ] Session management

### Agent Service
- [ ] Agent CRUD operations
- [ ] Framework-specific adapters
- [ ] A2A Proxy functionality
- [ ] Access control (public/private/team)

### Chat Service
- [ ] WebSocket connection
- [ ] Message streaming
- [ ] Session persistence
- [ ] Multi-agent support (future)

### Tracing Service
- [ ] Log collection
- [ ] Real-time streaming
- [ ] Agent transfer detection
- [ ] Log filtering

### Admin Service
- [ ] User management
- [ ] LLM model management
- [ ] Statistics aggregation
- [ ] Platform monitoring

### Worker Service
- [ ] Health check tasks
- [ ] Scheduled jobs
- [ ] Celery beat
- [ ] Flower monitoring

### API Gateway
- [ ] Service routing
- [ ] Health check aggregation
- [ ] Request proxying
- [ ] CORS configuration

### Mock SSO
- [ ] Pre-defined user login
- [ ] Custom user creation
- [ ] JWT token generation
- [ ] Redirect callback flow

---

## 🎯 Next Steps

1. **자동화 테스트 구현**
   - Playwright E2E tests
   - Jest unit tests
   - API integration tests

2. **모니터링 설정**
   - Prometheus metrics
   - Grafana dashboards
   - Alert rules

3. **보안 테스트**
   - OWASP Top 10
   - Penetration testing
   - Load testing