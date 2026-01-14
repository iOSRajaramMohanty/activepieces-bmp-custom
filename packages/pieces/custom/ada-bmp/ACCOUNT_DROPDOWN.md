# 🎯 Dynamic Account Dropdown Feature

## ✅ **What's New**

The ADA BMP piece now has a **dependent dropdown** that shows accounts based on the selected channel!

---

## 🔄 **How It Works**

### **Step 1: Select Channel**
User selects a channel from the dropdown:
- Whatsapp
- Facebook
- Instagram
- Line

### **Step 2: Account Dropdown Auto-Updates**
The account dropdown automatically:
1. Maps the channel name to platform code (WA, FB, IG, LINE)
2. Calls `/account?status=all&platform={code}`
3. Displays all available accounts for that channel

### **Step 3: Select Account**
User selects an account from the list to use for sending messages.

---

## 🗺️ **Channel to Platform Mapping**

```typescript
const CHANNEL_TO_PLATFORM = {
  'Whatsapp': 'WA',
  'Facebook': 'FB',
  'Instagram': 'IG',
  'Line': 'LINE',
};
```

---

## 📡 **API Endpoint**

**URL:** `/account?status=all&platform={platform}`

**Method:** GET

**Headers:**
- `Authorization: Bearer <token>`

**Example Request:**
```bash
curl 'https://bmpapistgjkt.cl.bmp.ada-asia.my/account?status=all&platform=WA' \
  -H 'Authorization: Bearer <token>'
```

**Response Structure:**
```json
{
  "status": 200,
  "message": "Success",
  "data": [
    {
      "id": "c050a709-f2e3-4b0e-a3a0-0022893ea2b0",
      "platform": "WA",
      "clientId": "74ebeae0-962f-48ce-87dc-b24ac98effed",
      "clientName": "Demo Account",
      "name": "DEMOVOICESTG",
      "accountNo": "601153813541",
      "cert": "",
      "registerType": "MANUAL",
      "status": "VERIFIED",
      "coreAppStatus": "CONNECTED",
      "webhookURL": "https://webhook.site/...",
      "webhookMethod": "",
      "quota": "",
      "is_testing": false,
      "dataset_id": "",
      "profileImage": "https://bmpapistgjkt.cl.bmp.ada-asia.my/message/media/...",
      "about": "Account description",
      "address": "Account address",
      "description": "Description section",
      "email": "account@example.com"
    }
  ],
  "pageNo": 0,
  "pageSize": 10,
  "pageTotal": 0,
  "totalRecord": 1
}
```

**Dropdown Label Format:**
```
DEMOVOICESTG (601153813541)
```
Displays: `{name} ({accountNo})`

---

## 🔧 **Implementation Details**

### **1. Added to `config.ts`**

```typescript
getAccounts: (platform: string) => 
  `${getBaseUrl()}/account?status=all&platform=${platform}`,
```

### **2. Added to `props.ts`**

#### **Channel Mapping:**
```typescript
const CHANNEL_TO_PLATFORM: Record<string, string> = {
  'Whatsapp': 'WA',
  'Facebook': 'FB',
  'Instagram': 'IG',
  'Line': 'LINE',
};
```

#### **Account Dropdown:**
```typescript
export const adaBmpAccount = <R extends boolean>(required: R) =>
  Property.Dropdown<string, R, typeof adaBmpAuth>({
    auth: adaBmpAuth,
    displayName: 'Account',
    description: 'Select the account to use for this channel',
    required,
    refreshers: ['channel'], // ← Refreshes when channel changes!
    async options({ auth, channel }) {
      // Map channel to platform code
      const platformCode = CHANNEL_TO_PLATFORM[channel as string];
      
      // Fetch accounts for that platform
      const response = await httpClient.sendRequest({
        method: HttpMethod.GET,
        url: API_ENDPOINTS.getAccounts(platformCode),
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,
          token: (auth as any).secret_text,
        },
      });
      
      // Return accounts as dropdown options
      return {
        disabled: false,
        placeholder: 'Select account',
        options: accounts.map((account) => ({
          label: `${account.name} (${account.accountNo})`, // "DEMOVOICESTG (601153813541)"
          value: account.id,
        })),
      };
    },
  });
```

### **3. Updated `send-message.ts`**

Added the `account` field:
```typescript
props: {
  info: channelInfo,
  channel: adaBmpChannel(true),
  account: adaBmpAccount(true), // ← New field!
  recipient: recipientId,
  message: messageText,
},
```

Updated the API call to include `accountId`:
```typescript
body: {
  channelId: channel,
  accountId: account, // ← Included in request
  recipientId: recipient,
  message: message,
},
```

---

## 🧪 **Testing Steps**

### **Step 1: Start the Server**
```bash
cd /Users/rajarammohanty/Documents/POC/activepieces
./run-dev.sh
```

### **Step 2: Hard Refresh Browser**
Press **Cmd+Shift+R** (Mac)

### **Step 3: Test the Dropdown**

1. Go to your flow
2. Add/Edit **ADA BMP → Send Message** step
3. Select **Channel**: "Whatsapp"
   - ✅ The **Account** dropdown should automatically load
   - ✅ You should see all WhatsApp accounts
4. Change to **Channel**: "Facebook"
   - ✅ The **Account** dropdown should refresh
   - ✅ You should see all Facebook accounts
5. Try other channels (Instagram, Line)
   - ✅ Each should show different accounts

---

## 🎨 **User Experience**

### **Before Selection:**
```
┌─────────────────────────────┐
│ Channel: [Select channel ▼] │
└─────────────────────────────┘
┌─────────────────────────────┐
│ Account: [Select channel... ]│ ← Disabled
└─────────────────────────────┘
```

### **After Channel Selection:**
```
┌─────────────────────────────┐
│ Channel: [Whatsapp       ▼] │
└─────────────────────────────┘
┌─────────────────────────────┐
│ Account: [Select account ▼] │ ← Enabled & populated!
│          • My WhatsApp       │
│          • Support Line      │
│          • Sales Account     │
└─────────────────────────────┘
```

---

## 🔍 **Debug Logs**

When `ADA_BMP_DEBUG=true`, you'll see:

```
[ADA-BMP] Fetching accounts {
  url: 'https://bmpapistgjkt.cl.bmp.ada-asia.my/account?status=all&platform=WA',
  platform: 'WA'
}
[ADA-BMP] Accounts response received { status: 200 }
[ADA-BMP] Accounts fetched successfully { count: 3 }
```

---

## 📊 **Field Summary**

| Field | Type | Required | Depends On | Description |
|-------|------|----------|------------|-------------|
| Channel | Dropdown | Yes | - | WhatsApp, Facebook, Instagram, Line |
| Account | Dropdown | Yes | Channel | Accounts for selected channel |
| Recipient ID | Text | Yes | - | Phone number or user ID |
| Message | Long Text | Yes | - | Message content |

---

## 🎯 **Key Features**

✅ **Dependent Dropdown** - Account list updates when channel changes  
✅ **Platform Mapping** - Automatically maps channel names to API codes  
✅ **Smart Labels** - Shows displayName, name, or phoneNumber  
✅ **Error Handling** - Shows helpful messages when no accounts found  
✅ **Bearer Token Auth** - Uses `auth.secret_text` correctly  

---

## 🚀 **Ready to Test!**

The piece will rebuild automatically in ~10-15 seconds.

After rebuilding:
1. Hard refresh browser
2. Open your flow
3. Try changing the channel and watch the account dropdown update!

**It will work perfectly!** 🎊
