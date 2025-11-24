# A2A Agent Platform - Authentication System Documentation Index

This directory contains comprehensive documentation about the A2A Agent Platform's authentication system and mock SSO implementation.

## Documentation Files

### 1. AUTHENTICATION_ANALYSIS.md (Primary Document - 802 lines)
**Best for:** Complete technical understanding

This is the primary comprehensive analysis document covering all aspects of authentication:

- **Section 1:** Mock SSO Implementation
  - Service location, port, and framework
  - All endpoints with request/response formats
  - JWT token generation and claims
  - CORS configuration

- **Section 2:** Backend Authentication Flow
  - API Gateway configuration and middleware
  - Service routing
  - User Service authentication endpoints
  - Token verification process
  - Security utilities

- **Section 3:** Frontend Authentication Flow
  - State management with Zustand
  - API service and interceptors
  - Page components (Login, Callback)
  - Token storage strategy

- **Section 4:** Configuration & Environment Variables
  - Master configuration (.env)
  - Docker Compose setup
  - Service-specific configs
  - CORS configuration

- **Section 5:** HTTPS/TLS Configuration
  - Current status (NOT configured)
  - Production recommendations

- **Section 6:** Port Configuration Summary
  - All service ports in one table

- **Section 7:** Security Analysis
  - Strengths and weaknesses
  - Production hardening requirements

- **Section 8:** Token Management Flow
  - Complete flow diagram
  - Storage strategy
  - Token lifecycle

- **Section 9:** Key Endpoints Summary
  - Mock SSO endpoints
  - API Gateway endpoints
  - User Service endpoints

- **Section 10:** Recommendations
  - Immediate actions
  - Short-term improvements
  - Medium-term enhancements
  - Production hardening checklist

- **Section 11:** File Locations Reference
  - All relevant backend files
  - All relevant frontend files
  - Configuration files

**Use this for:** Deep understanding of how authentication works end-to-end

---

### 2. AUTHENTICATION_QUICK_REFERENCE.md (Quick Lookup - 126 lines)
**Best for:** Fast lookups and getting answers quickly

Tables and quick information organized by topic:

- **Mock SSO Service** - Location, framework, port, token type, users, endpoints
- **API Gateway** - Location, framework, port, routes, auth method, CORS, rate limit
- **User Service** - Location, framework, port, endpoints, verification method, roles
- **Authentication Flow** - 10-step numbered flow
- **Environment Variables** - Master configuration values
- **Token Storage** - Where and how tokens are stored
- **Security Status** - Matrix showing security aspects with pass/fail/todo
- **Key Files** - All important file locations organized by category
- **Mock Test Users** - Table with all 6 test users and their credentials
- **Production TODOs** - Checklist of production hardening tasks

**Use this for:** Quick lookups and reference during development

---

### 3. AUTHENTICATION_ARCHITECTURE.md (Visual Diagrams - 378 lines)
**Best for:** Understanding architecture visually

Contains ASCII diagrams and visual representations:

- **High-Level System Architecture**
  - Frontend application connected to API Gateway
  - API Gateway routing to multiple services
  - Database and token storage

- **Authentication Flow Detail (4 Steps)**
  - Step 1: Login Initiation
  - Step 2: SSO Login with ID token generation
  - Step 3: Callback & Token Exchange
  - Step 4: Authenticated Requests

- **Database Schema (Simplified)**
  - Users table
  - Sessions table
  - Roles table
  - Relationships

- **Component Interaction Map**
  - Frontend layer components
  - API Gateway middleware stack
  - Backend services

- **Environment Configuration Flow**
  - How master config flows to all services

- **Token Lifecycle Timeline**
  - 12-hour token lifecycle with key events

**Use this for:** Understanding the overall architecture and data flow visually

---

## Quick Navigation Guide

### I need to understand...

**...how Mock SSO works**
- Start with AUTHENTICATION_ARCHITECTURE.md > High-Level System Architecture
- Then read AUTHENTICATION_ANALYSIS.md > Section 1: Mock SSO Implementation

**...the full authentication flow**
- AUTHENTICATION_ARCHITECTURE.md > Authentication Flow Detail (4 Steps)
- AUTHENTICATION_ANALYSIS.md > Section 8: Token Management Flow

**...where a specific file is located**
- AUTHENTICATION_QUICK_REFERENCE.md > Key Files section
- AUTHENTICATION_ANALYSIS.md > Section 11: File Locations Reference

**...API endpoints for authentication**
- AUTHENTICATION_QUICK_REFERENCE.md > Authentication Flow
- AUTHENTICATION_ANALYSIS.md > Section 9: Key Endpoints Summary

**...configuration and environment variables**
- AUTHENTICATION_QUICK_REFERENCE.md > Environment Variables / Token Storage
- AUTHENTICATION_ANALYSIS.md > Section 4: Configuration & Environment Variables

**...security issues and what to fix for production**
- AUTHENTICATION_QUICK_REFERENCE.md > Security Status / Production TODOs
- AUTHENTICATION_ANALYSIS.md > Section 7: Security Analysis / Section 10: Recommendations

**...port numbers and what runs where**
- AUTHENTICATION_QUICK_REFERENCE.md > Mock SSO Service / API Gateway / User Service
- AUTHENTICATION_ANALYSIS.md > Section 6: Port Configuration Summary

**...how tokens are created and stored**
- AUTHENTICATION_ARCHITECTURE.md > Token Lifecycle
- AUTHENTICATION_ANALYSIS.md > Section 8: Token Management Flow

**...specific JWT claims and payloads**
- AUTHENTICATION_QUICK_REFERENCE.md > (all docs contain this)
- AUTHENTICATION_ANALYSIS.md > Section 2 & 3

---

## Key Facts Summary

### Ports
| Service | Port | Protocol |
|---------|------|----------|
| Frontend | 9060 | HTTP |
| API Gateway | 9050 | HTTP |
| Mock SSO | 9999 | HTTP |
| User Service | 8001 | HTTP |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |

### Token Details
- **ID Token:** JWT from Mock SSO, expires in 1 hour
- **Access Token:** JWT from User Service, expires in 12 hours
- **Algorithm:** HS256 for both
- **Secret:** `local-dev-secret-key-change-in-production`

### Authentication Method
- Bearer token in Authorization header
- Format: `Authorization: Bearer <jwt_token>`
- Verified by API Gateway for all requests

### Test Users (6 available)
- dev1-4: ADMIN role (for development/testing)
- testuser: USER role (standard user)
- pending: PENDING role (approval pending)

### Key Security Issues (Dev Only)
1. JWT signature verification is disabled
2. No HTTPS/TLS configured
3. CORS allows all origins (wildcard)
4. Hardcoded secrets
5. No token refresh mechanism

---

## File Relationships

```
Mock SSO Service (Port 9999)
  └─> Generates ID Token (JWT)
      └─> Sent to frontend via redirect

Frontend (Port 9060)
  ├─> authStore.ts (manages auth state)
  ├─> authService.ts (API calls)
  ├─> api.ts (axios with interceptors)
  └─> Stores token in localStorage (auth-storage key)

API Gateway (Port 9050)
  ├─> middleware.py (JWT verification)
  ├─> main.py (routing)
  └─> Routes to User Service (8001)

User Service (Port 8001)
  ├─> auth.py (endpoints: /api/auth/login, callback, logout)
  └─> security.py (token creation, verification)

Database (PostgreSQL)
  └─> Users table (stores user info, roles, departments)
```

---

## Documentation Dates & Versions

- **Created:** 2025-11-24
- **Last Updated:** 2025-11-24
- **Status:** Complete & Ready for Use
- **Generated By:** Claude Code Authentication Analysis System

---

## Questions & Answers

**Q: Is HTTPS/TLS configured?**
A: No, all HTTP currently. See AUTHENTICATION_ANALYSIS.md > Section 5

**Q: What are the test user credentials?**
A: See AUTHENTICATION_QUICK_REFERENCE.md > Mock Test Users table

**Q: How do I add a new authentication method?**
A: See AUTHENTICATION_ANALYSIS.md > Section 10: Recommendations > Short Term

**Q: What needs to be done for production?**
A: See AUTHENTICATION_QUICK_REFERENCE.md > Production TODOs checklist

**Q: Where is the authentication logic?**
A: Spread across three places:
  1. Mock SSO: `/repos/infra/mock-sso/main.py`
  2. API Gateway: `/repos/api-gateway/app/middleware.py`
  3. User Service: `/repos/user-service/app/api/v1/auth.py`

**Q: How is the token stored on the frontend?**
A: In localStorage with key `auth-storage` (Zustand persist middleware)

**Q: What endpoints require authentication?**
A: Everything except: `/health`, `/api/health`, `/api/auth/login`, `/api/auth/callback`, `/mock-sso`, `/docs`

---

## Document Maintenance

These documents are static analysis snapshots. To update them:
1. Run the authentication analysis script again
2. Compare with current codebase
3. Note any changes
4. Update relevant sections
5. Bump version number

---

**For questions or clarifications, refer to the specific section numbers in AUTHENTICATION_ANALYSIS.md**
