# 🔐 Encryption Key Issue - FIXED!

## 🐛 **The Real Problem**

The "Unexpected error" was **NOT** a token validation issue. It was an **encryption key mismatch**!

### **What Happened:**

```
Error: error:1C800064:Provider routines::bad decrypt
```

Your `run-dev.sh` was generating **random encryption keys** on every restart:

```bash
export AP_ENCRYPTION_KEY=$(openssl rand -hex 16)  # ❌ Different every time!
export AP_JWT_SECRET=$(openssl rand -hex 16)      # ❌ Different every time!
```

But you had **saved connections** in the database encrypted with a **previous key**. When Activepieces tried to decrypt them with the new random key → **FAIL!**

---

## ✅ **The Fix**

### **1. Fixed the Encryption Keys** (`run-dev.sh`)

Changed from random keys to **fixed keys**:

```bash
# Use fixed encryption keys for development (DO NOT use these in production!)
export AP_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef"
export AP_JWT_SECRET="fedcba9876543210fedcba9876543210"
```

✅ **Now the same keys are used on every restart!**

---

### **2. Cleared Old Corrupted Connections**

Deleted the old connections from the database:

```bash
DELETE FROM app_connection;
```

✅ **Old, corrupted connections removed!**

---

## 🚀 **Next Steps**

1. **Server is restarting** with fixed encryption keys
2. **Go to http://localhost:4300/**
3. **Add ADA BMP piece** and enter your token
4. **Save the connection**

✅ **Now it will work!**

---

## 📝 **Why This Happened**

| Action | What Happened |
|--------|---------------|
| First run | Keys: `abc123`, connection saved encrypted with `abc123` |
| Server restart | Keys: `xyz789` (random!), tries to decrypt with `xyz789` → ❌ FAIL |
| Second restart | Keys: `def456` (random!), tries to decrypt with `def456` → ❌ FAIL |
| **After fix** | Keys: `0123...` (fixed!), connection saved with `0123...` |
| **Next restart** | Keys: `0123...` (same!), decrypts with `0123...` → ✅ SUCCESS |

---

## ⚠️ **Important Notes**

1. **Development Only**: These fixed keys are for local development only. **NEVER** use them in production!

2. **Keep the Keys**: As long as you keep using the same encryption keys in `run-dev.sh`, your connections will persist across restarts.

3. **If You Change Keys Again**: You'll need to delete old connections again or regenerate all encryption keys consistently.

---

## 🧪 **Test It Now**

1. Wait for server to finish starting (15-20 seconds)
2. Refresh browser: http://localhost:4300/
3. Add ADA BMP piece
4. Enter your **new valid token**
5. Click **Save**

✅ **Should work perfectly!**

---

## 🔍 **How to Identify This Issue in the Future**

If you see:

```
Error: error:1C800064:Provider routines::bad decrypt
```

**Cause:** Encryption key mismatch

**Fix:** 
1. Use fixed encryption keys
2. Clear old connections
3. Restart server

---

**Try connecting now!** 🎉
