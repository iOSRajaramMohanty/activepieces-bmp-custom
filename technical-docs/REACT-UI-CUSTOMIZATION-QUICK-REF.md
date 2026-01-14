# React UI Customization - Quick Reference

**Quick access guide to the most common customizations**

---

## 🎨 Branding (Most Common)

| What | Where | How |
|------|-------|-----|
| **Website Name** | Backend API flags | `websiteName: "Your Company"` |
| **Logo** | Backend API flags | `logos.fullLogoUrl: "https://..."` |
| **Favicon** | Backend API flags | `logos.favIconUrl: "https://..."` |
| **Primary Color** | Backend API flags | `colors.primary.default: "#hex"` |
| **Title in HTML** | `index.html` line 8 | `<title><%= apTitle %></title>` |

**File**: `src/hooks/flags-hooks.ts` (TypeScript interface definition)
**File**: `src/components/theme-provider.tsx` (theme application logic)

---

## 🌈 Colors & Theme

| Feature | File | Line/Section |
|---------|------|--------------|
| CSS Variables | `src/components/theme-provider.tsx` | Lines 58-89 |
| Global Gradients | `src/styles/globals.css` | Lines 1-17 |
| Dark/Light Toggle | `src/components/theme-provider.tsx` | `setTheme()` function |

**CSS Variables Available**:
- `--primary` - Main brand color
- `--primary-100` - Light variant  
- `--primary-300` - Dark variant

---

## 🧩 Components

| Component Type | Location | Purpose |
|----------------|----------|---------|
| **Custom Components** | `src/components/custom/` | Reusable UI elements |
| **Base UI (shadcn)** | `src/components/ui/` | Buttons, dialogs, forms |
| **Feature Components** | `src/features/*/components/` | Feature-specific UI |

**Quick Add Component**:
```tsx
// Create: src/components/custom/your-component.tsx
export function YourComponent({ prop }: { prop: string }) {
  return <div className="p-4">{prop}</div>;
}
```

---

## 🌍 Translations

| Language | Code | File Location |
|----------|------|---------------|
| English | `en` | `public/locales/en/translation.json` |
| German | `de` | `public/locales/de/translation.json` |
| Spanish | `es` | `public/locales/es/translation.json` |
| French | `fr` | `public/locales/fr/translation.json` |
| Japanese | `ja` | `public/locales/ja/translation.json` |
| + 6 more | ... | `public/locales/*/` |

**Add Translation**:
```json
{
  "Your Key": "Your Translation"
}
```

**Use in Code**:
```tsx
const { t } = useTranslation();
return <div>{t('Your Key')}</div>;
```

---

## 🛣️ Routes

| Route | File | Customizable |
|-------|------|--------------|
| `/` | `src/app/routes/index.tsx` | ✅ Dashboard |
| `/sign-in` | `src/app/routes/sign-in/index.tsx` | ✅ Login page |
| `/flows` | `src/app/routes/flows/index.tsx` | ✅ Flows list |
| `/platform/*` | `src/app/routes/platform/` | ✅ Admin pages |

**Add Route**:
```tsx
// In src/app/guards/index.tsx
<Route path="/custom" element={<YourPage />} />
```

---

## 🔌 API Configuration

| Setting | File | Line |
|---------|------|------|
| **API Base URL** | `src/lib/api.ts` | Lines 13-16 |
| **Dev Proxy** | `vite.config.mts` | Lines 25-36 |
| **Request Headers** | `src/lib/api.ts` | Lines 67-74 |

**Quick Change API URL**:
```typescript
// src/lib/api.ts
export const API_BASE_URL = 'https://your-api.com';
```

**Dev Proxy**:
```typescript
// vite.config.mts
proxy: {
  '/api': {
    target: 'http://localhost:3000',
  },
}
```

---

## 🎭 Styling Methods

| Method | When to Use | Example |
|--------|-------------|---------|
| **TailwindCSS** | Standard styling | `className="p-4 bg-blue-500"` |
| **CSS Variables** | Dynamic colors | `var(--primary)` |
| **Global CSS** | App-wide styles | `src/styles/globals.css` |
| **Inline Styles** | Rare, dynamic only | `style={{ color: dynColor }}` |

---

## 📁 File Structure Quick Map

```
packages/react-ui/src/
├── app/
│   ├── app.tsx              # Main app component
│   ├── routes/              # All page routes
│   └── guards/              # Route protection
├── components/
│   ├── custom/              # Custom components
│   ├── ui/                  # Base UI components
│   └── theme-provider.tsx   # Theme logic
├── features/
│   ├── flows/               # Flow management
│   ├── pieces/              # Piece system
│   └── [feature]/           # Other features
├── hooks/                   # React hooks
├── lib/
│   ├── api.ts              # API client
│   └── [util].ts           # Utilities
├── assets/
│   ├── img/                # Images
│   └── fonts/              # Fonts
├── i18n.ts                 # i18n config
├── main.tsx                # Entry point
└── styles/                 # Global CSS
```

---

## ⚡ Most Common Tasks

### 1. Change Primary Color

```typescript
// Via backend API flags
{
  "colors": {
    "primary": {
      "default": "#your-color"
    }
  }
}
```

### 2. Add Custom Page

```tsx
// 1. Create: src/app/routes/custom-page/index.tsx
export function CustomPage() {
  return <div>Your page</div>;
}

// 2. Add route in: src/app/guards/index.tsx
<Route path="/custom" element={<CustomPage />} />
```

### 3. Hide/Show Features

```tsx
// Use feature flags
const { data: enabled } = flagsHooks.useFlag(ApFlagId.YOUR_FEATURE);

if (!enabled) return null;
return <YourFeature />;
```

### 4. Custom Authentication

```typescript
// src/lib/custom-auth-api.ts
export const customAuthApi = {
  login(credentials) {
    return api.post('/v1/auth/custom', credentials);
  },
};
```

### 5. Change Font

```css
/* src/styles.css */
@import url('https://fonts.googleapis.com/css2?family=YourFont&display=swap');

body {
  font-family: 'YourFont', sans-serif;
}
```

---

## 🚀 Development Commands

```bash
# Start dev server
npm run serve:frontend

# TypeScript check
npm run vite-typecheck

# Build production
nx build react-ui

# Clear cache
rm -rf node_modules/.vite
```

---

## 🐛 Quick Debugging

| Issue | Quick Fix |
|-------|-----------|
| Styles not applying | Clear cache + restart: `rm -rf node_modules/.vite && npm run serve:frontend` |
| TypeScript errors | `npm run vite-typecheck` |
| API not working | Check `vite.config.mts` proxy + backend running |
| Build fails | Check console, fix TS errors, clean: `rm -rf dist` |
| HMR not working | Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows) |

---

## 📋 Pre-Deploy Checklist

- [ ] TypeScript check passes
- [ ] Works in light mode
- [ ] Works in dark mode
- [ ] Responsive on mobile (320px+)
- [ ] All text uses `t()` for i18n
- [ ] No console errors
- [ ] Build completes: `nx build react-ui`
- [ ] Test built version: `npx serve dist/packages/react-ui`

---

## 🔗 Related Docs

- Full Guide: `technical-docs/REACT-UI-CUSTOMIZATION.md`
- Custom Pieces: `technical-docs/CUSTOM-PIECE.md`
- Project Overview: `technical-docs/PROJECT.md`
- Main README: `README.md`

---

## 💡 Pro Tips

1. **Use existing components** from `src/components/ui/` before creating new ones
2. **Follow naming conventions** - component files use PascalCase
3. **Test both themes** - many users prefer dark mode
4. **Use TypeScript** - it catches errors before runtime
5. **Keep features modular** - use the `src/features/` structure
6. **Leverage React Query** - for all API calls
7. **Use CSS variables** - for dynamic theming
8. **Respect i18n** - always use `t()` for user text

---

**For detailed explanations, see**: `REACT-UI-CUSTOMIZATION.md`
