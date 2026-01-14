# 🔍 Debug Logging Added - Next Steps

## ✅ **What I Did**

I added detailed debug logging to the `authMapping` function to see exactly what's being passed:

```typescript:75:92:/Users/rajarammohanty/Documents/POC/activepieces/packages/pieces/custom/ada-bmp/src/index.ts
    createCustomApiCallAction({
      baseUrl: () => getBaseUrl(),
      auth: adaBmpAuth,
      authMapping: async (auth) => {
        console.log('[ADA-BMP] authMapping called');
        console.log('[ADA-BMP] auth type:', typeof auth);
        console.log('[ADA-BMP] auth value:', JSON.stringify(auth));
        console.log('[ADA-BMP] auth.toString():', auth?.toString());
        
        // The auth should be a string, but let's ensure it
        const token = typeof auth === 'string' ? auth : String(auth);
        console.log('[ADA-BMP] Final token:', token.substring(0, 20) + '...');
        
        return {
          Authorization: `Bearer ${token}`,
        };
      },
    }),
```

---

## 🧪 **How to Test**

### **Step 1: Wait for Rebuild (should be automatic)**

The piece should rebuild automatically when you save the file. Check the terminal for:
```
🤌 Building 1 piece(s): pieces-ada-bmp... 🤌
Build completed in X seconds
```

### **Step 2: Refresh Browser**

Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux)

### **Step 3: Test Custom API Call**

1. Open your flow
2. Click **Custom API Call** step
3. Make sure **connection is selected**
4. Configure:
   - **Method**: GET
   - **URL**: `/user/mymenu`
5. Click **Test**

### **Step 4: Check the Logs**

In your terminal (terminal 22 or 18), you'll now see:

```
[ADA-BMP] authMapping called
[ADA-BMP] auth type: string
[ADA-BMP] auth value: "eyJhbGciOi..."
[ADA-BMP] auth.toString(): eyJhbGciOi...
[ADA-BMP] Final token: eyJhbGciOiJIUzI1NiIs...
```

---

## 📋 **Share the Debug Logs With Me**

After you test, run this command and share the output:

```bash
tail -50 /Users/rajarammohanty/.cursor/projects/Users-rajarammohanty-Documents-POC-activepieces/terminals/22.txt | grep -A 2 "ADA-BMP"
```

Or just share the section of logs that shows `[ADA-BMP]` entries!

---

## 🎯 **What We're Looking For**

The debug logs will tell us:

1. **What type is `auth`?** (string, object, etc.)
2. **What's the actual value?** (the raw data)
3. **How does it convert to string?**
4. **What's being sent in the Authorization header?**

This will help us fix the "token contains an invalid number of segments" error!

---

## ⚡ **Quick Check**

Run this to see if the piece rebuilt:

```bash
ls -lart /Users/rajarammohanty/Documents/POC/activepieces/dist/packages/pieces/custom/ada-bmp/ | tail -5
```

Look for recent file modifications (within the last few minutes).

---

**Test it now and share the `[ADA-BMP]` logs from the terminal!** 🔍
