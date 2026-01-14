# Super Admin Dashboard - React UI Guide

## ✅ What Has Been Added

I've successfully integrated a Super Admin Dashboard into your React UI project. This allows super admin users (like `demo@user.com`) to view all platforms, users, and projects across the entire system.

## 📁 Files Created/Modified

### New Files Created:

1. **`packages/react-ui/src/lib/super-admin-api.ts`**
   - API service for all super admin endpoints
   - Includes methods for:
     - `getAllPlatforms()` - Get all platforms/tenants
     - `getAllUsers()` - Get all users across all platforms
     - `getAllProjects()` - Get all projects across all platforms
     - `getPlatformUsers(platformId)` - Get users for a specific platform
     - `getPlatformProjects(platformId)` - Get projects for a specific platform
     - `getSystemStats()` - Get system-wide statistics

2. **`packages/react-ui/src/hooks/super-admin-hooks.ts`**
   - React Query hooks for super admin data fetching
   - All hooks include:
     - Automatic caching (30 second stale time)
     - Loading states
     - Error handling
     - Automatic refetching

3. **`packages/react-ui/src/app/routes/super-admin/index.tsx`**
   - Complete Super Admin Dashboard page
   - Features:
     - Statistics cards showing totals (platforms, users, projects, flows)
     - Three tabbed views: Platforms, Users, Projects
     - Data tables with sorting and filtering
     - Role badges with color coding
     - Status indicators
     - Formatted dates
     - Access control (only super admins can view)

### Modified Files:

4. **`packages/react-ui/src/app/guards/index.tsx`**
   - Added route for `/super-admin` path
   - Integrated with PlatformLayout

5. **`packages/react-ui/src/app/components/sidebar/platform/index.tsx`**
   - Added "Super Admin Dashboard" link to sidebar
   - Link only appears for users with `SUPER_ADMIN` role
   - Positioned at the top of the General section with Shield icon

## 🚀 How to Access the Super Admin Dashboard

### Step 1: Start Your Services

Make sure both backend and frontend are running:

```bash
# Check if services are running
./scripts/check-status.sh

# If not running, start them
./scripts/restart-all.sh
```

### Step 2: Login as Super Admin

1. Open your browser and go to: **http://localhost:4200**
2. Login with super admin credentials:
   - **Email**: `demo@user.com`
   - **Password**: `Test@123` (or your configured password)

### Step 3: Access the Dashboard

Once logged in as a super admin, you have **two ways** to access the dashboard:

#### Option 1: Via Sidebar (Recommended)
1. Click on the hamburger menu or navigate to Platform Admin
2. In the sidebar, you'll see **"Super Admin Dashboard"** at the top of the General section (with a Shield icon)
3. Click on it to open the dashboard

#### Option 2: Direct URL
- Navigate directly to: **http://localhost:4200/super-admin**

## 📊 Dashboard Features

### Statistics Cards (Top Section)
- **Total Platforms**: Number of organizations/tenants
- **Total Users**: Number of users (with breakdown of super admins and admins)
- **Total Projects**: Number of projects across all platforms
- **Total Flows**: Number of flows across all projects

### Platforms Tab
View all platforms/organizations with:
- Platform Name
- Owner Email
- Number of Users
- Number of Projects
- Creation Date

### Users Tab
View all users across all platforms with:
- Email
- Full Name
- Platform they belong to
- Role (with color-coded badges):
  - 🟣 **Super Admin** (Purple)
  - 🔵 **Admin** (Blue)
  - ⚪ **Operator/Member** (Gray)
- Status (Active/Inactive with color indicators)
- External ID
- Creation Date

### Projects Tab
View all projects across all platforms with:
- Project Name
- Platform Name
- Owner Email
- Number of Flows
- Creation Date

## 🔒 Security & Access Control

### Built-in Protection
The dashboard includes automatic access control:

```typescript
// Only super admins can access
if (currentUser?.platformRole !== PlatformRole.SUPER_ADMIN) {
  return <AccessDenied />
}
```

If a non-super-admin user tries to access `/super-admin`, they will see an "Access Denied" message.

### API Security
All API endpoints (`/api/v1/super-admin/*`) are protected at the backend level and require:
1. Valid authentication token
2. User must have `platformRole: 'SUPER_ADMIN'`

## 🎨 UI Features

### Modern Design
- Clean, responsive layout using shadcn/ui components
- Tabbed interface for easy navigation
- Data tables with:
  - Sortable columns
  - Truncated text for long values
  - Formatted dates
  - Color-coded badges for roles and statuses
  - Empty states with helpful messages

### Performance
- Data caching (30-second stale time)
- Loading states for all data fetches
- Optimized re-renders with React Query
- Parallel data fetching for better performance

## 🧪 Testing the Dashboard

### Test Scenario 1: View All Data
1. Login as `demo@user.com`
2. Navigate to Super Admin Dashboard
3. You should see statistics at the top
4. Switch between Platforms, Users, and Projects tabs
5. Verify data is displayed correctly

### Test Scenario 2: Access Control
1. Login as a regular user (non-super-admin)
2. Try to navigate to `/super-admin`
3. You should see "Access Denied" message

### Test Scenario 3: Real-time Updates
1. Open the dashboard
2. In another tab/window, create a new user or project
3. Refresh the dashboard (or wait 30 seconds for auto-refresh)
4. New data should appear

## 📡 API Endpoints Used

The dashboard uses these backend endpoints:

```
GET /api/v1/super-admin/platforms      - List all platforms
GET /api/v1/super-admin/users          - List all users
GET /api/v1/super-admin/projects       - List all projects
GET /api/v1/super-admin/stats          - Get system statistics
```

All requests include the authentication token automatically.

## 🔧 Customization Options

### Modify Refresh Interval
In `packages/react-ui/src/hooks/super-admin-hooks.ts`:

```typescript
staleTime: 30000, // Change to your preferred milliseconds
```

### Add More Statistics
In `packages/react-ui/src/app/routes/super-admin/index.tsx`, add more cards:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Your Custom Stat</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{stats?.yourStat ?? 0}</div>
  </CardContent>
</Card>
```

### Customize Table Columns
Modify the `columns` array in each tab to add/remove/reorder columns.

## 🐛 Troubleshooting

### Dashboard Not Loading
1. Check if backend is running: `./scripts/check-status.sh`
2. Verify you're logged in as super admin
3. Check browser console for errors
4. Verify API endpoints are accessible: `curl http://localhost:3000/v1/super-admin/stats -H "Authorization: Bearer YOUR_TOKEN"`

### "Access Denied" Message
- Ensure you're logged in with a super admin account
- Check user's `platformRole` in the database
- Verify the user has `platformRole: 'SUPER_ADMIN'`

### Data Not Showing
1. Check if there's data in the database
2. Open browser DevTools → Network tab
3. Look for API calls to `/api/v1/super-admin/*`
4. Check response status and data

### Sidebar Link Not Visible
- Ensure you're logged in as super admin
- The link only appears for users with `platformRole: 'SUPER_ADMIN'`
- Try refreshing the page

## 📝 Code Structure

```
packages/react-ui/src/
├── lib/
│   └── super-admin-api.ts          # API service layer
├── hooks/
│   └── super-admin-hooks.ts        # React Query hooks
├── app/
│   ├── routes/
│   │   └── super-admin/
│   │       └── index.tsx           # Main dashboard component
│   ├── guards/
│   │   └── index.tsx               # Route configuration
│   └── components/
│       └── sidebar/
│           └── platform/
│               └── index.tsx       # Sidebar with super admin link
```

## ✨ Key Features Summary

✅ **Complete Dashboard**: View all platforms, users, and projects  
✅ **Statistics Overview**: Real-time system statistics  
✅ **Tabbed Interface**: Easy navigation between different views  
✅ **Role-based Access**: Only super admins can access  
✅ **Sidebar Integration**: Quick access from platform admin  
✅ **Modern UI**: Clean, responsive design with shadcn/ui  
✅ **Data Tables**: Sortable, filterable, with pagination support  
✅ **Color-coded Badges**: Visual indicators for roles and statuses  
✅ **Auto-refresh**: Data updates every 30 seconds  
✅ **Loading States**: Smooth user experience during data fetching  
✅ **Error Handling**: Graceful error messages  

## 🎉 You're All Set!

Your React UI now has a fully functional Super Admin Dashboard! Login as `demo@user.com` and navigate to the Super Admin Dashboard from the sidebar to see all your platform data in one place.

---

**Created**: 2026-01-13  
**Location**: `/Users/rajarammohanty/Documents/POC/activepieces/`  
**Access URL**: `http://localhost:4200/super-admin`
