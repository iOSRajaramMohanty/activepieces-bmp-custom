# 🚀 Start Activepieces with ADA BMP Piece

## Quick Start

Run this **single command** in your terminal:

```bash
cd /Users/rajarammohanty/Documents/POC/activepieces && ./start-ada-bmp.sh
```

## What Will Happen

The script will:
1. ✅ Load Node.js v22
2. ✅ Set environment variables for ADA BMP piece
3. ✅ Start three services:
   - **Frontend (GUI)**: http://localhost:4300
   - **Backend API**: http://localhost:3000
   - **Engine**: Worker process

## Wait for These Messages

Look for these success indicators:

```
[GUI] ➜  Local:   http://localhost:4300/
[API] Server listening on port 3000
[ENG] Engine started successfully
```

This usually takes **30-60 seconds** on first startup.

## Access the UI

Once you see the success messages:

1. Open your browser
2. Go to: **http://localhost:4300**
3. Log in or create an account
4. Create a new flow
5. Search for "**ADA BMP**" in the pieces list
6. Your piece will appear! ✨

## Testing Your Piece

### 1. Connect Your Account
- Click on ADA BMP piece
- Enter your API token
- Click "Test Connection"
- ✅ It will POST to `/user/checkToken` with `{"accessToken": "your-token"}`

### 2. See the Channel Dropdown
- Once connected, you'll see a "Channel" dropdown
- Click it to open
- ✅ It will GET from `/channels` endpoint
- You should see: WhatsApp, Facebook, Line, Instagram

### 3. Send a Test Message
- Select a channel
- Enter recipient ID
- Type a message
- Run the action
- ✅ It will POST to `/messages/send`

## Troubleshooting

### If frontend doesn't load (ERR_CONNECTION_REFUSED)

Wait 60 seconds for initial build, then check terminal for errors.

### If you see build errors

Make sure you're in a **new terminal window** and run:
```bash
source ~/.zshrc
nvm use 22
cd /Users/rajarammohanty/Documents/POC/activepieces
./start-ada-bmp.sh
```

### To stop the servers

Press **Ctrl + C** in the terminal where the server is running.

### To restart

Just run `./start-ada-bmp.sh` again!

---

## Your Piece Location

```
/Users/rajarammohanty/Documents/POC/activepieces/packages/pieces/custom/ada-bmp/
```

## Your API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/user/checkToken` | POST | Validate token (body: `{"accessToken": "token"}`) |
| `/channels` | GET | Get channels list |
| `/messages/send` | POST | Send message |

**Base URL**: `https://api.ada-bmp.com`

---

**Ready?** Open a **new terminal** and run:

```bash
cd /Users/rajarammohanty/Documents/POC/activepieces
./start-ada-bmp.sh
```

Then wait for the success messages and open **http://localhost:4300** in your browser! 🎉
