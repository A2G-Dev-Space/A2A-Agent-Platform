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
MODE=${1:-full}

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
    setup)
        echo "🔧 Setting up development databases..."
        cd repos/infra
        
        # Start only PostgreSQL first
        echo "📦 Starting PostgreSQL container..."
        $DOCKER_COMPOSE -f docker-compose.dev.yml up -d postgres
        
        # Wait for PostgreSQL to be ready
        echo "⏳ Waiting for PostgreSQL to be ready..."
        timeout=60
        counter=0
        while ! docker exec a2g-postgres-dev pg_isready -U dev_user > /dev/null 2>&1; do
            if [ $counter -ge $timeout ]; then
                echo "❌ PostgreSQL failed to start within $timeout seconds"
                exit 1
            fi
            echo "   Waiting... ($counter/$timeout)"
            sleep 2
            counter=$((counter + 2))
        done
        
        echo "✅ PostgreSQL is ready!"
        
        # Check if databases already exist
        echo "🔍 Checking existing databases..."
        existing_dbs=$(docker exec a2g-postgres-dev psql -U dev_user -d postgres -t -c "SELECT datname FROM pg_database WHERE datname LIKE '%_service_db';" 2>/dev/null | tr -d ' \n' || echo "")
        
        if [ -n "$existing_dbs" ]; then
            echo "⚠️  Service databases already exist: $existing_dbs"
            echo "   Do you want to recreate them? This will delete all data! (y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                echo "🗑️  Dropping existing databases..."
                docker exec a2g-postgres-dev psql -U dev_user -d postgres -c "DROP DATABASE IF EXISTS user_service_db;"
                docker exec a2g-postgres-dev psql -U dev_user -d postgres -c "DROP DATABASE IF EXISTS agent_service_db;"
                docker exec a2g-postgres-dev psql -U dev_user -d postgres -c "DROP DATABASE IF EXISTS chat_service_db;"
                docker exec a2g-postgres-dev psql -U dev_user -d postgres -c "DROP DATABASE IF EXISTS tracing_service_db;"
                docker exec a2g-postgres-dev psql -U dev_user -d postgres -c "DROP DATABASE IF EXISTS admin_service_db;"
            else
                echo "✅ Using existing databases"
                cd ../..
                exit 0
            fi
        fi
        
        # Initialize databases
        echo "🏗️  Creating service databases..."
        docker exec a2g-postgres-dev psql -U dev_user -d postgres -f /docker-entrypoint-initdb.d/init.sql

        # Note: All service database schemas are managed by Alembic migrations
        # Tables will be created when services start and run migrations

        echo "✅ Empty databases created. Tables will be created by Alembic migrations."
        
        if [ $? -eq 0 ]; then
            echo "✅ Database setup completed successfully!"
            echo ""
            echo "📋 Created databases:"
            echo "   - user_service_db"
            echo "   - agent_service_db"
            echo "   - chat_service_db"
            echo "   - tracing_service_db"
            echo "   - admin_service_db"
            echo ""

            # Start services to run migrations
            echo "🚀 Starting services to run database migrations..."
            $DOCKER_COMPOSE -f docker-compose.dev.yml up -d

            # Wait for services to be ready
            echo "⏳ Waiting for services to start..."
            sleep 10

            # Run migrations for all services
            echo "📝 Running database migrations..."

            # Define services with Alembic support
            SERVICES_WITH_MIGRATIONS=("user-service" "agent-service" "chat-service" "tracing-service" "admin-service")

            for service in "${SERVICES_WITH_MIGRATIONS[@]}"; do
                CONTAINER_NAME="a2g-$service"

                if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
                    if [ -f "../$service/alembic.ini" ]; then
                        echo "   Running $service migrations..."
                        if docker exec "$CONTAINER_NAME" uv run alembic upgrade head 2>/dev/null; then
                            echo "   ✅ $service migrations applied"
                        else
                            echo "   ⚠️  Could not run $service migrations"
                        fi
                    fi
                else
                    echo "   ⏭️  $service container not running, skipping..."
                fi
            done

            # Create initial admin users for user-service
            echo "👥 Creating initial admin users..."
            docker exec a2g-postgres-dev psql -U dev_user -d user_service_db -c "
            INSERT INTO users (username, username_kr, username_en, email, role, department_kr, department_en, is_active)
            VALUES
                ('syngha.han', '한승하', 'Syngha Han', 'syngha.han@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team', true),
                ('byungju.lee', '이병주', 'Byungju Lee', 'byungju.lee@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team', true),
                ('youngsub.kim', '김영섭', 'Youngsub Kim', 'youngsub.kim@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team', true),
                ('junhyung.ahn', '안준형', 'Junhyung Ahn', 'junhyung.ahn@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team', true),
                ('test.user', '테스트유저', 'Test User', 'test.user@company.com', 'PENDING', 'Test Team', 'Test Team', true)
            ON CONFLICT (username) DO NOTHING;
            " && echo "   ✅ Initial users created" || echo "   ⚠️  Could not create initial users"

            echo ""
            echo "✅ Database migrations completed!"
            echo ""
            echo "🎉 Setup complete! Services are now running."
            echo ""
            echo "📌 Next steps:"
            echo "   1. Start frontend: cd frontend && npm install && npm run dev"
            echo "   2. Access app at: http://localhost:9060"
            echo "   3. API Gateway at: http://localhost:9050"
            echo ""
            echo "📝 After 'git pull', run: ./start-dev.sh update"
        else
            echo "❌ Database setup failed!"
            exit 1
        fi

        cd ../..
        exit 0
        ;;
    full)
        echo "📦 Starting all services..."
        cd repos/infra
        $DOCKER_COMPOSE -f docker-compose.dev.yml up -d
        cd ../..
        ;;
    minimal)
        echo "📦 Starting minimal services (API Gateway + Mock SSO + Database)..."
        cd repos/infra
        $DOCKER_COMPOSE -f docker-compose.dev.yml up -d api-gateway mock-sso postgres redis
        cd ../..
        ;;
    gateway)
        echo "📦 Starting only API Gateway and dependencies..."
        cd repos/infra
        $DOCKER_COMPOSE -f docker-compose.dev.yml up -d api-gateway postgres redis
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
        echo "Usage: ./start-dev.sh [setup|update|full|minimal|gateway|stop]"
        echo "  setup   - Initialize development databases (run this first!)"
        echo "  update  - Update all service databases with latest migrations (after git pull)"
        echo "  full    - Start all services (default)"
        echo "  minimal - Start API Gateway, Mock SSO, and databases only"
        echo "  gateway - Start API Gateway and databases only"
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