# ✅ Channels from `/user/mymenu` API

## 🎯 **What Changed**

The ADA BMP piece now fetches channels from the `/user/mymenu` endpoint and extracts the channel list from the nested menu structure.

---

## 📋 **API Response Structure**

The `/user/mymenu` endpoint returns:

```json
{
  "status": 200,
  "errorCode": 0,
  "message": "Success",
  "data": [
    {
      "id": "...",
      "name": "Dashboard",
      "subMenu": []
    },
    {
      "id": "21e9f855-3067-4511-aa6c-109d00ef19c2",
      "name": "Channel",
      "subMenu": [
        {
          "id": "40aa4301-ca72-4007-a6b9-e5c9005dee9f",
          "name": "Whatsapp",
          "subMenu": [...]
        },
        {
          "id": "2a96f5c0-6ef1-45df-a730-8cd6aa8ba74f",
          "name": "Instagram",
          "subMenu": []
        },
        {
          "id": "46c9990f-ab14-451e-b5d9-f716e223b7cb",
          "name": "Facebook",
          "subMenu": []
        },
        {
          "id": "4e3cf2fb-4ca5-4873-b896-3027f6ad02cd",
          "name": "Line",
          "subMenu": [...]
        }
      ]
    },
    {
      "id": "...",
      "name": "Flow Builder",
      "subMenu": []
    }
  ]
}
```

---

## 🔧 **How It Works**

### **1. Find the "Channel" Menu**

```typescript
const channelMenu = body.data.find((item) => item.name === 'Channel');
```

### **2. Extract Channels from `subMenu`**

```typescript
const channels = channelMenu.subMenu.map((channel) => ({
  id: channel.id,
  name: channel.name,
}));
```

**Result:**
```json
[
  { "id": "40aa4301-ca72-4007-a6b9-e5c9005dee9f", "name": "Whatsapp" },
  { "id": "2a96f5c0-6ef1-45df-a730-8cd6aa8ba74f", "name": "Instagram" },
  { "id": "46c9990f-ab14-451e-b5d9-f716e223b7cb", "name": "Facebook" },
  { "id": "4e3cf2fb-4ca5-4873-b896-3027f6ad02cd", "name": "Line" }
]
```

### **3. Display in Dropdown**

```typescript
return {
  disabled: false,
  placeholder: 'Select channel',
  options: channels.map((channel) => ({
    label: channel.name,      // Display: "Whatsapp"
    value: channel.id,         // Value: "40aa4301-..."
  })),
};
```

---

## 📁 **Files Modified**

### **1. `src/lib/common/config.ts`**
✅ Already had the correct endpoint:
```typescript
getChannels: () => `${getBaseUrl()}/user/mymenu`,
```

### **2. `src/lib/common/props.ts`**
✅ **Updated** to:
- Parse the nested menu structure
- Find the "Channel" menu item
- Extract channels from `subMenu`
- Use `(auth as any).secret_text` for authentication

### **3. `src/lib/actions/send-message.ts`**
✅ **Updated** to:
- Use `(auth as any).secret_text` for authentication

### **4. `src/index.ts`**
✅ **Already fixed** to:
- Use `(auth as any).secret_text` in `authMapping` for Custom API Call

---

## 🧪 **Testing Steps**

### **Step 1: Wait for Rebuild**
The piece will automatically rebuild (takes ~10-15 seconds).

### **Step 2: Hard Refresh Browser**
Press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)

### **Step 3: Test Custom API Call**
1. Open your flow
2. Click **Custom API Call** step
3. Set **Method**: GET
4. Set **URL**: `/user/mymenu`
5. Click **Test**

✅ **Expected:** You should see the full menu structure returned

### **Step 4: Test Send Message Action**
1. Add a **Send Message** step
2. Click the **Channel** dropdown

✅ **Expected:** You should see:
- Whatsapp
- Instagram
- Facebook
- Line

---

## 🔍 **Debug Logs**

If debug mode is enabled (`ADA_BMP_DEBUG=true`), you'll see:

```
[ADA-BMP] Fetching channels from /user/mymenu { url: 'https://...' }
[ADA-BMP] Menu response received { status: 200 }
[ADA-BMP] Channels extracted successfully { 
  count: 4,
  channels: [
    { id: '40aa4301-...', name: 'Whatsapp' },
    { id: '2a96f5c0-...', name: 'Instagram' },
    { id: '46c9990f-...', name: 'Facebook' },
    { id: '4e3cf2fb-...', name: 'Line' }
  ]
}
```

---

## ✅ **All Auth Issues Fixed**

| Component | Status | Auth Method |
|-----------|--------|-------------|
| Token Validation | ✅ Working | `auth` directly in POST body |
| Custom API Call | ✅ Fixed | `auth.secret_text` with Bearer prefix |
| Send Message | ✅ Fixed | `auth.secret_text` with Bearer token |
| Channel Dropdown | ✅ Fixed | `auth.secret_text` with Bearer token |

---

## 📝 **Summary**

All components now correctly handle the `SecretTextConnectionValue` object by:

1. **Token Validation** (`validate` in `index.ts`): 
   - Uses `auth` directly (already a string in this context)

2. **Custom API Call** (`authMapping` in `index.ts`): 
   - Uses `(auth as any).secret_text` to extract token
   - Adds "Bearer" prefix

3. **Channel Dropdown** (`props.ts`): 
   - Uses `(auth as any).secret_text` for Bearer token auth
   - Parses `/user/mymenu` to find "Channel" submenu
   - Extracts channel name and ID

4. **Send Message** (`send-message.ts`): 
   - Uses `(auth as any).secret_text` for Bearer token auth

---

## 🎉 **Ready to Test!**

The piece will rebuild automatically. After 10-15 seconds:

1. Hard refresh your browser
2. Test the Custom API Call with `/user/mymenu`
3. Check the Channel dropdown in Send Message action

**Everything should work now!** 🚀
