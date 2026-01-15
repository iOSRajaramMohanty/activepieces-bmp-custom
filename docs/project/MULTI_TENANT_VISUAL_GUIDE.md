# Multi-Tenant System - Visual Guide

## Quick Reference Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPER_ADMIN                              │
│  • Create Tenants (Owners)                                 │
│  • View All Tenants                                         │
│  • Switch to Tenant Accounts                                │
│  • NO Personal Projects                                     │
│  • NO Flows                                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Creates
                            ▼
        ┌───────────────────────────────────────┐
        │         OWNER (Tenant)                │
        │  • Invite Admins                      │
        │  • View All Projects & Flows          │
        │  • View Operator/Member Flows         │
        │  • Switch to Admin Accounts           │
        │  • NO Personal Projects               │
        │  • NO Flows                           │
        └───────────────────────────────────────┘
                    │
                    │ Invites
                    ▼
        ┌───────────────────────────────────────┐
        │            ADMIN                      │
        │  • Invite Operators/Members           │
        │  • Create Personal Projects            │
        │  • Create Flows                       │
        │  • Projects Visible to All            │
        └───────────────────────────────────────┘
                    │
                    │ Invites
                    ▼
    ┌───────────────────┬───────────────────┐
    │     OPERATOR       │      MEMBER        │
    │  • View Admin      │  • View Admin      │
    │    Projects        │    Projects        │
    │  • Create Flows    │  • Create Flows    │
    │  • NO Projects     │  • NO Projects     │
    └───────────────────┴───────────────────┘
```

---

## Project Visibility Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN Creates Project                     │
│                    (Type: PERSONAL)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Automatically Visible To:
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│    OWNER     │   │   OPERATOR   │   │    MEMBER    │
│              │   │              │   │              │
│ Can View     │   │ Can View    │   │ Can View     │
│ Can View     │   │ Can Create   │   │ Can Create   │
│ All Flows    │   │ Flows        │   │ Flows        │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## Flow Creation Permissions

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN                                    │
│  ✅ Create Flows in Own Projects                            │
│  ✅ View All Flows in Own Projects                          │
│  ✅ View Operator/Member Created Flows                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              OPERATOR / MEMBER                              │
│  ✅ Create Flows in Admin's Projects                         │
│  ✅ View All Flows in Admin's Projects                       │
│  ✅ View Other Operator/Member Flows                         │
│  ❌ Cannot Create Projects                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    OWNER                                    │
│  ✅ View All Flows (Admin + Operator/Member)                │
│  ❌ Cannot Create Flows                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  SUPER_ADMIN                                │
│  ✅ View All Flows (via Account Switch)                     │
│  ❌ Cannot Create Flows                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Account Switching Flow

```
┌─────────────────────────────────────────────────────────────┐
│              SUPER_ADMIN Dashboard                          │
│                                                             │
│  [View Tenants] [Create Tenant] [Switch to Tenant]         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Clicks "Switch to Tenant"
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              OWNER Dashboard (Switched)                    │
│                                                             │
│  [View Projects] [View Flows] [Invite Admin]               │
│  [Back to Super Admin]                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Clicks "Back to Super Admin"
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPER_ADMIN Dashboard                          │
│                                                             │
│  (Session Restored)                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Invitation Hierarchy

```
Step 1: SUPER_ADMIN → OWNER
┌─────────────────────────────────────────────────────────────┐
│  Super Admin creates tenant                                 │
│  • Tenant Name                                              │
│  • Owner Email                                              │
│  • Owner Password                                           │
│                                                             │
│  System Creates:                                           │
│  ✅ Platform (Tenant)                                       │
│  ✅ Owner User (Role: ADMIN)                                │
│  ❌ NO Personal Project                                     │
└─────────────────────────────────────────────────────────────┘

Step 2: OWNER → ADMIN
┌─────────────────────────────────────────────────────────────┐
│  Owner invites admin                                        │
│  • Email: admin@example.com                                 │
│  • Role: ADMIN                                              │
│                                                             │
│  Admin accepts & signs up                                   │
│  System Creates:                                           │
│  ✅ User (Role: ADMIN)                                      │
│  ✅ Personal Project (Default)                              │
│  ✅ Project Visible to All                                  │
└─────────────────────────────────────────────────────────────┘

Step 3: ADMIN → OPERATOR/MEMBER
┌─────────────────────────────────────────────────────────────┐
│  Admin invites operator/member                              │
│  • Email: operator@example.com                             │
│  • Role: OPERATOR or MEMBER                                 │
│                                                             │
│  Operator/Member accepts & signs up                         │
│  System Creates:                                           │
│  ✅ User (Role: OPERATOR/MEMBER)                            │
│  ❌ NO Personal Project                                     │
│  ✅ Can See Admin Projects                                  │
│  ✅ Can Create Flows                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure Example

```
Platform: "Acme Corp"
├── Owner: owner@acme.com
│   └── (No Projects)
│
├── Admin 1: admin1@acme.com
│   ├── Project: "Marketing Automation"
│   │   ├── Flow: "Email Campaign" (Created by Admin 1)
│   │   ├── Flow: "Social Media Post" (Created by Operator 1)
│   │   └── Flow: "Analytics Report" (Created by Member 1)
│   │
│   └── Project: "Customer Support"
│       ├── Flow: "Ticket Routing" (Created by Admin 1)
│       └── Flow: "Auto Response" (Created by Operator 2)
│
├── Admin 2: admin2@acme.com
│   └── Project: "Sales Pipeline"
│       ├── Flow: "Lead Scoring" (Created by Admin 2)
│       └── Flow: "Follow-up Email" (Created by Member 2)
│
├── Operator 1: operator1@acme.com
│   └── (No Projects, but can see Admin 1's projects)
│
├── Operator 2: operator2@acme.com
│   └── (No Projects, but can see Admin 1's projects)
│
├── Member 1: member1@acme.com
│   └── (No Projects, but can see Admin 1's projects)
│
└── Member 2: member2@acme.com
    └── (No Projects, but can see Admin 2's projects)
```

---

## Role Capabilities Matrix

| Capability | SUPER_ADMIN | OWNER | ADMIN | OPERATOR | MEMBER |
|------------|-------------|-------|-------|----------|--------|
| Create Tenant | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite Admin | ❌ | ✅ | ❌ | ❌ | ❌ |
| Invite Operator/Member | ❌ | ❌ | ✅ | ❌ | ❌ |
| Create Project | ❌ | ❌ | ✅ | ❌ | ❌ |
| Create Flow (Own Project) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Create Flow (Admin Project) | ❌ | ❌ | ❌ | ✅ | ✅ |
| View All Projects | ✅ (via switch) | ✅ | ✅ (own only) | ✅ (admin's) | ✅ (admin's) |
| View All Flows | ✅ (via switch) | ✅ | ✅ | ✅ | ✅ |
| Switch Accounts | ✅ (to owner) | ✅ (to admin) | ❌ | ❌ | ❌ |
| Personal Projects | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## Key Rules Summary

### ✅ Allowed Actions

1. **Super Admin**
   - Create tenants
   - Switch to tenant accounts
   - View all tenant data

2. **Owner**
   - Invite admins
   - View all projects and flows
   - Manage platform settings

3. **Admin**
   - Create personal projects (visible to all)
   - Create flows in own projects
   - Invite operators/members
   - View all flows in own projects

4. **Operator/Member**
   - View admin's projects
   - Create flows in admin's projects
   - View all flows in admin's projects

### ❌ Restricted Actions

1. **Super Admin**
   - Cannot create projects
   - Cannot create flows
   - Cannot be invited

2. **Owner**
   - Cannot create projects (unless switched to admin)
   - Cannot create flows (unless switched to admin)
   - Cannot invite operators/members directly (unless switched to admin)

3. **Admin**
   - Cannot invite other admins
   - Cannot see other admin's projects (unless owner)

4. **Operator/Member**
   - Cannot create projects
   - Cannot invite users
   - Cannot see other admin's projects (only their assigned admin)

---

## Implementation Checklist

- [ ] Super Admin tenant creation endpoint
- [ ] Account switching functionality
- [ ] Project visibility filters
- [ ] Flow creation permissions
- [ ] Invitation role hierarchy validation
- [ ] UI for role-based dashboards
- [ ] Project auto-visibility for operators/members
- [ ] Owner dashboard showing all projects/flows
- [ ] Super Admin tenant management UI
- [ ] Role-based navigation restrictions

---

## Notes

1. **Personal Projects**: Only admins can create projects, and they are automatically visible to all operators/members in the platform.

2. **No Personal Projects**: Super Admin and Owner cannot have personal projects. They can only view projects created by admins.

3. **Flow Creation**: Operators and members can create flows in admin's projects, but the project ownership remains with the admin.

4. **Account Switching**: 
   - Super Admin can switch into any owner account to view their data
   - Owner can switch into any admin account within their platform
   - When switched, users can perform actions as the switched account (e.g., owner switched to admin can create projects/flows)
   - Both can switch back to their original account

5. **Visibility**: All admin personal projects are visible to all platform members (operators/members) by default. No additional permissions needed.
