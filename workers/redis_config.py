from celery import Celery
from core.config import settings

# Celery instance for background tasks (Phase 1 retry scheduling)
celery_app = Celery(
    "voice_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"]
)

