# Send Bulk Message — HTML mock (JSON-driven)

Visual mock of the **Send Bulk Message** step for ADA BMP. It **loads** [`bmp-templates-filtered.json`](bmp-templates-filtered.json) from the same folder and:

- Filters the **Template** list by **Template Category** (`MARKETING` / `UTILITY` / `AUTHENTICATION`) using each row’s `category` field.
- Labels templates **`CP`** / **`STD`** from `isCallPermissionRequest` (same idea as `[CP]` / `[STD]` in the piece).
- After you pick a template, **derives input fields** from the template object:
  - Scans `body`, `header` (TEXT), `footer` for `{{1}}`, `{{2}}`, … and renders **Param** inputs (hints from `bodyParameters` / `footerParameters` when present).
  - **`headerType`** string `"null"` or **`IMAGE` / `VIDEO` / `DOCUMENT`**: **Header (Optional)** + **Header Media** with **Browse** (optional for `"null"` catalog-style rows). **`TEXT`** headers with `{{n}}` use Param inputs only (no Browse row).
  - **`type` `carousel`**: main body params plus **per-card** body params for each `carouselCards` entry.
  - **Buttons** listed read-only.
- **Message / OTP** field: **only shown** when Message Type is **Send WA Template** and **Template Category** is **AUTHENTICATION** (OTP), or when Message Type is **not** Send WA Template (free-text body). Hidden for **Send WA Template** + MARKETING / UTILITY.
- **Preview mock payload (JSON)** includes `messageBox` only when that field is visible (same rules).

Aligned with:

- [`packages/pieces/custom/ada-bmp/src/lib/actions/send-bulk-message.ts`](../packages/pieces/custom/ada-bmp/src/lib/actions/send-bulk-message.ts) (bulk payload shape and **Template parameters (JSON)** keys should match this preview)
- [`packages/pieces/custom/ada-bmp/src/lib/common/props.ts`](../packages/pieces/custom/ada-bmp/src/lib/common/props.ts)

**Important:** Browsers block `fetch()` to local JSON when the page is opened as `file://`. **Serve the `docs` folder over HTTP:**

```bash
cd docs && python3 -m http.server 8765
```

Then open: `http://localhost:8765/send-bulk-message-mock-ui.html`

The banner at the top shows load status (success count or error with the same instructions).

**Note:** [`bmp-templates-filtered.json`](bmp-templates-filtered.json) has **no `AUTHENTICATION` templates** (filtered out earlier), so choosing AUTH shows an empty template list — use **MARKETING** or **UTILITY** to exercise the UI.

## Piece reference

Implementation lives in [`packages/pieces/custom/ada-bmp/src/lib/actions/send-bulk-message.ts`](../packages/pieces/custom/ada-bmp/src/lib/actions/send-bulk-message.ts).
