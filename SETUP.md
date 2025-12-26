# Multi-Tenant SaaS Platform - Quick Start Guide

## Project Structure
This repository contains a complete multi-tenant SaaS platform with:
- Backend API (Express.js + PostgreSQL)
- Frontend (React)
- Docker Compose setup
- Database migrations and seeds

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd MULTI-SAAS
```

### 2. Run with Docker Compose (Recommended)
```bash
docker-compose up -d
```

This will:
- Start PostgreSQL database on port 5432
- Start backend API on port 5000  
- Start frontend on port 3000
- Automatically run migrations and seed data

### 3. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- API Health Check: http://localhost:5000/api/health

## Test Credentials

### Super Admin
- Email: superadmin@system.com
- Password: Admin123

### Demo Tenant
- Subdomain: demo
- Admin Email: admin@demo.com
- Admin Password: Demo123

### Regular Users (Demo Tenant)
- user1@demo.com / User123
- user2@demo.com / User123

## API Endpoints

All endpoints follow RESTful conventions and require JWT authentication (except login/register).

### Authentication
- POST /api/auth/register-tenant
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout

### Tenants
- GET /api/tenants (superadmin only)
- GET /api/tenants/:id
- PUT /api/tenants/:id

### Users
- POST /api/tenants/:tenantId/users
- GET /api/tenants/:tenantId/users
- PUT /api/users/:id
- DELETE /api/users/:id

### Projects
- POST /api/projects
- GET /api/projects
- PUT /api/projects/:id
- DELETE /api/projects/:id

### Tasks
- POST /api/projects/:projectId/tasks
- GET /api/projects/:projectId/tasks
- PUT /api/tasks/:id
- PATCH /api/tasks/:id/status

## Environment Variables

See .env file for all configuration variables. Key ones:
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- JWT_SECRET, JWT_EXPIRES_IN
- FRONTEND_URL, PORT, NODE_ENV

## Database Schema

Core tables:
- tenants
- users
- projects
- tasks
- auditlogs

## Features

✅ Multi-tenancy with complete data isolation
✅ JWT-based authentication with 24-hour expiry
✅ Role-based access control (SuperAdmin, TenantAdmin, User)
✅ Subscription plan management (Free, Pro, Enterprise)
✅ User and project management per tenant
✅ Task management with status tracking
✅ Audit logging for all critical operations
✅ CORS configuration for security
✅ Docker containerization
✅ Automatic database migrations and seeding

## Troubleshooting

### Docker Issues
- Ensure ports 3000, 5000, 5432 are available
- Check Docker daemon is running
- View logs: `docker-compose logs -f`

### Database Connection Issues
- Wait 30 seconds after docker-compose up for database to initialize
- Check health: `curl http://localhost:5000/api/health`
- Verify .env values match docker-compose.yml

### Frontend Not Loading
- Clear browser cache
- Check frontend is built and running
- Verify API_URL environment variable

## Development

### Local Setup (Without Docker)
```bash
# Backend
cd backend
npm install
node src/server.js

# Frontend (in another terminal)
cd frontend  
npm install
npm start
```

### Database
Migrations run automatically on startup. To manually run:
```bash
psql -U postgres -d saasdb -f backend/migrations/*.sql
```

## Project Status

This is a production-ready, fully functional multi-tenant SaaS platform meeting all specified requirements including:
- 19 API endpoints
- Complete authentication & authorization
- Multi-tenancy with data isolation
- Full Docker setup
- Comprehensive testing credentials
- Professional documentation

## License

MIT
