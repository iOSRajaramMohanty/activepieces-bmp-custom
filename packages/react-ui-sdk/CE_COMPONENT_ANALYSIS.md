# CE Component Analysis

This document tracks which React UI components are CE-safe (no EE dependencies) and can be used in the SDK.

## ✅ CE-Safe Components (No EE Imports)

### Core Flow Components
- **FlowsPage** (`packages/react-ui/src/app/routes/flows/index.tsx`)
  - Imports: FlowsTable only
  - Status: ✅ CE SAFE
  - Usage: Dashboard/Flows list

- **FlowBuilderPage** (`packages/react-ui/src/app/routes/flows/id/index.tsx`)
  - Imports: BuilderPage, BuilderStateProvider, flowsApi
  - Status: ✅ CE SAFE
  - Usage: Flow Builder editor

- **FlowsTable** (`packages/react-ui/src/app/routes/flows/flows-table/index.tsx`)
  - Status: ✅ CE SAFE (needs verification)
  - Usage: Flows table component

### Runs Components
- **RunsPage** (`packages/react-ui/src/app/routes/runs/index.tsx`)
  - Imports: RunsTable only
  - Status: ✅ CE SAFE
  - Usage: Runs list

- **FlowRunPage** (`packages/react-ui/src/app/routes/runs/id/index.tsx`)
  - Imports: BuilderPage, flowRunsApi, flowsApi
  - Status: ✅ CE SAFE
  - Usage: Single run view

### Templates Components
- **TemplatesPage** (`packages/react-ui/src/app/routes/templates/index.tsx`)
  - Imports: templatesHooks, flowHooks, platformHooks
  - Status: ✅ CE SAFE
  - Usage: Templates browser

### Connections Components
- **AppConnectionsPage** (`packages/react-ui/src/app/routes/connections/index.tsx`)
  - Imports: appConnectionsHooks, piecesHooks
  - Status: ✅ CE SAFE (with condition: exclude EditGlobalConnectionDialog for global connections)
  - Usage: Connections management
  - Note: EditGlobalConnectionDialog uses global connections (EE feature), but regular connections are CE-safe

## ❌ EE-Only Components (Must Exclude)

### Embedding (EE Only)
- **EmbedPage** (`packages/react-ui/src/app/routes/embed/index.tsx`)
  - Imports: `ee-embed-sdk`
  - Status: ❌ EE ONLY - EXCLUDE

- **EmbeddedConnectionDialog** (`packages/react-ui/src/app/routes/embed/embedded-connection-dialog.tsx`)
  - Imports: `ee-embed-sdk`
  - Status: ❌ EE ONLY - EXCLUDE

### Platform Admin (EE Only)
- **BillingPage** (`packages/react-ui/src/app/routes/platform/billing/index.tsx`)
  - Imports: `@activepieces/ee-shared`
  - Status: ❌ EE ONLY - EXCLUDE

- **SSOPage** (`packages/react-ui/src/app/routes/platform/security/sso/index.tsx`)
  - Status: ❌ EE ONLY - EXCLUDE

- **AuditLogsPage** (`packages/react-ui/src/app/routes/platform/security/audit-logs/index.tsx`)
  - Imports: `@activepieces/ee-shared`
  - Status: ❌ EE ONLY - EXCLUDE

- **ApiKeysPage** (`packages/react-ui/src/app/routes/platform/security/api-keys/index.tsx`)
  - Imports: `@activepieces/ee-shared`
  - Status: ❌ EE ONLY - EXCLUDE

- **SigningKeysPage** (`packages/react-ui/src/app/routes/platform/security/signing-keys/index.tsx`)
  - Imports: `@activepieces/ee-shared`
  - Status: ❌ EE ONLY - EXCLUDE

- **ProjectRolePage** (`packages/react-ui/src/app/routes/platform/security/project-role/index.tsx`)
  - Imports: `@activepieces/ee-shared`
  - Status: ❌ EE ONLY - EXCLUDE

- **BrandingPage** (`packages/react-ui/src/app/routes/platform/setup/branding/index.tsx`)
  - Status: ❌ EE ONLY - EXCLUDE

- **GlobalConnectionsTable** (`packages/react-ui/src/app/routes/platform/setup/connections/index.tsx`)
  - Status: ❌ EE ONLY - EXCLUDE

- **OrganizationsPage** (`packages/react-ui/src/app/routes/platform/organizations/index.tsx`)
  - Status: ❌ EE ONLY - EXCLUDE

- **EventDestinationsPage** (`packages/react-ui/src/app/routes/platform/infra/event-destinations/index.tsx`)
  - Imports: `@activepieces/ee-shared`
  - Status: ❌ EE ONLY - EXCLUDE

## ⚠️ Components Needing Further Analysis

These components need deeper analysis to verify they don't have EE dependencies:

1. **EditGlobalConnectionDialog** - Used in ConnectionsPage, might be EE
2. **BuilderPage** - Core builder component, needs verification
3. **BuilderStateProvider** - State management, needs verification
4. **FlowsTable** - Table component, needs verification
5. **RunsTable** - Table component, needs verification

## Integration Strategy

1. **Direct Import Approach**: Import CE-safe components directly from react-ui
2. **Wrapper Approach**: Create thin wrappers that handle:
   - Provider setup (QueryClient, Router, etc.)
   - Configuration injection
   - Event handling
3. **Provider Setup**: Components will need:
   - QueryClientProvider
   - RouterProvider (MemoryRouter for SDK)
   - ThemeProvider
   - Authentication context

## Next Steps

1. Verify BuilderPage and BuilderStateProvider are CE-safe
2. Verify FlowsTable and RunsTable are CE-safe
3. Check EditGlobalConnectionDialog for EE dependencies
4. Create wrapper components with proper provider setup
5. Test integration with Angular
