# Multi-Tenancy Implementation Guide

## Overview

Activepieces supports three multi-tenancy models:

```
Platform (Tenant Level)
  └── Projects (Workspace Level)
       └── Flows (Automation Level)
```

---

## Option 1: Single Platform with Multiple Users (Current Setup)

### Architecture
- ✅ One platform shared by all users
- ✅ Team collaboration
- ❌ No data isolation between users

### Current Configuration

```bash
# run-dev.sh
export AP_EDITION=ce
export AP_DEV_ALLOW_MULTIPLE_SIGNUPS=true
```

### Use Cases
- Internal company tools
- Team collaboration apps
- Single organization deployment

---

## Option 2: Hostname-Based Multi-Tenancy (SaaS Recommended)

### Architecture
- ✅ Each tenant gets their own platform
- ✅ Complete data isolation
- ✅ Custom branding per tenant
- ✅ Works with CE/EE editions

### How It Works

```
Request Flow:
1. User visits: tenant1.yourapp.com
2. System extracts hostname: "tenant1.yourapp.com"
3. Looks up platform by custom domain
4. Routes to correct isolated platform
```

### Implementation Steps

#### Step 1: Upgrade to Enterprise Edition (or use EE features)

```bash
# run-dev.sh
export AP_EDITION=ee  # Required for custom domains feature
```

**Note:** Custom domains are an EE feature. For CE, see Option 3 below.

#### Step 2: Enable Custom Domains

The custom domain service maps hostnames to platforms:

```typescript
// When user signs up on tenant1.yourapp.com:
customDomainService.create({
    domain: 'tenant1.yourapp.com',
    platformId: newPlatform.id
})
```

#### Step 3: Set Up Wildcard DNS

```
# DNS Configuration
*.yourapp.com  →  Your Server IP
```

#### Step 4: Configure Nginx/Reverse Proxy

```nginx
server {
    server_name *.yourapp.com;
    
    location / {
        proxy_pass http://activepieces:4300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Signup Flow Example

```typescript
// User signs up at tenant1.yourapp.com
POST /api/v1/authentication/sign-up
Host: tenant1.yourapp.com

↓

1. Extract hostname: "tenant1.yourapp.com"
2. Check if platform exists for this domain
3. If not, create new platform
4. Create custom domain mapping
5. Create user and associate with platform
6. Return token scoped to that platform
```

### License Consideration
⚠️ **Custom domains require Enterprise Edition license**

---

## Option 3: Manual Platform Creation (CE-Compatible)

### Architecture
- ✅ Works with Community Edition
- ✅ Full isolation between tenants
- ❌ Requires manual platform setup
- ❌ All tenants share same domain

### Implementation

#### Modify Authentication to Auto-Create Platforms

Create a new file:

```typescript
// packages/server/api/src/app/authentication/multi-tenant-auth.service.ts

import { authenticationService } from './authentication.service'
import { platformService } from '../platform/platform.service'
import { projectService } from '../project/project-service'

export const multiTenantAuthService = (log: FastifyBaseLogger) => ({
    async signUpWithNewPlatform(params: SignUpParams): Promise<AuthenticationResponse> {
        // 1. Create user identity
        const userIdentity = await userIdentityService(log).create({
            ...params,
            verified: true,
        })

        // 2. Create user
        const user = await userService.create({
            identityId: userIdentity.id,
            platformRole: PlatformRole.ADMIN,
            platformId: null,
        })

        // 3. Create dedicated platform for this user
        const platform = await platformService.create({
            ownerId: user.id,
            name: `${userIdentity.firstName}'s Organization`,
        })

        // 4. Associate user with platform
        await userService.addOwnerToPlatform({
            platformId: platform.id,
            id: user.id,
        })

        // 5. Create default project
        const project = await projectService.create({
            displayName: `${userIdentity.firstName}'s Project`,
            ownerId: user.id,
            platformId: platform.id,
            type: ProjectType.PERSONAL,
        })

        // 6. Return token
        return authenticationUtils.getProjectAndToken({
            userId: user.id,
            platformId: platform.id,
            projectId: project.id,
        })
    }
})
```

#### Modify Authentication Controller

```typescript
// packages/server/api/src/app/authentication/authentication.controller.ts

app.post('/sign-up', SignUpRequestOptions, async (request) => {
    // For CE multi-tenant mode, always create new platform
    const createNewPlatform = system.getEdition() === ApEdition.COMMUNITY && 
                             system.get('AP_MULTI_TENANT_MODE') === 'true'
    
    let signUpResponse
    
    if (createNewPlatform) {
        signUpResponse = await multiTenantAuthService(request.log).signUpWithNewPlatform({
            ...request.body,
            provider: UserIdentityProvider.EMAIL,
        })
    } else {
        const platformId = await platformUtils.getPlatformIdForRequest(request)
        signUpResponse = await authenticationService(request.log).signUp({
            ...request.body,
            provider: UserIdentityProvider.EMAIL,
            platformId: platformId ?? null,
        })
    }

    return signUpResponse
})
```

#### Configuration

```bash
# run-dev.sh
export AP_EDITION=ce
export AP_MULTI_TENANT_MODE=true  # Enable CE multi-tenant
```

### User Experience

```
User 1 signs up → Platform A created
User 2 signs up → Platform B created  
User 3 signs up → Platform C created

Each on same domain (localhost:4300), but isolated data
```

### Platform Switching

Users can switch between platforms they belong to:

```typescript
POST /api/v1/authentication/switch-platform
{
  "platformId": "platform-xyz-123"
}
```

---

## Comparison Table

| Feature | Single Platform | Hostname-Based | CE Multi-Tenant |
|---------|----------------|----------------|-----------------|
| **Edition Required** | CE ✅ | EE ⚠️ | CE ✅ |
| **License Cost** | Free | Paid | Free |
| **Data Isolation** | ❌ Shared | ✅ Complete | ✅ Complete |
| **Custom Domains** | ❌ | ✅ | ❌ |
| **Custom Branding** | ❌ | ✅ | ✅ (per platform) |
| **Complexity** | Low | High | Medium |
| **Best For** | Internal tools | SaaS | CE SaaS |

---

## Recommended Approach

### For Your Use Case:

1. **Development/Testing** → Use **Option 1** (current setup)
   - Simple, no changes needed
   - Good for demos

2. **Production SaaS (Budget available)** → Use **Option 2** (EE + Custom Domains)
   - Professional
   - tenant1.yourapp.com, tenant2.yourapp.com
   - Best UX

3. **Production SaaS (CE only)** → Use **Option 3** (CE Multi-Tenant)
   - Free and open source
   - Same domain, isolated data
   - Manual implementation

---

## Migration Path

### From Current Setup → Production Multi-Tenant

```bash
# 1. Keep CE for now
export AP_EDITION=ce

# 2. Implement Option 3 (CE Multi-Tenant)
# - Modify authentication controller
# - Test with multiple signups
# - Each gets isolated platform

# 3. Later: Upgrade to EE for custom domains
export AP_EDITION=ee
# - Add license key
# - Enable custom domain feature
# - Configure wildcard DNS
```

---

## Code to Implement (Option 3 - CE Multi-Tenant)

Would you like me to implement Option 3 for you? I can:

1. ✅ Create the multi-tenant auth service
2. ✅ Modify the authentication controller
3. ✅ Add the configuration flag
4. ✅ Test with multiple signups

This gives you **true multi-tenancy with CE edition** without requiring an EE license!

---

## Questions?

- **Q: Can users belong to multiple platforms?**  
  A: Yes! Users can switch between platforms using the switch-platform API.

- **Q: How do I migrate data between platforms?**  
  A: Export flows as JSON and import into another platform.

- **Q: What about billing per tenant?**  
  A: You'd need to implement your own billing tied to platform ID.

- **Q: Performance with many platforms?**  
  A: Database is indexed by platformId - scales well to thousands of platforms.
