# ADA BMP Piece Setup Instructions

## Overview

The ADA BMP piece has been created successfully! This piece provides integration with ADA BMP's multi-channel messaging platform supporting WhatsApp, Facebook, Line, and Instagram.

## File Structure

```
packages/pieces/custom/ada-bmp/
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── README.md
├── SETUP.md (this file)
└── src/
    ├── index.ts (main piece definition with auth)
    └── lib/
        ├── common/
        │   └── props.ts (channel dropdown and form properties)
        └── actions/
            └── send-message.ts (send message action)
```

## Features Implemented

### 1. **Token Authentication**
- Uses `PieceAuth.SecretText` for API token authentication
- Validates token by calling `/user/checkToken` endpoint
- Token is automatically included in all API requests as Bearer token

### 2. **Channel Dropdown**
- Dynamic dropdown that fetches channels from `/channels` API endpoint
- Displays channels with format: "Channel Name (Type)"
- Supports WhatsApp, Facebook, Line, and Instagram channels
- Shows proper loading states and error handling

### 3. **Send Message Action**
- Allows sending messages through any connected channel
- Input fields:
  - Channel selection dropdown
  - Recipient ID
  - Message text
- Returns success/error response from API

### 4. **Custom API Call Action**
- Automatically included for advanced users
- Allows making custom API calls to `https://api.ada-bmp.com`
- Authentication token automatically injected

## API Endpoints Used

The piece is configured to work with these endpoints:

1. **Token Validation**: `POST /user/checkToken`
   - Used during connection setup to validate the API token
   - Request body format:
   ```json
   {
     "accessToken": "your-api-token"
   }
   ```

2. **Get Channels**: `GET /channels`
   - Expected response format:
   ```json
   [
     {
       "id": "channel-id-1",
       "name": "Channel Name",
       "type": "whatsapp"
     },
     ...
   ]
   ```

3. **Send Message**: `POST /messages/send`
   - Request body format:
   ```json
   {
     "channelId": "channel-id",
     "recipientId": "recipient-id",
     "message": "message text"
   }
   ```

## Setup and Run

Follow these steps to see your piece in the UI:

### Step 1: Set Environment Variables

Set the following environment variables before starting the dev server:

```bash
export AP_EDITION=COMMUNITY
export AP_ENVIRONMENT=dev
export AP_DEV_PIECES=ada-bmp
```

Or add them to your shell profile (~/.zshrc or ~/.bashrc):

```bash
echo 'export AP_EDITION=COMMUNITY' >> ~/.zshrc
echo 'export AP_ENVIRONMENT=dev' >> ~/.zshrc
echo 'export AP_DEV_PIECES=ada-bmp' >> ~/.zshrc
source ~/.zshrc
```

### Step 2: Install Dependencies (if not already done)

```bash
cd /Users/rajarammohanty/Documents/POC/activepieces
npm install
# or
bun install
```

### Step 3: Start the Development Server

```bash
npm run dev
```

This command will:
1. Build your ada-bmp piece automatically
2. Start the backend API server
3. Start the frontend UI
4. Start the engine worker

### Step 4: Access the UI

Open your browser and navigate to:
```
http://localhost:4300
```

### Step 5: Create a Flow with ADA BMP

1. Log in to the Activepieces UI
2. Create a new flow
3. Add a trigger (e.g., Webhook trigger for testing)
4. Click "+" to add an action
5. Search for "ADA BMP" in the pieces list
6. Select "ADA BMP" piece
7. Configure the connection:
   - Enter your API token
   - The token will be validated against `/user/checkToken`
8. Select the "Send Message" action
9. Choose a channel from the dropdown (WhatsApp, Facebook, Line, Instagram)
10. Enter recipient ID and message
11. Test your flow!

## Important Notes

### API Base URL
The piece is currently configured to use:
```
https://api.ada-bmp.com
```

If you need to change this (e.g., for development/staging), update the URLs in:
- `src/index.ts` (token validation and custom API calls)
- `src/lib/common/props.ts` (channel fetching)
- `src/lib/actions/send-message.ts` (send message endpoint)

### Development Tips

1. **Hot Reload**: The dev server watches for changes to your piece. Edit the files and they'll rebuild automatically.

2. **Debugging**: Check the console output for build errors or runtime issues.

3. **Testing with Other Pieces**: You can combine ADA BMP with other pieces like Slack:
   - Webhook → ADA BMP → Slack
   - This validates that outputs from ADA BMP can be consumed by other pieces

4. **Multiple Dev Pieces**: To load multiple pieces in dev mode:
   ```bash
   export AP_DEV_PIECES=ada-bmp,slack,webhook
   ```

## Customization

### Adding More Actions

To add more actions (e.g., "Get Message Status", "Upload Media"):

1. Create a new file in `src/lib/actions/`
2. Import and add it to the `actions` array in `src/index.ts`

### Adding Triggers

To add triggers (e.g., "New Message Received"):

1. Create a new file in `src/lib/triggers/`
2. Import and add it to the `triggers` array in `src/index.ts`

### Modifying Channel Dropdown

The channel dropdown is defined in `src/lib/common/props.ts`. You can:
- Change the API endpoint
- Modify the dropdown display format
- Add filtering or sorting

## Troubleshooting

### Piece doesn't appear in UI
- Check that `AP_DEV_PIECES=ada-bmp` is set
- Verify the dev server is running without errors
- Look for build errors in the console

### Channel dropdown shows "Failed to load channels"
- Check that the API endpoint `/channels` is accessible
- Verify the API token is valid
- Check the expected response format matches the code

### Message sending fails
- Verify the `/messages/send` endpoint format
- Check that all required fields are provided
- Review API error messages in the action response

## Next Steps

1. **Test the piece** with real API credentials
2. **Adjust API endpoint URLs** if needed for your environment
3. **Add more actions** like:
   - Get conversation history
   - Upload media/files
   - Get channel statistics
4. **Add triggers** like:
   - New message received (webhook)
   - Message status changed
5. **Add proper logo**: Update the `logoUrl` in `src/index.ts` with your logo URL

## Architecture Notes

- **No EE Dependencies**: This piece uses Community Edition features only
- **Compatible with All Pieces**: Works seamlessly with other pieces in flows
- **Standard Authentication**: Uses the standard SecretText auth pattern
- **Dynamic Properties**: Channel dropdown refreshes options based on auth
