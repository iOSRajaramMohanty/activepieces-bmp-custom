# AUTHENTICATION Template Support

## Overview
Added support for AUTHENTICATION category templates (e.g., OTP templates) in the Send Bulk Message action. Templates of this category now use a special format matching the API requirements.

## Changes Made

### 1. Template Dropdown Enhancement (`props.ts`)
- Modified `adaBmpTemplate` dropdown to:
  - Parse template data as JSON containing `id`, `name`, `category`, and `type`
  - Disable non-AUTHENTICATION templates (they appear grayed out and cannot be selected)
  - Only AUTHENTICATION category templates are selectable
  - All templates remain visible for transparency

**Template Value Format:**
```json
{
  "id": "template-uuid",
  "name": "vikotptest",
  "category": "AUTHENTICATION",
  "type": "template-type"
}
```

### 2. Message Field (`send-bulk-message.ts`)
- Renamed field display to: **"Message / OTP"**
- Description updated: "Message content. For AUTHENTICATION templates, enter the OTP value here."
- Field serves dual purpose:
  - Regular message text for non-AUTHENTICATION templates
  - OTP value for AUTHENTICATION templates

### 3. Request Payload Logic (`send-bulk-message.ts`)

#### For AUTHENTICATION Templates:
```json
{
  "from": "601153813541",
  "to": ["596d2b93-13b0-4f66-8723-d5da1d775b5a"],
  "type": "template",
  "channel": "CONTACT",
  "platform": "WA",
  "tag2": "Send bulk to contact category",
  "templateId": "template-uuid",
  "templateLang": "en",
  "templateName": "vikotptest",
  "buttons": [null, null],
  "templateData": ["2034"],
  "templateButton": [["2034"], []],
  "headerType": "TEXT",
  "payload": ["", ""]
}
```

#### For Other Message Types (non-template):
```json
{
  "from": "account-number",
  "to": ["contact-category-id"],
  "type": "text|media|button|list|catalog",
  "channel": "CONTACT",
  "platform": "WA|FB|IG|LINE",
  "tag2": "Send bulk to contact category",
  "text": "message content"
}
```

#### For MARKETING / UTILITY / carousel WA templates:
Use **Template parameters (JSON)** for slot values; the piece builds the full `bulkmessage` body (see [`docs/ada-bmp-piece-mcp-guide.md`](../../../../docs/ada-bmp-piece-mcp-guide.md) §4.2).

## Usage

### Step 1: Select Template
When you open the template dropdown:
- ✅ **AUTHENTICATION** templates are **enabled** (selectable, normal appearance)
- ❌ Other categories (MARKETING, UTILITY, etc.) are **disabled** (grayed out, unselectable)

### Step 2: Enter OTP
For AUTHENTICATION templates:
- The "Message / OTP" field should contain the OTP value (e.g., "2034")
- This value is sent in the `templateData` array field

### Step 3: Send Message
The action automatically:
- Detects the template category from the selected template
- Formats the request body accordingly
- Uses `templateName` instead of `templateId` for AUTHENTICATION templates
- Places the OTP value in the `templateData` array

## Technical Details

### Template Detection
```typescript
// Parse template data
const templateData = JSON.parse(template);

// Check if AUTHENTICATION
if (templateData.category === 'AUTHENTICATION') {
  // Use AUTHENTICATION format
  requestBody = {
    templateName: templateData.name,
    templateData: [otpValue],
    // ... other AUTHENTICATION fields
  };
}
```

### Debugging
Debug logs include:
- `Using AUTHENTICATION template format` - when AUTHENTICATION template is detected
- `templateName` - the name of the template being used
- `otpValue: [REDACTED]` - OTP value is masked for security

## Example

### Configuration
- **Channel**: Whatsapp
- **Contact Category**: Test Users
- **Message Type**: Send WA Template
- **Account**: My WhatsApp Business Account
- **Template**: vikotptest (AUTHENTICATION) ✅
- **Message / OTP**: 2034

### Resulting API Call
```json
{
  "from": "601153813541",
  "to": ["596d2b93-13b0-4f66-8723-d5da1d775b5a"],
  "type": "template",
  "buttons": [],
  "templateData": ["2034"],
  "templateLang": "en",
  "templateName": "vikotptest",
  "headerType": "TEXT",
  "platform": "WA",
  "channel": "CONTACT",
  "payload": null,
  "tag2": "Send bulk to contact category"
}
```

## Files Modified
1. `packages/pieces/custom/ada-bmp/src/lib/common/props.ts`
   - Modified template dropdown to store JSON with category info
   - Added disabled state for non-AUTHENTICATION templates

2. `packages/pieces/custom/ada-bmp/src/lib/actions/send-bulk-message.ts`
   - Updated message field display name and description
   - Added logic to detect AUTHENTICATION templates
   - Implemented special payload format for AUTHENTICATION category

## Notes
- Non-AUTHENTICATION templates remain visible but are disabled (grayed out and unselectable)
- This provides transparency - users can see all available templates
- Disabled templates cannot be clicked or selected in the UI
- The message field label hints at dual usage (Message / OTP)
- Template selection is optional (as before)
- Backward compatible with existing non-AUTHENTICATION template flows
