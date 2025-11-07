FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy project files
COPY pyproject.toml ./

# Install dependencies
RUN uv sync --frozen

# Copy application code
COPY app ./app

# Expose port
EXPOSE 8006

# Run the application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8006", "--reload"]