#!/bin/bash

# ============================================
# Get Platform Owner Token Helper Script
# ============================================
# Helps extract the Platform Owner JWT token from browser
# ============================================

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════╗
║                    GET PLATFORM OWNER TOKEN                              ║
╚══════════════════════════════════════════════════════════════════════════╝

Follow these steps to get your Platform Owner JWT token:

STEP 1: Log in to Activepieces
────────────────────────────────────────────────────────────────────────────
1. Open browser: http://localhost:4200
2. Log in with Platform Owner credentials:
   Email: abc@demo.com
   Password: [your password]

STEP 2: Open Browser DevTools
────────────────────────────────────────────────────────────────────────────
   • Chrome/Edge: Press F12 or Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows)
   • Firefox: Press F12 or Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows)
   • Safari: Enable Developer Menu first, then Cmd+Option+I

STEP 3: Navigate to Storage
────────────────────────────────────────────────────────────────────────────
   Chrome/Edge:
   1. Click "Application" tab (top menu)
   2. Expand "Local Storage" (left sidebar)
   3. Click "http://localhost:4200"

   Firefox:
   1. Click "Storage" tab (top menu)
   2. Expand "Local Storage" (left sidebar)
   3. Click "http://localhost:4200"

   Safari:
   1. Click "Storage" tab (top menu)
   2. Click "Local Storage"
   3. Click "http://localhost:4200"

STEP 4: Find the Token
────────────────────────────────────────────────────────────────────────────
   Look for a key named one of these:
   • "token"
   • "auth_token"
   • "jwt"
   • "accessToken"

   The value will be a LONG string starting with "eyJ..."

   Example:
   Key: token
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEifQ.eyJpZCI6IkQzaG53...

STEP 5: Copy the Token
────────────────────────────────────────────────────────────────────────────
   1. Double-click the token value to select it
   2. Right-click → Copy
   3. Or use Cmd+C (Mac) / Ctrl+C (Windows)

STEP 6: Set Environment Variable
────────────────────────────────────────────────────────────────────────────
   Run this command in your terminal:

   export PLATFORM_OWNER_TOKEN="paste_your_token_here"

   Example:
   export PLATFORM_OWNER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEifQ.eyJpZCI6IkQzaG53..."

STEP 7: Verify
────────────────────────────────────────────────────────────────────────────
   Test that the token is set:

   echo $PLATFORM_OWNER_TOKEN

   Should print the token (starts with "eyJ...")

────────────────────────────────────────────────────────────────────────────

ALTERNATIVE: Use the API to get token
────────────────────────────────────────────────────────────────────────────

If you can't access browser DevTools, get token via API:

curl -X POST http://localhost:4200/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "abc@demo.com",
    "password": "YOUR_PASSWORD_HERE"
  }' | jq -r '.token'

Then:
export PLATFORM_OWNER_TOKEN="token_from_api_response"

────────────────────────────────────────────────────────────────────────────

READY TO PROCEED?

Once you have set PLATFORM_OWNER_TOKEN, you can run:

./scripts/migrate-admin-to-env-groups.sh abc_admin@demo.com

────────────────────────────────────────────────────────────────────────────

EOF
