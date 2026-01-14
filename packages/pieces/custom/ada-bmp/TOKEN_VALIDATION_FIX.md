# Token Validation Troubleshooting

## The Error You're Seeing

```
Connection failed with error: Failed to validate token. Please check your token and try again.
```

## Why This Happens

Your ADA BMP piece is trying to validate your token by calling:
```
POST https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken
Body: { "accessToken": "YOUR_TOKEN" }
Header: Authorization: YOUR_TOKEN
```

The validation is failing, which means one of these:

1. ❌ **Token is invalid/expired**
2. ❌ **API endpoint is different**
3. ❌ **Request format is wrong**
4. ❌ **Network/CORS issue**

---

## Quick Fixes to Try

### Option 1: Test Your Token Manually (Recommended)

```bash
# Test your token with curl
curl -X POST https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken \
  -H "Authorization: YOUR_ACTUAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"YOUR_ACTUAL_TOKEN"}'
```

**What to check:**
- Does it return 200 OK?
- What response do you get?
- Any error messages?

### Option 2: Disable Token Validation Temporarily

Edit `packages/pieces/custom/ada-bmp/src/index.ts`:

```typescript
export const adaBmpAuth = PieceAuth.SecretText({
  displayName: 'API Token',
  description: 'Enter your ADA BMP API token',
  required: true,
  validate: async ({ auth }) => {
    // TEMPORARY: Skip validation for testing
    return {
      valid: true,
    };
    
    /* Original validation code - commented out
    try {
      const apiUrl = API_ENDPOINTS.validateToken();
      debugLog('Validating token', { url: apiUrl });
      
      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: apiUrl,
        body: {
          accessToken: auth,
        },
      });

      if (response.status === 200) {
        debugLog('Token validation successful');
        return {
          valid: true,
        };
      }

      return {
        valid: false,
        error: 'Invalid token',
      };
    } catch (error) {
      debugLog('Token validation failed', error);
      return {
        valid: false,
        error: 'Failed to validate token. Please check your token and try again.',
      };
    }
    */
  },
});
```

This will let you connect and test other endpoints!

### Option 3: Check Debug Logs

Since we enabled `ADA_BMP_DEBUG=true`, check the server logs:

```bash
tail -f /Users/rajarammohanty/.cursor/projects/Users-rajarammohanty-Documents-POC-activepieces/terminals/20.txt | grep ADA-BMP
```

You should see:
```
[ADA-BMP] Validating token { url: '...' }
[ADA-BMP] Token validation failed { error: '...' }
```

### Option 4: Different Token Validation Endpoint

Maybe your API uses a different endpoint? Try changing it:

```typescript
// In config.ts
export const API_ENDPOINTS = {
  validateToken: () => `${getBaseUrl()}/user/validate`,  // Try different endpoint
  // or
  validateToken: () => `${getBaseUrl()}/auth/verify`,
  // or
  validateToken: () => `${getBaseUrl()}/token/check`,
  // ... rest of endpoints
};
```

### Option 5: Different Request Format

Maybe the API expects a different format? Try:

```typescript
// In index.ts validate function
const response = await httpClient.sendRequest({
  method: HttpMethod.POST,
  url: apiUrl,
  headers: {
    'Authorization': auth as string,  // Send in header instead
    'Content-Type': 'application/json',
  },
  // Remove body, or change body format
});
```

Or maybe it's a GET request?

```typescript
const response = await httpClient.sendRequest({
  method: HttpMethod.GET,  // Try GET
  url: apiUrl,
  headers: {
    'Authorization': auth as string,
  },
});
```

---

## Recommended Debugging Steps

### Step 1: Check What Actually Happens

With debug enabled, look at the logs when you try to connect:

```bash
# Start server with run-dev.sh
./run-dev.sh

# In another terminal, watch logs
tail -f ~/.cursor/projects/.../terminals/20.txt | grep -A 5 "ADA-BMP\|checkToken"
```

### Step 2: Test Token Validation Manually

```bash
# Try with your actual token
export MY_TOKEN="your-actual-token-here"

# Test 1: POST with body
curl -v -X POST https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken \
  -H "Content-Type: application/json" \
  -d "{\"accessToken\":\"$MY_TOKEN\"}"

# Test 2: POST with Authorization header
curl -v -X POST https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken \
  -H "Authorization: $MY_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"accessToken\":\"$MY_TOKEN\"}"

# Test 3: GET with header
curl -v -X GET https://bmpapistgjkt.cl.bmp.ada-asia.my/user/checkToken \
  -H "Authorization: $MY_TOKEN"
```

**Check the response:**
- Status code (200, 401, 404, etc.)
- Response body
- Any error messages

### Step 3: Simplify Validation

If you can't figure it out, just skip validation temporarily:

```typescript
validate: async ({ auth }) => {
  return { valid: true };  // Always accept
},
```

Then you can:
1. Connect successfully
2. Test other actions (like Custom API Call)
3. See what works
4. Come back to fix validation later

---

## Most Likely Issue

Based on the error message "Failed to validate token", it's probably:

**The `/user/checkToken` endpoint doesn't exist or expects different format**

**Solution**: 
1. Disable validation temporarily (Option 2 above)
2. Or ask your API team: "How do I validate a token? What endpoint and format?"

---

## Quick Action

**Try this now:**

1. **Disable validation temporarily** (edit index.ts, set `valid: true`)
2. **Restart server**: `pkill -f "nx serve" && ./run-dev.sh`
3. **Refresh browser**
4. **Try connecting** - it should work!
5. **Test Custom API Call** with a working endpoint like `/user/mymenu`
6. **Once that works**, come back to fix token validation

---

## Need Help?

Share with me:
1. The curl test results (from Step 2)
2. The debug logs (from Step 1)  
3. What your API team says about token validation

And I can give you the exact fix! 🎯
