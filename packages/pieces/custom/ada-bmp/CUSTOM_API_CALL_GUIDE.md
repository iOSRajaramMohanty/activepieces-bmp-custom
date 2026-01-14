# Custom API Call Action - Complete Guide

## Overview

The **Custom API Call** action is an automatically generated action that allows users to make any API call to your ADA BMP API without needing to create a specific action for it.

---

## How It Works

### 1. **Auto-Generated Action**

When you use `createCustomApiCallAction()` in your piece, it creates a fully functional action with a UI that includes:

- ✅ **URL field** (with base URL pre-filled)
- ✅ **Method dropdown** (GET, POST, PUT, PATCH, DELETE)
- ✅ **Headers editor** (auth auto-injected)
- ✅ **Query Parameters editor**
- ✅ **Body editor** (JSON, Form Data, etc.)
- ✅ **Response handling**

### 2. **Your Current Configuration**

In your `src/index.ts`:

```typescript
createCustomApiCallAction({
  baseUrl: () => getBaseUrl(),              // Returns: https://bmpapistgjkt.cl.bmp.ada-asia.my
  auth: adaBmpAuth,                         // Your token auth
  authMapping: async (auth) => ({
    Authorization: `Bearer ${auth}`,        // Automatically adds this header
  }),
})
```

---

## Questions Answered

### Q1: Will the Auth Token Auto-Inject?

**YES! ✅**

The auth token is **automatically injected** in the way you specified in `authMapping`:

```typescript
authMapping: async (auth) => ({
  Authorization: `Bearer ${auth}`,
})
```

**What happens:**
- User selects their ADA BMP connection
- The token from that connection is automatically added to **every request**
- Users don't need to manually add the Authorization header
- The header `Authorization: Bearer YOUR_TOKEN` is injected automatically

**In the UI, users will see:**
```
Headers:
  (Grayed out info text: "Authorization headers are injected automatically from your connection.")
```

---

### Q2: What is the BaseUrl?

**Current BaseUrl**: `https://bmpapistgjkt.cl.bmp.ada-asia.my`

This is defined in your `config.ts`:

```typescript
export const getBaseUrl = (): string => {
  const baseUrl = process.env.ADA_BMP_API_URL || 'https://bmpapistgjkt.cl.bmp.ada-asia.my';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};
```

**How it's used:**
- The base URL is **shown as a placeholder** in the URL field
- Users can type either:
  - **Full URL**: `https://bmpapistgjkt.cl.bmp.ada-asia.my/your/endpoint`
  - **Relative path**: `/your/endpoint` (base URL is automatically prepended)

---

### Q3: Can Users Pass Endpoints Manually?

**YES! ✅ This is the MAIN feature!**

Users can manually enter any endpoint in a **text field**, and it will work in two ways:

#### **Option 1: Relative Path (Recommended)**

User types:
```
/channels
```

Actual request goes to:
```
https://bmpapistgjkt.cl.bmp.ada-asia.my/channels
```

#### **Option 2: Full URL**

User types:
```
https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken
```

Actual request goes to:
```
https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken
```

---

## User Experience in the UI

When a user adds the **Custom API Call** action to their flow, they will see:

### **Step 1: Select Connection**
```
🔐 Authentication
   Select connection: [Choose ADA BMP connection]
```

### **Step 2: Configure Request**

```
📍 URL
   [Text Field showing: https://bmpapistgjkt.cl.bmp.ada-asia.my]
   Placeholder: "You can either use the full URL or the relative path to the base URL
                i.e https://bmpapistgjkt.cl.bmp.ada-asia.my/resource or /resource"
   
   User can type: /channels
   
🔧 Method
   [Dropdown: GET, POST, PUT, PATCH, DELETE]
   
📄 Headers
   (Info: Authorization headers are injected automatically from your connection.)
   [JSON Editor for additional headers]
   Example:
   {
     "Content-Type": "application/json"
   }
   
🔍 Query Parameters
   [JSON Editor]
   Example:
   {
     "page": "1",
     "limit": "10"
   }
   
📦 Body Type
   [Dropdown: none, JSON, Form Data, raw]
   
📝 Body
   [Editor based on body type]
   Example (JSON):
   {
     "name": "Test",
     "value": "123"
   }
```

### **Step 3: Test**

When user clicks **"Test step"**:

1. **URL is constructed**:
   - If user typed `/channels` → Request goes to `https://bmpapistgjkt.cl.bmp.ada-asia.my/channels`
   - If user typed full URL → Uses that URL

2. **Headers are merged**:
   ```json
   {
     "Authorization": "Bearer [user's token]",  // ✅ Auto-injected
     "Content-Type": "application/json"         // User's custom header
   }
   ```

3. **Request is sent** with:
   - Constructed URL
   - Selected method
   - Merged headers (with auth)
   - Query parameters
   - Body (if applicable)

4. **Response is returned** to the user

---

## Complete Example

### **User's Configuration:**

```
Connection: My ADA BMP Connection (token: abc123)
URL: /messages/broadcast
Method: POST
Headers:
{
  "Content-Type": "application/json"
}
Query Parameters:
{
  "async": "true"
}
Body:
{
  "channelIds": ["ch-1", "ch-2"],
  "message": "Hello everyone!"
}
```

### **Actual Request Sent:**

```http
POST https://bmpapistgjkt.cl.bmp.ada-asia.my/messages/broadcast?async=true HTTP/1.1
Authorization: Bearer abc123
Content-Type: application/json

{
  "channelIds": ["ch-1", "ch-2"],
  "message": "Hello everyone!"
}
```

---

## Advanced Configuration Options

You can customize the Custom API Call action further:

### **1. Custom Display Name**

```typescript
createCustomApiCallAction({
  baseUrl: () => getBaseUrl(),
  auth: adaBmpAuth,
  authMapping: async (auth) => ({
    Authorization: `Bearer ${auth}`,
  }),
  displayName: 'ADA BMP Custom API Call',  // Custom name
  description: 'Make any API call to ADA BMP endpoints',  // Custom description
})
```

### **2. Add Extra Props**

```typescript
createCustomApiCallAction({
  baseUrl: () => getBaseUrl(),
  auth: adaBmpAuth,
  authMapping: async (auth) => ({
    Authorization: `Bearer ${auth}`,
  }),
  extraProps: {
    apiVersion: Property.StaticDropdown({
      displayName: 'API Version',
      required: false,
      options: {
        options: [
          { label: 'v1', value: 'v1' },
          { label: 'v2', value: 'v2' },
        ],
      },
    }),
  },
})
```

### **3. Auth in Query Parameters (Instead of Headers)**

```typescript
createCustomApiCallAction({
  baseUrl: () => getBaseUrl(),
  auth: adaBmpAuth,
  authMapping: async (auth) => ({
    token: auth,  // Will be added as ?token=xxx
  }),
  authLocation: 'queryParams',  // Put auth in query params, not headers
})
```

### **4. Customize URL Field**

```typescript
createCustomApiCallAction({
  baseUrl: () => getBaseUrl(),
  auth: adaBmpAuth,
  authMapping: async (auth) => ({
    Authorization: `Bearer ${auth}`,
  }),
  props: {
    url: {
      displayName: 'API Endpoint',
      description: 'Enter the endpoint path (e.g., /messages/send)',
    },
  },
})
```

---

## Benefits of Custom API Call Action

### **For Users:**

1. **Flexibility**: Can call ANY endpoint without waiting for you to create actions
2. **Testing**: Great for testing new endpoints
3. **Debugging**: Can see exact requests and responses
4. **Quick Integration**: No need to learn multiple specific actions

### **For You (Developer):**

1. **Less Code**: Don't need to create actions for every endpoint
2. **Faster Development**: Users can use new endpoints immediately
3. **Backward Compatibility**: Old endpoints work without code changes
4. **Easy Maintenance**: One action handles all custom calls

---

## What Users See vs. What Gets Sent

| User Types | Gets Sent To | Auth Header Added |
|------------|--------------|-------------------|
| `/channels` | `https://bmpapistgjkt.cl.bmp.ada-asia.my/channels` | ✅ Yes |
| `/messages/send` | `https://bmpapistgjkt.cl.bmp.ada-asia.my/messages/send` | ✅ Yes |
| `/user/checkToken` | `https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken` | ✅ Yes |
| `/contacts/list` | `https://bmpapistgjkt.cl.bmp.ada-asia.my/contacts/list` | ✅ Yes |

---

## Common Use Cases

### **1. Get Conversation History**
```
Method: GET
URL: /conversations/history
Query Parameters:
{
  "channelId": "ch-123",
  "limit": "50"
}
```

### **2. Update Channel Settings**
```
Method: PUT
URL: /channels/ch-123
Body:
{
  "name": "New Channel Name",
  "active": true
}
```

### **3. Get User Profile**
```
Method: GET
URL: /user/profile
```

### **4. Get Contacts**
```
Method: GET
URL: /contacts/list
Query Parameters:
{
  "page": "1",
  "limit": "20"
}
```

### **5. Delete Message**
```
Method: DELETE
URL: /messages/msg-456
```

---

## Testing Custom API Call

### **In Activepieces UI:**

1. **Create a flow**
2. **Add your ADA BMP piece**
3. **Select "Custom API Call"** action
4. **Configure**:
   ```
   URL: /channels
   Method: GET
   ```
5. **Click "Test step"**
6. **See response** from `https://bmpapistgjkt.cl.bmp.ada-asia.my/channels`

---

## Error Handling

The Custom API Call action includes built-in error handling:

- **4xx errors**: Returns error message in response
- **5xx errors**: Returns server error details
- **Network errors**: Returns connection error
- **Timeout**: Configurable (default 30 seconds)

Users can see:
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Channel not found"
}
```

---

## Comparison with Specific Actions

| Feature | Custom API Call | Specific Action (e.g., Send Message) |
|---------|----------------|--------------------------------------|
| **Endpoint** | User defines | Pre-defined |
| **Parameters** | User defines | Form fields |
| **Flexibility** | High | Low |
| **Ease of Use** | Medium | High |
| **Error Messages** | Generic | Specific |
| **Validation** | Basic | Detailed |
| **Best For** | Testing, advanced users | Common operations, beginners |

---

## Summary

### **How Custom API Call Works:**

1. ✅ **Base URL**: `https://bmpapistgjkt.cl.bmp.ada-asia.my` (configurable via env var)
2. ✅ **Auth Auto-Inject**: YES - `Authorization: Bearer TOKEN` added automatically
3. ✅ **Manual Endpoint**: YES - Users type in text field (relative or full URL)
4. ✅ **Test Button**: YES - Sends request immediately and shows response
5. ✅ **Flexibility**: Users can call ANY endpoint with ANY method

### **User Workflow:**

```
1. Select ADA BMP connection → Token loaded
2. Type endpoint → /your/endpoint
3. Choose method → POST, GET, etc.
4. Add headers/body → Custom configuration
5. Click "Test step" → 
   Request sent to: https://bmpapistgjkt.cl.bmp.ada-asia.my/your/endpoint
   With header: Authorization: Bearer [user's token]
6. See response → Success or error
```

---

## Key Points

🎯 **Auth is ALWAYS auto-injected** - Users never need to add token manually  
🎯 **Base URL is automatic** - Users just type `/endpoint`  
🎯 **Test works immediately** - Click test → see response  
🎯 **Flexible & powerful** - Can call any endpoint with any configuration  
🎯 **Perfect for advanced users** - Complements your specific actions  

Your Custom API Call action is **fully functional and ready to use**! 🚀
