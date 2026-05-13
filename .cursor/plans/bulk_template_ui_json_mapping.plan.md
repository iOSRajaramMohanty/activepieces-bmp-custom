---
name: ""
overview: ""
todos: []
isProject: false
---

# BMP Send Bulk Message: UI ↔ JSON mapping (4 templates) + gaps

Sources: [docs/bmp-templates-filtered.json](docs/bmp-templates-filtered.json) (template records) + your screenshot groupings.

---

## Mock preview vs BMP API (must fix)

The HTML mock’s **Preview mock payload** (`collect()` in [docs/send-bulk-message-mock-ui.html](docs/send-bulk-message-mock-ui.html)) currently builds a **debug object**, not the real BMP request:

```json
{
  "templateName": "automationmktimgtemplate1769626396185",
  "templateId": "bd5cf010-194d-4493-b94d-921c84ae87c5",
  "category": "MARKETING",
  "messageType": "template",
  "templateCategory": "MARKETING",
  "variableSlots": {
    "headerMedia:fileName": "",
    "Body:1": "",
    "Body:2": ""
  }
}
```

**Requirement:** The preview (and the piece’s `requestBody`) must follow the **same standard as `POST {bmpApiUrl}/contact-category/bulkmessage`** for the **selected template** — keys, nesting, and array lengths — with values filled from user inputs and template metadata. Shape must be **dynamic** by template: `type` (`custom` | `carousel` | `catalog` | empty), `headerType` (`TEXT` | `IMAGE` | … | `"null"`), `buttons` count/types, and `carouselCards` structure.

**Completeness (required):** The BMP backend expects the **full** request object for that template — **all** top-level keys and **all** array slots the API defines for that shape (e.g. `buttons`, `templateButton`, `payload` each with the correct length; `templateData` for every body variable). Do **not** ship a minimal or partial JSON that omits keys because values are empty — use `""`, `null`, `[]`, or `null` entries where the capture shows them. Mock preview should mirror the same **complete** key set (use placeholders like `"<from>"` / `"<contactCategoryId>"` for `from` / `to` if real IDs are not available in the mock).

**Source of truth for field names:** Network captures for each template class supersede the mock’s `variableSlots` dump. **Canonical example for `automationmktimgtemplate1769626396185`** (BMP backend bulk message):

```json
{
  "from": "601153813541",
  "to": ["54bd3e6a-bdee-4307-a47e-5c3693df89fc"],
  "type": "template",
  "buttons": [null, null, null, null, null, null, null, null, null, null],
  "templateData": ["tyest1", "test2"],
  "templateButton": [[], [], [], [], [], [], [], [], [], []],
  "templateLang": "en",
  "templateName": "automationmktimgtemplate1769626396185",
  "headerType": "IMAGE",
  "platform": "WA",
  "channel": "CONTACT",
  "fileName": "ada-logo.png",
  "payload": ["test3", "test4", "test5", "test6", "test7", "test8", "", "", "", ""],
  "tag2": "Send bulk to contact category",
  "header": "https://bmpapistgjkt.cl.bmp.ada-asia.my/message/media/59e642e2-a93c-4e6a-9240-14caf6f3789b"
}
```

**Notes on this shape:**

- **`buttons`:** length **10**, all `null` here — aligns with **10** template buttons (6 QUICK_REPLY + 2 URL + PHONE_NUMBER + FLOW).
- **`templateData`:** length **2** — body `{{1}}`, `{{2}}` (main text parameters).
- **`templateButton`:** length **10**, each entry an **array** (empty in sample) — parallel to buttons; fill when a button type needs nested params per BMP rules.
- **`payload`:** length **10** — in the sample, **6** entries are quick-reply payload strings (`test3`…`test8` are six values), then **4** empty strings for the URL / URL / phone / flow button slots.
- **`headerType`:** **`"IMAGE"`** in the **bulk** request — matches [docs/bmp-templates-filtered.json](docs/bmp-templates-filtered.json) for this template. Use **`header`** (media URL) + **`fileName`** together for the image header.
- **`templateId`:** include in the real piece request if BMP or your capture requires it for that environment; mock can echo `id` from the selected template row for parity.

Also paste captures for the other three template archetypes when available; mirror the same array-length rules per template.

**Implementation direction:**

1. **Envelope** (always, per [docs/ada-bmp-piece-mcp-guide.md](docs/ada-bmp-piece-mcp-guide.md) and [packages/pieces/custom/ada-bmp/src/lib/actions/send-bulk-message.ts](packages/pieces/custom/ada-bmp/src/lib/actions/send-bulk-message.ts)): `from`, `to`, `type`, `channel`, `platform`, `tag2` — **always present** in the real request; mock preview uses the same keys with resolved or placeholder values (see **Completeness** above).
2. **Map** `variableSlots` internally → BMP fields: e.g. body `{{1}}`…`{{n}}` → `templateData` (or whatever the API uses for body components); **IMAGE** header browse → `header` URL and/or `fileName` as in your capture; carousel → `templateCarouselCards` (or equivalent) per card; quick reply / URL / phone / flow → `templateButton` / `payload` / nested arrays **matching template button order** from `buttons[]` in JSON.
3. **Piece:** extend `send-bulk-message.ts` so MARKETING/UTILITY **non–call-permission** templates do **not** stop at `templateId` + `text`; build the same structure as the mock/API.

---

## Screenshot → template name


| Screenshots | `name`                                            |
| ----------- | ------------------------------------------------- |
| 1st & 2nd   | `utilitytextautomationtest200126_122655`          |
| 3rd & 4th   | `marketingcatalogaumautomationtest210126_140622`  |
| 5th–8th     | `automarketingvideocarouseltemplate1769626324468` |
| Remaining   | `automationmktimgtemplate1769626396185`           |


---

## 1. `utilitytextautomationtest200126_122655` (UTILITY)

**JSON essentials:** `category`: UTILITY, `type`: `""`, `headerType`: TEXT, `header`: "Order update", `body` with `{{1}}` `{{2}}`, `footer`, `buttons[0]` URL.


| UI field (screenshots)  | JSON key                       | Value in JSON                                                              |
| ----------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| Template*               | `name`                         | `utilitytextautomationtest200126_122655`                                   |
| Header (Optional)       | `headerType`                   | `TEXT`                                                                     |
| Header Text             | `header`                       | `Order update`                                                             |
| Template Text*          | `body` / `content`             | `Hi {{1}}, your order has been shipped and is expected to arrive by {{2}}` |
| Param 1*                | user input → body slot 1       | `bodyParameters` examples: `["ENV","Test"]` (hints only)                   |
| Param 2*                | user input → body slot 2       |                                                                            |
| Button URL 1*           | `buttons[0].url`               | `https://google.com/`                                                      |
| Button label (if shown) | `buttons[0].text`              | `Label button`                                                             |
| Using Static Parameters | product flag (not in BMP JSON) | —                                                                          |


**Gaps / not in screenshots:** `footer` (`Thank you for shopping with us`) is not shown as editable; usually static on send. `wabaId`, `language`, `id` are metadata for API calls, not form fields.

---

## 2. `marketingcatalogaumautomationtest210126_140622` (MARKETING, catalog)

**JSON:** `type`: `catalog`, `headerType`: `"null"` (string), `header`: `""`, `body` with `{{1}}` `{{2}}`, `footer`, `buttons[0]` CATALOG.


| UI field                | JSON key                                   | Value in JSON                                                           |
| ----------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| Template*               | `name`                                     | `marketingcatalogaumautomationtest210126_140622`                        |
| Header (Optional)       | `headerType`                               | `"null"` / empty                                                        |
| Header Media / Browse   | `header` + `headerType` (when IMAGE/VIDEO) | JSON has no header media; UI shows Browse for optional marketing header |
| Template Text*          | `body` / `content`                         | `This is a test {{1}} template {{2}}...`                                |
| Param 1* / Param 2*     | body variable slots                        | `bodyParameters` examples: `["cat","cata"]`                             |
| Button Label            | `buttons[0].text`                          | `View catalog`                                                          |
| Using Static Parameters | product flag                               | —                                                                       |


**Gaps:** `footer` (`Catalogue template`) not visible in screenshot. **Catalog send** may require **catalog / product identifiers** (not in this template JSON); confirm BMP API. CATALOG button has no `url` in JSON (`""`).

---

## 3. `automarketingvideocarouseltemplate1769626324468` (MARKETING, carousel)

**JSON:** `type`: `carousel`, main `body` with `{{1}}{{2}}`, `bodyParameters` `["000","111"]`, `carouselCards` = two cards; each card: header `media_url`, body `text` with `{{1}}{{2}}`, nested `buttons`.


| UI field                                | JSON key                              | Value / notes                                                             |
| --------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| Template*                               | `name`                                | `automarketingvideocarouseltemplate1769626324468`                         |
| Header (Optional)                       | `headerType` (top-level)              | `TEXT`; top-level `header` is `""`                                        |
| Header Text                             | `header`                              | `""` in JSON (empty)                                                      |
| Template Text*                          | `body`                                | Main body with `{{1}}{{2}}`                                               |
| Param 1* / Param 2* (main)              | main body components                  | Examples `bodyParameters`: `000`, `111`                                   |
| Carousel Card N – File / Browse         | `carouselCards[n][header].media_url`  | Per-card video URL                                                        |
| Card Body – Content                     | `carouselCards[n][body].text`         | Each has `{{1}}{{2}}`                                                     |
| Param 1* / Param 2* per card            | card body parameters                  | JSON `parameters` under body component: e.g. `222`,`333` then `444`,`555` |
| **Card Buttons** – Phone / QR / Payload | `carouselCards[n][buttons].buttons[]` | `phone_number`, `quick_reply`; `parameters` may be null                   |


**Critical:** Main body and **each card body** reuse `{{1}}` and `{{2}}` in the **strings**, but WhatsApp sends **separate component parameter lists** for the main body vs each card. The UI correctly isolates **main** Param 1/2 vs **per-card** Param 1/2.

**Gaps:** Top-level `footer` is `""`. **Flow** if BMP expects **media upload** instead of reusing `media_url` is a product/API detail. **Carousel Card 2** header video Browse mirrors card 1 structurally.

---

## 4. `automationmktimgtemplate1769626396185` (MARKETING, custom image)

**Template list JSON** ([docs/bmp-templates-filtered.json](docs/bmp-templates-filtered.json))): `type`: `custom`, `headerType`: **IMAGE** in metadata, `header`: image URL, `body` with `{{1}}{{2}}`, `buttons` length 10 (QR×6, URL×2, PHONE_NUMBER, FLOW).

**Bulk API request** uses the **canonical shape above** — not the mock `variableSlots` object. Key mappings:


| UI / user input | Bulk request field | Notes |
| --- | --- | --- |
| Account picker | `from` | Sender WhatsApp business number |
| Contact category | `to` | Single-element array of category id |
| Body param 1 / 2 | `templateData[0]`, `templateData[1]` | Same order as `{{1}}`, `{{2}}` |
| Header media URL (Browse / paste) | `header` | BMP media URL after upload or existing URL |
| Header file name | `fileName` | e.g. `ada-logo.png` |
| Bulk `headerType` | `headerType` | **`"IMAGE"`** — same as template list metadata for this template |
| Per-button quick-reply payload (6) | `payload[0]`…`payload[5]` | Match QR buttons 1–6 |
| URL / phone / flow slots | `payload[6]`…`payload[9]` | Often `""` when using template defaults |
| Button slot placeholders | `buttons` | Array of **10** `null` in sample |
| Nested button params | `templateButton[i]` | **10** arrays, parallel to `buttons`; empty `[]` in sample |
| — | `templateName`, `templateLang`, `type`, `channel`, `platform`, `tag2` | As in sample |

**Gaps:** **PHONE_NUMBER** / **FLOW** may still need values from template JSON (`phoneNumber`, `flow_id`) when not overridden.

---

## Cross-cutting: what’s missing from UI coverage vs JSON

1. **Metadata always needed for API but not in form:** `id`, `wabaId`, `language`, `category`, `status` (APPROVED).
2. **Footer** often static; only add inputs if `footer` contains `{{n}}` (none of these four).
3. **Catalog template:** possible **catalog/product** selection not represented in template JSON.
4. **Carousel:** **main** vs **per-card** parameter sets must stay separate; naive `{{n}}` merge across the whole object would be wrong.
5. **FLOW / phone** buttons: labels may be insufficient; **flow_id** and **phone number** are in JSON for send.
6. `**headerType` `"null"`** (string) on catalog: normalize to empty/“none” in UI.
7. `**Using Static Parameters`:** checkbox in UI; **not** a BMP template field — app-level behavior.

---

## Implementation todos

- Replace mock **Preview** output with a **BMP-shaped** object (or two blocks: `bulkMessageRequest` + optional `notes`), built from selected row in [docs/bmp-templates-filtered.json](docs/bmp-templates-filtered.json) + filled inputs — **not** a flat `variableSlots` export.
- **Canonical JSON** for `automationmktimgtemplate1769626396185` is **in this plan** (see “Mock preview vs BMP API”); add captures for the other three archetypes when available.
- Load full template by `id` after dropdown selection (already have list payload; confirm if GET-by-id is needed).
- Implement placeholder / component scanning (main body, header text if any, each carousel card body).
- Map inputs to BMP send payload: `templateData`, `templateButton`, `payload`, `header` / `fileName`, carousel arrays — **sizes and order** from template `buttons` / `carouselCards`.
- Update [packages/pieces/custom/ada-bmp/src/lib/actions/send-bulk-message.ts](packages/pieces/custom/ada-bmp/src/lib/actions/send-bulk-message.ts) for generic MARKETING/UTILITY templates (not only CP and AUTH).
- Update [docs/ada-bmp-piece-mcp-guide.md](docs/ada-bmp-piece-mcp-guide.md) request-body section for full template send.
- QA all four templates end-to-end against BMP.

