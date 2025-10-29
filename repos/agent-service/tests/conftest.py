"""
Pytest configuration and fixtures for Agent Service tests
"""
import asyncio
from typing import AsyncGenerator, Generator
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings


# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def test_db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture(scope="function")
async def client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with database override."""
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def mock_user():
    """Mock authenticated user fixture."""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "department": "Engineering",
        "role": "developer"
    }


@pytest.fixture
def mock_user_2():
    """Mock authenticated user 2 for multi-user tests."""
    return {
        "username": "testuser2",
        "email": "test2@example.com",
        "full_name": "Test User 2",
        "department": "Product",
        "role": "developer"
    }


@pytest.fixture
def mock_token(mock_user):
    """Mock JWT token."""
    # For testing, we'll use a simple mock token
    # In real implementation, this should generate a valid JWT
    return "mock_valid_token"


@pytest.fixture
def auth_headers(mock_token):
    """Authentication headers for requests."""
    return {"Authorization": f"Bearer {mock_token}"}
