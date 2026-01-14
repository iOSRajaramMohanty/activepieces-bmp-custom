# 🚀 Super Admin Dashboard - Quick Start

## ⚡ TL;DR - How to View Super Admin Dashboard

### 1️⃣ Start Services
```bash
./scripts/restart-all.sh
```

### 2️⃣ Login
- Open: **http://localhost:4200**
- Email: **demo@user.com**
- Password: **Test@123**

### 3️⃣ Access Dashboard
**Option A**: Click **"Super Admin Dashboard"** in the sidebar (Shield icon)  
**Option B**: Navigate to **http://localhost:4200/super-admin**

---

## 📊 What You'll See

### Statistics Cards
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Total Platforms │   Total Users   │ Total Projects  │   Total Flows   │
│       3         │       5         │       8         │       12        │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Three Tabs

#### 📍 Platforms Tab
View all organizations/tenants:
- Platform Name
- Owner Email  
- User Count
- Project Count
- Created Date

#### 👥 Users Tab
View all users across all platforms:
- Email
- Name
- Platform
- Role (Super Admin 🟣 / Admin 🔵 / Member ⚪)
- Status (Active 🟢 / Inactive 🔴)
- External ID
- Created Date

#### 📁 Projects Tab
View all projects across all platforms:
- Project Name
- Platform
- Owner Email
- Flow Count
- Created Date

---

## 🔐 Who Can Access?

✅ **Super Admins Only** (like demo@user.com)  
❌ Regular users will see "Access Denied"

---

## 🎯 What Was Added?

### New Files:
1. `packages/react-ui/src/lib/super-admin-api.ts` - API service
2. `packages/react-ui/src/hooks/super-admin-hooks.ts` - React hooks
3. `packages/react-ui/src/app/routes/super-admin/index.tsx` - Dashboard page

### Modified Files:
1. `packages/react-ui/src/app/guards/index.tsx` - Added route
2. `packages/react-ui/src/app/components/sidebar/platform/index.tsx` - Added sidebar link

---

## 🧪 Quick Test

```bash
# 1. Check services are running
./scripts/check-status.sh

# 2. Test API directly (after getting token from login)
curl http://localhost:3000/v1/super-admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "totalPlatforms": 3,
#   "totalUsers": 5,
#   "totalProjects": 8,
#   "totalFlows": 12,
#   "totalSuperAdmins": 1,
#   "totalAdmins": 2
# }
```

---

## 📸 Visual Guide

### Sidebar Navigation
```
Platform Admin Sidebar
├── 🏠 Exit platform admin
├── ━━━━━━━━━━━━━━━━━━━
├── 📂 General
│   ├── 🛡️  Super Admin Dashboard  ← NEW! (Super Admins only)
│   ├── 📊 Projects
│   └── 👥 Users
├── ━━━━━━━━━━━━━━━━━━━
├── ⚙️  Setup
└── 🔒 Security
```

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Super Admin Dashboard                                       │
│  View and manage all platforms, users, and projects         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │    3    │  │    5    │  │    8    │  │   12    │       │
│  │Platforms│  │  Users  │  │Projects │  │  Flows  │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
├─────────────────────────────────────────────────────────────┤
│  [Platforms] [Users] [Projects]                             │
├─────────────────────────────────────────────────────────────┤
│  📊 All Platforms                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Name          │ Owner         │ Users │ Projects │  │   │
│  │ Demo's Org    │ demo@user.com │   2   │    3     │  │   │
│  │ Acme Corp     │ admin@acme.com│   3   │    5     │  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Features

✅ Real-time statistics  
✅ Sortable data tables  
✅ Color-coded role badges  
✅ Status indicators  
✅ Auto-refresh (30s)  
✅ Loading states  
✅ Empty states  
✅ Access control  
✅ Responsive design  

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Dashboard not loading | Run `./scripts/check-status.sh` and ensure services are running |
| "Access Denied" | Login as super admin (demo@user.com) |
| Sidebar link not visible | Ensure you're logged in as super admin |
| No data showing | Check if there's data in the database |

---

## 📚 Full Documentation

For detailed information, see: **SUPER_ADMIN_REACT_UI_GUIDE.md**

---

**Quick Access URL**: http://localhost:4200/super-admin  
**Super Admin Email**: demo@user.com  
**Created**: 2026-01-13
