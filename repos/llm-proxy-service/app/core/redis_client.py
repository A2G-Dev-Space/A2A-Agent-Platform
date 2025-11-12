"""
Redis client for session trace lookup
"""
import redis.asyncio as redis
import logging
import os

logger = logging.getLogger(__name__)

class RedisClient:
    """Redis client for looking up session → trace_id mappings"""

    def __init__(self):
        self.redis_client: redis.Redis = None
        # Use same Redis database as Chat Service (db=2)
        self.redis_url = os.getenv("REDIS_URL", "redis://redis:6379/2")

    async def connect(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = await redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            logger.info(f"Connected to Redis at {self.redis_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")

    async def get_session_trace(self, session_id: str) -> str | None:
        """Get trace_id for given session_id"""
        key = f"session:trace:{session_id}"
        trace_id = await self.redis_client.get(key)
        if trace_id:
            logger.info(f"Found trace_id for session {session_id}: {trace_id}")
        else:
            logger.warning(f"No trace_id found for session {session_id}")
        return trace_id

# Global Redis client instance
redis_client = RedisClient()

async def get_redis_client() -> RedisClient:
    """Dependency for getting Redis client"""
    return redis_client
