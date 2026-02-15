# Customizing SDK styles from bmp-fe-web with bmp-overrides.css

This guide explains how to customize CSS for the **Connections** page (and other SDK views) when the React UI SDK is embedded in **bmp-fe-web**, using **bmp-overrides.css** so your overrides take precedence over Bootstrap and the SDK’s inlined styles.

## 1. Where bmp-overrides.css lives and load order

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
| Toolbar (filters + bulk actions) | `div.flex.items-center.justify-between.pb-4` (filters + “Replace”, “New Connection” buttons) |
| Table wrapper | `div.rounded-md.mt-0.overflow-hidden` |
| Table | `table.table-fixed` inside `div.relative.w-full.overflow-auto` |
| Header row | `thead [&_tr]:border-b` → `tr` → `th` (e.g. Piece, Name, Status, Connected At, Flows, actions) |
| Body rows | `tbody tr` with `data-state="selected"` when selected, `border-b`, `hover:bg-muted/50` |
| Cells | `td` with `px-2 py-3 align-middle` |
| Buttons | “Replace” (outline), “New Connection” (primary), “Delete” (destructive) – they use shadcn `Button` with `variant="outline"`, `variant="default"`, `variant="destructive"` |

So in **bmp-overrides.css** you can target:

- `[data-ap-view="connections"] table` – the connections table
- `[data-ap-view="connections"] thead th` – header cells
- `[data-ap-view="connections"] tbody tr` – body rows
- `[data-ap-view="connections"] tbody td` – body cells
- `[data-ap-view="connections"] button` – buttons in the toolbar and row actions

## 4. Example overrides in bmp-overrides.css

### Only affect the Connections view

```css
/* Scope: Connections page only */
[data-ap-view="connections"] {
  /* Prevent Bootstrap from affecting the SDK container */
  all: initial;
  display: block;
  width: 100%;
  box-sizing: border-box;
}
[data-ap-view="connections"] * {
  box-sizing: border-box;
}
```

Use `all: initial` with care (it resets inheritance); often you only need to override specific Bootstrap rules.

### Override Bootstrap table styles on the Connections table

```css
[data-ap-view="connections"] table.table-fixed {
  /* Override Bootstrap .table if it leaks in */
  border-collapse: collapse;
  width: 100%;
}
[data-ap-view="connections"] thead th {
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}
[data-ap-view="connections"] tbody td {
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}
[data-ap-view="connections"] tbody tr:hover {
  background-color: #f9fafb;
}
```

### Make toolbar/buttons match your app

```css
[data-ap-view="connections"] .flex.items-center.justify-between.pb-4 {
  padding-bottom: 1rem;
  gap: 0.5rem;
}
[data-ap-view="connections"] button {
  /* Override Bootstrap .btn if it affects SDK buttons */
  font-family: inherit;
  border-radius: 0.375rem;
}
```

### Isolate the SDK from Bootstrap’s global styles

If Bootstrap’s base styles (e.g. on `table`, `button`, `input`) are affecting the Connections view, reset or re-define them only inside the SDK container:

```css
[data-ap-view="connections"] table {
  margin-bottom: 0;
  background-color: transparent;
}
[data-ap-view="connections"] .rounded-md {
  border-radius: 0.375rem;
}
```

### Connection dialog – remove unwanted scrollbar (“Select an Authentication Method”)

The connection/auth method modal is rendered in a **portal** (outside the Connections container), so scope with `[data-ap-view="connections"]` does not apply. Target it by `role="dialog"` and the dialog’s class.

If you are on an **older SDK build** where the dialog uses `overflow-y-auto` and shows a scrollbar even when content is short, add to **bmp-overrides.css**:

```css
/* Connection dialog: no scrollbar when content is short (e.g. "Select an Authentication Method") */
[role="dialog"][class*="overflow-y-auto"] {
  overflow-y: visible !important;
}
```

**Newer SDK builds** fix this in the bundle (flex layout + inner scroll wrapper), so the outer dialog uses `overflow-hidden` and no longer shows a scrollbar for short content. After updating the SDK you can remove this override; if host/Bootstrap styles still force a scrollbar, keep it.

## 5. Summary

1. **bmp-overrides.css** lives in bmp-fe-web and should load **after** Bootstrap and the SDK.
2. Scope Connections-specific rules with **`[data-ap-view="connections"]`** so they don’t affect other SDK views.
3. Use the **Connections page DOM structure** (table, thead, tbody, toolbar, buttons) to target the right elements.
4. Override only what you need (tables, buttons, spacing) so the SDK’s Tailwind/shadcn layout and behavior stay intact.

After changing the SDK bundle, when you copy built files into bmp-fe-web, **do not overwrite bmp-overrides.css** (see BUILD_GUIDE.md).
