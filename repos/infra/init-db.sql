-- A2G Platform Database Initialization Script
-- This script creates all necessary databases for the microservices

-- Create databases for each service
CREATE DATABASE user_service_db;
CREATE DATABASE agent_service_db;
CREATE DATABASE chat_service_db;
CREATE DATABASE tracing_service_db;
CREATE DATABASE admin_service_db;

-- Grant all privileges to dev_user
GRANT ALL PRIVILEGES ON DATABASE user_service_db TO dev_user;
GRANT ALL PRIVILEGES ON DATABASE agent_service_db TO dev_user;
GRANT ALL PRIVILEGES ON DATABASE chat_service_db TO dev_user;
GRANT ALL PRIVILEGES ON DATABASE tracing_service_db TO dev_user;
GRANT ALL PRIVILEGES ON DATABASE admin_service_db TO dev_user;

-- Connect to agent_service_db and create pgvector extension
\c agent_service_db;
CREATE EXTENSION IF NOT EXISTS vector;

-- Create initial schema for agent_service_db (for vector similarity search)
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    framework VARCHAR(50),
    status VARCHAR(50),
    embedding_vector vector(1536),
    capabilities JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS agents_embedding_idx ON agents
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- Add some test data (optional)
\c user_service_db;

-- Create initial admin user (will be properly created by the application)
-- This is just a placeholder table structure
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

-- Insert mock admin user for development
INSERT INTO users (username, username_kr, email, role, department_kr, department_en)
VALUES
    ('syngha.han', '한승하', 'syngha.han@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team'),
    ('byungju.lee', '이병주', 'byungju.lee@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team'),
    ('youngsub.kim', '김영섭', 'youngsub.kim@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team'),
    ('junhyung.ahn', '안준형', 'junhyung.ahn@company.com', 'ADMIN', 'AI Platform Team', 'AI Platform Team'),
    ('test.user', '테스트유저', 'test.user@company.com', 'USER', 'Test Team', 'Test Team')
ON CONFLICT (username) DO NOTHING;