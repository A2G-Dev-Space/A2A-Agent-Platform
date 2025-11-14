FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY pyproject.toml .
COPY uv.lock* .

# Install Python dependencies
RUN pip install --upgrade pip
RUN pip install uv
RUN uv sync

# Copy application code
COPY app/ app/

# Create entrypoint script
RUN echo '#!/bin/bash\n\
if [ "$1" = "worker" ]; then\n\
    echo "Starting Celery worker..."\n\
    celery -A app.celery_app worker --loglevel=info\n\
elif [ "$1" = "beat" ]; then\n\
    echo "Starting Celery beat..."\n\
    celery -A app.celery_app beat --loglevel=info\n\
elif [ "$1" = "api" ]; then\n\
    echo "Starting FastAPI server..."\n\
    uvicorn app.main:app --host 0.0.0.0 --port 8010\n\
else\n\
    echo "Usage: docker run <image> [worker|beat|api]"\n\
    exit 1\n\
fi' > /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["worker"]