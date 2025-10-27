# Admin Service - Frontend 연동 가이드

## 📋 개요

Admin Service는 LLM 모델 관리 및 사용량 통계 기능을 담당합니다.

## 🔗 Frontend가 호출하는 API

### 1. LLM 모델 관리

#### 1.1 LLM 모델 목록 조회
```
GET /api/admin/llm-models/
Authorization: Bearer {accessToken}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "GPT-4",
    "endpoint": "https://api.openai.com/v1",
    "api_key": "sk-***",
    "is_active": true,
    "health_status": "healthy",
    "last_health_check": "2025-10-27T12:00:00Z",
    "created_at": "2025-10-20T09:00:00Z"
  }
]
```

#### 1.2 LLM 모델 등록
```
POST /api/admin/llm-models/
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Claude-3",
  "endpoint": "https://api.anthropic.com/v1",
  "api_key": "sk-ant-..."
}
```

#### 1.3 LLM 모델 활성화/비활성화
```
PATCH /api/admin/llm-models/{id}/
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "is_active": false
}
```

### 2. LLM 사용량 통계

#### 2.1 개인별 통계
```
GET /api/admin/stats/llm-usage/?view=personal&start_date=2025-10-01&end_date=2025-10-27
Authorization: Bearer {accessToken}
```

**Response:**
```json
[
  {
    "user_id": 1,
    "user_username": "syngha.han",
    "model": "GPT-4",
    "tokens_used": 45000,
    "estimated_cost": 2.50,
    "request_count": 120
  }
]
```

#### 2.2 부서별 통계
```
GET /api/admin/stats/llm-usage/?view=department&start_date=2025-10-01&end_date=2025-10-27
```

#### 2.3 Agent별 통계
```
GET /api/admin/stats/llm-usage/?view=agent&start_date=2025-10-01&end_date=2025-10-27
```

### 3. Agent 사용량 통계

#### 3.1 Agent 사용량 조회
```
GET /api/admin/stats/agent-usage/?view=agent&start_date=2025-10-01&end_date=2025-10-27
Authorization: Bearer {accessToken}
```

**Response:**
```json
[
  {
    "agent_id": 1,
    "agent_name": "Customer Support Agent",
    "status": "PRODUCTION",
    "input_count": 1234,
    "avg_response_time": 2.3
  }
]
```

### 4. CSV/Excel Export

#### 4.1 통계 내보내기
```
GET /api/admin/stats/export?type=llm-usage&format=csv&start_date=2025-10-01&end_date=2025-10-27
Authorization: Bearer {accessToken}
```

**Response:** CSV 파일 다운로드

## 🧪 테스트 시나리오

### 시나리오 1: LLM 모델 등록
1. Settings → Admin → LLM 모델 관리
2. "+ 새 LLM 등록" 버튼 클릭
3. 정보 입력:
   - 이름: Claude-3
   - Endpoint: https://api.anthropic.com/v1
   - API Key: sk-ant-...
4. POST `/api/admin/llm-models/` 호출
5. 모델 목록에 추가됨
6. Health Status 자동 체크

### 시나리오 2: LLM 사용량 통계 조회
1. Settings → Admin → LLM 사용량 통계
2. 기간 선택: 2025-10-01 ~ 2025-10-27
3. 뷰 선택: 개인별
4. GET `/api/admin/stats/llm-usage/` 호출
5. 차트 표시 (모델별 토큰 사용량)
6. 테이블 표시 (사용자별 상세 내역)
7. "Export CSV" 버튼으로 다운로드

## 📁 초기 폴더 구조

```
admin-service/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py           # LLMModel
│   ├── schemas.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── llm_models.py   # LLM 모델 CRUD
│   │   ├── stats.py        # 통계 조회
│   │   └── export.py       # CSV/Excel Export
│   └── dependencies.py
├── tests/
├── requirements.txt        # FastAPI, pandas, openpyxl
├── Dockerfile
└── README.md
```

## ✅ Frontend 동작 확인 체크리스트

- [ ] LLM 모델 목록이 올바르게 표시되는가?
- [ ] LLM 모델 등록이 정상적으로 작동하는가?
- [ ] Health Status가 실시간으로 업데이트되는가?
- [ ] LLM 사용량 통계가 차트로 표시되는가?
- [ ] 개인별/부서별/Agent별 뷰 전환이 작동하는가?
- [ ] Agent 사용량 통계가 올바르게 표시되는가?
- [ ] CSV/Excel Export가 정상적으로 작동하는가?
