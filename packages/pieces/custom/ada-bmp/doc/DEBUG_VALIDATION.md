# 🔍 Debug Token Validation - Quick Steps

## What I Just Did

Added **detailed debug logs** to see exactly what's happening when you try to connect.

## How to See the Logs

### Step 1: Restart the Server

```bash
pkill -f "nx serve"
./run-dev.sh
```

### Step 2: Try to Connect Again

1. Go to http://localhost:4300/
2. Create a flow
3. Add ADA BMP piece
4. Enter your token
5. Click "Save"

### Step 3: Check the Logs

Look at your terminal where the server is running, you'll see:

```
[ADA-BMP] ===== TOKEN VALIDATION START =====
[ADA-BMP] URL: https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken
[ADA-BMP] Token (first 10 chars): eyJhbGciOi...
[ADA-BMP] Response Status: 400
[ADA-BMP] Response Body: { "error": "..." }
[ADA-BMP] ===== TOKEN VALIDATION FAILED =====
```

**Share these logs with me** and I can tell you exactly what's wrong!

---

## Common Issues & Fixes

### Issue 1: Endpoint Doesn't Exist (404)

```
[ADA-BMP] Response Status: 404
```

**Fix**: Change the endpoint in `config.ts`:

```typescript
export const API_ENDPOINTS = {
  validateToken: () => `${getBaseUrl()}/auth/validate`,  // Try different endpoint
  // ...
};
```

### Issue 2: Wrong Request Format (400)

```
[ADA-BMP] Response Status: 400
[ADA-BMP] Response Body: { "error": "Invalid request" }
```

**Fix**: Maybe API expects the token in headers, not body?

```typescript
// In index.ts, change the request:
const response = await httpClient.sendRequest({
  method: HttpMethod.POST,
  url: apiUrl,
  headers: {
    'Authorization': auth as string,
    'Content-Type': 'application/json',
  },
  // Remove body or try different format
});
```

### Issue 3: Wrong HTTP Method

```
[ADA-BMP] Response Status: 405
```

**Fix**: Try GET instead of POST:

```typescript
const response = await httpClient.sendRequest({
  method: HttpMethod.GET,  // Change to GET
  url: apiUrl,
  headers: {
    'Authorization': auth as string,
  },
});
```

### Issue 4: Network/CORS Error

```
[ADA-BMP] Error Type: Error
[ADA-BMP] Error Message: ENOTFOUND or CORS error
```

**Fix**: 
- Check if API URL is correct
- Check if API is accessible from your machine
- Test with curl first

---

## Quick Test with curl

While server is starting, test the endpoint manually:

```bash
# Replace YOUR_TOKEN with your actual token
curl -v -X POST https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"YOUR_TOKEN"}'
```

**What to look for:**
- Status code (200, 400, 404, 401, etc.)
- Response body
- Error message

---

## Temporary Bypass (If You're Stuck)

If you can't figure it out right now, skip validation temporarily:

```typescript
// In index.ts
validate: async ({ auth }) => {
  // TEMPORARY: Accept any token
  return { valid: true };
},
```

This lets you:
- ✅ Connect successfully
- ✅ Test other features (Custom API Call, Send Message)
- ✅ Come back to fix validation later

---

## What to Share

After you try to connect, share with me:

1. **The console logs** from the terminal (the ADA-BMP lines)
2. **The curl test result** (if you ran it)
3. **What your API team says** about token validation

And I'll give you the exact fix! 🎯

---

## Quick Reference

| Response | Meaning | Fix |
|----------|---------|-----|
| 200 | Success | Should work! Check logs for other issues |
| 400 | Bad Request | Wrong format - check body/headers |
| 401 | Unauthorized | Invalid token |
| 404 | Not Found | Wrong endpoint URL |
| 405 | Method Not Allowed | Try GET instead of POST |
| CORS/Network Error | Can't reach API | Check URL, firewall, CORS settings |

---

**Restart the server and try connecting - then show me the logs!** 📋
