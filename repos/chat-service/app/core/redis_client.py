"""
Redis client for session management
"""
import redis.asyncio as redis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class RedisClient:
    """Redis client for storing session → trace_id mappings"""

    def __init__(self):
        self.redis_client: redis.Redis = None

    async def connect(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = await redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            logger.info(f"Connected to Redis at {settings.REDIS_URL}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")

    async def set_session_trace(self, session_id: str, trace_id: str, ttl: int = 86400):
        """Store session_id → trace_id mapping with TTL (default 24h)"""
        key = f"session:trace:{session_id}"
        await self.redis_client.set(key, trace_id, ex=ttl)
        logger.info(f"Stored session mapping: {session_id} → {trace_id}")

    async def get_session_trace(self, session_id: str) -> str | None:
        """Get trace_id for given session_id"""
        key = f"session:trace:{session_id}"
        trace_id = await self.redis_client.get(key)
        return trace_id

    async def delete_session_trace(self, session_id: str):
        """Delete session mapping"""
        key = f"session:trace:{session_id}"
        await self.redis_client.delete(key)
        logger.info(f"Deleted session mapping: {session_id}")

# Global Redis client instance
redis_client = RedisClient()

async def get_redis_client() -> RedisClient:
    """Dependency for getting Redis client"""
    return redis_client
