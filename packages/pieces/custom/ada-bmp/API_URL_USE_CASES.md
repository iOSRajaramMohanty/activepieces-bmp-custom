# ADA BMP API URL Configuration - Use Cases

## Overview
The ADA BMP piece uses a **3-tier priority system** to resolve the API URL:
1. **Database Metadata** (Organization Environment Metadata) - **RECOMMENDED**
2. **Environment Variables** (Environment-specific: e.g., `STAGING_ADA_BMP_API_URL`)
3. **Default Environment Variable** (`.env` file: `ADA_BMP_API_URL`)

---

## Use Case 1: Fresh Installation (Default Behavior)

### Scenario
Platform owner installs Activepieces and creates the first admin account.

### Configuration
- `.env` file contains:
  ```bash
  ADA_BMP_API_URL=https://bmpapi.bmp.ada-asia.my
  ```
- No database metadata configured yet

### Connection Flow
1. **Admin creates BMP connection:**
   - Fills in: Connection Name = "My BMP Connection"
   - Fills in: API Token = "abc123..."
   - Selects: Environment = "Production"
   - *(No API URL field - removed)*

2. **Validation Process:**
   - Piece checks for environment-specific variable: `PRODUCTION_ADA_BMP_API_URL` → Not found
   - Falls back to default: `ADA_BMP_API_URL` = `https://bmpapi.bmp.ada-asia.my`
   - Validates token against: `https://bmpapi.bmp.ada-asia.my/user/checkToken`
   - ✅ Validation succeeds → Connection saved

3. **Flow Execution:**
   - When flow runs, `config.ts` checks:
     - Priority 1: Database metadata → Not found
     - Priority 2: Environment variable `PRODUCTION_ADA_BMP_API_URL` → Not found
     - Priority 3: Default `.env` → `https://bmpapi.bmp.ada-asia.my`
   - ✅ Uses Production URL

### Result
✅ Works out of the box with default Production URL

---

## Use Case 2: Admin Configures Environment Metadata (Recommended Approach)

### Scenario
Admin wants to use **Staging** environment and configures it in the organization settings.

### Configuration Steps

#### Step 1: Configure Environment Metadata
1. Navigate to: **Organization > Environments**
2. Find the "Staging" environment
3. Click **"My Environment Metadata"**
4. Add configuration:
   ```json
   {
     "ADA_BMP_API_URL": "https://bmpapistgjkt.cl.bmp.ada-asia.my"
   }
   ```
5. Save changes

#### Step 2: Create Connection
1. **Admin creates BMP connection:**
   - Connection Name = "Staging BMP"
   - API Token = "xyz789..."
   - Environment = "Staging"

2. **Validation Process:**
   - Checks: `STAGING_ADA_BMP_API_URL` → Not found
   - Falls back to: `ADA_BMP_API_URL` from `.env` (Production URL)
   - Validates token against Production URL
   - ✅ Validation succeeds (if token is valid for Production)

3. **Flow Execution:**
   - When flow runs, `config.ts` checks:
     - Priority 1: **Database metadata** → ✅ Found `https://bmpapistgjkt.cl.bmp.ada-asia.my`
     - Uses Staging URL from database
   - ✅ Uses correct Staging URL despite validation using Production URL

### Result
✅ Database metadata **overrides** the `.env` default during flow execution

---

## Use Case 3: Multiple Environments with Database Metadata

### Scenario
Organization uses **Dev, Staging, and Production** environments with different API URLs.

### Configuration

#### Environment Metadata Setup
1. **Dev Environment:**
   ```json
   {
     "ADA_BMP_API_URL": "https://bmpapidev2.cl.bmp.ada-asia.my"
   }
   ```

2. **Staging Environment:**
   ```json
   {
     "ADA_BMP_API_URL": "https://bmpapistgjkt.cl.bmp.ada-asia.my"
   }
   ```

3. **Production Environment:**
   ```json
   {
     "ADA_BMP_API_URL": "https://bmpapi.bmp.ada-asia.my"
   }
   ```

### Connection Behavior

| Connection | Selected Environment | Validation URL (from .env) | Runtime URL (from DB) |
|------------|---------------------|---------------------------|----------------------|
| Dev BMP | Dev | Production (default) | Dev (from DB metadata) |
| Staging BMP | Staging | Production (default) | Staging (from DB metadata) |
| Prod BMP | Production | Production (default) | Production (from DB metadata) |

### Result
✅ Each connection uses the **correct environment-specific URL** at runtime, regardless of validation URL

---

## Use Case 4: Environment-Specific Variables (Alternative Approach)

### Scenario
Platform admin wants to avoid database configuration and use `.env` file for all environments.

### Configuration
Add environment-specific variables to `.env`:
```bash
# Default (used for validation if no specific variable found)
ADA_BMP_API_URL=https://bmpapi.bmp.ada-asia.my

# Environment-specific URLs
DEV_ADA_BMP_API_URL=https://bmpapidev2.cl.bmp.ada-asia.my
STAGING_ADA_BMP_API_URL=https://bmpapistgjkt.cl.bmp.ada-asia.my
PRODUCTION_ADA_BMP_API_URL=https://bmpapi.bmp.ada-asia.my
```

### Connection Flow
1. **Admin creates "Staging" connection:**
   - Environment = "Staging"
   - Validation uses: `STAGING_ADA_BMP_API_URL` = `https://bmpapistgjkt.cl.bmp.ada-asia.my`
   - ✅ Validates against correct Staging URL

2. **Flow Execution:**
   - Checks database metadata → Not found
   - Uses `STAGING_ADA_BMP_API_URL` from environment variable
   - ✅ Uses correct Staging URL

### Result
✅ Environment-specific variables work for both validation and runtime

---

## Use Case 5: Validation Fails (No URL Configured)

### Scenario
Admin tries to create connection but no API URL is configured anywhere.

### Configuration
- `.env` has **no** `ADA_BMP_API_URL` set
- No database metadata configured
- No environment-specific variables

### Connection Flow
1. Admin creates BMP connection
2. Validation process:
   - Checks `STAGING_ADA_BMP_API_URL` → Not found
   - Checks `ADA_BMP_API_URL` → Not found
   - ❌ **Validation fails** with error:

   ```
   No API URL configured for "Staging" environment.

   Please ask your platform admin to configure the ADA_BMP_API_URL in the .env file.

   For Staging: https://bmpapistgjkt.cl.bmp.ada-asia.my
   For Dev: https://bmpapidev2.cl.bmp.ada-asia.my
   For Production: https://bmpapi.bmp.ada-asia.my
   ```

### Result
❌ Connection creation fails with clear instructions

---

## Use Case 6: Multi-Tenant Isolation (Owner-Specific Organizations)

### Scenario
- **Owner A** manages **Org 1** (Staging environment)
- **Owner B** manages **Org 2** (Dev environment)
- Both owners are on the same platform

### Configuration

#### Owner A (Org 1 - Staging)
1. Configures Staging environment metadata:
   ```json
   {
     "ADA_BMP_API_URL": "https://bmpapistgjkt.cl.bmp.ada-asia.my"
   }
   ```
2. Creates connection with Environment = "Staging"
3. Admin users under Owner A use this Staging URL

#### Owner B (Org 2 - Dev)
1. Configures Dev environment metadata:
   ```json
   {
     "ADA_BMP_API_URL": "https://bmpapidev2.cl.bmp.ada-asia.my"
   }
   ```
2. Creates connection with Environment = "Dev"
3. Admin users under Owner B use this Dev URL

### Isolation Behavior
- ✅ Owner A's organization **only sees** Org 1 in dropdowns
- ✅ Owner B's organization **only sees** Org 2 in dropdowns
- ✅ Each organization's connections use **their own** environment metadata
- ✅ Database metadata is scoped to `organizationId` → No cross-contamination

### Result
✅ Perfect tenant isolation with environment-specific API URLs

---

## Use Case 7: Admin Updates Environment Metadata (Hot Configuration)

### Scenario
Admin realizes the Staging API URL is incorrect and updates it in the database.

### Steps
1. **Initial State:**
   - Existing connection uses wrong URL: `https://bmpapi.bmp.ada-asia.my` (Production)
   - Flows fail with 405 errors

2. **Admin Updates Database Metadata:**
   - Goes to: **Organization > Environments > Staging > My Environment Metadata**
   - Updates:
     ```json
     {
       "ADA_BMP_API_URL": "https://bmpapistgjkt.cl.bmp.ada-asia.my"
     }
     ```
   - Saves changes

3. **Immediate Effect:**
   - **No need to recreate connections**
   - Next flow execution automatically uses the new URL from database
   - ✅ Flows start working immediately

### Result
✅ Hot configuration update without recreating connections

---

## Priority Resolution Summary

### Priority Order (Runtime Execution)
```
┌─────────────────────────────────────────────────┐
│ 1. Database Metadata (HIGHEST PRIORITY)        │
│    Organization > Environments > Metadata       │
│    Key: ADA_BMP_API_URL                         │
└─────────────────────────────────────────────────┘
                    ↓ (if not found)
┌─────────────────────────────────────────────────┐
│ 2. Environment-Specific Variable                │
│    e.g., STAGING_ADA_BMP_API_URL               │
└─────────────────────────────────────────────────┘
                    ↓ (if not found)
┌─────────────────────────────────────────────────┐
│ 3. Default .env Variable                        │
│    ADA_BMP_API_URL                              │
└─────────────────────────────────────────────────┘
                    ↓ (if not found)
┌─────────────────────────────────────────────────┐
│ ❌ ERROR: No API URL configured                 │
└─────────────────────────────────────────────────┘
```

---

## Best Practices

### ✅ Recommended Approach
- Use **Database Metadata** (Organization > Environments > My Environment Metadata)
- Provides per-organization flexibility
- Supports multi-tenant isolation
- Allows hot configuration updates
- No need to restart services

### ⚠️ Alternative Approach
- Use **Environment Variables** in `.env` file
- Simpler for single-tenant deployments
- Requires server restart for changes
- Global configuration (affects all organizations)

### ❌ Not Recommended
- Relying on default `.env` for all environments
- Mixing environments without clear configuration
- Not documenting which environment each connection uses

---

## Configuration Reference

### Environment URLs
| Environment | API URL |
|------------|---------|
| Dev | `https://bmpapidev2.cl.bmp.ada-asia.my` |
| Staging | `https://bmpapistgjkt.cl.bmp.ada-asia.my` |
| Production | `https://bmpapi.bmp.ada-asia.my` |

### Database Metadata Example
```json
{
  "ADA_BMP_API_URL": "https://bmpapistgjkt.cl.bmp.ada-asia.my"
}
```

### Environment Variable Example
```bash
# In .env file
STAGING_ADA_BMP_API_URL=https://bmpapistgjkt.cl.bmp.ada-asia.my
```

---

## Troubleshooting

### Issue: Connection validation succeeds but flow fails with 405 error
**Cause:** Database metadata is not configured, falling back to wrong `.env` URL

**Solution:**
1. Check current metadata:
   ```sql
   SELECT environment, metadata 
   FROM organization_environment 
   WHERE environment = 'Staging';
   ```
2. Update metadata via UI: Organization > Environments > My Environment Metadata
3. Or update via SQL:
   ```sql
   UPDATE organization_environment 
   SET metadata = jsonb_set(
     COALESCE(metadata, '{}'::jsonb), 
     '{ADA_BMP_API_URL}', 
     '"https://bmpapistgjkt.cl.bmp.ada-asia.my"'
   ) 
   WHERE environment = 'Staging';
   ```

### Issue: All connections use Production URL regardless of environment
**Cause:** No environment-specific configuration

**Solution:** Configure database metadata for each environment (see Use Case 3)

### Issue: Cannot create connection - validation fails
**Cause:** No `ADA_BMP_API_URL` configured in `.env`

**Solution:** Add default URL to `.env`:
```bash
ADA_BMP_API_URL=https://bmpapi.bmp.ada-asia.my
```

---

## Summary

| Configuration Method | Validation | Runtime | Multi-Tenant | Hot Update |
|---------------------|-----------|---------|--------------|------------|
| Database Metadata (Recommended) | Uses .env default | Uses DB metadata | ✅ Yes | ✅ Yes |
| Environment Variables | Uses env var | Uses env var | ❌ No | ❌ No (requires restart) |
| Default .env only | Uses default | Uses default | ❌ No | ❌ No (requires restart) |
