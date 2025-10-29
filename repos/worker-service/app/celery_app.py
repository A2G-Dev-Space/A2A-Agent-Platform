"""
Worker Service - A2G Platform
Celery 백그라운드 작업 처리 담당
"""
from celery import Celery
from celery.schedules import crontab
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Celery configuration
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/6")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/7")

# Create Celery app
celery_app = Celery(
    "worker",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["app.tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-llm-health": {
            "task": "app.tasks.check_llm_health",
            "schedule": crontab(minute="*/5"),  # Every 5 minutes
        },
        "aggregate-statistics": {
            "task": "app.tasks.aggregate_statistics",
            "schedule": crontab(minute=0),  # Every hour
        },
        "check-agent-health": {
            "task": "app.tasks.check_agent_health",
            "schedule": crontab(minute="*/10"),  # Every 10 minutes
        },
    }
)

if __name__ == "__main__":
    celery_app.start()
