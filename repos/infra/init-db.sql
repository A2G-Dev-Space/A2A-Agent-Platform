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