# ADA BMP Piece

ADA BMP is a multi-channel messaging platform integration for Activepieces that supports:

- WhatsApp
- Facebook Messenger
- Line
- Instagram

## Configuration

### Environment Variables

The API URL and other settings can be configured using environment variables:

- **`ADA_BMP_API_URL`**: Base URL for the ADA BMP API (default: `https://api.ada-bmp.com`)
- **`ADA_BMP_DEBUG`**: Enable debug logging (default: `false`)
- **`ADA_BMP_TIMEOUT`**: Request timeout in milliseconds (default: `30000`)
- **`ADA_BMP_API_VERSION`**: API version (default: `v1`)

### Configuration Examples

```bash
# Production (default)
export ADA_BMP_API_URL=https://api.ada-bmp.com

# Staging Environment
export ADA_BMP_API_URL=https://api-staging.ada-bmp.com
export ADA_BMP_DEBUG=true

# Local Development
export ADA_BMP_API_URL=http://localhost:8080
export ADA_BMP_DEBUG=true
```

See [ENV_CONFIG.md](./ENV_CONFIG.md) for detailed configuration instructions.

## Authentication

This piece uses API token authentication. You'll need to provide your ADA BMP API token which will be validated against the `/user/checkToken` endpoint.

## Actions

### Send Message

Send a message through any of the supported channels (WhatsApp, Facebook, Line, or Instagram).

**Inputs:**
- **Channel**: Select the messaging channel from the dropdown
- **Recipient ID**: The ID of the recipient (phone number, user ID, etc.)
- **Message**: The text message to send

### Custom API Call

Make custom API calls to the ADA BMP API with your authentication token automatically included.

## API Endpoints

The following endpoints are used (with configurable base URL):

- `POST /user/checkToken` - Token validation
- `GET /channels` - List available channels
- `POST /messages/send` - Send a message

## Usage

1. **Configure Environment** (optional):
   ```bash
   export ADA_BMP_API_URL=https://your-api-url.com
   ```

2. **Create a new flow** in Activepieces

3. **Add the ADA BMP piece**

4. **Connect your account** using your API token

5. **Select the channel** from the dropdown (WhatsApp, Facebook, Line, or Instagram)

6. **Configure the message details**

7. **Save and test** your flow

## Development

The configuration is centralized in `src/lib/common/config.ts`. All API URLs are constructed from the environment variable or default value.

## Troubleshooting

### Enable Debug Logging

```bash
export ADA_BMP_DEBUG=true
npm run dev
```

This will show detailed logs for all API calls:
- Token validation
- Channel fetching  
- Message sending

### Test with Different Environments

You can easily switch between environments by changing the `ADA_BMP_API_URL`:

```bash
# Test with staging
ADA_BMP_API_URL=https://api-staging.ada-bmp.com npm run dev

# Test with local mock
ADA_BMP_API_URL=http://localhost:8080 npm run dev
```

## Files

- `src/index.ts` - Main piece definition
- `src/lib/common/config.ts` - Configuration management
- `src/lib/common/props.ts` - Property definitions (channel dropdown, etc.)
- `src/lib/actions/send-message.ts` - Send message action
- `ENV_CONFIG.md` - Detailed configuration guide
