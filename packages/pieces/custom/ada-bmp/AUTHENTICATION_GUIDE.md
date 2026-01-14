# 🔐 ADA BMP Authentication Guide

## Overview

Your ADA BMP API has **different authentication requirements** for different endpoints:

| Endpoint | Authentication Method | Format |
|----------|----------------------|---------|
| `/user/checkToken` | **Body** | `{"accessToken": "token"}` |
| All other endpoints | **Header** | `Authorization: Bearer token` |

---

## ✅ **Fixed!**

I've updated the code to handle both authentication methods:

### 1️⃣ **Connection Validation** (`/user/checkToken`)

```typescript:19:33:/Users/rajarammohanty/Documents/POC/activepieces/packages/pieces/custom/ada-bmp/src/index.ts
  validate: async ({ auth }) => {
    try {
      const apiUrl = API_ENDPOINTS.validateToken();
      console.log('[ADA-BMP] ===== TOKEN VALIDATION START =====');
      console.log('[ADA-BMP] URL:', apiUrl);
      console.log('[ADA-BMP] Token (first 10 chars):', auth.substring(0, 10) + '...');
      
      // Validate token by calling /user/checkToken endpoint (POST method)
      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: apiUrl,
        body: {
          accessToken: auth,  // ✅ Token in BODY (no Bearer prefix)
        },
      });
```

✅ **Sends token in request body** (no Bearer prefix)

---

### 2️⃣ **Custom API Call Action**

```typescript:75:81:/Users/rajarammohanty/Documents/POC/activepieces/packages/pieces/custom/ada-bmp/src/index.ts
    createCustomApiCallAction({
      baseUrl: () => getBaseUrl(),
      auth: adaBmpAuth,
      authMapping: async (auth) => ({
        Authorization: `Bearer ${auth as unknown as string}`,  // API expects "Bearer token" format for regular calls
      }),
    }),
```

✅ **Sends token as `Authorization: Bearer token` header**

---

### 3️⃣ **Send Message Action**

```typescript:30:42:/Users/rajarammohanty/Documents/POC/activepieces/packages/pieces/custom/ada-bmp/src/lib/actions/send-message.ts
      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: apiUrl,
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,  // ✅ Adds "Bearer" prefix
          token,
        },
        body: {
          channelId: channel,
          recipientId: recipient,
          message: message,
        },
      });
```

✅ **Uses `BEARER_TOKEN` type** (automatically adds Bearer prefix)

---

### 4️⃣ **Channel Dropdown**

```typescript:35:42:/Users/rajarammohanty/Documents/POC/activepieces/packages/pieces/custom/ada-bmp/src/lib/common/props.ts
        const response = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: apiUrl,
          authentication: {
            type: AuthenticationType.BEARER_TOKEN,  // ✅ Adds "Bearer" prefix
            token: auth as unknown as string,
          },
        });
```

✅ **Uses `BEARER_TOKEN` type** (automatically adds Bearer prefix)

---

## 🔄 **How It Works**

### **Connection Setup (Token Validation)**

```
User enters token → Activepieces calls validate() →
POST /user/checkToken
Body: {"accessToken": "eyJhbGciOi..."}
✅ No Bearer prefix
```

### **Using Actions (Custom API Call, Send Message, etc.)**

```
User runs action → Piece makes API call →
GET/POST /your-endpoint
Headers: {"Authorization": "Bearer eyJhbGciOi..."}
✅ With Bearer prefix
```

---

## 🧪 **Test It**

### **Step 1: Test Connection**

```bash
# This is what the validate() function does
curl -X POST https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"YOUR_TOKEN"}'

# Expected: 200 OK
```

### **Step 2: Test Regular API Call**

```bash
# This is what Custom API Call/Send Message does
curl -X GET https://bmpapistgjkt.cl.bmp.ada-asia.my/channels \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: List of channels
```

---

## 🚀 **Next Steps**

1. **Get a fresh token** (your old one expired)
2. **Restart the server** (to load the updated code)
3. **Connect with the new token**
4. **Test the Custom API Call action**

---

## 📝 **Testing Checklist**

- [ ] Get a new token from your API
- [ ] Restart Activepieces dev server
- [ ] Connect ADA BMP piece (should succeed)
- [ ] Test "Custom API Call" action
- [ ] Test "Send Message" action
- [ ] Verify channels dropdown loads

---

## 🐛 **Debugging**

If you still get errors, check:

1. **Token expired?** → Get a fresh one
2. **Wrong endpoint?** → Verify the URL in error message
3. **Wrong format?** → Check if API expects different body/headers
4. **Server not restarted?** → Kill and restart: `pkill -f "nx serve" && ./run-dev.sh`

---

## 📚 **API Reference**

### **Validation Endpoint**

```
POST /user/checkToken
Content-Type: application/json
Body: {"accessToken": "YOUR_TOKEN"}

Response 200: Token valid
Response 400: Token invalid/expired
```

### **All Other Endpoints**

```
GET/POST /endpoint
Authorization: Bearer YOUR_TOKEN

Response 200: Success
Response 400 (10203): Missing or invalid Bearer token
Response 401: Unauthorized
```

---

**Everything is now configured correctly!** Just restart the server and use a fresh token. 🎉
