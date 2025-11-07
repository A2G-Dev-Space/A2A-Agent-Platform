#!/bin/bash

# A2G Platform Development Environment Startup Script

echo "🚀 Starting A2G Platform Development Environment..."
echo ""

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        if [ "$EUID" -ne 0 ]; then
            echo "❌ Cannot access Docker. Try one of the following:"
            echo "   1. Run with sudo: sudo ./start-dev.sh"
            echo "   2. Add your user to docker group: sudo usermod -aG docker $USER"
            echo "      (then logout and login again)"
            echo "   3. Start Docker Desktop if not running"
        else
            echo "❌ Docker is not running. Please start Docker Desktop and try again."
        fi
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to check if docker compose is available
check_docker_compose() {
    if docker compose version > /dev/null 2>&1; then
        DOCKER_COMPOSE="docker compose"
    elif docker-compose version > /dev/null 2>&1; then
        DOCKER_COMPOSE="docker-compose"
    else
        echo "❌ Docker Compose is not installed. Please install it and try again."
        exit 1
    fi
    echo "✅ Docker Compose is available: $DOCKER_COMPOSE"
}

# Main execution
check_docker
check_docker_compose

# Parse arguments
MODE=${1:-start}

case $MODE in
    update)
        echo "🔄 Updating all service databases with latest migrations..."
        echo ""

        # Check if PostgreSQL is running
        if ! docker exec a2g-postgres-dev pg_isready -U dev_user > /dev/null 2>&1; then
            echo "❌ PostgreSQL is not running. Please start it first with: ./start-dev.sh setup"
            exit 1
        fi

        # Map service names to container names (all services with database)
        declare -A SERVICE_CONTAINERS=(
            ["user-service"]="a2g-user-service"
            ["agent-service"]="a2g-agent-service"
            ["chat-service"]="a2g-chat-service"
            ["tracing-service"]="a2g-tracing-service"
            ["admin-service"]="a2g-admin-service"
        )

        SUCCESS_COUNT=0
        SKIP_COUNT=0
        FAIL_COUNT=0

        for service in "${!SERVICE_CONTAINERS[@]}"; do
            CONTAINER_NAME="${SERVICE_CONTAINERS[$service]}"
            SERVICE_PATH="repos/$service"

            if [ ! -d "$SERVICE_PATH" ]; then
                echo "⚠️  $service: Directory not found, skipping..."
                SKIP_COUNT=$((SKIP_COUNT + 1))
                continue
            fi

            # Check if container is running
            if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
                echo "⏭️  $service: Container not running, skipping..."
                echo "   Start services with: ./start-dev.sh full"
                SKIP_COUNT=$((SKIP_COUNT + 1))
                continue
            fi

            # Check if alembic is configured
            if [ ! -f "$SERVICE_PATH/alembic.ini" ]; then
                echo "⏭️  $service: No alembic configuration, skipping..."
                SKIP_COUNT=$((SKIP_COUNT + 1))
                continue
            fi

            # Check if there are any migrations
            if [ ! -d "$SERVICE_PATH/alembic/versions" ] || [ -z "$(ls -A $SERVICE_PATH/alembic/versions/*.py 2>/dev/null)" ]; then
                echo "⏭️  $service: No migration files found, skipping..."
                SKIP_COUNT=$((SKIP_COUNT + 1))
                continue
            fi

            echo "📦 $service: Checking for migrations..."

            # Check current migration status (inside container)
            CURRENT=$(docker exec "$CONTAINER_NAME" uv run alembic current 2>/dev/null | grep -oP '(?<=^)[a-f0-9]+' || echo "none")
            echo "   Current: $CURRENT"

            # Apply migrations (inside container)
            echo "   Running: docker exec $CONTAINER_NAME uv run alembic upgrade head"

            # Run migration and capture output
            MIGRATION_OUTPUT=$(docker exec "$CONTAINER_NAME" uv run alembic upgrade head 2>&1 | tee /tmp/alembic_output_$service.log)
            MIGRATION_EXIT_CODE=$?

            # Check if migration succeeded or if objects already exist (which is ok)
            if [ $MIGRATION_EXIT_CODE -eq 0 ] || echo "$MIGRATION_OUTPUT" | grep -q "already exists"; then
                NEW_CURRENT=$(docker exec "$CONTAINER_NAME" uv run alembic current 2>/dev/null | grep -oP '(?<=^)[a-f0-9]+' || echo "unknown")

                if echo "$MIGRATION_OUTPUT" | grep -q "already exists"; then
                    echo "   ⚠️  Some objects already exist (likely from manual setup)"
                    echo "   📝 Stamping migration as applied..."
                    docker exec "$CONTAINER_NAME" uv run alembic stamp head 2>/dev/null
                    NEW_CURRENT=$(docker exec "$CONTAINER_NAME" uv run alembic current 2>/dev/null | grep -oP '(?<=^)[a-f0-9]+' || echo "unknown")
                    echo "   ✅ Marked as up to date ($NEW_CURRENT)"
                elif [ "$CURRENT" = "$NEW_CURRENT" ] && [ "$CURRENT" != "none" ]; then
                    echo "   ✅ Already up to date ($NEW_CURRENT)"
                else
                    echo "   ✅ Updated to: $NEW_CURRENT"
                fi
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            else
                echo "   ❌ Migration failed! Check logs above."
                FAIL_COUNT=$((FAIL_COUNT + 1))
            fi

            echo ""
        done

        # Summary
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📊 Migration Update Summary:"
        echo "   ✅ Success: $SUCCESS_COUNT"
        echo "   ⏭️  Skipped: $SKIP_COUNT"
        echo "   ❌ Failed:  $FAIL_COUNT"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        if [ $FAIL_COUNT -gt 0 ]; then
            echo ""
            echo "⚠️  Some migrations failed. Please check the error messages above."
            exit 1
        else
            echo ""
            echo "🎉 All migrations completed successfully!"
        fi

        exit 0
        ;;
    start)
        echo "📦 Starting all services..."
        cd repos/infra
        $DOCKER_COMPOSE -f docker-compose.dev.yml up -d
        cd ../..
        ;;
    stop)
        echo "🛑 Stopping all services..."
        cd repos/infra
        $DOCKER_COMPOSE -f docker-compose.dev.yml down
        cd ../..
        exit 0
        ;;
    *)
        echo "Usage: ./start-dev.sh [start|update|stop]"
        echo "  start   - Start all services (default)"
        echo "  update  - Update all service databases with latest migrations (after git pull)"
        echo "  stop    - Stop all services"
        exit 1
        ;;
esac

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check service health
echo ""
echo "🔍 Checking service health..."

# Check API Gateway
if curl -s -o /dev/null -w "%{http_code}" http://localhost:9050/health | grep -q "200"; then
    echo "✅ API Gateway is healthy at http://localhost:9050"
else
    echo "⚠️  API Gateway is not ready yet. It may take a few more seconds."
fi

# Check PostgreSQL
if docker exec a2g-postgres-dev pg_isready -U dev_user > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "⚠️  PostgreSQL is not ready yet"
fi

# Check Redis
if docker exec a2g-redis-dev redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis is not ready yet"
fi

echo ""
echo "🎉 Development environment is starting!"
echo ""
echo "📌 Service URLs:"
echo "   - Frontend:    http://localhost:9060 (run: cd frontend && npm install && npm run dev)"
echo "   - API Gateway: http://localhost:9050"
echo "   - Mock SSO:    http://localhost:9050/mock-sso"
echo ""
echo "📝 To view logs: cd repos/infra && $DOCKER_COMPOSE -f docker-compose.dev.yml logs -f [service-name]"
echo "📝 To stop all: ./start-dev.sh stop"
echo ""