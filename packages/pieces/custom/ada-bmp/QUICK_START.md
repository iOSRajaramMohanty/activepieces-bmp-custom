# ADA BMP Quick Start Guide

## ✅ What's Been Created

Your custom ADA BMP piece is ready! Here's what's included:

### 🔐 Authentication
- **Token-based auth** using `/user/checkToken` endpoint
- Validates tokens before allowing connections
- Automatically adds Bearer token to all API requests

### 📡 Channel Selection (Like Slack!)
- **Dynamic dropdown** showing all available channels
- Fetches from `/channels` API endpoint
- Displays: WhatsApp, Facebook, Line, Instagram
- Format: "Channel Name (Type)"

### 📨 Send Message Action
- Send messages through any channel
- Simple form with:
  - Channel dropdown
  - Recipient ID field
  - Message text field

### 🔧 Custom API Call
- Make any API call to ADA BMP
- Token automatically included
- For advanced use cases

---

## 🚀 How to Run (3 Steps)

### 1️⃣ Set Environment Variable

```bash
export AP_EDITION=COMMUNITY
export AP_ENVIRONMENT=dev
export AP_DEV_PIECES=ada-bmp
```

### 2️⃣ Start Dev Server

```bash
cd /Users/rajarammohanty/Documents/POC/activepieces
npm run dev
```

Wait for:
- ✅ Frontend: http://localhost:4300
- ✅ Backend API started
- ✅ ada-bmp piece built

### 3️⃣ Use in UI

1. Open http://localhost:4300
2. Create a new flow
3. Add ADA BMP piece
4. Connect with your API token
5. Select channel from dropdown
6. Send your first message!

---

## 📁 Key Files

```
src/index.ts                    → Main piece definition + auth
src/lib/common/props.ts         → Channel dropdown logic
src/lib/actions/send-message.ts → Send message action
```

---

## 🎨 UI Behavior (Like Slack Reference Image)

### Connection Setup
```
┌─────────────────────────────────────┐
│ Connect to ADA BMP                  │
├─────────────────────────────────────┤
│                                     │
│ API Token *                         │
│ ┌─────────────────────────────────┐ │
│ │ Enter your ADA BMP API token    │ │
│ └─────────────────────────────────┘ │
│                                     │
│         [Test Connection]           │
│                                     │
└─────────────────────────────────────┘
```

### Channel Dropdown (After Connection)
```
┌─────────────────────────────────────┐
│ Send Message                        │
├─────────────────────────────────────┤
│                                     │
│ Channel *                           │
│ ┌─────────────────────────────────┐ │
│ │ ▼ Select channel               │ │
│ └─────────────────────────────────┘ │
│   • WhatsApp Support (whatsapp)     │
│   • Facebook Page (facebook)        │
│   • Line Official (line)            │
│   • Instagram Business (instagram)  │
│                                     │
│ Recipient ID *                      │
│ ┌─────────────────────────────────┐ │
│ │ +1234567890                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Message *                           │
│ ┌─────────────────────────────────┐ │
│ │ Hello from Activepieces!        │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔌 API Endpoints

Your piece integrates with:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/user/checkToken` | POST | Validate API token |
| `/channels` | GET | Get available channels |
| `/messages/send` | POST | Send a message |

Base URL: `https://api.ada-bmp.com`

---

## ✨ Features

### ✅ Community Edition Only
- No EE services used
- Works with CE mode (`AP_EDITION=COMMUNITY`)
- No license required

### ✅ Works with Other Pieces
- Compatible with Slack, HTTP, Webhook, etc.
- Can be chained in flows
- Outputs can be used by next steps

### ✅ Production-Ready Patterns
- Token validation
- Error handling
- Loading states
- Proper TypeScript types

---

## 📝 Example Flow

**Webhook → ADA BMP → Slack**

```
1. Webhook receives data
   ↓
2. ADA BMP sends message to WhatsApp
   ↓
3. Slack notification sent to team
```

This proves your piece works with others!

---

## 🔄 Next Steps

### Immediate
1. Run `npm run dev` with `AP_DEV_PIECES=ada-bmp`
2. Test in UI at http://localhost:4300
3. Create a test flow

### Future Enhancements
- [ ] Add "Get Message Status" action
- [ ] Add "Upload Media" action
- [ ] Add "New Message Received" trigger (webhook)
- [ ] Add message templates support
- [ ] Add conversation history retrieval

---

## 🐛 Troubleshooting

**Piece not showing in UI?**
```bash
# Check env var is set
echo $AP_DEV_PIECES  # Should show: ada-bmp

# Restart dev server
npm run dev
```

**Channel dropdown empty?**
- Verify `/channels` endpoint is accessible
- Check API token is valid
- Review console for errors

**Build errors?**
- Check all TypeScript files compile
- Run: `npm run build-piece -- ada-bmp`

---

## 📚 Documentation

- **Full Setup**: See `SETUP.md`
- **Usage Guide**: See `README.md`
- **Activepieces Docs**: See `../../technical-docs/CUSTOM-PIECE.md`

---

## 🎉 You're All Set!

Your ADA BMP piece is ready to use. Start the dev server and begin building flows!

```bash
export AP_DEV_PIECES=ada-bmp
npm run dev
```

Then visit: **http://localhost:4300**
