# 🔧 Worker Service

**담당자**: DEV2 (이병주, byungju.lee@company.com)
**기술**: Celery + Redis
**포트**: N/A (백그라운드 워커), 5555 (Flower 모니터링)

---

## 📋 목차

1. [서비스 개요](#서비스-개요)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [Celery 태스크](#celery-태스크)
5. [스케줄링](#스케줄링)
6. [모니터링](#모니터링)
7. [테스트 가이드](#테스트-가이드)
8. [개발 환경 설정](#개발-환경-설정)
9. [Sprint 체크리스트](#sprint-체크리스트)

---

## 서비스 개요

Worker Service는 **Celery 기반 백그라운드 작업 처리 서비스**로, 무거운 연산, 배치 처리, 주기적 작업을 비동기로 처리합니다.

### 핵심 역할
- **비동기 작업**: 무거운 연산을 백그라운드에서 처리
- **스케줄링**: 주기적 작업 자동 실행 (Celery Beat)
- **Health Check**: 에이전트 및 LLM 모델 상태 확인
- **통계 집계**: 일별/주간/월별 통계 자동 계산
- **정리 작업**: 오래된 데이터 삭제 및 아카이빙

### 구성 요소
- **Celery Worker**: 태스크 실행
- **Celery Beat**: 스케줄 작업 관리
- **Flower**: 웹 기반 모니터링 (선택)
- **Redis**: 메시지 브로커 및 결과 저장소

---

## 주요 기능

### 1. 에이전트 Health Check
주기적으로 등록된 에이전트의 상태 확인:

```python
@celery_app.task
def check_agent_health(agent_id: int):
    """에이전트 Health Check"""
    agent = get_agent(agent_id)
    try:
        response = httpx.get(f"{agent.endpoint}/health", timeout=10)
        if response.status_code == 200:
            update_agent_health(agent_id, "healthy")
        else:
            update_agent_health(agent_id, "unhealthy")
    except Exception:
        update_agent_health(agent_id, "unreachable")
```

### 2. LLM Health Check
LLM 모델 상태 확인:

```python
@celery_app.task
def check_llm_health(model_id: int):
    """LLM 모델 Health Check"""
    model = get_llm_model(model_id)
    try:
        response = httpx.post(
            model.endpoint,
            json={"prompt": "test"},
            timeout=30
        )
        update_llm_health(model_id, "healthy", response.elapsed.total_seconds())
    except Exception:
        update_llm_health(model_id, "unhealthy")
```

### 3. 통계 집계
일별/주간/월별 통계 자동 계산:

```python
@celery_app.task
def aggregate_daily_statistics():
    """일별 통계 집계"""
    today = date.today()
    stats = {
        "date": today,
        "total_users": count_users(),
        "active_users": count_active_users(today),
        "total_agents": count_agents(),
        "total_sessions": count_sessions(today),
        "total_api_calls": count_api_calls(today),
        "llm_usage": get_llm_usage(today)
    }
    save_statistics(stats)
```

### 4. 데이터 정리
오래된 데이터 삭제:

```python
@celery_app.task
def cleanup_old_data():
    """오래된 데이터 정리"""
    # 30일 이상된 로그 삭제
    delete_old_logs(days=30)

    # 90일 이상된 세션 아카이빙
    archive_old_sessions(days=90)

    # 1년 이상된 통계 압축
    compress_old_statistics(days=365)
```

---

## 기술 스택

### Backend
- **Task Queue**: Celery 5.3.4
- **Broker**: Redis 7.2
- **Result Backend**: Redis 7.2
- **Monitoring**: Flower 2.0.1
- **Python**: 3.11+

### 주요 라이브러리
```toml
[project]
dependencies = [
    "celery==5.3.4",
    "redis==5.0.1",
    "flower==2.0.1",
    "sqlalchemy==2.0.23",
    "asyncpg==0.29.0",
    "httpx==0.25.2",
    "pydantic==2.5.0"
]
```

---

## Celery 태스크

### 1. Health Check 태스크

```python
# app/tasks/health.py
from app.worker import celery_app
import httpx

@celery_app.task(name="health.check_agent")
def check_agent_health(agent_id: int):
    """에이전트 Health Check"""
    agent = get_agent_from_db(agent_id)

    try:
        response = httpx.get(
            f"{agent.endpoint}/health",
            timeout=10
        )

        if response.status_code == 200:
            update_agent_health(agent_id, "healthy")
            return {"agent_id": agent_id, "status": "healthy"}
        else:
            update_agent_health(agent_id, "unhealthy")
            return {"agent_id": agent_id, "status": "unhealthy"}

    except Exception as e:
        update_agent_health(agent_id, "unreachable")
        return {"agent_id": agent_id, "status": "unreachable", "error": str(e)}

@celery_app.task(name="health.check_all_agents")
def check_all_agents_health():
    """모든 에이전트 Health Check"""
    agents = get_all_agents()
    results = []

    for agent in agents:
        result = check_agent_health.delay(agent.id)
        results.append(result)

    return {"scheduled": len(results)}
```

### 2. LLM Health Check 태스크

```python
# app/tasks/llm.py
@celery_app.task(name="llm.check_health")
def check_llm_health(model_id: int):
    """LLM 모델 Health Check"""
    model = get_llm_model(model_id)

    try:
        start_time = time.time()
        response = httpx.post(
            model.endpoint,
            json={
                "model": model.name,
                "messages": [{"role": "user", "content": "test"}]
            },
            headers={"Authorization": f"Bearer {model.api_key}"},
            timeout=30
        )
        response_time = time.time() - start_time

        if response.status_code == 200:
            update_llm_health(model_id, "healthy", response_time)
            return {"model_id": model_id, "status": "healthy", "response_time": response_time}
        else:
            update_llm_health(model_id, "unhealthy")
            return {"model_id": model_id, "status": "unhealthy"}

    except Exception as e:
        update_llm_health(model_id, "unreachable")
        return {"model_id": model_id, "status": "unreachable", "error": str(e)}
```

### 3. 통계 집계 태스크

```python
# app/tasks/statistics.py
@celery_app.task(name="statistics.aggregate_daily")
def aggregate_daily_statistics():
    """일별 통계 집계"""
    today = date.today()
    yesterday = today - timedelta(days=1)

    stats = {
        "date": yesterday,
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(
            User.last_login >= yesterday
        ).count(),
        "total_agents": db.query(Agent).count(),
        "production_agents": db.query(Agent).filter(
            Agent.status == "PRODUCTION"
        ).count(),
        "total_sessions": db.query(Session).filter(
            Session.created_at >= yesterday,
            Session.created_at < today
        ).count(),
        "total_api_calls": count_api_calls_for_date(yesterday),
        "llm_usage": get_llm_usage_for_date(yesterday)
    }

    save_platform_statistics(stats)
    return stats

@celery_app.task(name="statistics.aggregate_weekly")
def aggregate_weekly_statistics():
    """주간 통계 집계"""
    # 주간 통계 로직
    pass
```

### 4. 데이터 정리 태스크

```python
# app/tasks/cleanup.py
@celery_app.task(name="cleanup.old_logs")
def cleanup_old_logs():
    """오래된 로그 삭제"""
    cutoff_date = datetime.now() - timedelta(days=30)

    deleted_count = db.query(Log).filter(
        Log.created_at < cutoff_date
    ).delete()

    db.commit()
    return {"deleted": deleted_count}

@celery_app.task(name="cleanup.old_sessions")
def cleanup_old_sessions():
    """오래된 세션 아카이빙"""
    cutoff_date = datetime.now() - timedelta(days=90)

    # 아카이브 로직
    sessions = db.query(Session).filter(
        Session.created_at < cutoff_date
    ).all()

    archive_sessions(sessions)
    return {"archived": len(sessions)}
```

---

## 스케줄링

### Celery Beat 설정

```python
# app/worker.py
from celery import Celery
from celery.schedules import crontab

celery_app = Celery('worker')

celery_app.conf.beat_schedule = {
    # 에이전트 Health Check (매 10분)
    'check-all-agents-every-10-min': {
        'task': 'health.check_all_agents',
        'schedule': 600.0,  # 10분
    },

    # LLM Health Check (매 15분)
    'check-all-llms-every-15-min': {
        'task': 'llm.check_all_models',
        'schedule': 900.0,  # 15분
    },

    # 일별 통계 (매일 자정 5분)
    'aggregate-daily-stats': {
        'task': 'statistics.aggregate_daily',
        'schedule': crontab(hour=0, minute=5),
    },

    # 주간 통계 (매주 월요일 오전 1시)
    'aggregate-weekly-stats': {
        'task': 'statistics.aggregate_weekly',
        'schedule': crontab(hour=1, minute=0, day_of_week=1),
    },

    # 로그 정리 (매일 오전 2시)
    'cleanup-old-logs': {
        'task': 'cleanup.old_logs',
        'schedule': crontab(hour=2, minute=0),
    },

    # 세션 아카이빙 (매주 일요일 오전 3시)
    'cleanup-old-sessions': {
        'task': 'cleanup.old_sessions',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),
    },
}
```

---

## 모니터링

### Flower 모니터링

Flower는 Celery 태스크를 웹 UI로 모니터링합니다:

```bash
# Flower 실행
celery -A app.worker flower --port=5555

# 브라우저에서 접속
http://localhost:5555
```

**Flower UI 기능:**
- 실행 중인 태스크 확인
- 태스크 성공/실패 통계
- Worker 상태 모니터링
- 태스크 재실행
- 큐 모니터링

### 프로그래매틱 모니터링

```python
# 태스크 상태 확인
from celery.result import AsyncResult

task = check_agent_health.delay(1)
print(task.state)  # PENDING, STARTED, SUCCESS, FAILURE
print(task.result)  # 결과 확인
print(task.ready())  # 완료 여부

# 모든 활성 태스크 확인
inspect = celery_app.control.inspect()
print(inspect.active())
print(inspect.scheduled())
print(inspect.reserved())
```

---

## 테스트 가이드

### 수동 태스크 실행

```python
# Python REPL에서 테스트
from app.tasks.health import check_agent_health
from app.tasks.statistics import aggregate_daily_statistics

# 즉시 실행 (동기)
result = check_agent_health(1)
print(result)

# 백그라운드 실행 (비동기)
task = check_agent_health.delay(1)
print(task.id)
print(task.state)
print(task.result)  # 완료 후 결과
```

### cURL로 Flower API 테스트

```bash
# 태스크 목록
curl http://localhost:5555/api/tasks

# Worker 상태
curl http://localhost:5555/api/workers

# 특정 태스크 상태
curl http://localhost:5555/api/task/info/TASK-ID
```

---

## 개발 환경 설정

### 일반 사용 (권장)

```bash
# 모든 서비스 시작
cd ~/projects/Agent-Platform-Development
./start-dev.sh full

# Worker 로그 확인
docker logs -f a2g-worker-service

# Flower 접속
http://localhost:5555
```

### 로컬 개발 (디버깅 시)

```bash
# 1. Docker에서 워커 중지
docker stop a2g-worker-service

# 2. 로컬 환경 설정
cd repos/worker-service
uv venv
source .venv/bin/activate
uv sync

# 3. 환경 변수 설정
cat > .env.local <<EOF
REDIS_URL=redis://localhost:6379/5
CELERY_BROKER_URL=redis://localhost:6379/5
CELERY_RESULT_BACKEND=redis://localhost:6379/5
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/admin_service_db
CELERY_TASK_TRACK_STARTED=True
CELERY_TASK_TIME_LIMIT=300
CELERY_WORKER_CONCURRENCY=4
EOF

# 4. Celery Worker 실행
celery -A app.worker worker --loglevel=info

# 5. Celery Beat 실행 (별도 터미널)
celery -A app.worker beat --loglevel=info

# 6. Flower 실행 (선택, 별도 터미널)
celery -A app.worker flower --port=5555
```

---

## Sprint 체크리스트

### 이병주 (byungju.lee@company.com)

#### Sprint 1 (1주차)
- [ ] 프로젝트 초기화 및 Celery 설정
- [ ] 기본 태스크 구조 설계
- [ ] Redis 브로커 연결
- [ ] Health Check 태스크 구현

#### Sprint 2 (2주차)
- [ ] LLM Health Check 태스크
- [ ] 통계 집계 태스크
- [ ] Celery Beat 스케줄 설정
- [ ] 단위 테스트 작성

#### Sprint 3 (3주차)
- [ ] 데이터 정리 태스크
- [ ] Flower 모니터링 설정
- [ ] Admin Service 연동
- [ ] 에러 처리 및 재시도 로직

#### Sprint 4 (4주차)
- [ ] 성능 최적화
- [ ] 로그 및 모니터링 강화
- [ ] 통합 테스트
- [ ] 문서 작성 완료

---

## 관련 문서

- [PROJECT_OVERVIEW.md](../../PROJECT_OVERVIEW.md) - 프로젝트 전체 개요
- [PROJECT_INTEGRATED_GUIDE.md](../../PROJECT_INTEGRATED_GUIDE.md) - 통합 개발 가이드
- [Admin Service README](../admin-service/README.md) - 관리자 서비스
- [Celery Documentation](https://docs.celeryq.dev/)

---

**© 2025 A2G Platform Team - Worker Service**
