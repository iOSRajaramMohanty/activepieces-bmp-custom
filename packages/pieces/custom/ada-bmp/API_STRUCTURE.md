# ADA BMP API Structure - Quick Reference

## Your API Endpoint Structure

Your ADA BMP API uses a **simple, flat structure** directly after the domain:

```
https://bmpapistgjkt.cl.bmp.ada-asia.my/[endpoint]
```

**NOT** using nested paths like:
- ❌ `/api/v1/endpoint`
- ❌ `/v1/endpoint`
- ❌ `/api/endpoint`

---

## Current API Endpoints

Based on your piece configuration, your actual endpoints are:

### **1. User Endpoints**

```
POST   /user/checkToken          # Validate API token
GET    /user/profile              # Get user profile (example)
GET    /user/info                 # Get user information (example)
```

### **2. Channel Endpoints**

```
GET    /channels                  # List all available channels
GET    /channels/{id}             # Get specific channel (example)
PUT    /channels/{id}/settings    # Update channel settings (example)
```

### **3. Message Endpoints**

```
POST   /messages/send             # Send a message
GET    /messages/history          # Get message history (example)
POST   /messages/broadcast        # Broadcast to multiple channels (example)
DELETE /messages/{id}             # Delete a message (example)
```

### **4. Other Endpoints** (Examples)

```
GET    /contacts/list             # List contacts
POST   /contacts/add              # Add contact
GET    /reports/daily             # Get daily report
```

---

## How Users Will Use These

### **In Custom API Call Action:**

Users will type **relative paths** (recommended):

```
Example 1: Get Channels
URL: /channels
Method: GET
→ Calls: https://bmpapistgjkt.cl.bmp.ada-asia.my/channels

Example 2: Send Message
URL: /messages/send
Method: POST
→ Calls: https://bmpapistgjkt.cl.bmp.ada-asia.my/messages/send

Example 3: Check Token
URL: /user/checkToken
Method: POST
→ Calls: https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken

Example 4: Get User Info
URL: /user/info
Method: GET
→ Calls: https://bmpapistgjkt.cl.bmp.ada-asia.my/user/info
```

---

## URL Pattern Examples

| User Types | Final URL | Notes |
|------------|-----------|-------|
| `/channels` | `https://bmpapistgjkt.cl.bmp.ada-asia.my/channels` | ✅ Simple, clean |
| `/user/checkToken` | `https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken` | ✅ Two-level path |
| `/messages/send` | `https://bmpapistgjkt.cl.bmp.ada-asia.my/messages/send` | ✅ Standard pattern |
| `/contacts/list` | `https://bmpapistgjkt.cl.bmp.ada-asia.my/contacts/list` | ✅ Works great |

---

## Configuration in Your Code

Your current setup correctly points to this structure:

```typescript
// In config.ts
export const getBaseUrl = (): string => {
  return process.env.ADA_BMP_API_URL || 'https://bmpapistgjkt.cl.bmp.ada-asia.my';
};

export const API_ENDPOINTS = {
  validateToken: () => `${getBaseUrl()}/user/checkToken`,     // ✅ Correct
  getChannels: () => `${getBaseUrl()}/channels`,              // ✅ Correct
  sendMessage: () => `${getBaseUrl()}/messages/send`,         // ✅ Correct
};
```

---

## Common Patterns for Your API

Based on your structure, typical endpoints would be:

### **Pattern 1: Resource List**
```
GET /channels              # List all channels
GET /contacts/list         # List all contacts
GET /messages/history      # List message history
```

### **Pattern 2: Resource Action**
```
POST /messages/send        # Send a message
POST /user/checkToken      # Check token
POST /contacts/add         # Add contact
```

### **Pattern 3: Resource with ID**
```
GET    /channels/ch-123           # Get specific channel
PUT    /channels/ch-123/settings  # Update channel
DELETE /messages/msg-456          # Delete message
```

---

## Documentation Updated

All documentation now reflects your actual API structure:

✅ **CUSTOM_API_CALL_GUIDE.md** - Updated with correct endpoints  
✅ **ENV_CONFIG.md** - Shows your domain structure  
✅ **README.md** - Correct examples  

---

## Examples for Your Users

### **Example 1: List Channels**
```
Connection: My ADA BMP Account
URL: /channels
Method: GET

→ GET https://bmpapistgjkt.cl.bmp.ada-asia.my/channels
  Authorization: Bearer [token]
```

### **Example 2: Send Message**
```
Connection: My ADA BMP Account
URL: /messages/send
Method: POST
Body:
{
  "channelId": "ch-123",
  "recipientId": "+1234567890",
  "message": "Hello!"
}

→ POST https://bmpapistgjkt.cl.bmp.ada-asia.my/messages/send
  Authorization: Bearer [token]
  Content-Type: application/json
  
  {"channelId":"ch-123","recipientId":"+1234567890","message":"Hello!"}
```

### **Example 3: Get User Profile**
```
Connection: My ADA BMP Account
URL: /user/profile
Method: GET

→ GET https://bmpapistgjkt.cl.bmp.ada-asia.my/user/profile
  Authorization: Bearer [token]
```

### **Example 4: Get Contacts**
```
Connection: My ADA BMP Account
URL: /contacts/list
Method: GET
Query Parameters:
{
  "page": "1",
  "limit": "20"
}

→ GET https://bmpapistgjkt.cl.bmp.ada-asia.my/contacts/list?page=1&limit=20
  Authorization: Bearer [token]
```

---

## Summary

✅ **Your API Structure**: `https://bmpapistgjkt.cl.bmp.ada-asia.my/[endpoint]`  
✅ **No `/api/` prefix** - Clean, simple URLs  
✅ **Two-level paths OK** - Like `/user/checkToken`  
✅ **Documented correctly** - All guides updated  
✅ **Ready to use** - Works with Custom API Call  

Your API structure is **simple and clean**! Users will find it easy to use. 🎉
