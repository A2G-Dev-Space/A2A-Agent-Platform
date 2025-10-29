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

        # List of services with potential migrations
        SERVICES=("user-service" "agent-service" "chat-service" "tracing-service" "admin-service")

        SUCCESS_COUNT=0
        SKIP_COUNT=0
        FAIL_COUNT=0

        for service in "${SERVICES[@]}"; do
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

            echo "📦 $service: Checking for migrations..."
            cd "$SERVICE_PATH"

            # Check current migration status
            CURRENT=$(alembic current 2>/dev/null | grep -oP '(?<=^)[a-f0-9]+' || echo "none")

            # Check if there are any migrations
            if [ ! -d "alembic/versions" ] || [ -z "$(ls -A alembic/versions/*.py 2>/dev/null)" ]; then
                echo "   ℹ️  No migration files found"
                SKIP_COUNT=$((SKIP_COUNT + 1))
                cd ../..
                continue
            fi

            # Apply migrations
            echo "   Current: $CURRENT"
            echo "   Running: alembic upgrade head..."

            if alembic upgrade head 2>&1 | tee /tmp/alembic_output_$service.log; then
                NEW_CURRENT=$(alembic current 2>/dev/null | grep -oP '(?<=^)[a-f0-9]+' || echo "unknown")

                if [ "$CURRENT" = "$NEW_CURRENT" ] && [ "$CURRENT" != "none" ]; then
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
            cd ../..
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
        
        # Create initial schema for agent_service_db (without pgvector for now)
        echo "🔧 Setting up agent_service_db..."
        docker exec a2g-postgres-dev psql -U dev_user -d agent_service_db -c "
        CREATE TABLE IF NOT EXISTS agents (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            framework VARCHAR(50),
            status VARCHAR(50),
            capabilities JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        "
        
        # Create initial schema for user_service_db
        echo "🔧 Setting up user_service_db..."
        docker exec a2g-postgres-dev psql -U dev_user -d user_service_db -c "
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            username_kr VARCHAR(255),
            email VARCHAR(255) UNIQUE NOT NULL,
            role VARCHAR(50) DEFAULT 'PENDING',
            department_kr VARCHAR(255),
            department_en VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        );
        
        INSERT INTO users (username, username_kr, email, role, department_kr, department_en)
        VALUES
            ('syngha.han', '한승하', 'syngha.han@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team'),
            ('byungju.lee', '이병주', 'byungju.lee@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team'),
            ('youngsub.kim', '김영섭', 'youngsub.kim@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team'),
            ('junhyung.ahn', '안준형', 'junhyung.ahn@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team'),
            ('test.user', '테스트유저', 'test.user@company.com', 'USER', 'Test Team', 'Test Team')
        ON CONFLICT (username) DO NOTHING;
        "
        
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
            echo "🎉 You can now run: ./start-dev.sh full"
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