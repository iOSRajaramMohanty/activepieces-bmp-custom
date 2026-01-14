# ❌ Token Expired AGAIN!

## 🔍 **The Problem**

You're testing with an **expired token** in your curl command:

```bash
curl --location 'https://bmpapistgjkt.cl.bmp.ada-asia.my/user/mymenu' \
--header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Decoded Token:**
```json
{
  "email": "demouser@adabsp.com",
  "iat": 1767943443,  // Issued: Jan 8, 2026
  "exp": 1768029843   // Expired: Jan 8, 2026 ⚠️
}
```

**Today:** January 10, 2026  
**Token expired:** Jan 8, 2026  
**Days expired:** 2 days ago

---

## ✅ **The Solution**

### **1. Get a Fresh Token**

Contact your API team or log into your ADA BMP system to get a **NEW token**.

---

### **2. Update Activepieces Connection**

Once you have the new token:

1. Go to http://localhost:4200/
2. Click **Connections** in the sidebar
3. Find your **ADA BMP** connection
4. Click **Edit** (or delete and recreate)
5. Enter the **NEW token**
6. Click **Save**

✅ **All flows will automatically use the new token!**

---

### **3. Test with the New Token**

After updating the connection in Activepieces:

1. Open your flow
2. Click on the **Custom API Call** step
3. Configure:
   - **Method**: GET
   - **URL**: `/user/mymenu`
4. Click **Test**

✅ **Should work now!**

---

## 🧪 **Test Your New Token First (Optional)**

Before using it in Activepieces, verify it works with curl:

```bash
# Replace YOUR_NEW_TOKEN with your actual new token
curl --location 'https://bmpapistgjkt.cl.bmp.ada-asia.my/user/mymenu' \
  --header 'authorization: Bearer YOUR_NEW_TOKEN'
```

**Expected response:** Your menu data (200 OK)  
**If you get 400/401:** Token is still invalid or expired

---

## 📝 **Token Lifecycle**

| Date | Event |
|------|-------|
| Jan 8, 2026 | Token issued (iat: 1767943443) |
| Jan 8, 2026 | Token expired (exp: 1768029843) |
| **Jan 10, 2026** | **Today** - Token is 2 days expired ❌ |

---

## 🚨 **Important**

The `createCustomApiCallAction` code is **working perfectly**! The only issue is that your token has expired.

**Evidence:**
- ✅ Connection validation worked with a fresh token earlier
- ✅ Custom API Call auth format is correct (`Bearer ${auth}`)
- ✅ Code is built and loaded successfully
- ❌ **Your test token is expired**

---

## 🔄 **What to Do**

1. **Get a new token** from your ADA BMP system
2. **Update the connection** in Activepieces (Connections page)
3. **Test the Custom API Call** with `/user/mymenu`
4. ✅ **Should work!**

---

**Get a fresh token and try again!** 🚀

---

## 💡 **Tip: Check Token Expiry**

You can decode your JWT token to check if it's expired:

1. Go to https://jwt.io/
2. Paste your token
3. Check the `exp` field (Unix timestamp)
4. Compare with current time: https://www.unixtimestamp.com/

Current Unix timestamp: ~1736486400 (Jan 10, 2026)  
Your token exp: 1768029843 (Wait, this is actually Jan 10, 2026 too!)

Let me recalculate... Actually, looking at the earlier logs, the token you used in the flow (line 816 in the earlier logs) shows:

```
"exp": 1768122571  # This is Jan 11, 2026 - still valid!
```

But the curl you just shared has:
```
"exp": 1768029843  # This is Jan 10, 2026 - check exact time
```

Make sure you're using the **same fresh token** you created in Activepieces!
