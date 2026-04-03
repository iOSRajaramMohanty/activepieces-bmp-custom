# ADA BMP Piece — MCP Client Guide

**Piece:** `@activepieces/piece-ada-bmp` v0.1.1  
**Display name:** ADA BMP  
**Category:** Communication  
**Channels supported:** WhatsApp · Facebook · Instagram · Line

---

## Table of Contents

1. [What is ADA BMP?](#1-what-is-ada-bmp)
2. [Prerequisites](#2-prerequisites)
3. [Connection / Authentication](#3-connection--authentication)
4. [Actions](#4-actions)
   - [Send Message](#41-send-message)
   - [Send Bulk Message](#42-send-bulk-message)
   - [Upload Contact Parameters](#43-upload-contact-parameters)
   - [Store Conversation](#44-store-conversation)
   - [Get Conversation](#45-get-conversation)
   - [Custom API Call](#46-custom-api-call)
5. [Triggers](#5-triggers)
   - [Receive Webhook](#51-receive-webhook)
   - [New Message Receive (Callback)](#52-new-message-receive-callback)
6. [Building MCP Tool Flows with ADA BMP](#6-building-mcp-tool-flows-with-ada-bmp)
7. [Common MCP Tool Patterns](#7-common-mcp-tool-patterns)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. What is ADA BMP?

ADA BMP (Bulk Messaging Platform) is a multi-channel messaging platform that lets you send and receive messages over **WhatsApp, Facebook, Line, and Instagram** via a unified REST API.

In Activepieces the `ada-bmp` piece wraps BMP's API so you can:
- Send 1:1 messages to a specific customer.
- Broadcast bulk messages to a contact category.
- Upload contact parameters via CSV.
- Store and retrieve per-customer conversation history (in-platform store).
- Trigger flows when BMP sends webhook events.

When wired to an **MCP Tool trigger**, any of the actions above become callable from an AI agent (Claude Desktop, Cursor, Windsurf, etc.) through the Activepieces MCP server.

---

## 2. Prerequisites

| Requirement | Details |
|---|---|
| Activepieces instance | Running locally or in cloud with MCP server enabled |
| ADA BMP API token | Obtained from your BMP account |
| BMP environment | Dev / Staging / Production |
| `ADA_BMP_API_URL` | Set in **Organization → Environments → [your org] → Configure** for the matching environment |
| MCP server token | Found in **Project Settings → MCP Server** in Activepieces |

---

## 3. Connection / Authentication

All BMP actions and triggers require an **ADA BMP Connection**.

### Fields

| Field | Required | Description |
|---|---|---|
| **API Token** | ✅ | Your BMP access token. Validated against `POST /user/checkToken`. |
| **Environment** | ✅ | One of `Dev`, `Staging`, or `Production`. Must match the environment row in Activepieces Organisation settings that has `ADA_BMP_API_URL` configured. |

### How the API URL is resolved

The piece never stores the API URL in the connection. At runtime it:
1. Reads `ADA_BMP_API_URL` from the **organization_environment** metadata row that matches the selected environment.
2. Falls back to the `ADA_BMP_API_URL` environment variable if no DB row is found.
3. Throws a clear error if neither is configured.

**Action required (admin):** For each environment (Dev / Staging / Production) go to:  
`Organisation → Environments → [org name] → Configure → add ADA_BMP_API_URL = https://your-bmp-api.example.com`

---

## 4. Actions

### 4.1 Send Message

**Action name:** `send_message`

Sends a text message to a **single recipient** on a chosen channel and account.

#### Input Fields

| Field | Type | Required | Description |
|---|---|---|---|
| **Channel** | Dropdown | ✅ | `Whatsapp` / `Facebook` / `Instagram` / `Line`. Populated from the BMP `/account` endpoint. |
| **Account** | Dropdown | ✅ | The specific BMP account (sender) for the chosen channel. |
| **Recipient Input Type** | Dropdown | ✅ | `Select from Active Conversations` or `Enter Manually`. |
| **Select Recipient** | Dropdown | ✅ (when Select) | Active conversation recipients fetched from `/msglog/live`. |
| **Recipient ID** | Text | ✅ (when Manual) | Phone number (WhatsApp), user ID (Line), etc. Supports `{{step.field}}` references. |
| **Message** | Long Text | ✅ | Message content. Supports `{{step.field}}` references. |

#### Output

```json
{
  "success": true,
  "data": { /* BMP API response body */ }
}
```

On error:
```json
{
  "success": false,
  "error": "Error description"
}
```

#### BMP API called
- `GET  {bmpApiUrl}/account?platform={WA|FB|IG|LINE}` — resolve `accountNo`
- `POST {bmpApiUrl}/message` — send the message

#### Example MCP Tool input schema (for MCP trigger)

```json
{
  "recipientId": { "type": "string", "description": "Recipient phone number or user ID" },
  "message":     { "type": "string", "description": "Text message to send" }
}
```

---

### 4.2 Send Bulk Message

**Action name:** `send_bulk_message`

Broadcasts a message to all contacts in a **Contact Category** on WhatsApp, Facebook, or Instagram (Line is excluded from bulk).

#### Input Fields

| Field | Type | Required | Description |
|---|---|---|---|
| **Channel** | Dropdown | ✅ | `Whatsapp` / `Facebook` / `Instagram` (Line excluded for bulk). |
| **Contact Category** | Dropdown | ✅ | Category from `GET /contact-category?platform=…`. Sorted by `contactCategoryNumber` descending. Shows member count. |
| **Message Type** | Dropdown | ✅ | `text` / `button` / `list` / `media` / `template` / `catalog`. |
| **Account** | Dropdown | ✅ | BMP sender account. |
| **Template Category** | Dropdown | When `template` type | `AUTHENTICATION` / `MARKETING` / `UTILITY`. Defaults to `AUTHENTICATION`. |
| **Template** | Dropdown | When `template` type | Approved templates filtered by category, sorted newest first. For MARKETING/UTILITY, call-permission templates are listed first with `[CP]` prefix and standard templates follow with `[STD]` prefix. |
| **Template fields** | Dynamic (short text) | No | When `template` is selected, the piece shows one field per template slot (body/header/footer `{{n}}`, quick-reply `payload:i`, carousel `Card N body:n`, `headerMedia:fileName`, etc.) — same keys as [`docs/send-bulk-message-mock-ui.html`](send-bulk-message-mock-ui.html). Empty for AUTH and call-permission templates. |
| **Template parameters (JSON)** | Long Text | No | Optional advanced override: JSON object of slot values. Non-empty **Template fields** values override this JSON for the same key. |
| **Message / OTP** | Long Text | Conditional | **Required** for non-template message types (`text`, `media`, …) and for **AUTHENTICATION** templates (OTP). **Optional** for other WA templates when Template fields or JSON parameters are set. |

#### Request body shapes

**Text / Media / Button / List / Catalog:**
```json
{
  "from": "accountNo",
  "to": ["contactCategoryId"],
  "type": "text",
  "channel": "CONTACT",
  "platform": "WA",
  "text": "Your message",
  "tag2": "Send bulk to contact category"
}
```

**AUTHENTICATION template:**
```json
{
  "from": "accountNo",
  "to": ["contactCategoryId"],
  "type": "template",
  "channel": "CONTACT",
  "platform": "WA",
  "tag2": "Send bulk to contact category",
  "templateId": "uuid-from-template-list",
  "templateLang": "en",
  "templateName": "template_name",
  "buttons": [null, null],
  "templateData": ["<OTP>"],
  "templateButton": [["<OTP>"], []],
  "headerType": "TEXT",
  "payload": ["", ""]
}
```

**MARKETING / UTILITY with call permission:**
```json
{
  "from": "accountNo",
  "to": ["contactCategoryId"],
  "type": "template",
  "channel": "CONTACT",
  "platform": "WA",
  "tag2": "Send bulk to contact category",
  "templateId": "uuid-from-template-list",
  "templateLang": "en",
  "templateName": "template_name",
  "buttons": [],
  "headerType": "TEXT",
  "payload": null
}
```

**MARKETING / UTILITY template with `buttons[]` (e.g. custom image + quick replies):**  
`templateData` is built in order: header `{{n}}` values, then body `{{n}}`, then footer `{{n}}` (keys `Header text:n`, `Body:n`, `Footer:n` in Template parameters JSON). `buttons` is an array of `null` with the same length as the template’s `buttons`. `templateButton` is the same length, each element an array (often empty). `payload[i]` is filled from `payload:i` in the JSON for `QUICK_REPLY` buttons; otherwise `""`. For `IMAGE` / `VIDEO` / `DOCUMENT` headers, BMP expects `header` (media URL) and `fileName`.

Example (shape only; names/ids illustrative):

```json
{
  "from": "accountNo",
  "to": ["contactCategoryId"],
  "type": "template",
  "channel": "CONTACT",
  "platform": "WA",
  "tag2": "Send bulk to contact category",
  "templateId": "uuid-from-template-list",
  "templateLang": "en",
  "templateName": "automationmktimgtemplate1769626396185",
  "headerType": "IMAGE",
  "header": "https://…/message/media/…",
  "fileName": "ada-logo.png",
  "buttons": [null, null, null, null, null, null, null, null, null, null],
  "templateData": ["valueForBody1", "valueForBody2"],
  "templateButton": [[], [], [], [], [], [], [], [], [], []],
  "payload": ["qr1", "qr2", "qr3", "qr4", "qr5", "qr6", "", "", "", ""]
}
```

**Carousel template (`type: carousel`):**  
Includes `templateData` for the **main** body and `templateCarouselCards` built from the template’s `carouselCards` with per-card body parameters filled from keys `Card 1 body:1`, `Card 2 body:1`, etc. Top-level `buttons`, `templateButton`, and `payload` are sent as `null` in the current piece mapping. Confirm against BMP if your environment expects different keys.

**Catalog (`headerType` string `"null"` in template list):**  
`headerType` in the bulk payload may be the string `"null"`; optional header media uses `header` / `fileName` when applicable.

#### Output

```json
{
  "success": true,
  "data": { /* BMP bulk message response */ }
}
```

#### BMP API called
- `GET  {bmpApiUrl}/account?platform={…}` — resolve `accountNo`
- `POST {bmpApiUrl}/contact-category/bulkmessage`

#### Example MCP Tool input schema

```json
{
  "contactCategoryId": { "type": "string", "description": "ID of the contact category to broadcast to" },
  "message":           { "type": "string", "description": "Message text or OTP value" },
  "templateName":      { "type": "string", "description": "BMP template name (optional, for template messages)" }
}
```

---

### 4.3 Upload Contact Parameters

**Action name:** `upload_contact_parameters`

Uploads a **CSV file** to BMP's `/contact/upload-parameters` endpoint for bulk contact management.

#### Input Fields

| Field | Type | Required | Description |
|---|---|---|---|
| **CSV Content** | Long Text | ✅ | Raw CSV data. Semicolon-delimited. First row: `Platform;Customer No;Customer Name;Category;Param1;Param2;Param3;Param3` |
| **File Name** | Text | No | Defaults to `contacts.csv`. |

#### CSV Format

```
Platform;Customer No;Customer Name;Category;Param1;Param2;Param3;Param3
WA;+6281234567890;Alice Smith;VIP;Gold;2025;;
WA;+6289876543210;Bob Jones;Standard;Silver;2024;;
```

#### Output

```json
{
  "success": true,
  "data": { /* BMP upload response */ }
}
```

#### BMP API called
- `POST {bmpApiUrl}/contact/upload-parameters` — multipart/form-data with the CSV file

#### Example MCP Tool input schema

```json
{
  "csvContent": {
    "type": "string",
    "description": "Semicolon-delimited CSV content. Header: Platform;Customer No;Customer Name;Category;Param1;Param2;Param3;Param3"
  },
  "fileName": {
    "type": "string",
    "description": "Optional file name (default: contacts.csv)"
  }
}
```

---

### 4.4 Store Conversation

**Action name:** `store_conversation`

Persists a **single chat message** into the Activepieces project store, keyed by mobile number. Old messages are auto-purged by retention policy.

Useful for keeping conversation context between flow runs so an AI agent can access the history.

#### Input Fields

| Field | Type | Required | Description |
|---|---|---|---|
| **Mobile Number** | Text | ✅ | Customer identifier, e.g. `+91XXXXXXXXXX`. |
| **Role** | Dropdown | ✅ | `user` / `agent` / `system`. |
| **Content** | Long Text | ✅ | The message text to store. |
| **Summary** | Long Text | No | Rolling summary. Replaces any existing summary when provided. |
| **Retention Days** | Number | No | Messages older than this are purged. Default: 30. |

#### Output

```json
{
  "success": true,
  "mobileNumber": "+91XXXXXXXXXX",
  "messageCount": 5,
  "lastUpdated": "2025-01-15T10:30:00.000Z",
  "retentionDays": 30
}
```

#### Storage key
`bmp-conv:{mobileNumber}` — scoped to the Activepieces project.

#### Example MCP Tool input schema

```json
{
  "mobileNumber": { "type": "string", "description": "Customer phone number" },
  "role":         { "type": "string", "description": "user | agent | system" },
  "content":      { "type": "string", "description": "Message content to store" },
  "summary":      { "type": "string", "description": "Optional rolling summary (replaces existing)" }
}
```

---

### 4.5 Get Conversation

**Action name:** `get_conversation`

Retrieves the stored conversation history and summary for a customer.

#### Input Fields

| Field | Type | Required | Description |
|---|---|---|---|
| **Mobile Number** | Text | ✅ | Same identifier used in Store Conversation. |
| **Include Messages** | Checkbox | No | Return full message history. Default: `true`. |
| **Last N Days** | Number | No | Filter messages to last N days. Leave blank for all. |

#### Output (found)

```json
{
  "found": true,
  "mobileNumber": "+91XXXXXXXXXX",
  "messages": [
    { "role": "user", "content": "Hello!", "timestamp": "2025-01-15T10:00:00.000Z" },
    { "role": "agent", "content": "Hi there!", "timestamp": "2025-01-15T10:01:00.000Z" }
  ],
  "summary": "Customer asked about pricing.",
  "messageCount": 2,
  "lastUpdated": "2025-01-15T10:01:00.000Z"
}
```

#### Output (not found)

```json
{
  "found": false,
  "mobileNumber": "+91XXXXXXXXXX",
  "messages": [],
  "summary": "",
  "messageCount": 0,
  "lastUpdated": null
}
```

#### Example MCP Tool input schema

```json
{
  "mobileNumber":    { "type": "string", "description": "Customer phone number" },
  "includeMessages": { "type": "boolean", "description": "Return full message list (default true)" },
  "lastNDays":       { "type": "number", "description": "Limit to last N days (optional)" }
}
```

---

### 4.6 Custom API Call

**Action name:** `custom_api_call`

A pass-through action that lets you call **any BMP REST endpoint** not covered by the other actions. Uses the same connection (Bearer token + environment API URL).

Configure method, path, body, headers, and query parameters directly.

---

## 5. Triggers

### 5.1 Receive Webhook

**Trigger name:** `receive_webhook`  
**Strategy:** Webhook (unique URL per flow)

Fires for **every POST request** with a JSON body that BMP sends to the generated webhook URL. Use when you need a simple catchall for all BMP events.

#### Setup
1. Enable the trigger in your Activepieces flow.
2. Copy the generated **Webhook URL** shown in the trigger configuration.
3. Register that URL as the callback endpoint in your BMP settings.

#### Payload output
```json
{
  "event": "message.received",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "id": "msg_123",
    "from": "+1234567890",
    "to": "+0987654321",
    "message": "Sample webhook message",
    "platform": "whatsapp"
  }
}
```

---

### 5.2 New Message Receive (Callback)

**Trigger name:** `new_message_callback`  
**Strategy:** App Webhook (event-based, channel+account scoped)

Fires only when a BMP event payload matches the **selected channel and account**. Requires BMP to send `platform`, `accountNo`, and `eventType` in every callback request.

#### Setup
1. Select the **Channel** and **Account** in the trigger props.
2. Enable the trigger — the piece registers a listener for `Message` events on `{platform}:{accountNo}`.
3. BMP must POST callback events to your Activepieces webhook URL with the fields:
   - `platform` — e.g. `WA`, `FB`, `IG`, `LINE`
   - `accountNo` — the account number
   - `eventType` — e.g. `Message`, `Delivery`, `Read`

All event types are accepted (routing is by platform+accountNo identity, not by eventType).

#### Payload output
Full BMP callback body, e.g.:
```json
{
  "platform": "WA",
  "accountNo": "628XXXXXXXXX",
  "eventType": "Message",
  "identifierValue": "+91XXXXXXXXXX",
  "data": { /* BMP message data */ }
}
```

---

## 6. Building MCP Tool Flows with ADA BMP

This section walks through creating a flow that an MCP client (Cursor, Claude, etc.) can call to send a WhatsApp message.

### Step-by-step via Activepieces Builder

#### 1. Create a new flow
Name it, e.g. **"Send WhatsApp Message"**.

#### 2. Configure the MCP Tool trigger
| Setting | Value |
|---|---|
| Name | `send_whatsapp_message` |
| Description | `Sends a WhatsApp text message to a recipient via ADA BMP` |
| Wait for Response | ✅ ON (required to get reply back to MCP client) |
| Parameters | `recipientId` (Text, required) · `message` (Text, required) |

#### 3. Add Send Message action
- **Channel:** `Whatsapp`
- **Account:** select your WhatsApp account
- **Recipient Input Type:** `Enter Manually`
- **Recipient ID:** `{{trigger.recipientId}}`
- **Message:** `{{trigger.message}}`

#### 4. Add Reply to MCP Client action
- **Mode:** `Simple`
- **Response:** `{ "result": "{{step_1.data}}" }`
- **Wait for Response:** `Stop`

#### 5. Publish the flow
Click **Publish** — MCP uses the published version.

#### 6. Verify the tool name
Call `tools/list` on the MCP server and find the hashed name:
```
send_whatsapp_message_{flowId4chars}_{6charhash}_mcp
```

#### 7. Call from MCP client

```bash
curl --location 'http://localhost:4300/api/v1/projects/{projectId}/mcp-server/http' \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json, text/event-stream' \
  --header 'Authorization: Bearer {mcpToken}' \
  --data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "send_whatsapp_message_XXXX_xxxxxx_mcp",
      "arguments": {
        "recipientId": "+6281234567890",
        "message": "Hello from MCP!"
      }
    }
  }'
```

---

## 7. Common MCP Tool Patterns

### Pattern 1 — Send message to a known recipient

**Trigger parameters:** `recipientId` (Text), `message` (Text)  
**Action:** Send Message → `recipientType: manual`, `recipientManual: {{trigger.recipientId}}`

### Pattern 2 — Send bulk campaign

**Trigger parameters:** `contactCategoryId` (Text), `messageText` (Text)  
**Action:** Send Bulk Message → manually set `contactCategory` to `{{trigger.contactCategoryId}}`

### Pattern 3 — Look up conversation history

**Trigger parameters:** `mobileNumber` (Text)  
**Action:** Get Conversation → `mobileNumber: {{trigger.mobileNumber}}`  
**Reply:** `{ "history": "{{step_1.messages}}", "summary": "{{step_1.summary}}" }`

### Pattern 4 — Store AI agent reply

**Trigger parameters:** `mobileNumber` (Text), `content` (Text), `summary` (Text)  
**Action:** Store Conversation → `role: agent`, `content: {{trigger.content}}`, `summary: {{trigger.summary}}`

### Pattern 5 — Upload contacts from AI-generated CSV

**Trigger parameters:** `csvContent` (Text)  
**Action:** Upload Contact Parameters → `csvContent: {{trigger.csvContent}}`

---

## 8. Troubleshooting

### `body: {}` in MCP tool output
**Cause:** "Wait for Response" is off on the MCP Tool trigger → flow runs async and MCP never receives the Reply.  
**Fix:** Open the MCP Tool trigger, enable **Wait for Response**, republish.

### `No API URL configured for … environment`
**Cause:** `ADA_BMP_API_URL` not set in the organisation_environment metadata for the chosen environment.  
**Fix:** Go to **Organisation → Environments → [your org] → Configure** and set `ADA_BMP_API_URL`.

### `Invalid token` on connection validate
**Cause:** Wrong API token, or token belongs to a different environment.  
**Fix:** Use the correct token for the chosen environment. Validate at `POST /user/checkToken`.

### Tool not found in `tools/list`
**Cause:** Flow is not published or is disabled.  
**Fix:** Publish and enable the flow.

### MCP trigger fires but `inputs` is `{}`
**Cause:** Code step has no input mappings.  
**Fix:** In the Code step's **Inputs** panel, add each field and map to `{{trigger.fieldName}}`.

### Bulk message succeeds but contacts don't receive messages
**Cause:** Wrong template kind selected (for MARKETING/UTILITY, choose `[CP]` templates for call-permission campaigns and `[STD]` templates for standard).  
**Fix:** Check template status in BMP, then re-select the appropriate `[CP]` / `[STD]` template in the Template dropdown and republish the flow.

### Line channel not showing in Send Bulk Message
**By design.** Bulk messaging via contact categories is not supported for Line. Use **Send Message** for individual Line messages.
