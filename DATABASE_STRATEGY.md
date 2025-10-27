# 🗄️ Database Strategy - 마이크로서비스 DB 분리 및 버전 관리

**문서 버전**: 1.0
**최종 수정일**: 2025년 10월 27일
**기술 스택**: PostgreSQL, SQLAlchemy, Alembic
**아키텍처**: Microservice with Separated Databases

---

## 📋 목차

1. [데이터베이스 아키텍처 전략](#1-데이터베이스-아키텍처-전략)
2. [스키마 분리 전략](#2-스키마-분리-전략)
3. [버전 관리 (Alembic)](#3-버전-관리-alembic)
4. [서비스별 마이그레이션 전략](#4-서비스별-마이그레이션-전략)
5. [외부 개발 환경 DB 관리](#5-외부-개발-환경-db-관리)
6. [사내망 통합 전략](#6-사내망-통합-전략)
7. [트러블슈팅](#7-트러블슈팅)

---

## 1. 데이터베이스 아키텍처 전략

### 1.1 아키텍처 선택: Schema-per-Service

A2G Platform은 **Django를 사용하지 않기 때문에** 데이터베이스 마이그레이션 및 버전 관리가 매우 중요합니다.

**선택된 전략**: **Schema-per-Service** (단일 PostgreSQL 인스턴스, 스키마 분리)

```
PostgreSQL Instance (agent_dev_platform)
├── Schema: users                 → User Service
│   ├── users
│   ├── api_keys
│   └── alembic_version
│
├── Schema: agents                → Agent Service
│   ├── agents
│   ├── agent_capabilities
│   ├── agent_embeddings
│   └── alembic_version
│
├── Schema: chat                  → Chat Service
│   ├── chat_sessions
│   ├── chat_messages
│   ├── file_uploads
│   └── alembic_version
│
├── Schema: tracing               → Tracing Service
│   ├── log_entries
│   ├── trace_metadata
│   └── alembic_version
│
└── Schema: admin                 → Admin Service
    ├── llm_models
    ├── usage_stats
    └── alembic_version
```

### 1.2 선택 이유

| 전략 | 장점 | 단점 | 채택 여부 |
|------|------|------|----------|
| **단일 DB** | 간단, JOIN 가능 | 서비스 결합도 높음, 스케일링 어려움 | ❌ |
| **DB-per-Service** | 완전 독립, 스케일링 용이 | 복잡, 비용 증가, 트랜잭션 어려움 | ❌ (4명 팀에 과도) |
| **Schema-per-Service** ⭐ | 논리적 분리, 관리 용이, JOIN 가능 | 스케일링 제한적 | ✅ **채택** |

**결론**:
- 4명 팀에서 6주 개발 기간을 고려할 때, **Schema-per-Service**가 가장 현실적입니다.
- 향후 서비스가 성장하면 Schema → 독립 DB로 마이그레이션 가능합니다.

### 1.3 데이터베이스 인스턴스

```yaml
# docker-compose.external.yml (사외망)
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: agent_dev_platform_local
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data_local:/var/lib/postgresql/data

volumes:
  postgres_data_local:
```

```bash
# .env.internal (사내망)
DB_HOST=a2g-db.company.com
DB_NAME=agent_development_platform
DB_USER=adp
DB_PASSWORD=<secure-password>
```

---

## 2. 스키마 분리 전략

### 2.1 스키마 생성

각 서비스는 자신의 스키마를 생성하고 관리합니다.

```python
# 각 서비스의 database.py
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://dev_user:dev_password@localhost:5432/agent_dev_platform_local"
)
SCHEMA_NAME = os.getenv("DB_SCHEMA", "users")  # 서비스마다 다름

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# 스키마 자동 생성 및 설정
@event.listens_for(engine, "connect", insert=True)
def set_search_path(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA_NAME}")
    cursor.execute(f"SET search_path TO {SCHEMA_NAME}")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 2.2 서비스별 스키마 할당

| 서비스 | 스키마 이름 | 환경 변수 | 주요 테이블 |
|--------|------------|----------|------------|
| **User Service** | `users` | `DB_SCHEMA=users` | users, api_keys |
| **Agent Service** | `agents` | `DB_SCHEMA=agents` | agents, agent_capabilities, agent_embeddings |
| **Chat Service** | `chat` | `DB_SCHEMA=chat` | chat_sessions, chat_messages, file_uploads |
| **Tracing Service** | `tracing` | `DB_SCHEMA=tracing` | log_entries, trace_metadata |
| **Admin Service** | `admin` | `DB_SCHEMA=admin` | llm_models, usage_stats |

### 2.3 환경 변수 설정

```bash
# user-service/.env
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/agent_dev_platform_local
DB_SCHEMA=users

# agent-service/.env
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/agent_dev_platform_local
DB_SCHEMA=agents

# chat-service/.env
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/agent_dev_platform_local
DB_SCHEMA=chat

# tracing-service/.env
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/agent_dev_platform_local
DB_SCHEMA=tracing

# admin-service/.env
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/agent_dev_platform_local
DB_SCHEMA=admin
```

---

## 3. 버전 관리 (Alembic)

### 3.1 Alembic 설치 및 초기화

각 서비스에서 Alembic을 초기화합니다.

```bash
# 예시: User Service
cd agent-platform-user-service
pip install alembic

# Alembic 초기화
alembic init alembic

# 디렉토리 구조
user-service/
├── alembic/
│   ├── versions/             # 마이그레이션 파일들
│   ├── env.py                # Alembic 환경 설정
│   └── script.py.mako        # 마이그레이션 템플릿
├── alembic.ini               # Alembic 설정 파일
├── app/
│   ├── models.py
│   └── database.py
└── requirements.txt
```

### 3.2 Alembic 설정

#### alembic.ini

```ini
# alembic.ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql://dev_user:dev_password@localhost:5432/agent_dev_platform_local

[post_write_hooks]
hooks = black
black.type = console_scripts
black.entrypoint = black
```

#### alembic/env.py

```python
# alembic/env.py
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, event
from alembic import context
import os
import sys

# 서비스의 models를 import하기 위한 경로 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.models import Base  # User Service의 모델
from app.database import SCHEMA_NAME

# Alembic Config 객체
config = context.config

# Logging 설정
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 모델의 MetaData (자동 마이그레이션용)
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=SCHEMA_NAME,  # 스키마 지정
    )

    with context.begin_transaction():
        context.execute(f"SET search_path TO {SCHEMA_NAME}")
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # 스키마 생성
        connection.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA_NAME}")
        connection.execute(f"SET search_path TO {SCHEMA_NAME}")

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=SCHEMA_NAME,  # alembic_version 테이블도 스키마에 저장
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### 3.3 마이그레이션 파일 생성

```bash
# 모델 변경 후 마이그레이션 생성
alembic revision --autogenerate -m "Create users and api_keys tables"

# 생성된 파일 확인
# alembic/versions/xxxx_create_users_and_api_keys_tables.py
```

**생성된 마이그레이션 예시**:

```python
# alembic/versions/001_create_users_table.py
"""Create users and api_keys tables

Revision ID: 001
Revises:
Create Date: 2025-10-27 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # users 테이블 생성
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('role', sa.Enum('PENDING', 'USER', 'ADMIN', name='userrole'), nullable=False),
        sa.Column('username_kr', sa.String(), nullable=True),
        sa.Column('username_en', sa.String(), nullable=True),
        sa.Column('deptname_kr', sa.String(), nullable=True),
        sa.Column('deptname_en', sa.String(), nullable=True),
        sa.Column('theme_preference', sa.String(), nullable=True),
        sa.Column('language_preference', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # api_keys 테이블 생성
    op.create_table(
        'api_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_api_keys_key'), 'api_keys', ['key'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_api_keys_key'), table_name='api_keys')
    op.drop_table('api_keys')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_table('users')
```

### 3.4 마이그레이션 실행

```bash
# 최신 버전으로 마이그레이션
alembic upgrade head

# 특정 버전으로 업그레이드
alembic upgrade 001

# 한 단계 다운그레이드
alembic downgrade -1

# 현재 버전 확인
alembic current

# 마이그레이션 히스토리 확인
alembic history --verbose
```

---

## 4. 서비스별 마이그레이션 전략

### 4.1 마이그레이션 순서

서비스 간 외래 키 관계가 있는 경우, 마이그레이션 순서가 중요합니다.

```
1. User Service (users 스키마)     ← 다른 서비스가 참조
   └─ users, api_keys

2. Agent Service (agents 스키마)   ← users.id 참조 (owner_id)
   └─ agents, agent_capabilities

3. Chat Service (chat 스키마)      ← users.id, agents.id 참조
   └─ chat_sessions, chat_messages

4. Tracing Service (tracing 스키마) ← chat_sessions 참조 (trace_id)
   └─ log_entries, trace_metadata

5. Admin Service (admin 스키마)     ← 독립적
   └─ llm_models, usage_stats
```

### 4.2 외래 키 관리 전략

**중요**: 스키마를 분리하면 PostgreSQL의 외래 키 제약이 **다른 스키마를 참조할 수 없습니다**.

**해결 방법**:
1. **외래 키를 사용하지 않음** (Application Level Referential Integrity)
2. 대신 **비즈니스 로직에서 참조 무결성 검증**

**예시**: Agent Service에서 User Service의 users 참조

```python
# agents 스키마의 agents 테이블
class Agent(Base):
    __tablename__ = "agents"
    __table_args__ = {"schema": "agents"}

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    owner_id = Column(Integer, nullable=False)  # users.id를 참조 (FK 없음)

    # 외래 키 대신 비즈니스 로직에서 검증
    def validate_owner(self, db: Session):
        # User Service API 호출 또는 직접 DB 쿼리
        user = db.execute(
            text("SELECT id FROM users.users WHERE id = :owner_id"),
            {"owner_id": self.owner_id}
        ).fetchone()
        if not user:
            raise ValueError(f"User {self.owner_id} does not exist")
```

### 4.3 Cross-Schema 조회

필요한 경우 다른 스키마의 테이블을 직접 조회할 수 있습니다:

```python
from sqlalchemy import text

# Agent Service에서 User 정보 조회
def get_agent_with_owner(agent_id: int, db: Session):
    result = db.execute(
        text("""
            SELECT
                a.id, a.name, a.owner_id,
                u.username, u.email
            FROM agents.agents a
            LEFT JOIN users.users u ON a.owner_id = u.id
            WHERE a.id = :agent_id
        """),
        {"agent_id": agent_id}
    ).fetchone()
    return result
```

---

## 5. 외부 개발 환경 DB 관리

### 5.1 개발자별 독립 DB

**문제**: 8명의 개발자가 동일한 DB 인스턴스를 사용하면 마이그레이션 충돌이 발생합니다.

**해결책**: 각 개발자가 **로컬 Docker PostgreSQL**을 실행합니다.

```bash
# 각 개발자의 로컬 환경
docker-compose -f docker-compose.external.yml up -d postgres

# 확인
docker ps
# postgres 컨테이너가 localhost:5432에서 실행 중
```

**장점**:
- 마이그레이션 충돌 없음
- 테스트 데이터 자유롭게 생성/삭제 가능
- 오프라인 개발 가능

### 5.2 마이그레이션 동기화

**브랜치 전환 시 마이그레이션 확인**:

```bash
# develop 브랜치에서 최신 코드 pull
git pull origin develop

# 각 서비스에서 마이그레이션 실행
cd agent-platform-user-service
alembic upgrade head

cd ../agent-platform-agent-service
alembic upgrade head

cd ../agent-platform-chat-service
alembic upgrade head

# ... (모든 서비스)
```

**자동화 스크립트**:

```bash
# scripts/migrate_all.sh
#!/bin/bash

SERVICES=("user-service" "agent-service" "chat-service" "tracing-service" "admin-service")

for service in "${SERVICES[@]}"; do
    echo "Migrating $service..."
    cd "agent-platform-$service"
    alembic upgrade head
    cd ..
done

echo "All services migrated successfully!"
```

### 5.3 마이그레이션 충돌 해결

**시나리오**: DEV2와 DEV3가 동시에 같은 테이블에 컬럼을 추가

```bash
# DEV2: alembic/versions/002_add_theme_column.py
# DEV3: alembic/versions/003_add_language_column.py
```

**해결 방법**:

```bash
# 1. 최신 develop 브랜치 pull
git pull origin develop

# 2. 충돌하는 마이그레이션 병합
alembic merge 002 003 -m "Merge theme and language columns"

# 3. 생성된 병합 마이그레이션 실행
alembic upgrade head
```

---

## 6. 사내망 통합 전략

### 6.1 Production DB 마이그레이션

**사외망 → 사내망 이전 시**:

```bash
# 1. 모든 서비스의 마이그레이션 파일을 사내망 Git에 Push
git push origin develop

# 2. 사내망에서 코드 Pull
git pull origin develop

# 3. 환경 변수 교체
cp .env.internal .env

# 4. 모든 서비스 마이그레이션 실행
./scripts/migrate_all_internal.sh
```

**migrate_all_internal.sh**:

```bash
#!/bin/bash

# Production DB 정보
export DATABASE_URL="postgresql://adp:secure-password@a2g-db.company.com:5432/agent_development_platform"

SERVICES=("user-service" "agent-service" "chat-service" "tracing-service" "admin-service")

for service in "${SERVICES[@]}"; do
    echo "Migrating $service to production..."
    cd "agent-platform-$service"
    alembic upgrade head
    if [ $? -ne 0 ]; then
        echo "ERROR: Migration failed for $service"
        exit 1
    fi
    cd ..
done

echo "✅ All services migrated to production successfully!"
```

### 6.2 롤백 전략

```bash
# 특정 버전으로 롤백
cd agent-platform-user-service
alembic downgrade 001

# 전체 롤백 (주의!)
alembic downgrade base
```

### 6.3 백업 전략

**Production DB 백업**:

```bash
# 마이그레이션 전 백업
pg_dump -h a2g-db.company.com -U adp -d agent_development_platform \
    -n users -n agents -n chat -n tracing -n admin \
    > backup_$(date +%Y%m%d_%H%M%S).sql

# 복원
psql -h a2g-db.company.com -U adp -d agent_development_platform \
    < backup_20251027_100000.sql
```

---

## 7. 트러블슈팅

### 7.1 마이그레이션 실행 실패

**증상**: `alembic.util.exc.CommandError: Target database is not up to date.`

**원인**: alembic_version 테이블이 최신 상태가 아님

**해결**:

```bash
# 현재 버전 확인
alembic current

# 강제로 특정 버전으로 설정 (주의!)
alembic stamp head

# 다시 마이그레이션
alembic upgrade head
```

### 7.2 스키마가 생성되지 않음

**증상**: `sqlalchemy.exc.ProgrammingError: (psycopg2.errors.InvalidSchemaName) schema "users" does not exist`

**해결**:

```sql
-- PostgreSQL에 직접 연결하여 스키마 생성
psql -h localhost -U dev_user -d agent_dev_platform_local

CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS agents;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS tracing;
CREATE SCHEMA IF NOT EXISTS admin;
```

또는 Python 스크립트:

```python
# scripts/create_schemas.py
from sqlalchemy import create_engine
import os

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

schemas = ["users", "agents", "chat", "tracing", "admin"]

with engine.connect() as conn:
    for schema in schemas:
        conn.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
        print(f"✅ Schema '{schema}' created")
```

### 7.3 외래 키 오류

**증상**: `ForeignKeyConstraintError` across schemas

**원인**: PostgreSQL은 다른 스키마 간 외래 키를 지원하지 않음

**해결**: 외래 키 제약 제거, Application Level에서 검증

```python
# ❌ 잘못된 방법
class Agent(Base):
    owner_id = Column(Integer, ForeignKey("users.users.id"))

# ✅ 올바른 방법
class Agent(Base):
    owner_id = Column(Integer, nullable=False)  # FK 없음

    def validate_owner(self, db: Session):
        # 비즈니스 로직에서 검증
        ...
```

### 7.4 마이그레이션 충돌

**증상**: `alembic.util.exc.CommandError: Multiple head revisions are present`

**해결**:

```bash
# 헤드 확인
alembic heads

# 병합
alembic merge <head1> <head2> -m "Merge conflicting migrations"

# 업그레이드
alembic upgrade head
```

---

## 📚 참고 자료

- [Alembic Documentation](https://alembic.sqlalchemy.org/en/latest/)
- [SQLAlchemy Schema Names](https://docs.sqlalchemy.org/en/20/core/metadata.html#specifying-the-schema-name)
- [PostgreSQL Schema Documentation](https://www.postgresql.org/docs/current/ddl-schemas.html)
- [Microservices Database Patterns](https://microservices.io/patterns/data/database-per-service.html)

---

## 🎯 다음 단계

1. **각 서비스에 Alembic 설정**:
   - `alembic init alembic`
   - `alembic.ini` 및 `env.py` 수정

2. **초기 마이그레이션 생성**:
   - `alembic revision --autogenerate -m "Initial tables"`

3. **마이그레이션 실행**:
   - `alembic upgrade head`

4. **CI/CD 통합**:
   - GitHub Actions에서 자동 마이그레이션 실행

---

**Contact**: syngha.han@samsung.com
**Repository**: [Agent-Platform-Development](https://github.com/A2G-Dev-Space/Agent-Platform-Development)
