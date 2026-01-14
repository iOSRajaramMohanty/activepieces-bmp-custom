# React UI Customization Guide

**Version**: Activepieces v0.76.1  
**Target Package**: `/packages/react-ui`

This guide provides a comprehensive overview of all customization options available in the Activepieces React UI frontend application.

---

## Table of Contents

1. [Overview](#overview)
2. [Branding & Theme](#branding--theme)
3. [Styling & CSS](#styling--css)
4. [Components](#components)
5. [Localization (i18n)](#localization-i18n)
6. [Routes & Navigation](#routes--navigation)
7. [API Configuration](#api-configuration)
8. [Assets & Media](#assets--media)
9. [Build Configuration](#build-configuration)
10. [Advanced Customizations](#advanced-customizations)
11. [Best Practices](#best-practices)

---

## Overview

The React UI is built with:
- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **React Query** for data fetching
- **React Router** for navigation
- **i18next** for internationalization

### Project Structure

```
packages/react-ui/
├── src/
│   ├── app/                    # Main application & routing
│   ├── components/             # Reusable components
│   ├── features/               # Feature-specific modules
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities & API clients
│   ├── assets/                 # Static assets
│   └── styles/                 # Global CSS
├── public/                     # Public static files
│   └── locales/                # Translation files
├── index.html                  # HTML template
├── vite.config.mts             # Vite configuration
└── project.json                # Nx project configuration
```

---

## Branding & Theme

### 1. Website Branding

**Location**: Controlled via API flags (backend configuration)

**Customizable Properties**:

```typescript
{
  websiteName: string;           // Website title
  logos: {
    fullLogoUrl: string;         // Full logo (used in header)
    favIconUrl: string;          // Favicon
    logoIconUrl: string;         // Icon-only logo
  };
  colors: {
    primary: {
      default: string;           // Primary color (hex)
      dark: string;              // Primary dark variant
      light: string;             // Primary light variant
    };
  };
}
```

**File**: `src/hooks/flags-hooks.ts` (lines 7-21)

**How to customize**:
1. Update branding through the backend API flags
2. The `ThemeProvider` automatically applies these changes
3. Colors are converted to HSL and set as CSS variables

### 2. Theme Provider

**File**: `src/components/theme-provider.tsx`

**Features**:
- Dark/Light/System theme switching
- Dynamic color application
- Favicon management
- Website title management

**Customization Example**:

```tsx
// Modify color variables
document.documentElement.style.setProperty(
  '--primary',
  colorsUtils.hexToHslString('#your-color-hex')
);
```

**CSS Variables Set**:
- `--primary`: Main brand color
- `--primary-100`: Light variant
- `--primary-300`: Dark variant

### 3. HTML Template Customization

**File**: `index.html`

**Customizable**:
```html
<title><%= apTitle %></title>
<link rel="icon" type="image/x-icon" href="<%= apFavicon %>">
```

These variables are replaced during build:
- `apTitle` → From environment or 'Activepieces'
- `apFavicon` → From environment or default favicon

---

## Styling & CSS

### 1. Global Styles

**File**: `src/styles/globals.css`

**Purpose**: Define global gradients, animations, and overrides

**Example Customization**:
```css
.welcome-gradient {
    background: linear-gradient(
        to bottom right,
        rgba(255, 255, 255, 1) 0%,
        rgba(249, 250, 251, 0.9) 100%
    );
}

/* Dark mode variant */
@media (prefers-color-scheme: dark) {
    .welcome-gradient {
        background: linear-gradient(
            to bottom right,
            rgba(31, 41, 55, 1) 0%,
            rgba(17, 24, 39, 0.9) 100%
        );
    }
}
```

### 2. TailwindCSS Configuration

**File**: `postcss.config.js`

**Current Setup**:
```javascript
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**How to Customize**:
1. Create a `tailwind.config.js` file in the react-ui root
2. Extend default theme with custom colors, fonts, spacing, etc.

**Example**:
```javascript
// tailwind.config.js (create this file)
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#your-color',
          secondary: '#your-color',
        },
      },
      fontFamily: {
        sans: ['Your Font', 'sans-serif'],
      },
    },
  },
};
```

### 3. Component-Specific Styles

**File**: `src/styles.css`

This file imports component-specific styles and can be extended with custom CSS.

---

## Components

### 1. Custom Components

**Location**: `src/components/custom/`

**Available Components**:
- `alert-icon.tsx` - Alert icons
- `ap-avatar.tsx` - User avatars
- `button-with-tooltip.tsx` - Buttons with tooltips
- `circular-progress.tsx` - Progress indicators
- `copy-to-clipboard.tsx` - Copy functionality
- `json-editor.tsx` - JSON editing
- `markdown.tsx` - Markdown rendering
- `searchable-select.tsx` - Searchable dropdowns
- And more...

**How to Customize**:

1. **Modify Existing Components**:
```tsx
// Edit: src/components/custom/page-header.tsx
export function PageHeader({ title, icon }) {
  return (
    <div className="custom-header">
      {icon && <YourCustomIcon />}
      <h1 className="text-brand-primary">{title}</h1>
    </div>
  );
}
```

2. **Create New Components**:
```tsx
// Create: src/components/custom/your-component.tsx
export function YourComponent() {
  return <div>Your custom component</div>;
}
```

### 2. UI Components (shadcn/ui based)

**Location**: `src/components/ui/`

These are base UI components that can be customized:
- Buttons
- Dialogs
- Dropdowns
- Forms
- Tables
- Tooltips
- etc.

**Customization**: Edit individual component files to change styling or behavior.

### 3. Page Header Customization

**File**: `src/components/custom/page-header.tsx`

Customize the header that appears on most pages:
- Logo placement
- Navigation items
- User menu
- Search functionality

### 4. Sidebar Customization

**File**: `src/components/custom/ap-sidebar-toggle.tsx`

Customize:
- Sidebar appearance
- Navigation items
- Icons
- Collapse behavior

---

## Localization (i18n)

### 1. Configuration

**File**: `src/i18n.ts`

**Supported Languages**:
```typescript
export enum LocalesEnum {
  ENGLISH = 'en',
  GERMAN = 'de',
  SPANISH = 'es',
  FRENCH = 'fr',
  JAPANESE = 'ja',
  DUTCH = 'nl',
  PORTUGUESE = 'pt',
  RUSSIAN = 'ru',
  CHINESE_SIMPLIFIED = 'zh',
  CHINESE_TRADITIONAL = 'zh-TW',
  ARABIC = 'ar',
}
```

### 2. Translation Files

**Location**: `public/locales/{language}/translation.json`

**Example Structure**:
```json
{
  "Sign In": "Sign In",
  "Email": "Email",
  "Password": "Password",
  "Welcome to {appName}": "Welcome to {appName}",
  // Add your custom translations
}
```

### 3. Adding a New Language

**Steps**:

1. Create a new folder in `public/locales/`:
```bash
mkdir public/locales/your-language-code
```

2. Create `translation.json`:
```json
{
  "Sign In": "Your Translation",
  // ... all translations
}
```

3. Add to `i18n.ts`:
```typescript
supportedLngs: ['en', 'de', 'your-language-code'],
```

### 4. Using Translations in Components

```tsx
import { useTranslation } from 'react-i18next';

export function YourComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('Welcome to {appName}', { appName: 'Activepieces' })}</h1>
      <button>{t('Sign In')}</button>
    </div>
  );
}
```

### 5. Parsing Config

**File**: `i18next-parser.config.js`

Configure how translation keys are extracted from source code.

---

## Routes & Navigation

### 1. Route Structure

**Location**: `src/app/routes/`

**Main Routes**:
- `/` - Home/Dashboard
- `/sign-in` - Authentication
- `/sign-up` - Registration
- `/flows` - Flow management
- `/connections` - Connection management
- `/runs` - Flow run history
- `/platform/*` - Platform admin routes
- `/embed/*` - Embedded routes

### 2. Adding Custom Routes

**File**: `src/app/guards/index.tsx` (ApRouter component)

**Example**:
```tsx
import { Route } from 'react-router-dom';
import YourCustomPage from './routes/your-custom-page';

// Add to router
<Route path="/your-custom-path" element={<YourCustomPage />} />
```

### 3. Navigation Utils

**File**: `src/lib/navigation-utils.tsx`

**Usage**:
```tsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/your-custom-path');
```

### 4. Route Guards

**Location**: `src/app/guards/`

**Available Guards**:
- Authentication guards
- Permission guards
- Role-based guards

**Example Custom Guard**:
```tsx
// Create: src/app/guards/custom-guard.tsx
export function CustomGuard({ children }) {
  const isAllowed = checkYourCondition();
  
  if (!isAllowed) {
    return <Navigate to="/forbidden" />;
  }
  
  return children;
}
```

---

## API Configuration

### 1. API Client

**File**: `src/lib/api.ts`

**Configuration**:
```typescript
export const API_BASE_URL =
  import.meta.env.MODE === 'cloud'
    ? 'https://cloud.activepieces.com'
    : window.location.origin;

export const API_URL = `${API_BASE_URL}/api`;
```

**How to Customize**:

1. **Change API endpoint**:
```typescript
export const API_BASE_URL = 'https://your-custom-api.com';
```

2. **Add custom headers**:
```typescript
function request<TResponse>(url: string, config: AxiosRequestConfig = {}) {
  return axios({
    url: resolvedUrl,
    ...config,
    headers: {
      ...config.headers,
      'X-Custom-Header': 'your-value',
      Authorization: getToken(),
    },
  });
}
```

3. **Add custom interceptors**:
```typescript
axios.interceptors.request.use((config) => {
  // Modify request
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors
    return Promise.reject(error);
  }
);
```

### 2. Proxy Configuration (Development)

**File**: `vite.config.mts`

**Current Setup**:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3000',  // Change to your backend URL
      secure: false,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
      ws: true,  // WebSocket support
    },
  },
  port: 4200,
},
```

**Customization**:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8080',  // Your backend
    secure: false,
  },
  '/custom-api': {
    target: 'http://another-service:9000',
    changeOrigin: true,
  },
}
```

### 3. Feature Flags

**File**: `src/hooks/flags-hooks.ts`

**Usage**:
```tsx
import { flagsHooks } from '@/hooks/flags-hooks';

export function YourComponent() {
  const { data: featureEnabled } = flagsHooks.useFlag(ApFlagId.YOUR_FEATURE);
  
  if (!featureEnabled) {
    return null;
  }
  
  return <div>Feature content</div>;
}
```

---

## Assets & Media

### 1. Images

**Location**: `src/assets/img/`

**Customizable Assets**:
- Logos (SVG format recommended)
- Icons
- Illustrations
- Background images

**How to Add**:
```tsx
import yourLogo from '@/assets/img/your-logo.svg';

export function Header() {
  return <img src={yourLogo} alt="Your Logo" />;
}
```

### 2. Fonts

**Location**: `src/assets/fonts/`

**Current Fonts**: 3 woff2 font files

**Adding Custom Fonts**:

1. Add font files to `src/assets/fonts/`

2. Import in CSS:
```css
/* In src/styles.css */
@font-face {
  font-family: 'Your Font';
  src: url('./assets/fonts/your-font.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}

body {
  font-family: 'Your Font', sans-serif;
}
```

3. Or configure in Tailwind:
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Your Font', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

### 3. Favicon

**Method 1: Via HTML template**
```html
<!-- index.html -->
<link rel="icon" type="image/x-icon" href="/your-favicon.ico">
```

**Method 2: Via Theme Provider**
```tsx
// Automatically set via branding configuration
setFavicon(branding.logos.favIconUrl);
```

---

## Build Configuration

### 1. Vite Configuration

**File**: `vite.config.mts`

**Key Configuration Options**:

```typescript
export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/react-ui',
  
  server: {
    port: 4200,              // Dev server port
    host: '0.0.0.0',         // Allow external access
  },
  
  build: {
    outDir: '../../dist/packages/react-ui',
    emptyOutDir: true,
    reportCompressedSize: true,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),  // @ alias for imports
    },
  },
});
```

**Customizations**:

1. **Change dev server port**:
```typescript
server: {
  port: 8080,
}
```

2. **Add build optimizations**:
```typescript
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,  // Remove console.log in production
    },
  },
}
```

3. **Add environment variables**:
```typescript
define: {
  __APP_VERSION__: JSON.stringify(process.env.APP_VERSION),
}
```

### 2. TypeScript Configuration

**Files**:
- `tsconfig.json` - Base config
- `tsconfig.app.json` - App-specific config
- `tsconfig.spec.json` - Test config

**Customization Example**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"]
    }
  }
}
```

### 3. HTML Plugin Customization

**File**: `vite-plugins/html-plugin.js`

**Purpose**: Injects dynamic variables into HTML template

**Usage**:
```javascript
customHtmlPlugin({
  title: 'Your App Name',
  icon: 'https://your-domain.com/favicon.ico',
  // Add custom variables
  customVar: 'value',
})
```

---

## Advanced Customizations

### 1. Custom Authentication Flow

**File**: `src/lib/authentication-session.ts`

**Customization**:
```typescript
export const authenticationSession = {
  // Add custom authentication methods
  customLogin(credentials: CustomCredentials) {
    // Your custom login logic
    return authenticationApi.customLogin(credentials);
  },
  
  // Custom token storage
  saveToken(token: string) {
    // Store in your custom location
    ApStorage.getInstance().setItem('custom-token', token);
  },
};
```

### 2. Custom API Endpoints

**File**: `src/lib/*-api.ts`

**Example**: Create a custom API module

```typescript
// Create: src/lib/custom-api.ts
import { api } from './api';

export const customApi = {
  getYourData() {
    return api.get<YourDataType>('/v1/custom/data');
  },
  
  postYourData(data: YourDataType) {
    return api.post('/v1/custom/data', data);
  },
};
```

### 3. Custom React Hooks

**Location**: `src/hooks/`

**Example**:
```typescript
// Create: src/hooks/use-custom-data.ts
import { useQuery } from '@tanstack/react-query';
import { customApi } from '@/lib/custom-api';

export function useCustomData() {
  return useQuery({
    queryKey: ['customData'],
    queryFn: customApi.getYourData,
  });
}
```

### 4. Custom Feature Modules

**Location**: `src/features/`

**Structure**:
```
src/features/your-feature/
├── components/           # Feature-specific components
├── lib/                  # Feature utilities
│   ├── api.ts           # API calls
│   ├── hooks.ts         # Feature hooks
│   └── utils.ts         # Helper functions
└── index.tsx            # Main feature component
```

**Example**:
```tsx
// src/features/your-feature/index.tsx
export function YourFeature() {
  const { data } = useYourFeatureData();
  
  return (
    <div>
      <YourFeatureHeader />
      <YourFeatureContent data={data} />
    </div>
  );
}
```

### 5. Custom Providers

**Location**: `src/components/`

**Example**: Create a custom context provider

```tsx
// Create: src/components/custom-provider.tsx
import { createContext, useContext, useState } from 'react';

const CustomContext = createContext<CustomContextType | undefined>(undefined);

export function CustomProvider({ children }) {
  const [state, setState] = useState(initialState);
  
  return (
    <CustomContext.Provider value={{ state, setState }}>
      {children}
    </CustomContext.Provider>
  );
}

export function useCustomContext() {
  const context = useContext(CustomContext);
  if (!context) {
    throw new Error('useCustomContext must be used within CustomProvider');
  }
  return context;
}
```

Then add to `src/app/app.tsx`:
```tsx
<CustomProvider>
  <YourApp />
</CustomProvider>
```

### 6. Embedding Customization

**File**: `src/components/embed-provider.tsx`

**Purpose**: Handles embedded mode configuration

**Customization**:
- Remove "Powered by Activepieces" branding
- Customize embed behavior
- Add custom embed features

### 7. Telemetry & Analytics

**File**: `src/components/telemetry-provider.tsx`

**Customization**:
```tsx
// Add your analytics
useEffect(() => {
  if (user) {
    yourAnalytics.identify(user.id, {
      email: user.email,
      // ... other user properties
    });
  }
}, [user]);
```

---

## Best Practices

### 1. File Organization

✅ **DO**:
- Keep related files together in feature folders
- Use clear, descriptive names
- Follow existing naming conventions
- Use TypeScript for type safety

❌ **DON'T**:
- Mix feature logic in shared components
- Create deeply nested folder structures
- Use generic names like `utils.ts` everywhere

### 2. Styling

✅ **DO**:
- Use TailwindCSS utility classes
- Create CSS variables for reusable values
- Use the theme system for colors
- Support both light and dark modes

❌ **DON'T**:
- Write inline styles extensively
- Hard-code colors
- Override framework styles without documentation

### 3. State Management

✅ **DO**:
- Use React Query for server state
- Use React Context for global UI state
- Keep local state in components when possible
- Use proper TypeScript types

❌ **DON'T**:
- Prop-drill excessively
- Store server data in Context
- Forget to handle loading and error states

### 4. Component Development

✅ **DO**:
- Create small, reusable components
- Use composition over inheritance
- Add proper prop types
- Document complex components
- Follow accessibility guidelines

❌ **DON'T**:
- Create overly complex components
- Ignore TypeScript errors
- Skip error boundaries

### 5. Internationalization

✅ **DO**:
- Always use `t()` function for user-facing text
- Provide context for translators
- Use ICU message format for plurals and variables
- Test with different languages

❌ **DON'T**:
- Hard-code text strings
- Assume text length (different languages vary)
- Forget RTL language support (like Arabic)

### 6. API Integration

✅ **DO**:
- Use React Query for data fetching
- Handle loading and error states
- Use proper TypeScript types for API responses
- Add request/response interceptors for common logic

❌ **DON'T**:
- Make API calls directly in components
- Ignore error handling
- Skip optimistic updates where appropriate

### 7. Performance

✅ **DO**:
- Use React.memo for expensive components
- Lazy load routes and heavy components
- Optimize images (use WebP, lazy loading)
- Use proper React Query cache configuration

❌ **DON'T**:
- Render large lists without virtualization
- Re-create functions in render
- Forget to cleanup subscriptions

### 8. Development Workflow

✅ **DO**:
- Run TypeScript checks (`npm run vite-typecheck`)
- Test in both light and dark modes
- Test responsive layouts
- Check browser console for errors

❌ **DON'T**:
- Commit TypeScript errors
- Skip testing on different screen sizes
- Ignore console warnings

---

## Common Customization Scenarios

### Scenario 1: Custom Company Branding

**Goal**: Apply your company's branding throughout the app

**Steps**:
1. Update branding via backend API flags:
```json
{
  "websiteName": "Your Company",
  "logos": {
    "fullLogoUrl": "https://your-cdn.com/logo.svg",
    "favIconUrl": "https://your-cdn.com/favicon.ico",
    "logoIconUrl": "https://your-cdn.com/icon.svg"
  },
  "colors": {
    "primary": {
      "default": "#your-brand-color",
      "dark": "#your-dark-variant",
      "light": "#your-light-variant"
    }
  }
}
```

2. Add custom fonts:
```css
/* src/styles.css */
@import url('https://fonts.googleapis.com/css2?family=Your+Font:wght@400;600;700&display=swap');

body {
  font-family: 'Your Font', system-ui, sans-serif;
}
```

3. Update favicon in `index.html`

### Scenario 2: Add Custom Dashboard Widget

**Goal**: Add a new widget to the dashboard

**Steps**:
1. Create component:
```tsx
// src/features/dashboard/components/custom-widget.tsx
export function CustomWidget() {
  const { data } = useCustomWidgetData();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Widget</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Your widget content */}
      </CardContent>
    </Card>
  );
}
```

2. Add to dashboard:
```tsx
// src/app/routes/index.tsx
import { CustomWidget } from '@/features/dashboard/components/custom-widget';

export function Dashboard() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <ExistingWidget />
      <CustomWidget />  {/* Add here */}
    </div>
  );
}
```

### Scenario 3: Custom Authentication Provider

**Goal**: Integrate with your SSO system

**Steps**:
1. Create custom auth API:
```typescript
// src/lib/custom-auth-api.ts
export const customAuthApi = {
  ssoLogin(token: string) {
    return api.post('/v1/authentication/sso', { token });
  },
};
```

2. Create custom sign-in page:
```tsx
// src/app/routes/custom-sign-in/index.tsx
export function CustomSignIn() {
  const handleSSOLogin = async () => {
    const response = await customAuthApi.ssoLogin(ssoToken);
    authenticationSession.saveResponse(response, false);
    navigate('/');
  };
  
  return (
    <div>
      <button onClick={handleSSOLogin}>Sign in with SSO</button>
    </div>
  );
}
```

3. Update router to use custom sign-in

### Scenario 4: Hide/Show Features by Role

**Goal**: Show different UI based on user role

**Steps**:
1. Create role guard:
```tsx
// src/app/guards/role-guard.tsx
export function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();
  
  if (!allowedRoles.includes(user.role)) {
    return null;
  }
  
  return children;
}
```

2. Use in components:
```tsx
<RoleGuard allowedRoles={['admin', 'owner']}>
  <AdminPanel />
</RoleGuard>
```

### Scenario 5: Custom Piece Display

**Goal**: Customize how pieces are displayed

**Steps**:
1. Modify piece icon component:
```tsx
// src/features/pieces/components/piece-icon.tsx
export function CustomPieceIcon({ piece }) {
  // Add custom logic
  if (piece.name === 'ada-bmp') {
    return <img src="/custom-ada-bmp-icon.svg" />;
  }
  
  return <DefaultPieceIcon piece={piece} />;
}
```

2. Update piece selector styles

---

## Environment Variables

### Development

Create `.env.local` (not tracked by git):
```bash
VITE_CUSTOM_VAR=your-value
```

Access in code:
```typescript
const customVar = import.meta.env.VITE_CUSTOM_VAR;
```

### Production

Set during build:
```bash
VITE_CUSTOM_VAR=production-value npm run build
```

---

## Testing Customizations

### 1. Local Development

```bash
# Start dev server
npm run serve:frontend

# In another terminal, check TypeScript
npm run vite-typecheck
```

### 2. Build Testing

```bash
# Build the application
nx build react-ui

# Serve the built files
npx serve dist/packages/react-ui
```

### 3. Visual Testing Checklist

- [ ] Light mode appearance
- [ ] Dark mode appearance
- [ ] Mobile responsiveness (320px, 768px, 1024px, 1440px)
- [ ] All routes accessible
- [ ] Custom components render correctly
- [ ] Translations work for all supported languages
- [ ] Custom branding appears correctly
- [ ] API calls work as expected
- [ ] No console errors or warnings

---

## Troubleshooting

### Issue: Styles Not Applying

**Solution**:
1. Clear Vite cache: `rm -rf node_modules/.vite`
2. Restart dev server
3. Check that Tailwind classes are correct
4. Verify CSS file is imported in `main.tsx`

### Issue: Components Not Updating

**Solution**:
1. Check that file is saved
2. Verify Hot Module Replacement (HMR) is working
3. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
4. Check browser console for errors

### Issue: TypeScript Errors

**Solution**:
1. Run `npm run vite-typecheck` to see all errors
2. Ensure all imports have proper types
3. Check `tsconfig.json` for correct paths
4. Restart TypeScript server in your IDE

### Issue: API Calls Failing

**Solution**:
1. Check proxy configuration in `vite.config.mts`
2. Verify backend is running on correct port
3. Check browser Network tab for actual requests
4. Verify API endpoint paths are correct

### Issue: Build Fails

**Solution**:
1. Check for TypeScript errors
2. Verify all dependencies are installed
3. Check `vite.config.mts` for configuration issues
4. Try cleaning and rebuilding: `rm -rf dist && nx build react-ui`

---

## Additional Resources

### Official Documentation
- **React**: https://react.dev
- **Vite**: https://vitejs.dev
- **TailwindCSS**: https://tailwindcss.com
- **React Query**: https://tanstack.com/query
- **React Router**: https://reactrouter.com
- **i18next**: https://www.i18next.com

### Activepieces Docs
- **Main Documentation**: `docs/` folder
- **Embedding Guide**: `docs/embedding/`
- **API Documentation**: `docs/endpoints/`
- **Technical Docs**: `technical-docs/` folder

---

## Summary Checklist

Before deploying customizations, ensure:

- [ ] All TypeScript checks pass
- [ ] Components work in both light and dark modes
- [ ] Responsive design works on all screen sizes
- [ ] All user-facing text uses i18n
- [ ] API integration tested
- [ ] Custom branding applied correctly
- [ ] No console errors
- [ ] Build completes successfully
- [ ] Documentation updated for your changes
- [ ] Code follows existing patterns and conventions

---

**Happy Customizing!** 🎨

For questions or issues with customization, refer to:
- Main project README: `/README.md`
- Contributing guide: `/CONTRIBUTING.md`
- Technical docs: `/technical-docs/`
