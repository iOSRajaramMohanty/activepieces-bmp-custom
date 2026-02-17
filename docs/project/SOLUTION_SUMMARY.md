# ✅ ACTIVEPIECES IS NOW RUNNING LOCALLY!

## 🎉 **SUCCESS!** Your Custom ADA BMP Piece is Live!

### **What's Running:**

1. **Frontend (GUI)**: http://localhost:4300/
2. **Backend API**: http://localhost:3000/ (proxied through frontend at http://localhost:4300/api/)
3. **Your Custom Piece**: `ada-bmp` is loaded and watching for changes!

---

## **The Fix: What Was Wrong**

### **Root Cause:**
You were using **incorrect enum values** for environment variables:

| **Wrong** | **Correct** | **Why** |
|-----------|-------------|---------|
| `AP_EDITION=COMMUNITY` | `AP_EDITION=ce` | ApEdition enum uses 'ce' not 'COMMUNITY' |
| `AP_ENVIRONMENT=testing` | `AP_ENVIRONMENT=test` | ApEnvironment enum uses 'test' not 'testing' |

This caused:
- ❌ "Edition COMMUNITY not supported in pglite mode" errors
- ❌ Database connection failures

### **Additional Issues Fixed:**
1. **Node.js v23** → **Node.js v20** (using nvm)
2. Missing **@tiptap/starter-kit** package for frontend
3. TypeScript type casting errors in ada-bmp piece code

---

## **How to Start Activepieces with Your Custom Piece**

### **Option 1: Use the Quick Start Script (Recommended)**

```bash
./START_CORRECTLY.sh
```

This script:
- Switches to Node.js v20
- Sets correct environment variables
- Starts all services (API, GUI, Engine)

### **Option 2: Manual Start**

```bash
# Load Node v20
nvm use 20

# Set environment variables
export AP_EDITION=ce
export AP_ENVIRONMENT=test
export AP_DEV_PIECES=ada-bmp

# Start dev server
npm run dev
```

---

## **Your ADA BMP Piece**

### **Location:**
```
/packages/pieces/custom/ada-bmp/
```

### **Features Implemented:**
✅ **Token Authentication** - Uses `POST /user/checkToken` with bearer token
✅ **Dynamic Channel Dropdown** - Fetches channels from `GET /channels` API
✅ **Send Message Action** - Posts to `POST /messages/send` endpoint

### **Files:**
- `src/index.ts` - Main piece definition with auth
- `src/lib/actions/send-message.ts` - Send message action
- `src/lib/common/props.ts` - Channel dropdown property

---

## **Testing Your Piece in the UI**

1. **Open** http://localhost:4300/
2. **Sign up** for a new account
3. **Create a new flow**
4. **Add "ADA BMP" piece** from the pieces list
5. **Connect** using your API token
6. **Select a channel** from the dropdown
7. **Send a test message**!

---

## **Hot Reloading**

The server is watching your ada-bmp piece directory. Any changes you make to:
- `/packages/pieces/custom/ada-bmp/src/**`

Will automatically trigger a rebuild. You'll see:
```
[10:19:08 UTC] INFO: Starting watch for package: ada-bmp
```

---

## **Troubleshooting**

### **If API exits immediately:**
The Nx daemon sometimes crashes. Just restart:
```bash
npm run serve:backend
```

### **If you see "Edition not supported":**
Double-check your environment variables:
```bash
echo $AP_EDITION    # Should print: ce
echo $AP_ENVIRONMENT # Should print: test
```

### **If frontend won't load:**
```bash
npm run serve:frontend
```

---

## **Environment Variable Reference**

| Variable | Value | Purpose |
|----------|-------|---------|
| `AP_EDITION` | `ce` | Use Community Edition |
| `AP_ENVIRONMENT` | `test` | Enable embedded database |
| `AP_DEV_PIECES` | `ada-bmp` | Load your custom piece |
| `NODE_VERSION` | `v20.x.x` | Required Node.js version |

---

## **Next Steps**

### **1. Update API Endpoints**
Replace placeholder URLs in your piece:
- `https://api.ada-bmp.com/user/checkToken`
- `https://api.ada-bmp.com/channels`
- `https://api.ada-bmp.com/messages/send`

With your **actual** ADA BMP API endpoints.

### **2. Add More Actions**
Create more files in `/packages/pieces/custom/ada-bmp/src/lib/actions/` such as:
- `receive-message.ts` (trigger)
- `list-messages.ts` (action)
- `get-channel-info.ts` (action)

### **3. Test with Real Data**
Once connected to real API endpoints, test:
- Token validation
- Channel fetching
- Message sending

---

## **Why It Wasn't Running Before**

1. **❌ Wrong enum values** (`COMMUNITY` vs `ce`, `testing` vs `test`)
2. **❌ Wrong Node.js version** (v23 vs v20)
3. **❌ Missing frontend dependencies** (@tiptap packages)
4. **❌ Build cache** not being cleared after env changes

**All fixed now!** 🎉

---

## **Terminal Windows**

Keep these terminals open:
- **Terminal 1**: Frontend - http://localhost:4300/
- **Terminal 2**: Backend API - http://localhost:3000/
- **Terminal 3**: (Optional) Engine if you stopped it

Or just use **one terminal** with `./START_CORRECTLY.sh` which runs everything together!

---

## **Contact Support**

If you have questions about:
- **Activepieces platform**: https://www.activepieces.com/docs
- **Custom pieces**: `/technical-docs/CUSTOM-PIECE.md`
- **Your piece**: Check `/packages/pieces/custom/ada-bmp/README.md`

---

**Congratulations! Your development environment is ready! 🚀**
