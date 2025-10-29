# GEMINI.md

## Project Overview

This project is a comprehensive platform for developing, testing, deploying, and monitoring AI agents. It's built on a microservices architecture with a React frontend. The platform supports multiple agent frameworks, provides a standardized Agent-to-Agent (A2A) communication protocol, and includes features like real-time tracing, intelligent agent recommendations, and integrated authentication.

The platform has three main modes of operation:

*   **Workbench Mode:** For developing and testing individual agents.
*   **Hub Mode:** For discovering and using production-ready agents.
*   **Flow Mode:** For orchestrating multiple agents in a workflow.

## Building and Running

The project uses a shell script, `start-dev.sh`, to manage the development environment.

### Initial Setup

To set up the development environment for the first time, run:

```bash
./start-dev.sh setup
```

### Running the Application

To start all services, including the backend microservices and the frontend, run:

```bash
./start-dev.sh full
```

This will start the backend services in Docker containers and the frontend on `http://localhost:9060`.

### Running a Specific Service Locally

To run a specific backend service locally for development or debugging, first start all services:

```bash
./start-dev.sh full
```

Then, stop the service you want to run locally:

```bash
docker stop a2g-{service-name}
```

Finally, navigate to the service's directory and run it locally:

```bash
cd repos/{service-name}
uv venv && source .venv/bin/activate
uv sync
uvicorn app.main:app --reload --port {port}
```

### Stopping the Application

To stop all services, run:

```bash
./start-dev.sh stop
```

## Development Conventions

### Git Workflow

*   Before starting work, pull the latest changes from the `main` branch:
    ```bash
    git pull origin main
    ```
*   After pulling, update the database migrations:
    ```bash
    ./start-dev.sh update
    ```
*   When creating a new migration, use the following command:
    ```bash
    alembic revision --autogenerate -m "Your migration message"
    ```
*   After creating a migration, apply it to your local database:
    ```bash
    alembic upgrade head
    ```

### Coding Style

*   **Frontend:** The frontend is built with React and TypeScript. It uses Tailwind CSS for styling and Zustand for state management.
*   **Backend:** The backend services are built with Python and FastAPI. They use SQLAlchemy for the ORM and Alembic for database migrations.

### Testing

*   **Frontend:** The frontend can be tested from the browser's developer console.
*   **Backend:** The backend services have a suite of tests that can be run with `pytest`.
