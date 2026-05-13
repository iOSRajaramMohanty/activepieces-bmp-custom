---
name: Upgrade SDK in bmp-fe-web
overview: Add bmpEnabled support to the existing Activepieces component in bmp-fe-web while preserving auto-provision, organization setup, and BMP connection features. Use partial CSS migration - keep critical layout CSS, accept color/font changes.
todos:
  - id: backup-files
    content: Create backup of existing Activepieces code in bmp-fe-web
    status: completed
  - id: add-bmpEnabled-input
    content: "Add @Input() bmpEnabled: boolean = true to activepieces.component.ts"
    status: completed
  - id: update-sdk-config
    content: Add bmpEnabled to __AP_SDK_CONFIG__ in ngAfterViewInit
    status: completed
  - id: update-configureAPI
    content: Pass bmpEnabled to configureAPI() call
    status: completed
  - id: update-react-props
    content: Add bmpEnabled to React component props
    status: completed
  - id: create-critical-css
    content: Create bmp-critical-overrides.css with only essential layout/interactivity fixes
    status: completed
  - id: update-loadBMPOverrides
    content: Update loadBMPOverrides() to load new critical CSS file
    status: completed
  - id: reinstall-sdk
    content: Reinstall SDK to get the configureAPI fix that preserves bmpEnabled
    status: completed
  - id: test-oauth
    content: Test OAuth flow uses local BMP Cloud OAuth endpoint
    status: completed
isProject: false
---

# Upgrade SDK in bmp-fe-web (Option C: Partial Migration)

## Goal

Add `bmpEnabled` support for Cloud OAuth while **preserving all existing BMP features**:

- Auto-provision via localStorage (`exchangeToken`)
- Organization setup (`ensureOrganizationSetup`)
- Environment configuration (`ensureEnvironmentExists`)
- BMP connection management (`ensureBmpConnection`)

## Approach: Partial CSS Migration

**Keep:** Critical layout and interactivity CSS (flow builder, dialogs, pointer-events)
**Accept:** Color and font changes (SDK purple theme, Inter font instead of Axiata)

## Files to Modify

### 1. activepieces.component.ts - Add bmpEnabled

**File:** `[src/app/pages/activepieces/page/activepieces.component.ts](/Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/app/pages/activepieces/page/activepieces.component.ts)`

#### Change 1: Add bmpEnabled Input (after line ~64)

```typescript
@Input() component: 'flow-builder' | 'dashboard' | 'connections' | 'runs' | 'templates' = 'dashboard';
@Input() bmpEnabled: boolean = true;  // <-- ADD THIS LINE
```

#### Change 2: Update **AP_SDK_CONFIG** (around line ~667)

```typescript
// Before:
(window as any).__AP_SDK_CONFIG__ = {
  apiUrl: effectiveApiUrl,
  token,
  projectId,
  flowId: this.flowId,
};

// After:
(window as any).__AP_SDK_CONFIG__ = {
  apiUrl: effectiveApiUrl,
  token,
  projectId,
  flowId: this.flowId,
  bmpEnabled: this.bmpEnabled,  // <-- ADD THIS LINE
};
```

#### Change 3: Update configureAPI call (around line ~717)

```typescript
// Before:
this.sdkModule.configureAPI({
  apiUrl: effectiveApiUrl,
  token,
});

// After:
this.sdkModule.configureAPI({
  apiUrl: effectiveApiUrl,
  token,
  bmpEnabled: this.bmpEnabled,  // <-- ADD THIS LINE
});
```

#### Change 4: Update React props (around line ~734)

```typescript
// Before:
const props: any = {
  apiUrl: effectiveApiUrl,
  token,
};

// After:
const props: any = {
  apiUrl: effectiveApiUrl,
  token,
  bmpEnabled: this.bmpEnabled,  // <-- ADD THIS LINE
};
```

#### Change 5: Update loadBMPOverrides to load critical CSS (around line ~567)

Update the `loadBMPOverrides()` method to load the new critical CSS file:

```typescript
private loadBMPOverrides(): Promise<void> {
  return new Promise((resolve) => {
    // Check if already loaded
    if (document.querySelector('link[href="styles/bmp-critical-overrides.css"]')) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/bmp-critical-overrides.css';  // <-- CHANGED from bmp-overrides.css
    link.onload = () => {
      console.log('✅ BMP critical style overrides loaded');
      resolve();
    };
    link.onerror = () => {
      console.warn('⚠️ Failed to load BMP critical style overrides, continuing with SDK styles');
      resolve();
    };
    document.head.appendChild(link);
  });
}
```

### 6. Create bmp-critical-overrides.css

**File:** `src/styles/bmp-critical-overrides.css` (NEW FILE)

This file contains **only critical CSS** for:

- Flow builder layout/height fixes
- Dialog layout fixes
- Interactivity (pointer-events)

See "Critical CSS Content" section below for the full file content.

### 7. Update angular.json to copy new CSS file

**File:** `angular.json`

Add the new CSS file to assets:

```json
{
  "glob": "bmp-critical-overrides.css",
  "input": "src/styles",
  "output": "/styles"
}
```

### 2. No Changes to Other Files

Keep everything else as-is:

- `activepieces.component.html` - No changes
- `activepieces.component.scss` - No changes
- `activepieces.module.ts` - No changes
- `activepieces-routing.module.ts` - No changes

---

## Critical CSS Content (bmp-critical-overrides.css)

This file contains **~400 lines** of essential CSS extracted from the original 1517-line `bmp-overrides.css`.

**What's included:**

- Flow builder layout (height propagation, fullscreen mode)
- Dialog layout fixes (connection dialogs, auth method selection)
- Interactivity fixes (pointer-events for all clickable elements)
- Basic container structure

**What's NOT included (accept SDK defaults):**

- Colors (will use SDK purple instead of BMP blue)
- Fonts (will use Inter instead of Axiata)
- Button styling
- Table styling
- Tab styling
- Checkbox/switch styling
- Scrollbar styling

```css
/**
 * BMP Critical Overrides for Activepieces SDK
 * 
 * This file contains ONLY critical CSS for:
 * 1. Flow builder layout/height fixes
 * 2. Dialog layout fixes
 * 3. Interactivity (pointer-events)
 * 
 * Color and font styling uses SDK defaults.
 */

/* ============================================
   SDK Layout and Container Structure
   ============================================ */

/* react-mount-point - dashboard: allow natural height, flow builder: fill height */
.react-mount-point {
  flex: 1 1 auto !important;
  min-height: fit-content !important;
  height: auto !important;
  overflow: visible !important;
  display: flex !important;
  flex-direction: column !important;
}

/* ap-sdk-root - dashboard: allow natural height, flow builder: fill height */
.ap-sdk-root {
  flex: 1 1 auto !important;
  min-height: fit-content !important;
  height: auto !important;
  overflow: visible !important;
  padding: 16px !important;
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
}

/* Flow builder mode - need fixed height for canvas */
.fullscreen-mode .react-mount-point {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  height: 100vh !important;
  overflow: hidden !important;
}

.fullscreen-mode .ap-sdk-root {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  height: calc(100vh - 32px) !important;
  overflow: hidden !important;
  padding: 0 !important;
}

/* CRITICAL: Child inside ap-sdk-root */
.ap-sdk-root > div {
  flex: 1 1 auto !important;
  min-height: fit-content !important;
  height: auto !important;
  overflow: visible !important;
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
}

/* Flow builder mode */
.fullscreen-mode .ap-sdk-root > div {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  height: 100% !important;
  overflow: hidden !important;
}

/* ============================================
   Layout Containers
   ============================================ */
.ap-sdk-root main,
.ap-sdk-root [data-slot='sidebar-inset'],
.ap-sdk-root main[data-slot='sidebar-inset'] {
  flex: 1 1 auto !important;
  min-height: fit-content !important;
  height: auto !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: visible !important;
}

.ap-sdk-root [data-slot='sidebar-wrapper'] {
  flex: 1 1 auto !important;
  min-height: fit-content !important;
  height: auto !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: visible !important;
}

/* Flow builder mode - fixed height containers */
.fullscreen-mode .ap-sdk-root main,
.fullscreen-mode .ap-sdk-root [data-slot='sidebar-inset'],
.fullscreen-mode .ap-sdk-root main[data-slot='sidebar-inset'],
.fullscreen-mode .ap-sdk-root [data-slot='sidebar-wrapper'],
.fullscreen-mode .ap-sdk-root [data-slot='sidebar-inset'] > div {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  height: 100% !important;
  overflow: hidden !important;
}

/* ============================================
   FLOW BUILDER - Height Chain
   ============================================ */

/* When flow builder is detected, set up proper height chain */
.activepieces-page:has(.max-h-\[100vh\]) {
  padding: 0 !important;
  overflow: hidden !important;
  height: 100vh !important;
}

.activepieces-page:has(.max-h-\[100vh\]) .page-header {
  display: none !important;
}

.activepieces-page:has(.max-h-\[100vh\]) .react-mount-point {
  height: 100vh !important;
  min-height: 100vh !important;
  overflow: hidden !important;
}

/* ap-sdk-root in flow builder mode */
.ap-sdk-root:has(.max-h-\[100vh\]) {
  height: 100vh !important;
  min-height: 100vh !important;
  padding: 0 !important;
  overflow: hidden !important;
}

.ap-sdk-root:has(.max-h-\[100vh\]) > div {
  height: 100vh !important;
  min-height: 100vh !important;
  overflow: hidden !important;
}

/* Sidebar containers in flow builder */
.ap-sdk-root:has(.max-h-\[100vh\]) [data-slot='sidebar-wrapper'],
.ap-sdk-root:has(.max-h-\[100vh\]) main,
.ap-sdk-root:has(.max-h-\[100vh\]) [data-slot='sidebar-inset'] {
  height: 100vh !important;
  min-height: 100vh !important;
  overflow: hidden !important;
}

/* The flow builder container */
.ap-sdk-root .max-h-\[100vh\] {
  height: 100vh !important;
  max-height: 100vh !important;
}

/* ResizablePanelGroup */
.ap-sdk-root [data-slot="resizable-panel-group"] {
  flex: 1 1 0% !important;
  min-height: 0 !important;
}

/* Flow canvas panel */
.ap-sdk-root #flow-canvas {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  height: 100% !important;
  position: relative !important;
  overflow: hidden !important;
}

.ap-sdk-root #flow-canvas > div {
  height: 100% !important;
  width: 100% !important;
  position: relative !important;
}

/* Canvas controls positioning */
.ap-sdk-root #canvas-controls {
  position: absolute !important;
  bottom: 8px !important;
  left: 0 !important;
  z-index: 50 !important;
}

/* Right sidebar z-index */
.ap-sdk-root #right-sidebar {
  z-index: 35 !important;
  padding-left: 1rem !important;
}

/* Resizable handle */
.ap-sdk-root [data-slot='resizable-handle'] {
  overflow: visible !important;
}

.ap-sdk-root [data-slot='resizable-handle'] > div {
  min-width: 0.75rem !important;
  min-height: 1rem !important;
  position: relative !important;
  z-index: 9999 !important;
}

/* ============================================
   Fullscreen Mode
   ============================================ */
app-activepieces {
  display: block;
  height: 100%;
  width: 100%;
}

.activepieces-page.fullscreen-mode {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 1000 !important;
  background: #fff !important;
}

/* ============================================
   CONNECTION DIALOG FIXES
   ============================================ */

/* Connection dialog – fix flex layout issues */
.activepieces-container [role="dialog"],
.ap-sdk-root [role="dialog"] {
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}

/* Dialog header – keep flex column with proper spacing */
.activepieces-container [role="dialog"] > div:first-child,
.ap-sdk-root [role="dialog"] > div:first-child {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.75rem !important;
}

/* Dialog form – flex column, proper gap */
.activepieces-container [role="dialog"] form,
.ap-sdk-root [role="dialog"] form {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.75rem !important;
}

/* Dialog footer – row layout, right-align Cancel and Save */
.activepieces-container [role="dialog"] form + div,
.ap-sdk-root [role="dialog"] form + div {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  justify-content: flex-end !important;
  align-items: center !important;
  gap: 0.5rem !important;
  margin-top: 1rem !important;
}

/* ============================================
   AUTH METHOD DIALOG FIXES
   ============================================ */

/* Remove scrollbar for auth method selection dialog */
body [role="dialog"]:has([role="radiogroup"])[class*="overflow-y-auto"] {
  overflow-y: visible !important;
  overflow: visible !important;
}

/* Dialog content wrapper */
body [role="dialog"][class*="max-h-"]:not([class*="h-[680px]"]) > div {
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
  min-height: min-content !important;
  flex: 0 1 auto !important;
}

/* Radiogroup – single column, each option on its own row */
body [role="dialog"] [role="radiogroup"],
body [role="dialog"] [role="radiogroup"].grid.gap-3 {
  min-height: min-content !important;
  display: grid !important;
  grid-template-columns: 1fr !important;
  grid-auto-rows: min-content !important;
  gap: 1rem !important;
}

/* Auth option cards */
body [role="dialog"] [role="radiogroup"] > div,
body [role="dialog"] [role="radiogroup"] .p-4.rounded-lg {
  display: block !important;
  min-height: min-content !important;
  width: 100% !important;
  position: relative !important;
  grid-column: 1 !important;
}

/* Footer (Cancel / Next) */
body [role="dialog"]:has([role="radiogroup"]) > div > div[class*="mt-4"]:last-of-type {
  margin-top: 1.5rem !important;
  display: flex !important;
  justify-content: flex-end !important;
  gap: 0.5rem !important;
  flex-shrink: 0 !important;
  padding: 1rem 1.5rem 0 1.5rem !important;
  position: relative !important;
  z-index: 1 !important;
  pointer-events: auto !important;
}

/* Button container */
body [role="dialog"]:has([role="radiogroup"]) > div > div.mx-5.w-full {
  display: flex !important;
  flex-direction: row !important;
  justify-content: flex-end !important;
  align-items: center !important;
  gap: 0.5rem !important;
  width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  pointer-events: auto !important;
}

/* Ensure buttons are clickable */
body [role="dialog"]:has([role="radiogroup"]) > div > div[class*="mt-4"]:last-of-type button {
  pointer-events: auto !important;
  position: relative !important;
  z-index: 1 !important;
}

/* ============================================
   NEW CONNECTION PIECE PICKER
   ============================================ */
body [role="dialog"][class*="h-[680px]"] {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

body [role="dialog"][class*="h-[680px]"] [class*="grow"][class*="overflow-y-auto"] {
  min-height: 0 !important;
  flex: 1 1 0% !important;
  display: flex !important;
  flex-direction: column !important;
}

body [role="dialog"][class*="h-[680px]"] [data-radix-scroll-area-viewport] {
  min-height: 0 !important;
  overflow-y: auto !important;
  flex: 1 1 0% !important;
  height: 100% !important;
}

/* ============================================
   INTERACTIVITY FIXES - Ensure all buttons/links work
   ============================================ */

/* Ensure all interactive elements receive pointer events */
.ap-sdk-root button,
.ap-sdk-root a,
.ap-sdk-root input,
.ap-sdk-root select,
.ap-sdk-root textarea,
.ap-sdk-root [role="button"],
.ap-sdk-root [role="link"],
.ap-sdk-root [role="checkbox"],
.ap-sdk-root [role="switch"],
.ap-sdk-root [role="tab"],
.ap-sdk-root [role="menuitem"],
.ap-sdk-root [role="option"],
.ap-sdk-root [tabindex],
.ap-sdk-root label,
.activepieces-container button,
.activepieces-container a,
.activepieces-container input,
.activepieces-container [role="button"],
.activepieces-container [role="checkbox"],
.activepieces-container [role="switch"],
.activepieces-container [tabindex] {
  pointer-events: auto !important;
  cursor: pointer;
}

/* Table rows should be clickable */
.ap-sdk-root tr,
.ap-sdk-root tbody tr,
.activepieces-container tr {
  pointer-events: auto !important;
  cursor: pointer;
}

/* Dropdown/menu triggers */
.ap-sdk-root [data-radix-collection-item],
.ap-sdk-root [data-state],
.ap-sdk-root [aria-haspopup] {
  pointer-events: auto !important;
}

/* SVG icons inside buttons should inherit pointer-events */
.ap-sdk-root button svg,
.ap-sdk-root a svg,
.ap-sdk-root [role="button"] svg {
  pointer-events: none;
}

/* Flow nodes - ensure they're visible and clickable */
.ap-sdk-root [class*="flow-widget"],
.ap-sdk-root [class*="step-card"],
.ap-sdk-root [data-testid*="step"],
.ap-sdk-root [data-testid*="node"] {
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

/* Panels and sidebars */
.ap-sdk-root [class*="panel"],
.ap-sdk-root [class*="sidebar"],
.ap-sdk-root [class*="drawer"] {
  flex-shrink: 0 !important;
  pointer-events: auto !important;
}

/* Tables */
.ap-sdk-root table,
.ap-sdk-root [role="table"],
.activepieces-container table {
  pointer-events: auto !important;
}

/* React Flow pane - background for panning */
.ap-sdk-root .react-flow__pane {
  cursor: grab;
}

.ap-sdk-root .react-flow__pane:active {
  cursor: grabbing;
}

/* Tooltips - ensure they're visible */
.ap-sdk-root [role="tooltip"],
.ap-sdk-root [data-radix-popper-content-wrapper],
body > [role="tooltip"],
body > [data-radix-popper-content-wrapper] {
  z-index: 9999 !important;
}
```

## What Gets Preserved


| Feature                           | Status |
| --------------------------------- | ------ |
| Auto-provision via localStorage   | ✅ Kept |
| Organization setup                | ✅ Kept |
| Environment configuration         | ✅ Kept |
| BMP connection management         | ✅ Kept |
| Route-based component switching   | ✅ Kept |
| Loading states and error handling | ✅ Kept |


## What Changes


| Feature                  | Change                                                                  |
| ------------------------ | ----------------------------------------------------------------------- |
| `bmpEnabled` flag        | ✅ Added                                                                 |
| `bmp-overrides.css`      | ❌ Replaced with `bmp-critical-overrides.css` (~400 lines vs 1517 lines) |
| Colors                   | Will use SDK purple theme (not BMP blue)                                |
| Fonts                    | Will use Inter (not Axiata)                                             |
| Button/Table/Tab styling | Will use SDK defaults                                                   |


## Backup Strategy

```bash
BACKUP_DIR="/Users/rajarammohanty/Documents/ADA/bmp-fe-web-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/app/pages/activepieces "$BACKUP_DIR/"
cp /Users/rajarammohanty/Documents/ADA/bmp-fe-web/package.json "$BACKUP_DIR/"
```

## SDK Bundle Update

```bash
cd /Users/rajarammohanty/Documents/ADA/bmp-fe-web
rm -rf node_modules/@activepieces
npm install
```

## Testing Checklist

1. Start bmp-fe-web dev server
2. Navigate to `/secure/my-integrations/activepieces`
3. Verify auto-provision works (check console for "Auto-provisioning" messages)
4. Verify organization setup works (check console for "Organization setup complete")
5. Verify BMP connection is created/updated
6. Check console for:
  - `bmpEnabled: true` in `__AP_SDK_CONFIG__`
  - `[isBmpEnabled] Using SDK config, returning: true`
7. Test OAuth - should use local Cloud OAuth (not `secrets.activepieces.com`)

## Summary of Changes

**Changes to `activepieces.component.ts`:**

1. Add `@Input() bmpEnabled: boolean = true;`
2. Add `bmpEnabled: this.bmpEnabled` to `__AP_SDK_CONFIG__`
3. Add `bmpEnabled: this.bmpEnabled` to `configureAPI()` call
4. Add `bmpEnabled: this.bmpEnabled` to React props
5. Update `loadBMPOverrides()` to load `bmp-critical-overrides.css`

**New Files:**

1. Create `src/styles/bmp-critical-overrides.css` (~400 lines of critical CSS)

**Update `angular.json`:**

1. Add asset entry for `bmp-critical-overrides.css`

## Rollback

```bash
cp -r /Users/rajarammohanty/Documents/ADA/bmp-fe-web-backups/TIMESTAMP/activepieces \
      /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/app/pages/
```

---

## Challenges and Impacted Areas

### Potential Challenges


| #   | Challenge                                         | Risk Level | Mitigation                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **UI Regression from removing bmp-overrides.css** | HIGH       | The `bmp-overrides.css` (large file) provides BMP-specific styling for `.activepieces-container`, `.activepieces-page`, `app-activepieces`. Removing it may cause visual differences. Test all views thoroughly.                             |
| 2   | **Auth Interceptor Impact**                       | MEDIUM     | `auth-interceptor.ts` adds BMP Authorization headers to all `HttpClient` calls. The `exchangeToken()` and other HTTP calls in activepieces.component.ts go through this interceptor. Ensure Activepieces API accepts or ignores BMP headers. |
| 3   | **Error Interceptor**                             | LOW        | `error.interceptor.ts` handles global errors. Activepieces API errors may show as BMP-style toasts if response shapes overlap.                                                                                                               |
| 4   | **SDK Bundle Cache**                              | MEDIUM     | Browser may cache old SDK bundle. Need to clear Angular cache and do hard refresh after updating.                                                                                                                                            |
| 5   | **Missing Templates Route**                       | LOW        | `componentMap` includes `'templates'` but `activepieces-routing.module.ts` has no templates route. Not blocking but inconsistent.                                                                                                            |


### Impacted Files


| File                                                                                                                                    | Impact                                                | Action Required                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `[activepieces.component.ts](/Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/app/pages/activepieces/page/activepieces.component.ts)` | **PRIMARY** - Add bmpEnabled, remove loadBMPOverrides | ✅ Modify (5 changes)                                                  |
| `[angular.json](/Users/rajarammohanty/Documents/ADA/bmp-fe-web/angular.json)`                                                           | Asset config for SDK and bmp-overrides.css            | ⚠️ Optional: Remove bmp-overrides.css asset entry if no longer needed |
| `[bmp-overrides.css](/Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/styles/bmp-overrides.css)`                                      | No longer loaded at runtime                           | ⚠️ Keep file but unused; delete later after visual QA                 |
| `[environment.ts](/Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/environments/environment.ts)`                                      | Dev environment config                                | ⚠️ Optional: Add `bmpEnabled: true` to `activepieces` block           |
| `[environment.prod.ts](/Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/environments/environment.prod.ts)`                            | Prod environment config                               | ⚠️ Optional: Add `bmpEnabled: true` to `activepieces` block           |
| `[package.json](/Users/rajarammohanty/Documents/ADA/bmp-fe-web/package.json)`                                                           | SDK dependency                                        | ✅ npm install to get updated SDK                                      |
| `node_modules/@activepieces/react-ui-sdk`                                                                                               | SDK bundle                                            | ✅ Reinstall to get configureAPI fix                                   |


### Files NOT Impacted (No Changes Needed)


| File                             | Reason                     |
| -------------------------------- | -------------------------- |
| `activepieces.component.html`    | Template unchanged         |
| `activepieces.component.scss`    | Component styles unchanged |
| `activepieces.module.ts`         | Module unchanged           |
| `activepieces-routing.module.ts` | Routes unchanged           |
| `navigation.ts`                  | Nav links unchanged        |
| `sidebar.component.ts`           | Sidebar menu unchanged     |
| `layout-routing.module.ts`       | Lazy loading unchanged     |
| `proxy.conf.json`                | Dev proxy unchanged        |
| `auth-interceptor.ts`            | No changes needed          |
| `error.interceptor.ts`           | No changes needed          |


### Environment Configuration

Current `environment.ts`:

```typescript
activepieces: {
  apiUrl: '',  // Uses dev proxy
  platformId: '...'
}
```

Current `environment.prod.ts`:

```typescript
activepieces: {
  apiUrl: 'https://activepieces.bmp.ada-asia.my',
  platformId: '...'
}
```

**Note:** `bmpEnabled` is currently hardcoded as `@Input() bmpEnabled: boolean = true` in the component. If you need per-environment control, add it to the environment files.

### Visual QA Checklist (Post-Change)

After removing `bmp-overrides.css`, verify these views:

1. **Dashboard** (`/secure/my-integrations/activepieces`)
  - Layout and spacing
  - Colors and fonts
  - Buttons and icons
2. **Flows List** (`/secure/my-integrations/activepieces/flows`)
  - Table/list styling
  - Action buttons
3. **Flow Builder** (`/secure/my-integrations/activepieces/flows/:flowId`)
  - Canvas rendering
  - Fullscreen mode
  - Sidebar panels
  - Node styling
4. **Connections** (`/secure/my-integrations/activepieces/connections`)
  - Connection cards
  - OAuth dialogs
  - **OAuth redirect URL** (should use BMP endpoint, not secrets.activepieces.com)
5. **Runs** (`/secure/my-integrations/activepieces/runs`)
  - Run history table
  - Status indicators

### No Hardcoded Cloud URLs

Good news: No references to `secrets.activepieces.com` or `cloud.activepieces` found in bmp-fe-web. The Cloud OAuth routing is handled entirely in the SDK based on `bmpEnabled` flag.

---

## CRITICAL: UI/Stylesheet Impact Analysis

### bmp-overrides.css Overview (1517 lines)

The `bmp-overrides.css` file provides **extensive BMP-specific customizations**. Removing it will cause significant visual changes.

### What bmp-overrides.css Provides (Will Be Lost)


| Category                            | Customizations                                                     | Lines     | Impact Level |
| ----------------------------------- | ------------------------------------------------------------------ | --------- | ------------ |
| **CSS Variables**                   | BMP Blue (#6177c4), Dark Blue (#2c3b71), font-sans override        | 24-35     | HIGH         |
| **Typography**                      | Axiata font family (AxiataBook, AxiataBold) for all elements       | 41-62     | HIGH         |
| **Buttons**                         | 8px border-radius, BMP color scheme, hover states, disabled states | 69-139    | MEDIUM       |
| **Form Inputs**                     | 3px border-radius, BMP borders (#e1e1e1), focus states             | 143-165   | MEDIUM       |
| **Cards/Containers**                | 8px border-radius                                                  | 169-175   | LOW          |
| **Dropdowns/Menus**                 | 8px border-radius for popovers                                     | 179-187   | LOW          |
| **Navigation Tabs**                 | Minimal design, thin underline, BMP colors                         | 192-267   | MEDIUM       |
| **Links**                           | BMP blue colors                                                    | 271-286   | LOW          |
| **Badges**                          | 8px border-radius, Axiata font                                     | 290-295   | LOW          |
| **Tables**                          | BMP header colors (#2c3b71), borders (#dbdfeb), fonts              | 299-343   | MEDIUM       |
| **Dialogs/Modals**                  | 8px border-radius                                                  | 347-353   | LOW          |
| **Scrollbars**                      | BMP-styled scrollbars                                              | 357-379   | LOW          |
| **Flow Builder Labels**             | Dynamic value icon alignment fixes                                 | 407-456   | MEDIUM       |
| **Tab Content Heights**             | Fixed height overrides for Input/Output tabs                       | 462-485   | MEDIUM       |
| **Checkboxes**                      | 20px size, 5px border-radius, BMP colors                           | 491-576   | MEDIUM       |
| **Radio Buttons**                   | BMP color scheme                                                   | 579-597   | LOW          |
| **Switches/Toggles**                | Green checked state, thumb positioning                             | 603-670   | MEDIUM       |
| **Dot Indicators**                  | Convert to square style                                            | 675-696   | LOW          |
| **Connection Dialog Fixes**         | Layout fixes for "Connect to Slack"                                | 699-756   | HIGH         |
| **Auth Method Dialog**              | Radiogroup visibility, button positioning                          | 769-856   | CRITICAL     |
| **New Connection Picker**           | Scroll fixes for piece picker                                      | 861-882   | HIGH         |
| **SDK Layout**                      | .ap-sdk-root, sidebar-inset, backgrounds                           | 887-1011  | HIGH         |
| **Flow Builder Layout**             | Height propagation, fullscreen mode                                | 1037-1094 | CRITICAL     |
| **ResizablePanelGroup**             | Panel sizing                                                       | 1097-1100 | MEDIUM       |
| **Flow Canvas**                     | #flow-canvas height, positioning                                   | 1103-1123 | CRITICAL     |
| **React Flow**                      | Pane cursor, tooltips z-index                                      | 1131-1146 | MEDIUM       |
| **Step Node Hover**                 | Border highlights on hover/selected                                | 1151-1176 | MEDIUM       |
| **Sidebar Inset**                   | Borders, margins, backgrounds                                      | 1178-1254 | HIGH         |
| **Resizable Handle**                | Handle positioning and visibility                                  | 1281-1299 | MEDIUM       |
| **Dashboard Toolbar**               | Overflow, margins                                                  | 1301-1321 | LOW          |
| **Flow Builder Canvas Full Height** | Critical layout fixes                                              | 1326-1357 | CRITICAL     |
| **Interactivity Fixes**             | pointer-events for all interactive elements                        | 1359-1416 | CRITICAL     |
| **Flow Builder Specific**           | Panel/sidebar/drawer fixes                                         | 1422-1451 | HIGH         |
| **Dashboard/List View**             | Table clicks, star buttons, toggles, menus                         | 1453-1516 | HIGH         |


### SDK Built-in Styles (sdk-isolation.css) Provides


| Category              | What SDK Provides                                                  |
| --------------------- | ------------------------------------------------------------------ |
| **Fonts**             | Inter font family (400, 500, 600, 700 weights) - NOT Axiata        |
| **Container Heights** | Height propagation for .activepieces-container, .react-mount-point |
| **CSS Containment**   | Isolation from host app styles                                     |
| **Colors**            | Activepieces purple/violet theme - NOT BMP blue                    |


### CRITICAL Risk Areas

#### 1. Flow Builder Layout (Lines 1037-1357)

**~320 lines** of flow builder specific CSS including:

- Fullscreen mode handling (`.fullscreen-mode`, `:has(.max-h-[100vh])`)
- Canvas height calculations (`height: 100vh`, `min-height: 0`)
- Sidebar/panel positioning
- React Flow canvas fixes
- Resizable handle positioning

**Without these, flow builder may:**

- Not render at correct height
- Have broken panel layouts
- Show scrollbars incorrectly
- Have z-index issues

#### 2. Interactivity/Pointer Events (Lines 1359-1516)

**~160 lines** ensuring all interactive elements work:

- `pointer-events: auto !important` for buttons, links, inputs, checkboxes, switches, tabs
- Table row clicks
- Star/favorite buttons
- Three-dot menus
- Create/Import buttons
- Search input fixes

**Without these, users may:**

- Not be able to click buttons
- Not be able to interact with table rows
- Have broken form inputs

#### 3. Connection Dialogs (Lines 699-882)

**~180 lines** fixing dialog layouts:

- "Connect to Slack" dialog flex layout
- "Select Authentication Method" radiogroup visibility
- "New Connection" piece picker scrolling
- Button positioning (Cancel/Next/Save)

**Without these, OAuth dialogs may:**

- Have overlapping elements
- Hide buttons outside viewport
- Have broken scrolling
- Show only one auth option instead of all

### Detailed Visual QA Checklist

After removing `bmp-overrides.css`, verify these views **thoroughly**:

#### 1. Dashboard (`/secure/my-integrations/activepieces`)

- Layout renders correctly (not broken)
- Colors are SDK purple (not BMP blue) - expected change
- Fonts are Inter (not Axiata) - expected change
- "Create New" button is clickable
- Tables render correctly
- Row hover effects work
- Search input is functional
- Filter dropdowns work

#### 2. Flows List (`/secure/my-integrations/activepieces/flows`)

- Table renders with correct styling
- Row click navigates to flow builder
- Star/favorite buttons work
- Status toggles (switches) work
- Three-dot menu opens
- Pagination works

#### 3. Flow Builder (`/secure/my-integrations/activepieces/flows/:flowId`) - CRITICAL

- Canvas renders at correct height (fills viewport)
- Nodes are visible on canvas
- Nodes are draggable (pan/zoom works)
- Clicking on node selects it
- Right sidebar opens when node selected
- Right sidebar content is scrollable
- Resize handle between canvas and sidebar works
- Fullscreen mode fills entire screen
- Header/breadcrumbs visible and clickable
- "Test" button works
- "Publish" button works
- Back navigation works

#### 4. Connections (`/secure/my-integrations/activepieces/connections`) - CRITICAL

- Connection cards render
- "+ New Connection" button works
- **Connection dialog opens properly**
- **ALL authentication methods are visible** (not just one)
- **Cancel/Next buttons visible and clickable**
- **OAuth popup opens with correct redirect URL**
- **Redirect URL uses YOUR ngrok domain** (not secrets.activepieces.com)
- Connection saves successfully
- Connection can be deleted

#### 5. Runs (`/secure/my-integrations/activepieces/runs`)

- Run history table renders
- Status indicators visible and colored correctly
- Row click shows run details
- Re-run button works

### Recommendation: Phased Approach

Given the **1517 lines** of CSS customizations, consider:

**Option A: Keep bmp-overrides.css (Safest)**

1. Add `bmpEnabled` flag only
2. Keep `loadBMPOverrides()` call
3. Test OAuth works with local endpoint
4. Migrate styles to SDK later

**Option B: Remove bmp-overrides.css (This Plan)**

1. Add `bmpEnabled` flag
2. Remove `loadBMPOverrides()` call
3. Accept visual changes (purple theme, Inter font)
4. Fix critical layout issues if found
5. Can restore overrides if too many issues

**Option C: Partial Migration**

1. Add `bmpEnabled` flag
2. Keep only critical CSS (flow builder, dialogs)
3. Accept color/font changes
4. Test thoroughly

