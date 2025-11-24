#!/bin/bash

# A2G Platform A2G Platform Startup Script

echo "🚀 Starting A2G Platform A2G Platform..."
echo ""

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        if [ "$EUID" -ne 0 ]; then
            echo "❌ Cannot access Docker. Try one of the following:"
            echo "   1. Run with sudo: sudo ./start.sh"
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

# Function to apply HOST_IP configuration
apply_host_configuration() {
    # Load HOST_IP from repos/infra/.env
    if [ -f "repos/infra/.env" ]; then
        export $(grep HOST_IP repos/infra/.env | xargs)
        export $(grep GATEWAY_PORT repos/infra/.env | xargs)
        echo "📌 Using HOST_IP: ${HOST_IP:-localhost}"
        echo "📌 Using GATEWAY_PORT: ${GATEWAY_PORT:-9050}"
    else
        echo "⚠️  repos/infra/.env not found, using default: localhost"
        HOST_IP="localhost"
        GATEWAY_PORT="9050"
    fi

    # Update all configuration files with HOST_IP
    echo "🔧 Applying HOST_IP configuration..."

    # Check if frontend/.env exists and if HOST_IP has changed
    FRONTEND_ENV_CHANGED=false
    if [ -f "frontend/.env" ]; then
        # Extract current VITE_HOST_IP from frontend/.env
        CURRENT_FRONTEND_IP=$(grep "^VITE_HOST_IP=" frontend/.env 2>/dev/null | cut -d'=' -f2)
        if [ "$CURRENT_FRONTEND_IP" != "$HOST_IP" ]; then
            FRONTEND_ENV_CHANGED=true
            echo "   ⚠️  Frontend HOST_IP changed: ${CURRENT_FRONTEND_IP} → ${HOST_IP}"
        fi
    fi

    # Update frontend/.env
    if [ -f "frontend/.env" ]; then
        sed -i "s/^VITE_HOST_IP=.*/VITE_HOST_IP=${HOST_IP}/" frontend/.env
        sed -i "s/^VITE_GATEWAY_PORT=.*/VITE_GATEWAY_PORT=${GATEWAY_PORT}/" frontend/.env
        sed -i "s/172\.26\.110\.192/${HOST_IP}/g" frontend/.env
    else
        echo "VITE_HOST_IP=${HOST_IP}" > frontend/.env
        echo "VITE_GATEWAY_PORT=${GATEWAY_PORT}" >> frontend/.env
        echo "VITE_API_URL=/api" >> frontend/.env
        echo "# Internal network - no proxy needed" >> frontend/.env
        echo "HTTP_PROXY=" >> frontend/.env
        echo "HTTPS_PROXY=" >> frontend/.env
        echo "NO_PROXY=localhost,127.0.0.1,*.local,${HOST_IP},10.*,172.*,192.168.*" >> frontend/.env
        FRONTEND_ENV_CHANGED=true
    fi

    # Update vite.config.ts
    if [ -f "frontend/vite.config.ts" ]; then
        sed -i "s|http://[0-9.]*:9050|http://${HOST_IP}:9050|g" frontend/vite.config.ts
        sed -i "s|ws://[0-9.]*:9050|ws://${HOST_IP}:9050|g" frontend/vite.config.ts
    fi

    # Update all backend service config files
    echo "   Updating backend service configurations..."
    for service in user-service agent-service chat-service tracing-service admin-service
    do
        config_file="repos/${service}/app/core/config.py"
        if [ -f "$config_file" ]; then
            # Replace hardcoded IPs in CORS origins
            sed -i "s/172\.26\.110\.192/${HOST_IP}/g" "$config_file"
            sed -i "s/10\.229\.95\.228/${HOST_IP}/g" "$config_file"
            # Replace in SSO settings if exists
            sed -i "s|http://172\.26\.110\.192:9999|http://${HOST_IP}:9999|g" "$config_file"
            sed -i "s|http://172\.26\.110\.192:9050|http://${HOST_IP}:9050|g" "$config_file"
            sed -i "s|http://10\.229\.95\.228:9999|http://${HOST_IP}:9999|g" "$config_file"
            sed -i "s|http://10\.229\.95\.228:9050|http://${HOST_IP}:9050|g" "$config_file"
            echo "   ✓ Updated ${service}"
        fi

        # Update main.py to use allow_origins=["*"] for all services
        main_file="repos/${service}/app/main.py"
        if [ -f "$main_file" ]; then
            # Replace CORS configuration to allow all origins
            sed -i '/allow_origins.*settings\.CORS_ORIGINS/c\    allow_origins=["*"],  # Allow all origins' "$main_file"
            echo "   ✓ Updated ${service} CORS to allow all"
        fi
    done

    # Update API Gateway config
    if [ -f "repos/api-gateway/app/config.py" ]; then
        sed -i "s/172\.26\.110\.192/${HOST_IP}/g" repos/api-gateway/app/config.py
        echo "   ✓ Updated api-gateway config"
    fi
    if [ -f "repos/api-gateway/app/main.py" ]; then
        sed -i "s/172\.26\.110\.192/${HOST_IP}/g" repos/api-gateway/app/main.py
        sed -i "s/10\.229\.95\.228/${HOST_IP}/g" repos/api-gateway/app/main.py
        echo "   ✓ Updated api-gateway main"
    fi

    # Update LLM Proxy service
    # Note: llm-proxy already has allow_origins=["*"] configured, no need to modify CORS

    # Update worker-service main.py too (though it already has ["*"])
    if [ -f "repos/worker-service/app/main.py" ]; then
        sed -i '/allow_origins=/c\    allow_origins=["*"],  # Allow all origins' repos/worker-service/app/main.py
    fi

    # Update docker-compose environment
    export HOST_IP
    export GATEWAY_PORT=${GATEWAY_PORT:-9050}

    echo "✅ Configuration applied"

    # Notify user if frontend environment changed
    if [ "$FRONTEND_ENV_CHANGED" = true ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⚠️  IMPORTANT: Frontend environment updated!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "   The frontend/.env file has been updated with new HOST_IP."
        echo "   You MUST restart the frontend dev server for changes to take effect:"
        echo ""
        echo "   1. Stop current frontend (Ctrl+C in frontend terminal)"
        echo "   2. Restart: cd frontend && npm run dev"
        echo ""
        echo "   Frontend uses Vite which loads environment variables at build time,"
        echo "   so changes to .env require a restart to be picked up."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    fi
}

# Main execution
check_docker
check_docker_compose
apply_host_configuration

# Parse arguments
MODE=${1:-start}

case $MODE in
    setup)
        echo "🔧 Setting up A2G Platform for the first time..."
        echo ""

        # Start infrastructure services first (PostgreSQL, Redis)
        echo "📦 Starting infrastructure services (PostgreSQL, Redis)..."
        cd repos/infra
        $DOCKER_COMPOSE -f docker-compose.yml up -d postgres redis
        cd ../..

        echo "⏳ Waiting for PostgreSQL to be ready..."
        sleep 10

        # Wait for PostgreSQL to be ready
        MAX_RETRIES=30
        RETRY_COUNT=0
        while ! docker exec a2g-postgres pg_isready -U dev_user > /dev/null 2>&1; do
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
                echo "❌ PostgreSQL failed to start after $MAX_RETRIES attempts"
                exit 1
            fi
            echo "   Waiting for PostgreSQL... (attempt $RETRY_COUNT/$MAX_RETRIES)"
            sleep 2
        done

        echo "✅ PostgreSQL is ready"
        echo ""

        # Verify databases were created by init-db.sql
        echo "🔍 Verifying databases..."
        EXPECTED_DBS=("user_service_db" "agent_service_db" "chat_service_db" "tracing_service_db" "admin_service_db" "llm_proxy_db" "worker_db")

        for db in "${EXPECTED_DBS[@]}"; do
            if docker exec a2g-postgres psql -U dev_user -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
                echo "   ✅ $db exists"
            else
                echo "   ❌ $db does not exist - init-db.sql may have failed"
                exit 1
            fi
        done

        echo ""
        echo "📦 Starting all services (except celery-beat)..."
        cd repos/infra
        # Start all services except celery-beat to prevent premature health checks
        $DOCKER_COMPOSE -f docker-compose.yml up -d --scale celery-beat=0
        cd ../..

        echo ""
        echo "⏳ Waiting for all services to start..."
        sleep 15

        echo ""
        echo "🔄 Running database migrations for all services..."
        echo ""

        # Map service names to container names
        declare -A SERVICE_CONTAINERS=(
            ["user-service"]="a2g-user-service"
            ["agent-service"]="a2g-agent-service"
            ["chat-service"]="a2g-chat-service"
            ["tracing-service"]="a2g-tracing-service"
            ["admin-service"]="a2g-admin-service"
            ["llm-proxy-service"]="a2g-llm-proxy"
            ["worker-service"]="a2g-worker-service"
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

            # Wait for container to be ready
            MAX_WAIT=60
            WAIT_COUNT=0
            while ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; do
                WAIT_COUNT=$((WAIT_COUNT + 1))
                if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
                    echo "❌ $service: Container not started after ${MAX_WAIT}s"
                    FAIL_COUNT=$((FAIL_COUNT + 1))
                    continue 2
                fi
                sleep 1
            done

            echo "📦 $service: Running initial migrations..."

            # Run migration
            MIGRATION_OUTPUT=$(docker exec "$CONTAINER_NAME" uv run alembic upgrade head 2>&1 | tee /tmp/alembic_output_$service.log)
            MIGRATION_EXIT_CODE=$?

            if [ $MIGRATION_EXIT_CODE -eq 0 ] || echo "$MIGRATION_OUTPUT" | grep -q "already exists"; then
                if echo "$MIGRATION_OUTPUT" | grep -q "already exists"; then
                    echo "   ⚠️  Some objects already exist, stamping migration..."
                    docker exec "$CONTAINER_NAME" uv run alembic stamp head 2>/dev/null
                fi
                CURRENT=$(docker exec "$CONTAINER_NAME" uv run alembic current 2>/dev/null | grep -oP '(?<=^)[a-f0-9]+' || echo "applied")
                echo "   ✅ Migration complete ($CURRENT)"
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            else
                echo "   ❌ Migration failed! Check /tmp/alembic_output_$service.log"
                FAIL_COUNT=$((FAIL_COUNT + 1))
            fi
            echo ""
        done

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📊 Setup Summary:"
        echo "   ✅ Success: $SUCCESS_COUNT"
        echo "   ⏭️  Skipped: $SKIP_COUNT"
        echo "   ❌ Failed:  $FAIL_COUNT"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""

        if [ $FAIL_COUNT -gt 0 ]; then
            echo "⚠️  Setup completed with some failures. Check error messages above."
            echo "   You can try running './start.sh update' to retry migrations."
        else
            echo "✅ Migrations completed successfully!"
        fi

        echo ""
        echo "📦 Starting celery-beat (now that migrations are complete)..."
        cd repos/infra
        $DOCKER_COMPOSE -f docker-compose.yml up -d celery-beat
        cd ../..

        echo ""
        echo "🗑️  Initializing databases with clean state..."
        echo ""
        echo "⚠️  WARNING: This will DELETE ALL existing data!"
        echo "   This should only be done on first-time setup."
        echo ""
        read -p "   Do you want to clear all data and create admin user? (yes/no): " CONFIRM

        if [ "$CONFIRM" = "yes" ]; then
            echo ""
            echo "   Clearing all databases..."

            # Clear all data and create admin user
            docker exec a2g-postgres psql -U dev_user -d user_service_db -c "DELETE FROM users;" > /dev/null 2>&1
            docker exec a2g-postgres psql -U dev_user -d user_service_db -c "INSERT INTO users (username, username_kr, username_en, email, department_kr, department_en, role, created_at, updated_at, preferences) VALUES ('admin', 'Admin', 'Admin', 'admin@company.com', 'admin-team', 'admin-team', 'ADMIN', NOW(), NOW(), '{}');" > /dev/null 2>&1
            echo "   ✅ User database initialized (1 admin user)"

            docker exec a2g-postgres psql -U dev_user -d agent_service_db -c "DELETE FROM agents;" > /dev/null 2>&1
            echo "   ✅ Agent database cleared"

            docker exec a2g-postgres psql -U dev_user -d admin_service_db -c "DELETE FROM llm_models;" > /dev/null 2>&1
            echo "   ✅ LLM models database cleared"

            docker exec a2g-postgres psql -U dev_user -d llm_proxy_db -c "DELETE FROM llm_calls; DELETE FROM trace_events; DELETE FROM tool_calls;" > /dev/null 2>&1
            echo "   ✅ LLM proxy database cleared"

            docker exec a2g-postgres psql -U dev_user -d chat_service_db -c "DELETE FROM sessions; DELETE FROM messages;" > /dev/null 2>&1
            echo "   ✅ Chat database cleared"

            docker exec a2g-postgres psql -U dev_user -d tracing_service_db -c "DELETE FROM trace_logs;" > /dev/null 2>&1
            echo "   ✅ Tracing database cleared"

            docker exec a2g-postgres psql -U dev_user -d worker_db -c "DELETE FROM statistics_snapshots;" > /dev/null 2>&1
            echo "   ✅ Worker database cleared"
        else
            echo ""
            echo "   ⏭️  Skipping data initialization - keeping existing data"
        fi

        echo ""
        echo "🎉 Setup completed successfully!"

        echo ""
        echo "📌 Next steps:"
        echo "   1. Start frontend: cd frontend && npm install && npm run dev"
        echo "   2. Access platform: http://${HOST_IP}:9060"
        echo "   3. Mock SSO: http://${HOST_IP}:9050/mock-sso"
        echo ""
        echo "📌 Configuration:"
        echo "   - All services use HOST_IP from repos/infra/.env: ${HOST_IP}"
        echo "   - To change IP: Edit repos/infra/.env, run ./start.sh, then restart frontend"
        echo ""

        exit 0
        ;;
    update)
        echo "🔄 Updating all service databases with latest migrations..."
        echo ""

        # Check if PostgreSQL is running
        if ! docker exec a2g-postgres pg_isready -U dev_user > /dev/null 2>&1; then
            echo "❌ PostgreSQL is not running. Please start it first with: ./start.sh setup"
            exit 1
        fi

        # Map service names to container names (all services with database)
        declare -A SERVICE_CONTAINERS=(
            ["user-service"]="a2g-user-service"
            ["agent-service"]="a2g-agent-service"
            ["chat-service"]="a2g-chat-service"
            ["tracing-service"]="a2g-tracing-service"
            ["admin-service"]="a2g-admin-service"
            ["llm-proxy-service"]="a2g-llm-proxy"
            ["worker-service"]="a2g-worker-service"
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
                echo "   Start services with: ./start.sh full"
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
        $DOCKER_COMPOSE -f docker-compose.yml up -d
        cd ../..
        ;;
    stop)
        echo "🛑 Stopping all services..."
        cd repos/infra
        $DOCKER_COMPOSE -f docker-compose.yml down
        cd ../..
        exit 0
        ;;
    *)
        echo "Usage: ./start.sh [setup|start|update|stop]"
        echo ""
        echo "Commands:"
        echo "  setup   - First-time setup: start services and run all database migrations"
        echo "            ⚠️  WARNING: Will ask to delete all data and create admin user"
        echo "  start   - Start all services (default)"
        echo "  update  - Update all service databases with latest migrations (after git pull)"
        echo "  stop    - Stop all services"
        echo ""
        echo "Common workflows:"
        echo "  First time:    ./start.sh setup (answer 'yes' to initialize with admin user)"
        echo "  After git pull: ./start.sh && ./start.sh update"
        echo "  Daily use:     ./start.sh"
        echo ""
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
if curl -s -o /dev/null -w "%{http_code}" http://${HOST_IP}:9050/health | grep -q "200"; then
    echo "✅ API Gateway is healthy at http://${HOST_IP}:9050"
else
    echo "⚠️  API Gateway is not ready yet. It may take a few more seconds."
fi

# Check PostgreSQL
if docker exec a2g-postgres pg_isready -U dev_user > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "⚠️  PostgreSQL is not ready yet"
fi

# Check Redis
if docker exec a2g-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis is not ready yet"
fi

echo ""
echo "🎉 Development environment is starting!"
echo ""
echo "📌 Service URLs:"
echo "   - Frontend:    http://${HOST_IP}:9060"
echo "   - API Gateway: http://${HOST_IP}:9050"
echo "   - Mock SSO:    http://${HOST_IP}:9050/mock-sso"
echo ""
echo "📌 Frontend Setup:"
echo "   If frontend is not running, start it with:"
echo "   $ cd frontend && npm install && npm run dev"
echo ""
echo "   ⚠️  If you changed HOST_IP in repos/infra/.env:"
echo "   - Stop the frontend dev server (Ctrl+C)"
echo "   - Restart it: cd frontend && npm run dev"
echo ""
echo "📝 To view logs: cd repos/infra && $DOCKER_COMPOSE -f docker-compose.yml logs -f [service-name]"
echo "📝 To stop all: ./start.sh stop"
echo ""