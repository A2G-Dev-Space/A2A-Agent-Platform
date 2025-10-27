# Worker Service - Frontend 연동 가이드

## 📋 개요

Worker Service는 Celery 기반 비동기 작업 처리를 담당합니다.

## 🔗 Frontend가 호출하는 API

**Frontend는 Worker Service를 직접 호출하지 않습니다.**
다른 서비스(Agent, Chat 등)가 비동기 작업을 Worker Service에 위임합니다.

## 🔧 주요 기능

### 1. Agent Health Check (정기 작업)
- 모든 PRODUCTION Agent의 Health를 5분마다 체크
- Health Status 업데이트 → Frontend에서 Agent 카드에 표시

### 2. Embedding 생성 (비동기 작업)
- Agent 생성 시 description/capabilities의 임베딩 벡터 생성
- AI 랭킹 검색에 사용

### 3. 알림 전송 (비동기 작업)
- 사용자 승인 시 관리자에게 알림
- Agent 운영 전환 시 팀 멤버에게 알림

### 4. 통계 집계 (정기 작업)
- LLM/Agent 사용량 통계 일일 집계
- Dashboard 차트 데이터 생성

## 🧪 테스트 시나리오

### 시나리오 1: Agent Health Check
1. PRODUCTION Agent 생성
2. Worker가 5분마다 Health Check 실행
3. Agent endpoint로 ping 요청
4. Health Status 업데이트
5. Frontend에서 Agent 카드의 Health Status 확인

### 시나리오 2: Embedding 생성
1. 새 Agent 생성
2. Agent Service가 Celery 작업 큐에 추가
3. Worker가 Embedding 모델로 벡터 생성
4. DB에 저장
5. Hub에서 AI 랭킹 검색 시 사용

## 📁 초기 폴더 구조

```
worker-service/
├── tasks/
│   ├── __init__.py
│   ├── health_check.py     # Agent Health Check
│   ├── embeddings.py       # Embedding 생성
│   ├── notifications.py    # 알림 전송
│   └── stats.py            # 통계 집계
├── celery_app.py           # Celery 설정
├── requirements.txt        # celery[redis], sentence-transformers
├── Dockerfile
└── README.md
```

## 🔑 환경 변수

```bash
# Redis (Broker)
REDIS_HOST=localhost
REDIS_PASSWORD=dev_redis_password

# Database
DB_HOST=localhost
DB_NAME=agent_dev_platform_local
DB_USER=dev_user
DB_PASSWORD=dev_password

# Celery
CELERY_BROKER_URL=redis://:dev_redis_password@localhost:6379/0
CELERY_RESULT_BACKEND=redis://:dev_redis_password@localhost:6379/1
```

## ✅ Frontend 동작 확인 체크리스트

- [ ] Agent Health Status가 주기적으로 업데이트되는가?
- [ ] 새 Agent 생성 시 AI 랭킹 검색이 즉시 작동하는가?
- [ ] 사용자 승인 시 알림이 전송되는가?
- [ ] 통계 페이지의 데이터가 주기적으로 업데이트되는가?
