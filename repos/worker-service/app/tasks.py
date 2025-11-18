"""
Celery tasks for background processing
"""
from app.celery_app import celery_app
from app.core.database import (
    async_session_maker,
    StatisticsSnapshot,
    LLMHealthStatus,
    init_db
)
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from datetime import datetime, timedelta
import httpx
import asyncio
import json
import os
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

# Service URLs
ADMIN_SERVICE_URL = os.getenv("ADMIN_SERVICE_URL", "http://admin-service:8001")
AGENT_SERVICE_URL = os.getenv("AGENT_SERVICE_URL", "http://agent-service:8002")
LLM_PROXY_SERVICE_URL = os.getenv("LLM_PROXY_SERVICE_URL", "http://llm-proxy-service:8006")
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user-service:8000")

@celery_app.task
def check_llm_health():
    """Check health of all registered LLMs"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_check_llm_health_async())
    finally:
        loop.close()

async def _check_llm_health_async():
    """Async implementation of LLM health check"""
    logger.info("Starting LLM health check...")

    try:
        # Get all LLMs from admin service (using public endpoint - no auth required)
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(f"{ADMIN_SERVICE_URL}/api/admin/public/llm-models/")
                if response.status_code != 200:
                    logger.error(f"Failed to get LLMs: {response.status_code}")
                    return {"error": "Failed to fetch LLMs"}

                llms = response.json()
            except Exception as e:
                logger.error(f"Error fetching LLMs: {e}")
                return {"error": str(e)}

            # Check health of each LLM
            health_results = {}
            async with async_session_maker() as session:
                for llm in llms:
                    llm_id = llm["id"]
                    endpoint = llm.get("endpoint", "")
                    provider = llm.get("provider", "")
                    model = llm.get("model", "")

                    # Perform health check (simple HTTP check)
                    is_healthy = False
                    response_time = None
                    error_msg = None

                    try:
                        start_time = datetime.utcnow()

                        # Health check: Try to reach the LLM endpoint
                        if endpoint:
                            # For OpenAI-compatible APIs, check /models endpoint
                            if "openai" in provider.lower() or "v1" in endpoint:
                                check_url = endpoint.rstrip("/chat/completions") + "/models"
                            else:
                                check_url = endpoint

                            check_response = await client.get(
                                check_url,
                                headers={
                                    "Authorization": f"Bearer {llm.get('api_key', '')}",
                                    "Accept": "application/json"
                                },
                                timeout=5.0
                            )

                            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                            is_healthy = check_response.status_code in [200, 404]  # 404 might be OK for some endpoints

                            if not is_healthy:
                                error_msg = f"HTTP {check_response.status_code}"
                        else:
                            error_msg = "No endpoint configured"

                    except httpx.TimeoutException:
                        error_msg = "Timeout"
                        response_time = 5000  # 5 seconds timeout
                    except Exception as e:
                        error_msg = str(e)[:200]

                    # Get or create health status record
                    result = await session.execute(
                        select(LLMHealthStatus).where(
                            LLMHealthStatus.llm_id == llm_id
                        ).order_by(LLMHealthStatus.checked_at.desc()).limit(1)
                    )
                    last_status = result.scalar_one_or_none()

                    # Calculate consecutive failures
                    consecutive_failures = 0
                    if last_status:
                        if not is_healthy and not last_status.is_healthy:
                            consecutive_failures = last_status.consecutive_failures + 1
                        elif not is_healthy:
                            consecutive_failures = 1

                    # Create new health status record
                    health_status = LLMHealthStatus(
                        llm_id=llm_id,
                        provider=provider,
                        model=model,
                        endpoint_url=endpoint,
                        is_healthy=is_healthy,
                        response_time_ms=response_time,
                        error_message=error_msg,
                        consecutive_failures=consecutive_failures,
                        last_healthy_at=datetime.utcnow() if is_healthy else (last_status.last_healthy_at if last_status else None),
                        checked_at=datetime.utcnow(),
                        is_active=consecutive_failures < 3  # Mark inactive after 3 consecutive failures
                    )
                    session.add(health_status)

                    # Update LLM health status in admin service
                    try:
                        update_data = {
                            "health_status": "healthy" if is_healthy else "unhealthy",
                            "last_health_check": datetime.utcnow().isoformat()
                        }

                        # Mark as inactive after 3 consecutive failures
                        if consecutive_failures >= 3:
                            update_data["is_active"] = False
                            logger.warning(f"Marked LLM {llm_id} ({model}) as inactive after {consecutive_failures} failures")

                        await client.patch(
                            f"{ADMIN_SERVICE_URL}/api/v1/llm-models/{llm_id}/",
                            json=update_data
                        )
                    except Exception as e:
                        logger.error(f"Failed to update LLM status in admin service: {e}")

                    health_results[f"{provider}-{model}"] = {
                        "healthy": is_healthy,
                        "response_time_ms": response_time,
                        "consecutive_failures": consecutive_failures,
                        "error": error_msg
                    }

                await session.commit()

            logger.info(f"LLM health check completed: {health_results}")
            return health_results

    except Exception as e:
        logger.error(f"Error in LLM health check: {e}", exc_info=True)
        return {"error": str(e)}


@celery_app.task
def collect_daily_snapshot():
    """Collect daily statistics snapshot for trend tracking"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_collect_daily_snapshot_async())
    finally:
        loop.close()

async def _collect_daily_snapshot_async():
    """Async implementation of daily snapshot collection"""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

    logger.info("Starting daily statistics snapshot collection...")

    try:
        # Create a new async engine for this task's event loop
        DATABASE_URL = os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@postgres:5432/worker_db"
        )
        engine = create_async_engine(DATABASE_URL, echo=False, future=True)
        session_maker = async_sessionmaker(engine, expire_on_commit=False)

        # Collect data from HTTP APIs first
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Get user count
            try:
                user_response = await client.get(f"{USER_SERVICE_URL}/api/users/count")
                total_users = user_response.json().get("count", 0) if user_response.status_code == 200 else 0
            except Exception as e:
                logger.error(f"Failed to get user count: {e}")
                total_users = 0

            # 2. Get agent statistics
            try:
                agent_response = await client.get(f"{AGENT_SERVICE_URL}/api/agents/statistics")
                if agent_response.status_code == 200:
                    agent_stats = agent_response.json()
                    total_agents = agent_stats.get("total", 0)
                    deployed_agents = agent_stats.get("deployed", 0)
                    development_agents = agent_stats.get("development", 0)
                else:
                    total_agents = deployed_agents = development_agents = 0
            except Exception as e:
                logger.error(f"Failed to get agent statistics: {e}")
                total_agents = deployed_agents = development_agents = 0

            # 3. Get token usage by agent (both total and by-model)
            agent_token_usage = {}
            agent_token_usage_by_model = {}
            try:
                # Get all agents (using internal endpoint - no auth required)
                agents_response = await client.get(f"{AGENT_SERVICE_URL}/api/agents/internal/agents")
                if agents_response.status_code == 200:
                    agents = agents_response.json()

                    # Get token usage for each agent by trace_id
                    # This ensures token usage is accumulated even when agent changes models
                    for agent in agents:
                        trace_id = agent.get("trace_id")
                        if trace_id:
                            try:
                                # Get both total and by-model breakdown
                                usage_response = await client.get(
                                    f"{LLM_PROXY_SERVICE_URL}/api/v1/statistics/agent-usage/{trace_id}?include_by_model=true"
                                )
                                if usage_response.status_code == 200:
                                    usage_data = usage_response.json()
                                    agent_id_str = str(agent["id"])

                                    # Store total usage with trace_id as key (trace_id is the real identifier)
                                    agent_token_usage[trace_id] = {
                                        "agent_id": agent_id_str,
                                        "trace_id": trace_id,
                                        "name": agent.get("name", "Unknown"),
                                        "display_name": agent.get("display_name", agent.get("name", "Unknown")),
                                        "owner_id": agent.get("owner_id"),
                                        "total_tokens": usage_data.get("total_tokens", 0),
                                        "call_count": usage_data.get("call_count", 0),
                                        "prompt_tokens": usage_data.get("prompt_tokens", 0),
                                        "completion_tokens": usage_data.get("completion_tokens", 0)
                                    }

                                    # Store by-model usage with trace_id as key
                                    if "by_model" in usage_data and usage_data["by_model"]:
                                        agent_token_usage_by_model[trace_id] = usage_data["by_model"]
                            except Exception as e:
                                logger.error(f"Failed to get usage for agent {agent['id']}: {e}")
            except Exception as e:
                logger.error(f"Failed to get agent token usage: {e}")

            # 4. Get model usage statistics
            model_usage_stats = []
            try:
                model_response = await client.get(
                    f"{LLM_PROXY_SERVICE_URL}/api/v1/statistics/model-usage"
                )
                if model_response.status_code == 200:
                    model_usage_stats = model_response.json()
            except Exception as e:
                logger.error(f"Failed to get model usage statistics: {e}")

        # 5. Save snapshot to database using the new session maker
        async with session_maker() as session:
            snapshot = StatisticsSnapshot(
                snapshot_date=datetime.utcnow(),
                total_users=total_users,
                total_agents=total_agents,
                deployed_agents=deployed_agents,
                development_agents=development_agents,
                agent_token_usage=agent_token_usage,
                agent_token_usage_by_model=agent_token_usage_by_model,
                model_usage_stats=model_usage_stats,
                created_at=datetime.utcnow()
            )
            session.add(snapshot)
            await session.commit()

            logger.info(
                f"Daily snapshot saved: users={total_users}, agents={total_agents}, "
                f"deployed={deployed_agents}, development={development_agents}, "
                f"agents_with_usage={len(agent_token_usage)}, "
                f"agents_with_model_breakdown={len(agent_token_usage_by_model)}"
            )

        # Dispose of the engine
        await engine.dispose()

        return {
            "snapshot_date": datetime.utcnow().isoformat(),
            "total_users": total_users,
            "total_agents": total_agents,
            "deployed_agents": deployed_agents,
            "development_agents": development_agents,
            "agents_with_usage": len(agent_token_usage),
            "models_tracked": len(model_usage_stats)
        }

    except Exception as e:
        logger.error(f"Error collecting daily snapshot: {e}", exc_info=True)
        return {"error": str(e)}


@celery_app.task
def cleanup_old_snapshots():
    """Clean up snapshots older than 2 years"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_cleanup_old_snapshots_async())
    finally:
        loop.close()

async def _cleanup_old_snapshots_async():
    """Async implementation of snapshot cleanup"""
    logger.info("Starting cleanup of old snapshots...")

    try:
        cutoff_date = datetime.utcnow() - timedelta(days=730)  # 2 years

        async with async_session_maker() as session:
            # Delete old snapshots
            result = await session.execute(
                delete(StatisticsSnapshot).where(
                    StatisticsSnapshot.snapshot_date < cutoff_date
                )
            )
            deleted_count = result.rowcount

            # Also clean up old health check records (keep only last 7 days)
            health_cutoff = datetime.utcnow() - timedelta(days=7)
            health_result = await session.execute(
                delete(LLMHealthStatus).where(
                    LLMHealthStatus.checked_at < health_cutoff
                )
            )
            health_deleted = health_result.rowcount

            await session.commit()

            logger.info(f"Cleaned up {deleted_count} old snapshots and {health_deleted} old health records")
            return {"snapshots_deleted": deleted_count, "health_records_deleted": health_deleted}

    except Exception as e:
        logger.error(f"Error cleaning up old snapshots: {e}", exc_info=True)
        return {"error": str(e)}


# Keep the existing placeholder tasks for compatibility
@celery_app.task
def aggregate_statistics():
    """Aggregate platform statistics (deprecated - use collect_daily_snapshot)"""
    logger.info("aggregate_statistics called - redirecting to collect_daily_snapshot")
    return collect_daily_snapshot()

@celery_app.task
def check_agent_health():
    """Check health of all agents"""
    logger.info("Starting agent health check...")

    # This could be implemented to check agent A2A endpoints
    # For now, return mock data

    return {
        "status": "completed",
        "timestamp": datetime.utcnow().isoformat()
    }

@celery_app.task
def send_notification(user_id: str, message: str):
    """Send notification to user"""
    logger.info(f"Sending notification to {user_id}: {message}")

    # Mock notification sending
    # In production, this would integrate with notification service

    return {
        "user_id": user_id,
        "message": message,
        "sent_at": datetime.utcnow().isoformat(),
        "status": "sent"
    }