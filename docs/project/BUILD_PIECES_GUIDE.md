# Building Community Pieces Guide

This guide explains how to build and manage community pieces in Activepieces.

## 🎯 Quick Start

### Build Specific Piece
```bash
# Build a single piece (e.g., Slack)
./scripts/build-pieces.sh slack

# Or use nx directly
npx nx build pieces-slack
```

### Build Common Pieces
```bash
# Build commonly used pieces (Slack, Gmail, Google Sheets, etc.)
./scripts/build-pieces.sh common
```

### Build All Pieces
```bash
# Build ALL community pieces (takes 10-20 minutes)
./scripts/build-pieces.sh all
```

### List Available Pieces
```bash
./scripts/build-pieces.sh list
```

---

## 📦 What Gets Built

When you build a piece, the output goes to:
```
dist/packages/pieces/community/<piece-name>/
```

Example for Slack:
```
dist/packages/pieces/community/slack/
├── package.json
├── README.md
└── src/
    ├── index.js
    ├── index.d.ts
    ├── lib/
    │   ├── actions/
    │   ├── triggers/
    │   └── common/
    └── i18n/
```

---

## 🚀 Auto-Build on Server Start

To automatically build pieces when you start the dev server, edit `run-dev.sh`:

### Option 1: Build Common Pieces (Recommended)
Uncomment this line in `run-dev.sh`:
```bash
./scripts/build-pieces.sh common
```

This builds ~20 commonly used pieces and takes about 2-3 minutes.

### Option 2: Build Specific Pieces
Uncomment and customize:
```bash
./scripts/build-pieces.sh slack
```

### Option 3: Build All Pieces
⚠️ **Warning**: This takes 10-20 minutes!
```bash
./scripts/build-pieces.sh all
```

---

## 📋 Commonly Built Pieces

The `./scripts/build-pieces.sh common` command builds:

### Communication & Messaging
- **slack** - Slack integration
- **discord** - Discord bot
- **telegram-bot** - Telegram bot
- **twilio** - SMS and calling

### Email & Marketing
- **gmail** - Gmail integration
- **sendgrid** - Email sending
- **mailchimp** - Email marketing

### Productivity & Project Management
- **notion** - Notion database
- **trello** - Trello boards
- **asana** - Asana tasks
- **google-calendar** - Google Calendar

### Storage & Sheets
- **google-drive** - Google Drive
- **google-sheets** - Google Sheets
- **airtable** - Airtable bases

### CRM & Sales
- **hubspot** - HubSpot CRM
- **salesforce** - Salesforce CRM
- **stripe** - Stripe payments

### AI & Development
- **openai** - OpenAI GPT
- **anthropic** - Claude AI
- **github** - GitHub integration

---

## 🛠️ Build Individual Pieces On-Demand

### Build a Single Piece
```bash
# Using the helper script
./scripts/build-pieces.sh slack

# Using nx directly
npx nx build pieces-slack

# Check if it's built
ls -la dist/packages/pieces/community/slack/
```

### Build Multiple Specific Pieces
```bash
# Build several pieces at once
for piece in slack gmail discord; do
    ./scripts/build-pieces.sh $piece
done
```

### Find Piece Name
```bash
# List all available pieces
ls packages/pieces/community/

# Search for a specific piece
ls packages/pieces/community/ | grep -i "hubspot"
```

---

## 🔍 Troubleshooting

### Piece Not Found Error
```
Error: Cannot find project 'pieces-xyz'
```

**Solution**: Check if the piece exists
```bash
ls packages/pieces/community/ | grep xyz
```

### Build Failures
If a piece fails to build, it might have:
- Missing dependencies
- TypeScript errors
- Version conflicts

**Solution**: Check the build output for specific errors.

### Piece Not Showing in UI
After building, restart the dev server:
```bash
# Stop the server (Ctrl+C)
# Start again
./scripts/run-dev.sh
```

---

## 💡 Best Practices

### 1. **Build Only What You Need**
Don't build all pieces unless necessary. Each piece takes disk space.

### 2. **Build Before First Use**
Build pieces before creating flows that use them:
```bash
./scripts/build-pieces.sh slack
# Then create your Slack flow
```

### 3. **Clean Build When Updating**
If you update Activepieces code:
```bash
# Clean the dist folder
rm -rf dist/packages/pieces/community/slack

# Rebuild
./scripts/build-pieces.sh slack
```

### 4. **Check Build Status**
```bash
# See what's already built
ls dist/packages/pieces/community/

# Check a specific piece
ls -lh dist/packages/pieces/community/slack/
```

---

## 📊 Build Time Estimates

| Command | Pieces | Time | Use Case |
|---------|--------|------|----------|
| `./scripts/build-pieces.sh slack` | 1 | ~10s | Quick single piece |
| `./scripts/build-pieces.sh common` | ~20 | 2-3 min | Development work |
| `./scripts/build-pieces.sh all` | ~500+ | 15-20 min | Full deployment |

---

## 🔗 Related Files

- **`build-pieces.sh`** - Helper script to build pieces
- **`run-dev.sh`** - Dev server startup script
- **`nx.json`** - Nx build configuration
- **`packages/pieces/community/`** - Source code for all community pieces

---

## 📝 Examples

### Example 1: Build Slack Integration
```bash
# Build the Slack piece
./scripts/build-pieces.sh slack

# Verify it's built
ls dist/packages/pieces/community/slack/

# Start the server
./scripts/run-dev.sh

# Now you can use Slack triggers and actions in your flows!
```

### Example 2: Build Multiple Email Pieces
```bash
# Build all email-related pieces
for piece in gmail sendgrid mailchimp; do
    echo "Building $piece..."
    ./scripts/build-pieces.sh $piece
done
```

### Example 3: Auto-Build on Startup
Edit `run-dev.sh` and uncomment:
```bash
./scripts/build-pieces.sh common
```

This ensures commonly used pieces are always available.

---

## 🚨 Important Notes

1. **Custom pieces** (like `ada-bmp`) are built automatically by the dev server
2. **Community pieces** need to be built manually using this script
3. Built pieces are stored in `dist/` which is git-ignored
4. Rebuilding is safe - it will overwrite the old build
5. You can safely delete `dist/packages/pieces/community/` to start fresh

---

## 📚 Additional Resources

- [Activepieces Documentation](https://www.activepieces.com/docs)
- [Creating Custom Pieces](./technical-docs/CUSTOM-PIECE.md)
- [Nx Build System](https://nx.dev/)

---

## ❓ Need Help?

Common questions:

**Q: Which pieces should I build?**  
A: Start with `./scripts/build-pieces.sh common` for popular pieces, then build specific ones as needed.

**Q: Can I build pieces in parallel?**  
A: Yes, but it's handled automatically by Nx. Just run the build command.

**Q: Do I need to rebuild after code changes?**  
A: Only if you modify the piece's source code in `packages/pieces/community/`.

**Q: Why is my piece not showing up?**  
A: Make sure it's built (check `dist/`) and restart the dev server.
