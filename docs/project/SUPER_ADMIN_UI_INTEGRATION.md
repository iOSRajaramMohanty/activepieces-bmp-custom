# Super Admin UI Integration Guide

## ✅ Super Admin API Endpoints Are Live!

All endpoints are working and accessible at:
- **Base URL**: `http://localhost:4200/api/v1/super-admin`
- **Authentication**: Bearer token from login
- **Access**: Only users with `platformRole: 'SUPER_ADMIN'`

## 📡 Available API Endpoints

### 1. Get All Platforms
```javascript
GET /api/v1/super-admin/platforms

Response:
[
  {
    "id": "platform-id",
    "name": "Demo's Organization",
    "owner_email": "demo@user.com",
    "userCount": "1",
    "projectCount": "1",
    "created": "2026-01-12T10:35:02.790Z",
    ...
  }
]
```

### 2. Get All Users
```javascript
GET /api/v1/super-admin/users

Response:
[
  {
    "id": "user-id",
    "email": "demo@user.com",
    "firstName": "Demo",
    "lastName": "User",
    "platformRole": "SUPER_ADMIN",
    "platformName": "Demo's Organization",
    "status": "ACTIVE",
    ...
  }
]
```

### 3. Get All Projects
```javascript
GET /api/v1/super-admin/projects

Response:
[
  {
    "id": "project-id",
    "displayName": "Demo's Project",
    "platformName": "Demo's Organization",
    "ownerEmail": "demo@user.com",
    "flowCount": "0",
    ...
  }
]
```

### 4. Get Platform Users
```javascript
GET /api/v1/super-admin/platforms/:platformId/users

Response:
[
  {
    "id": "user-id",
    "email": "user@example.com",
    "platformRole": "ADMIN",
    "status": "ACTIVE",
    ...
  }
]
```

### 5. Get Platform Projects
```javascript
GET /api/v1/super-admin/platforms/:platformId/projects

Response:
[
  {
    "id": "project-id",
    "displayName": "My Project",
    "ownerEmail": "user@example.com",
    "flowCount": "5",
    ...
  }
]
```

### 6. Get System Statistics
```javascript
GET /api/v1/super-admin/stats

Response:
{
  "totalPlatforms": 3,
  "totalUsers": 3,
  "totalProjects": 3,
  "totalFlows": 1,
  "totalSuperAdmins": 1,
  "totalAdmins": 2
}
```

## 🎨 Frontend Integration

### Angular/TypeScript Service

Create a super admin service:

```typescript
// super-admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly API_URL = '/api/v1/super-admin';

  constructor(private http: HttpClient) {}

  getAllPlatforms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/platforms`);
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/users`);
  }

  getAllProjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/projects`);
  }

  getPlatformUsers(platformId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/platforms/${platformId}/users`);
  }

  getPlatformProjects(platformId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/platforms/${platformId}/projects`);
  }

  getSystemStats(): Observable<any> {
    return this.http.get(`${this.API_URL}/stats`);
  }
}
```

### React/TypeScript Service

```typescript
// superAdminService.ts
import axios from 'axios';

const API_URL = '/api/v1/super-admin';

export const superAdminService = {
  getAllPlatforms: async () => {
    const response = await axios.get(`${API_URL}/platforms`);
    return response.data;
  },

  getAllUsers: async () => {
    const response = await axios.get(`${API_URL}/users`);
    return response.data;
  },

  getAllProjects: async () => {
    const response = await axios.get(`${API_URL}/projects`);
    return response.data;
  },

  getPlatformUsers: async (platformId: string) => {
    const response = await axios.get(`${API_URL}/platforms/${platformId}/users`);
    return response.data;
  },

  getPlatformProjects: async (platformId: string) => {
    const response = await axios.get(`${API_URL}/platforms/${platformId}/projects`);
    return response.data;
  },

  getSystemStats: async () => {
    const response = await axios.get(`${API_URL}/stats`);
    return response.data;
  },
};
```

## 🧪 Testing in Browser Console

You can test these endpoints directly in the browser console:

### Step 1: Login and Get Token
```javascript
// Login as super admin
const loginResponse = await fetch('http://localhost:4200/api/v1/authentication/sign-in', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'demo@user.com',
    password: 'Test@123'
  })
});
const { token } = await loginResponse.json();
console.log('Token:', token);
```

### Step 2: Call Super Admin APIs
```javascript
// Get all platforms
const platforms = await fetch('http://localhost:4200/api/v1/super-admin/platforms', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
console.log('Platforms:', platforms);

// Get all users
const users = await fetch('http://localhost:4200/api/v1/super-admin/users', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
console.log('Users:', users);

// Get system stats
const stats = await fetch('http://localhost:4200/api/v1/super-admin/stats', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
console.log('Stats:', stats);
```

## 🎯 UI Component Examples

### Dashboard Stats Card (Angular)
```typescript
// super-admin-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { SuperAdminService } from './super-admin.service';

@Component({
  selector: 'app-super-admin-dashboard',
  template: `
    <div class="dashboard">
      <h1>Super Admin Dashboard</h1>
      
      <div class="stats-grid" *ngIf="stats">
        <div class="stat-card">
          <h3>{{ stats.totalPlatforms }}</h3>
          <p>Total Platforms</p>
        </div>
        <div class="stat-card">
          <h3>{{ stats.totalUsers }}</h3>
          <p>Total Users</p>
        </div>
        <div class="stat-card">
          <h3>{{ stats.totalProjects }}</h3>
          <p>Total Projects</p>
        </div>
        <div class="stat-card">
          <h3>{{ stats.totalFlows }}</h3>
          <p>Total Flows</p>
        </div>
      </div>

      <div class="platforms-list">
        <h2>All Platforms</h2>
        <table *ngIf="platforms">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Users</th>
              <th>Projects</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let platform of platforms">
              <td>{{ platform.name }}</td>
              <td>{{ platform.owner_email }}</td>
              <td>{{ platform.userCount }}</td>
              <td>{{ platform.projectCount }}</td>
              <td>{{ platform.created | date }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class SuperAdminDashboardComponent implements OnInit {
  stats: any;
  platforms: any[];
  users: any[];

  constructor(private superAdminService: SuperAdminService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.superAdminService.getSystemStats().subscribe(
      stats => this.stats = stats
    );
    this.superAdminService.getAllPlatforms().subscribe(
      platforms => this.platforms = platforms
    );
    this.superAdminService.getAllUsers().subscribe(
      users => this.users = users
    );
  }
}
```

### Platform List (React)
```tsx
// SuperAdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { superAdminService } from './superAdminService';

export const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [statsData, platformsData, usersData] = await Promise.all([
      superAdminService.getSystemStats(),
      superAdminService.getAllPlatforms(),
      superAdminService.getAllUsers(),
    ]);
    setStats(statsData);
    setPlatforms(platformsData);
    setUsers(usersData);
  };

  return (
    <div className="dashboard">
      <h1>Super Admin Dashboard</h1>
      
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{stats.totalPlatforms}</h3>
            <p>Total Platforms</p>
          </div>
          <div className="stat-card">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
          <div className="stat-card">
            <h3>{stats.totalProjects}</h3>
            <p>Total Projects</p>
          </div>
          <div className="stat-card">
            <h3>{stats.totalFlows}</h3>
            <p>Total Flows</p>
          </div>
        </div>
      )}

      <div className="platforms-list">
        <h2>All Platforms</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Users</th>
              <th>Projects</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map(platform => (
              <tr key={platform.id}>
                <td>{platform.name}</td>
                <td>{platform.owner_email}</td>
                <td>{platform.userCount}</td>
                <td>{platform.projectCount}</td>
                <td>{new Date(platform.created).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

## 🔒 Security Notes

1. **Authorization**: All endpoints check that the user has `platformRole: 'SUPER_ADMIN'`
2. **Authentication**: All endpoints require a valid Bearer token
3. **Cross-tenant Access**: Super admins can access data from ALL platforms
4. **Rate Limiting**: Standard rate limits apply (if configured)

## 📱 Quick Test HTML Page

Create `super-admin-test.html` in your public folder:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Super Admin Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .stat-card { background: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-card h2 { margin: 0; color: #6e41e2; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #6e41e2; color: white; }
        .error { color: red; }
        .success { color: green; }
    </style>
</head>
<body>
    <h1>Super Admin Dashboard</h1>
    
    <div id="login-section">
        <h2>Login</h2>
        <input type="email" id="email" placeholder="Email" value="demo@user.com">
        <input type="password" id="password" placeholder="Password" value="Test@123">
        <button onclick="login()">Login</button>
        <div id="login-status"></div>
    </div>

    <div id="dashboard" style="display: none;">
        <h2>System Statistics</h2>
        <div class="stats" id="stats"></div>

        <h2>All Platforms</h2>
        <table id="platforms-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Owner</th>
                    <th>Users</th>
                    <th>Projects</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody id="platforms-body"></tbody>
        </table>

        <h2>All Users</h2>
        <table id="users-table">
            <thead>
                <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Platform</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="users-body"></tbody>
        </table>
    </div>

    <script>
        let token = null;

        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const statusDiv = document.getElementById('login-status');

            try {
                const response = await fetch('/api/v1/authentication/sign-in', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                
                if (data.platformRole !== 'SUPER_ADMIN') {
                    statusDiv.innerHTML = '<p class="error">You must be a super admin to access this page.</p>';
                    return;
                }

                token = data.token;
                statusDiv.innerHTML = '<p class="success">✅ Logged in successfully!</p>';
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
                loadDashboard();
            } catch (error) {
                statusDiv.innerHTML = `<p class="error">Login failed: ${error.message}</p>`;
            }
        }

        async function loadDashboard() {
            // Load stats
            const stats = await fetchAPI('/api/v1/super-admin/stats');
            document.getElementById('stats').innerHTML = `
                <div class="stat-card"><h2>${stats.totalPlatforms}</h2><p>Platforms</p></div>
                <div class="stat-card"><h2>${stats.totalUsers}</h2><p>Users</p></div>
                <div class="stat-card"><h2>${stats.totalProjects}</h2><p>Projects</p></div>
                <div class="stat-card"><h2>${stats.totalFlows}</h2><p>Flows</p></div>
            `;

            // Load platforms
            const platforms = await fetchAPI('/api/v1/super-admin/platforms');
            const platformsBody = document.getElementById('platforms-body');
            platformsBody.innerHTML = platforms.map(p => `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.owner_email}</td>
                    <td>${p.userCount}</td>
                    <td>${p.projectCount}</td>
                    <td>${new Date(p.created).toLocaleDateString()}</td>
                </tr>
            `).join('');

            // Load users
            const users = await fetchAPI('/api/v1/super-admin/users');
            const usersBody = document.getElementById('users-body');
            usersBody.innerHTML = users.map(u => `
                <tr>
                    <td>${u.email}</td>
                    <td>${u.firstName} ${u.lastName}</td>
                    <td>${u.platformRole}</td>
                    <td>${u.platformName}</td>
                    <td>${u.status}</td>
                </tr>
            `).join('');
        }

        async function fetchAPI(endpoint) {
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.json();
        }
    </script>
</body>
</html>
```

Save this file and access it at `http://localhost:4200/super-admin-test.html`

## ✅ Summary

Your Super Admin API is **fully functional** and ready for UI integration!

**Available Now:**
- ✅ View all platforms/tenants
- ✅ View all users across all platforms
- ✅ View all projects across all platforms
- ✅ View users/projects for specific platforms
- ✅ View system statistics
- ✅ Full authorization (only super admins can access)

**Next Steps:**
1. Integrate these APIs into your existing Angular/React frontend
2. Create a Super Admin dashboard page
3. Add navigation links visible only to super admins
4. Style the components to match your design system

**Test It Now:**
```bash
# Login as super admin
curl -X POST http://localhost:4200/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@user.com","password":"Test@123"}'

# Use the token from the response
curl http://localhost:4200/api/v1/super-admin/platforms \
  -H "Authorization: Bearer YOUR_TOKEN"
```

🎉 **Your multi-tenant super admin system is complete!**
