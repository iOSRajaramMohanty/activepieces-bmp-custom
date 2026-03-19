# Customizing SDK styles from bmp-fe-web with bmp-overrides.css

This guide explains how to customize CSS for the **Connections** page (and other SDK views) when the React UI SDK is embedded in **bmp-fe-web**, using **bmp-overrides.css** so your overrides take precedence over Bootstrap and the SDK's inlined styles.

## Built-in Style Isolation (v1.0+)

**Starting with SDK v1.0+, Bootstrap style conflicts are handled automatically.** The SDK includes built-in CSS isolation that:

- Uses CSS containment (`contain: layout paint style`) to create a style boundary
- Resets Bootstrap's global element styles (tables, buttons, inputs, etc.) inside the SDK
- Isolates Radix UI portals (dialogs, popovers, dropdowns) from host styles
- Creates proper z-index stacking contexts

**Most Bootstrap conflicts are now resolved out-of-the-box.** You only need `bmp-overrides.css` for:
- Custom theming (changing colors, fonts, radius)
- App-specific layout adjustments
- Edge cases not covered by automatic isolation

If you're using SDK v1.0+, you can likely simplify or remove your existing `bmp-overrides.css`.

---

## 1. Where bmp-overrides.css lives and load order

> **Note:** With built-in isolation, you may not need this file at all. Use it only for custom theming or edge cases.

- **Location:** In the bmp-fe-web app (e.g. `src/styles/bmp-overrides.css` or next to your global styles).
- **Load order:** Import or link **bmp-overrides.css after**:
  - Bootstrap (or any other global framework),
  - The SDK script (which injects its own styles).

So in `angular.json` or your `index.html` / main bundle, ensure the overrides file is loaded last. Example in `angular.json`:

```json
"styles": [
  "node_modules/bootstrap/dist/css/bootstrap.min.css",
  "src/styles/styles.css",
  "src/styles/bmp-overrides.css"
]
```

If the SDK is loaded via a script tag, loading your overrides after that script is enough for cascade.

## 2. Scoping overrides to the Connections view only

The SDK wrapper sets a **data attribute** on the React root container so you can scope overrides per view:

- When the **Connections** component is mounted, the container has: **`data-ap-view="connections"`**.

Use this as an ancestor selector so your rules only affect the Connections page and not Dashboard, Runs, etc.

**Scope all Connections overrides under:**

```css
[data-ap-view="connections"] {
  /* your overrides */
}
```

Or target specific elements only when the Connections view is active:

```css
[data-ap-view="connections"] table { ... }
[data-ap-view="connections"] .rounded-md { ... }
```

## 3. DOM structure of the Connections page (for selectors)

The Connections route renders `AppConnectionsPage`, which uses a **DataTable** and shared UI components. The SDK uses **Tailwind/shadcn** (not Bootstrap) for the React UI; Bootstrap comes from bmp-fe-web and can affect the embedded content if not overridden.

Useful structure and classes:

| Area | Selector / structure |
|------|----------------------|
| Page root | `[data-ap-view="connections"]` → `div.flex-col.w-full` |
| Toolbar (filters + bulk actions) | `div.flex.items-center.justify-between.pb-4` (filters + "Replace", "New Connection" buttons) |
| Table wrapper | `div.rounded-md.mt-0.overflow-hidden` |
| Table | `table.table-fixed` inside `div.relative.w-full.overflow-auto` |
| Header row | `thead [&_tr]:border-b` → `tr` → `th` (e.g. Piece, Name, Status, Connected At, Flows, actions) |
| Body rows | `tbody tr` with `data-state="selected"` when selected, `border-b`, `hover:bg-muted/50` |
| Cells | `td` with `px-2 py-3 align-middle` |
| Buttons | "Replace" (outline), "New Connection" (primary), "Delete" (destructive) – they use shadcn `Button` with `variant="outline"`, `variant="default"`, `variant="destructive"` |

So in **bmp-overrides.css** you can target:

- `[data-ap-view="connections"] table` – the connections table
- `[data-ap-view="connections"] thead th` – header cells
- `[data-ap-view="connections"] tbody tr` – body rows
- `[data-ap-view="connections"] tbody td` – body cells
- `[data-ap-view="connections"] button` – buttons in the toolbar and row actions

## 4. Example overrides in bmp-overrides.css

> **Note:** With built-in isolation (v1.0+), most of these overrides are no longer needed. Use them only for custom styling.

### Custom theming (colors, fonts)

```css
/* Override SDK theme variables to match your app */
.ap-sdk-root {
  --primary: 220 90% 56%;  /* Your brand color in HSL */
  --primary-foreground: 0 0% 100%;
  --radius: 0.5rem;
  --font-sans: 'Your Font', system-ui, sans-serif;
}
```

### Only affect the Connections view

```css
/* Scope: Connections page only */
[data-ap-view="connections"] {
  /* Custom layout adjustments */
  padding: 1rem;
}
```

### Override specific table styles

```css
[data-ap-view="connections"] thead th {
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}
```

### Make toolbar/buttons match your app

```css
[data-ap-view="connections"] .flex.items-center.justify-between.pb-4 {
  padding-bottom: 1rem;
  gap: 0.5rem;
}
```

## 5. Summary

1. **SDK v1.0+ includes built-in Bootstrap isolation** – most conflicts are handled automatically.
2. **bmp-overrides.css** is optional – use it only for custom theming or edge cases.
3. Scope view-specific rules with **`[data-ap-view="connections"]`** so they don't affect other SDK views.
4. Use the **Connections page DOM structure** (table, thead, tbody, toolbar, buttons) to target the right elements.
5. Override only what you need (colors, fonts, spacing) so the SDK's Tailwind/shadcn layout and behavior stay intact.

After changing the SDK bundle, when you copy built files into bmp-fe-web, **do not overwrite bmp-overrides.css** (see BUILD_GUIDE.md).
