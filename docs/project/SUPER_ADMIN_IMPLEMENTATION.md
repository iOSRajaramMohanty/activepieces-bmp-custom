# Super Admin Implementation Guide

## Overview

This document describes the Super Admin feature implementation for multi-tenant Activepieces.

## Features

### 1. Super Admin Role
- **SUPER_ADMIN** platform role added
- System-wide access across all tenants/platforms
- Can view and manage all data

### 2. Tenant Management
- View all tenants (platforms)
- View tenant details (users, projects, stats)
- Create new tenants
- Disable public signup

### 3. API Endpoints

#### GET `/api/v1/super-admin/platforms`
List all platforms/tenants in the system

**Response:**
```json
{
  "data": [
    {
      "id": "platform-id",
      "name": "Company Name",
      "created": "2026-01-12T10:00:00Z",
      "ownerId": "user-id",
      "userCount": 5,
      "projectCount": 3
    }
  ],
  "total": 10
}
```

#### GET `/api/v1/super-admin/platforms/:id`
Get detailed information about a platform

**Response:**
```json
{
  "platform": { /* full platform object */ },
  "owner": {
    "id": "user-id",
    "status": "ACTIVE",
    "platformRole": "ADMIN"
  },
  "stats": {
    "userCount": 5,
    "projectCount": 3
  }
}
```

#### GET `/api/v1/super-admin/platforms/:id/projects`
List all projects in a platform

#### GET `/api/v1/super-admin/platforms/:id/users`
List all users in a platform

#### POST `/api/v1/super-admin/platforms`
Create a new tenant

**Request:**
```json
{
  "name": "New Company",
  "ownerEmail": "owner@company.com",
  "ownerFirstName": "John",
  "ownerLastName": "Doe",
  "ownerPassword": ""
}
```

#### GET `/api/v1/super-admin/stats`
Get system-wide statistics

**Response:**
```json
{
  "platformCount": 10,
  "totalUsers": 50,
  "totalProjects": 30,
  "totalActiveUsers": 45
}
```

### 4. Signup Control

Environment variable: `AP_PUBLIC_SIGNUP_ENABLED`
- `true` (default): Anyone can sign up
- `false`: Only super admins can create tenants

## Setup

### 1. Create First Super Admin

Run this SQL to create your first super admin:

```sql
-- Find or create a user
UPDATE "user" 
SET "platformRole" = 'SUPER_ADMIN' 
WHERE "identityId" = (
  SELECT id FROM user_identity WHERE email = 'admin@yourdomain.com'
);
```

### 2. Configure Signup

In `run-dev.sh`, add:
```bash
export AP_PUBLIC_SIGNUP_ENABLED=false  # Disable public signup
```

### 3. Access Super Admin API

All super admin endpoints require:
- Authentication (valid JWT token)
- SUPER_ADMIN role

Example:
```bash
curl http://localhost:3000/api/v1/super-admin/platforms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security

### Role Hierarchy
```
SUPER_ADMIN > ADMIN > OPERATOR > MEMBER
```

### Access Control
- **SUPER_ADMIN**: All endpoints, all platforms
- **ADMIN**: Their platform only
- **OPERATOR**: Read access to their platform
- **MEMBER**: Projects they're invited to

### Middleware
Super admin middleware checks:
1. User is authenticated
2. User has SUPER_ADMIN role
3. Denies access if either fails

## Usage Examples

### Create New Tenant

```bash
curl -X POST http://localhost:3000/api/v1/super-admin/platforms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "ownerEmail": "admin@acme.com",
    "ownerFirstName": "Jane",
    "ownerLastName": "Smith",
    "ownerPassword": "SecurePass123"
  }'
```

### View All Tenants

```bash
curl http://localhost:3000/api/v1/super-admin/platforms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get System Stats

```bash
curl http://localhost:3000/api/v1/super-admin/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Schema Changes

### user table
- `platformRole` column now supports 'SUPER_ADMIN' value

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AP_PUBLIC_SIGNUP_ENABLED` | `true` | Allow public signups |
| `AP_MULTI_TENANT_MODE` | `false` | Enable multi-tenant mode |

## Frontend Integration

### Admin Panel (Future)
- Dashboard showing all tenants
- Create new tenant form
- View tenant details
- System statistics

### Access Control
```typescript
// Check if user is super admin
if (user.platformRole === 'SUPER_ADMIN') {
  // Show super admin menu
}
```

## Migration Path

### From Single Tenant
1. Enable multi-tenant mode
2. Create super admin user
3. Existing platform becomes first tenant

### From Multi-Tenant without Super Admin
1. Choose one admin user
2. Promote to SUPER_ADMIN via SQL
3. Configure signup restrictions

## Testing

### Test Super Admin Access
```bash
# 1. Create super admin
# 2. Login as super admin
# 3. Access super admin endpoints
# 4. Verify normal users cannot access
```

### Test Tenant Creation
```bash
# 1. Create tenant via API
# 2. Verify platform created
# 3. Verify owner can login
# 4. Verify data isolation
```

## Troubleshooting

### Cannot Access Super Admin Endpoints
- Verify your user has SUPER_ADMIN role in database
- Check JWT token is valid
- Ensure endpoints are registered in app

### Signup Still Works with Public Disabled
- Check `AP_PUBLIC_SIGNUP_ENABLED` is set to `false`
- Restart server after changing config
- Verify signup controller checks the flag

## Future Enhancements

- [ ] Super admin UI dashboard
- [ ] Tenant usage analytics
- [ ] Bulk tenant operations
- [ ] Tenant suspension/activation
- [ ] Audit logging for super admin actions
- [ ] Super admin activity reports

## API Reference

Full API documentation available at `/api/docs` (if Swagger is enabled)
