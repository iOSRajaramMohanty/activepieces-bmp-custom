# ADA BMP Piece Architecture

## Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ADA BMP Piece                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                 Authentication Layer                   │   │
│  │                                                        │   │
│  │  PieceAuth.SecretText                                 │   │
│  │  • Validates token via /user/checkToken               │   │
│  │  • Stores in encrypted connection                     │   │
│  │  • Auto-injects in all API calls                      │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                   Dynamic Properties                   │   │
│  │                                                        │   │
│  │  Channel Dropdown (src/lib/common/props.ts)          │   │
│  │  • Fetches channels from API                          │   │
│  │  • Displays: WhatsApp, Facebook, Line, Instagram      │   │
│  │  • Refreshes on connection change                     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                        Actions                         │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────┐     │   │
│  │  │  Send Message                                │     │   │
│  │  │  • Select channel                            │     │   │
│  │  │  • Enter recipient ID                        │     │   │
│  │  │  • Type message                              │     │   │
│  │  │  • POST /messages/send                       │     │   │
│  │  └──────────────────────────────────────────────┘     │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────┐     │   │
│  │  │  Custom API Call                             │     │   │
│  │  │  • Make any API request                      │     │   │
│  │  │  • Token auto-injected                       │     │   │
│  │  │  • Full/relative URL support                 │     │   │
│  │  └──────────────────────────────────────────────┘     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Connection Setup Flow

```
User enters token in UI
         ↓
┌────────────────────────┐
│   Validation Request   │
│                        │
│  POST /user/checkToken │
│  Body:                 │
│  {                     │
│    "accessToken":      │
│    "<token>"           │
│  }                     │
└────────────────────────┘
         ↓
┌────────────────────────┐
│    ADA BMP API         │
│  Validates token       │
└────────────────────────┘
         ↓
    ✓ Valid / ✗ Invalid
         ↓
┌────────────────────────┐
│  Connection Saved      │
│  (encrypted in DB)     │
└────────────────────────┘
```

### 2. Channel Loading Flow

```
User opens action dropdown
         ↓
┌────────────────────────┐
│  Check connection      │
│  exists?               │
└────────────────────────┘
         ↓ Yes
┌────────────────────────┐
│   Fetch Channels       │
│                        │
│   GET /channels        │
│   Authorization:       │
│   Bearer <token>       │
└────────────────────────┘
         ↓
┌────────────────────────┐
│    ADA BMP API         │
│  Returns channel list  │
│  [                     │
│    {                   │
│      id: "ch1",        │
│      name: "Support",  │
│      type: "whatsapp"  │
│    },                  │
│    ...                 │
│  ]                     │
└────────────────────────┘
         ↓
┌────────────────────────┐
│  Transform to options  │
│  [                     │
│    {                   │
│      label: "Support   │
│       (whatsapp)",     │
│      value: "ch1"      │
│    },                  │
│    ...                 │
│  ]                     │
└────────────────────────┘
         ↓
    Display in dropdown
```

### 3. Send Message Flow

```
User fills form & clicks run
         ↓
┌────────────────────────┐
│  Flow execution starts │
└────────────────────────┘
         ↓
┌────────────────────────┐
│  Load saved connection │
│  (decrypt token)       │
└────────────────────────┘
         ↓
┌────────────────────────┐
│  Action.run()          │
│  called by engine      │
└────────────────────────┘
         ↓
┌────────────────────────┐
│  Send API Request      │
│                        │
│  POST /messages/send   │
│  Authorization:        │
│  Bearer <token>        │
│                        │
│  Body:                 │
│  {                     │
│    channelId: "ch1",   │
│    recipientId: "...", │
│    message: "..."      │
│  }                     │
└────────────────────────┘
         ↓
┌────────────────────────┐
│    ADA BMP API         │
│  Processes message     │
│  Returns response      │
└────────────────────────┘
         ↓
┌────────────────────────┐
│  Return to flow        │
│  {                     │
│    success: true,      │
│    data: {...}         │
│  }                     │
└────────────────────────┘
         ↓
    Next step in flow
```

## File Structure & Responsibilities

```
ada-bmp/
│
├── package.json                    # Dependencies
├── project.json                    # Nx build config
├── tsconfig.json                   # TypeScript config
├── tsconfig.lib.json              # Library TS config
│
├── README.md                       # User documentation
├── SETUP.md                        # Detailed setup guide
├── QUICK_START.md                 # Quick reference
├── ARCHITECTURE.md                # This file
│
└── src/
    │
    ├── index.ts                    # 🎯 Main piece definition
    │   │
    │   ├── adaBmpAuth             # Authentication config
    │   │   ├── displayName
    │   │   ├── description
    │   │   └── validate()         # Token validation
    │   │
    │   └── adaBmp                 # Piece definition
    │       ├── displayName: "ADA BMP"
    │       ├── description
    │       ├── auth: adaBmpAuth
    │       ├── actions: [...]
    │       └── triggers: []
    │
    └── lib/
        │
        ├── common/
        │   └── props.ts            # 📋 Reusable properties
        │       │
        │       ├── channelInfo     # Markdown info text
        │       ├── adaBmpChannel() # Dynamic channel dropdown
        │       ├── recipientId     # Text input
        │       └── messageText     # Long text input
        │
        └── actions/
            └── send-message.ts     # 📨 Send message action
                │
                ├── name: "send_message"
                ├── displayName: "Send Message"
                ├── props: {...}
                └── run(context)    # Execution logic
```

## Integration Points

### With Activepieces Core

```
┌─────────────────────────────────────────────────────────┐
│                  Activepieces Platform                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              UI (React)                         │   │
│  │  • Renders connection form                      │   │
│  │  • Renders action forms                         │   │
│  │  • Displays channel dropdown                    │   │
│  └─────────────────────────────────────────────────┘   │
│                       ↕                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │              API Server                         │   │
│  │  • Stores encrypted connections                 │   │
│  │  • Serves piece metadata                        │   │
│  │  • Enqueues flow runs                          │   │
│  └─────────────────────────────────────────────────┘   │
│                       ↕                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Worker/Engine                      │   │
│  │  • Loads piece code                            │   │
│  │  • Executes action.run()                       │   │
│  │  • Passes context with auth                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────────────┐
│                   ADA BMP Piece                         │
│  • Validates connections                                │
│  • Provides dynamic dropdowns                           │
│  • Executes actions                                     │
└─────────────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────────────┐
│                  ADA BMP API                            │
│  • Validates tokens                                     │
│  • Provides channel list                                │
│  • Sends messages                                       │
└─────────────────────────────────────────────────────────┘
```

### With Other Pieces (Flow Example)

```
┌──────────────┐
│   Webhook    │  ← Trigger: Receives HTTP POST
│   (Official) │
└──────┬───────┘
       │ {name: "John", phone: "+1234567890"}
       ↓
┌──────────────┐
│   ADA BMP    │  ← Action: Send welcome message
│   (Custom)   │     Channel: WhatsApp
└──────┬───────┘     Recipient: {{trigger.phone}}
       │ {success: true, messageId: "msg_123"}
       ↓
┌──────────────┐
│    Slack     │  ← Action: Notify team
│   (Official) │     Message: "Sent welcome to {{trigger.name}}"
└──────────────┘
```

## Security Architecture

### Token Storage

```
┌─────────────────────────────────────────────────┐
│             User enters token in UI             │
└─────────────────┬───────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────┐
│        API validates token (our code)           │
│        GET /user/checkToken                     │
└─────────────────┬───────────────────────────────┘
                  ↓ Valid
┌─────────────────────────────────────────────────┐
│    Activepieces encrypts & stores in DB         │
│    (app_connection table)                       │
└─────────────────┬───────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────┐
│    Runtime: Worker decrypts for action.run()   │
│    (passed in context.auth)                     │
└─────────────────────────────────────────────────┘
```

### No Token Exposure

- ✅ Tokens never logged
- ✅ Tokens never sent to client after save
- ✅ Tokens encrypted at rest
- ✅ Tokens only decrypted in worker process
- ✅ HTTPS required for API communication

## Error Handling

### Connection Validation Errors

```typescript
// In src/index.ts
validate: async ({ auth }) => {
  try {
    const response = await httpClient.sendRequest({...});
    
    if (response.status === 200) {
      return { valid: true };
    }
    
    return {
      valid: false,
      error: 'Invalid token'
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to validate token...'
    };
  }
}
```

### Channel Loading Errors

```typescript
// In src/lib/common/props.ts
async options({ auth }) {
  if (!auth) {
    return {
      disabled: true,
      placeholder: 'Connect your ADA BMP account',
      options: [],
    };
  }
  
  try {
    const response = await httpClient.sendRequest({...});
    return {
      disabled: false,
      placeholder: 'Select channel',
      options: transformedChannels,
    };
  } catch (error) {
    return {
      disabled: true,
      placeholder: 'Failed to load channels',
      options: [],
    };
  }
}
```

### Action Execution Errors

```typescript
// In src/lib/actions/send-message.ts
async run(context) {
  try {
    const response = await httpClient.sendRequest({...});
    return {
      success: true,
      data: response.body,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send message',
    };
  }
}
```

## Performance Considerations

### Channel Dropdown Caching

The UI automatically caches dropdown results:
- First load: API call made
- Subsequent loads: Cache used
- Refresh button: Forces new API call
- Connection change: Cache invalidated

### API Rate Limiting

Consider implementing:
```typescript
// Future enhancement
import { RateLimiter } from '@activepieces/pieces-common';

const limiter = new RateLimiter({
  maxRequests: 100,
  perSeconds: 60,
});
```

## Extension Points

### Adding New Actions

```typescript
// Example: src/lib/actions/get-status.ts
export const getStatusAction = createAction({
  auth: adaBmpAuth,
  name: 'get_status',
  displayName: 'Get Message Status',
  props: {
    messageId: Property.ShortText({
      displayName: 'Message ID',
      required: true,
    }),
  },
  async run(context) {
    // Implementation
  },
});

// Then add to src/index.ts:
// actions: [sendMessageAction, getStatusAction, ...]
```

### Adding Triggers

```typescript
// Example: src/lib/triggers/new-message.ts
export const newMessageTrigger = createTrigger({
  auth: adaBmpAuth,
  name: 'new_message',
  displayName: 'New Message',
  type: TriggerStrategy.APP_WEBHOOK,
  props: {
    channel: adaBmpChannel(false),
  },
  async onEnable(context) {
    // Register webhook
  },
  async onDisable(context) {
    // Unregister webhook
  },
  async run(context) {
    return [context.payload.body];
  },
});
```

## Testing Strategy

### Unit Testing Actions

```typescript
// Future: ada-bmp.spec.ts
describe('ADA BMP Send Message', () => {
  it('should send message successfully', async () => {
    const result = await sendMessageAction.run({
      auth: 'test-token',
      propsValue: {
        channel: 'ch-1',
        recipient: '+1234567890',
        message: 'Test',
      },
    });
    
    expect(result.success).toBe(true);
  });
});
```

### Integration Testing

```
1. Start dev server with AP_DEV_PIECES=ada-bmp
2. Create test flow:
   - Webhook → ADA BMP → Store
3. POST to webhook
4. Verify message sent
5. Check output in Store
```

## Deployment Notes

### Community Edition

- ✅ No EE dependencies
- ✅ Works with `AP_EDITION=COMMUNITY`
- ✅ No platform/project restrictions

### Production Considerations

1. **API URL**: Update if using different env
2. **Logo**: Upload proper logo and update URL
3. **Error Messages**: Customize for your audience
4. **Rate Limits**: Implement if needed
5. **Monitoring**: Add logging for debugging

---

## Summary

This piece follows Activepieces best practices:
- ✅ Standard auth pattern (SecretText)
- ✅ Dynamic properties (channel dropdown)
- ✅ Proper error handling
- ✅ TypeScript types
- ✅ Reusable components (props.ts)
- ✅ Compatible with other pieces
- ✅ CE-only (no EE dependencies)
