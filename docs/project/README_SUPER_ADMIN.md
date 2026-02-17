# 🛡️ Super Admin Dashboard - README

## 🎯 Quick Access

**URL**: http://localhost:4300/super-admin  
**Login**: demo@user.com / Test@123  
**Location**: Sidebar → "Super Admin Dashboard" (Shield icon)

---

## 📋 What You Can See

### As a Super Admin (demo@user.com), you can view:

✅ **All Platforms** - Every organization/tenant in the system  
✅ **All Users** - Every user across all platforms with their roles  
✅ **All Projects** - Every project including personal projects  
✅ **System Statistics** - Total counts of platforms, users, projects, flows  

---

## 🚀 Quick Start

```bash
# 1. Start services
./scripts/restart-all.sh

# 2. Open browser
open http://localhost:4300

# 3. Login
Email: demo@user.com
Password: Test@123

# 4. Click "Super Admin Dashboard" in sidebar
```

---

## 📊 Dashboard Sections

### 1. Statistics Cards (Top)
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Platforms  │    Users    │  Projects   │    Flows    │
│      3      │      5      │      8      │     12      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### 2. Platforms Tab
View all organizations with user and project counts

### 3. Users Tab
View all users with:
- 🟣 Super Admin (Purple badge)
- 🔵 Admin (Blue badge)
- ⚪ Member/Operator (Gray badge)
- 🟢 Active status (Green)
- 🔴 Inactive status (Red)

### 4. Projects Tab
View all projects with flow counts and owner information

---

## 🔐 Access Control

### Who Can Access?
✅ **Super Admins Only** (platformRole: 'SUPER_ADMIN')

### What Happens for Others?
❌ Non-super-admins see "Access Denied" message  
❌ Sidebar link not visible to non-super-admins  
❌ API returns 403 Forbidden

---

## 📁 Files Added

```
packages/react-ui/src/
├── lib/super-admin-api.ts           # API service
├── hooks/super-admin-hooks.ts       # React Query hooks
└── app/routes/super-admin/index.tsx # Dashboard page
```

---

## 🔧 Configuration

### Change Data Refresh Interval
**File**: `packages/react-ui/src/hooks/super-admin-hooks.ts`
```typescript
staleTime: 30000, // Change this (milliseconds)
```

### Enable Table Pagination
**File**: `packages/react-ui/src/app/routes/super-admin/index.tsx`
```typescript
hidePagination={false} // Change to false
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Dashboard not loading | Run `./scripts/check-status.sh` |
| "Access Denied" | Login as demo@user.com |
| No data showing | Check database has data |
| Sidebar link missing | Ensure logged in as super admin |

---

## 📚 Documentation Files

1. **SUPER_ADMIN_QUICK_START.md** - Quick reference guide
2. **SUPER_ADMIN_REACT_UI_GUIDE.md** - Comprehensive guide
3. **SUPER_ADMIN_ARCHITECTURE.md** - Technical architecture
4. **IMPLEMENTATION_SUMMARY.md** - Implementation overview
5. **README_SUPER_ADMIN.md** - This file

---

## 🎨 Features

✅ Real-time statistics  
✅ Sortable data tables  
✅ Color-coded badges  
✅ Auto-refresh (30s)  
✅ Loading states  
✅ Empty states  
✅ Responsive design  
✅ Type-safe APIs  

---

## 🧪 Test It

```bash
# Test API directly
curl http://localhost:3000/v1/super-admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "totalPlatforms": 3,
#   "totalUsers": 5,
#   "totalProjects": 8,
#   "totalFlows": 12
# }
```

---

## ✨ Summary

**Status**: ✅ Production Ready  
**Access**: Super Admins Only  
**URL**: http://localhost:4201/super-admin  
**Login**: demo@user.com

---

**Created**: 2026-01-13  
**Version**: 1.0.0  
**Maintained by**: Development Team  
**Access URL**: http://localhost:4300/super-admin
