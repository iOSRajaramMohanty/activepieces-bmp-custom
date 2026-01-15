# Multi-Tenant Architecture - EE Compliance Analysis

## Executive Summary

✅ **The Multi-Tenant Architecture is EE Compliant**

Our architecture uses **PERSONAL projects only**, which are **NOT restricted by Enterprise Edition policies**. TEAM projects are EE-only features, but we intentionally avoid using them.

---

## EE Restrictions Analysis

### 1. TEAM Projects (EE-Only Feature)

**EE Restriction:**
- TEAM projects are controlled by `teamProjectsLimit` enum:
  - `NONE`: No team projects allowed (free/community)
  - `ONE`: Maximum 1 team project (limited plans)
  - `UNLIMITED`: Unlimited team projects (Enterprise Edition)

**Location:** `packages/server/api/src/app/ee/projects/platform-project-controller.ts`

```typescript
async function assertMaximumNumberOfProjectsReachedByEdition(platformId: string) {
    const platform = await platformService.getOneWithPlanOrThrow(platformId)
    
    switch (platform.plan.teamProjectsLimit) {
        case TeamProjectsLimit.NONE: {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Team projects are not available on your current plan',
                },
            })
        }
        // ... other cases
    }
}
```

**Our Architecture:**
- ❌ **Does NOT use TEAM projects**
- ✅ Uses PERSONAL projects only
- ✅ No EE restrictions apply

---

### 2. PERSONAL Projects (No EE Restrictions)

**EE Status:**
- ✅ PERSONAL projects are **NOT restricted** by Enterprise Edition
- ✅ Available in all editions (Community, Enterprise, Cloud)
- ✅ No limits on number of personal projects
- ✅ No license key required

**Current Implementation:**
- Platform owner's personal projects are already visible to all platform members
- This was implemented in `applyProjectsAccessFilters` function

**Our Architecture:**
- ✅ Uses PERSONAL projects exclusively
- ✅ Makes admin's personal projects visible to all platform members
- ✅ Similar to existing platform owner visibility (already implemented)
- ✅ **No EE violations**

---

### 3. Project Visibility Rules

**Current Implementation:**
```typescript
// From project-service.ts
export async function applyProjectsAccessFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    params: ApplyProjectsAccessFiltersParams,
): Promise<void> {
    const { platformId, userId, isPrivileged } = params
    if (isPrivileged) {
        return
    }

    // Get platform owner ID to make their personal projects visible to all
    const platform = await platformService.getOneOrThrow(platformId)
    const platformOwnerId = platform.ownerId

    queryBuilder.andWhere(new Brackets(qb => {
        qb.where(
            'project."ownerId" = :userId AND project.type = :personalType',
            { userId, personalType: ProjectType.PERSONAL },
        ).orWhere(
            'project."ownerId" = :platformOwnerId AND project.type = :personalType',
            { platformOwnerId, personalType: ProjectType.PERSONAL },
        ).orWhere(
            'project.id IN (SELECT "projectId" FROM project_member WHERE "userId" = :userId AND "platformId" = :platformId)',
            { userId, platformId },
        )
    }))
}
```

**Our Architecture Extension:**
- We need to extend this to make **admin's personal projects** visible to all platform members
- This is similar to the existing platform owner visibility
- Uses PERSONAL projects (not TEAM projects)
- **No EE restrictions**

---

### 4. Project Member Access (EE Feature)

**EE Restriction:**
- Project members (`project_member` table) are used for TEAM projects
- TEAM projects require EE license
- Project roles are EE-only feature (`projectRolesEnabled`)

**Our Architecture:**
- ❌ **Does NOT use project members**
- ❌ **Does NOT use project roles**
- ✅ Uses platform-level visibility (PERSONAL projects visible to all)
- ✅ **No EE violations**

---

## Compliance Checklist

### ✅ EE Compliance Verified

| Feature | EE Status | Our Usage | Compliance |
|---------|-----------|-----------|------------|
| TEAM Projects | EE-Only | ❌ Not Used | ✅ Compliant |
| PERSONAL Projects | All Editions | ✅ Used | ✅ Compliant |
| Project Members | EE-Only | ❌ Not Used | ✅ Compliant |
| Project Roles | EE-Only | ❌ Not Used | ✅ Compliant |
| Platform Roles | All Editions | ✅ Used | ✅ Compliant |
| Personal Project Visibility | All Editions | ✅ Used | ✅ Compliant |

---

## Implementation Details

### Project Type Usage

**Our Architecture Uses:**
```typescript
ProjectType.PERSONAL  // ✅ No EE restrictions
```

**Our Architecture Does NOT Use:**
```typescript
ProjectType.TEAM      // ❌ EE-only, requires license
```

### Visibility Implementation

**Current (Platform Owner):**
```typescript
// Platform owner's personal projects visible to all
'project."ownerId" = :platformOwnerId AND project.type = :personalType'
```

**Proposed (Admin):**
```typescript
// Admin's personal projects visible to all platform members
'project."ownerId" IN (SELECT id FROM "user" WHERE "platformId" = :platformId AND "platformRole" = :adminRole) AND project.type = :personalType'
```

**EE Compliance:**
- ✅ Uses PERSONAL projects only
- ✅ Uses platform-level filtering (not project members)
- ✅ No EE features required

---

## Potential EE Concerns & Mitigation

### Concern 1: Making Personal Projects Visible to Multiple Users

**Question:** Does making admin's personal projects visible to all platform members violate EE policies?

**Answer:** ✅ **No**
- Personal projects are unlimited in all editions
- Platform owner's personal projects are already visible to all (existing feature)
- We're extending the same pattern to admins
- No project members or TEAM projects involved

### Concern 2: Multiple Admins Creating Projects

**Question:** If multiple admins create projects, does this violate any limits?

**Answer:** ✅ **No**
- Personal projects have no limits
- Each admin can create unlimited personal projects
- All are PERSONAL type (not TEAM)
- No EE restrictions apply

### Concern 3: Account Switching

**Question:** Does account switching require EE features?

**Answer:** ✅ **No**
- Account switching is a session management feature
- Uses existing authentication mechanisms
- No EE-specific features required
- Similar to platform switching (already exists)

---

## Recommendations

### ✅ Safe to Implement

1. **Use PERSONAL Projects Only**
   - ✅ Already planned
   - ✅ No EE restrictions

2. **Extend Visibility Filter**
   - ✅ Similar to existing platform owner visibility
   - ✅ Uses PERSONAL projects only
   - ✅ No project members required

3. **Platform-Level Access Control**
   - ✅ Uses platform roles (not project roles)
   - ✅ Platform roles are available in all editions
   - ✅ No EE license required

### ⚠️ Things to Avoid

1. **Do NOT Use TEAM Projects**
   - ❌ Would require EE license
   - ❌ Would violate compliance

2. **Do NOT Use Project Members**
   - ❌ EE-only feature
   - ❌ Not needed for our architecture

3. **Do NOT Use Project Roles**
   - ❌ EE-only feature (`projectRolesEnabled`)
   - ❌ Use platform roles instead

---

## Code Changes Required

### 1. Update Project Visibility Filter

**File:** `packages/server/api/src/app/project/project-service.ts`

**Change:** Extend `applyProjectsAccessFilters` to include admin's personal projects

```typescript
export async function applyProjectsAccessFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    params: ApplyProjectsAccessFiltersParams,
): Promise<void> {
    const { platformId, userId, isPrivileged } = params
    if (isPrivileged) {
        return
    }

    const platform = await platformService.getOneOrThrow(platformId)
    const platformOwnerId = platform.ownerId

    queryBuilder.andWhere(new Brackets(qb => {
        qb.where(
            'project."ownerId" = :userId AND project.type = :personalType',
            { userId, personalType: ProjectType.PERSONAL },
        ).orWhere(
            // Platform owner's personal projects (existing)
            'project."ownerId" = :platformOwnerId AND project.type = :personalType',
            { platformOwnerId, personalType: ProjectType.PERSONAL },
        ).orWhere(
            // Admin's personal projects (new - EE compliant)
            'project."ownerId" IN (SELECT id FROM "user" WHERE "platformId" = :platformId AND "platformRole" = :adminRole) AND project.type = :personalType',
            { platformId, adminRole: PlatformRole.ADMIN, personalType: ProjectType.PERSONAL },
        ).orWhere(
            'project.id IN (SELECT "projectId" FROM project_member WHERE "userId" = :userId AND "platformId" = :platformId)',
            { userId, platformId },
        )
    }))
}
```

**EE Compliance:** ✅ Uses PERSONAL projects only, no EE features

---

## Conclusion

### ✅ **The Multi-Tenant Architecture is EE Compliant**

**Key Points:**
1. ✅ Uses PERSONAL projects only (no EE restrictions)
2. ✅ Does NOT use TEAM projects (EE-only feature)
3. ✅ Does NOT use project members (EE-only feature)
4. ✅ Does NOT use project roles (EE-only feature)
5. ✅ Uses platform roles (available in all editions)
6. ✅ Extends existing visibility pattern (platform owner → admin)

**No EE License Required:**
- All features use non-EE components
- Personal projects are unlimited in all editions
- Platform-level access control is standard

**Implementation Status:**
- ✅ Safe to implement
- ✅ No EE violations
- ✅ Compatible with Community Edition
- ✅ Compatible with Enterprise Edition
- ✅ Compatible with Cloud Edition

---

## References

1. **TEAM Projects Restriction:**
   - File: `packages/server/api/src/app/ee/projects/platform-project-controller.ts`
   - Function: `assertMaximumNumberOfProjectsReachedByEdition`

2. **Project Access Filters:**
   - File: `packages/server/api/src/app/project/project-service.ts`
   - Function: `applyProjectsAccessFilters`

3. **Platform Plan Model:**
   - File: `packages/shared/src/lib/platform/platform.model.ts`
   - Enum: `TeamProjectsLimit`

4. **Project Types:**
   - `ProjectType.PERSONAL` - No restrictions
   - `ProjectType.TEAM` - EE-only, requires license
