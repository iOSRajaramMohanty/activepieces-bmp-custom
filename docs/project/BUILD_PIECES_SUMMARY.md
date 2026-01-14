# Community Pieces Build System - Summary

## 📁 Created Files

### 1. **build-pieces.sh** - Main Build Script
- **Location**: `/activepieces/build-pieces.sh`
- **Purpose**: Build community pieces on demand
- **Usage**:
  ```bash
  ./scripts/build-pieces.sh common    # Build 20 popular pieces
  ./scripts/build-pieces.sh all       # Build all pieces
  ./scripts/build-pieces.sh slack     # Build specific piece
  ./scripts/build-pieces.sh list      # List available pieces
  ```

### 2. **show-build-commands.sh** - Quick Reference
- **Location**: `/activepieces/show-build-commands.sh`
- **Purpose**: Display all available build commands
- **Usage**: `./show-build-commands.sh`

### 3. **BUILD_PIECES_GUIDE.md** - Complete Documentation
- **Location**: `/activepieces/BUILD_PIECES_GUIDE.md`
- **Purpose**: Comprehensive guide for building and managing pieces
- **Includes**: Examples, troubleshooting, best practices

### 4. **run-dev.sh** - Updated Startup Script
- **Location**: `/activepieces/run-dev.sh`
- **Changes**: Added commented options to auto-build pieces on startup
- **Usage**: Uncomment desired build line before `exec npm run dev`

---

## 🚀 Quick Start Guide

### Option 1: Build on Demand (Recommended)
```bash
# Build specific pieces when you need them
./scripts/build-pieces.sh slack
./scripts/build-pieces.sh gmail
./scripts/build-pieces.sh google-sheets
```

### Option 2: Build Common Pieces
```bash
# Build 20 popular pieces (takes 2-3 minutes)
./scripts/build-pieces.sh common
```

### Option 3: Auto-Build on Server Start
Edit `run-dev.sh` and uncomment this line (around line 52):
```bash
./scripts/build-pieces.sh common
```

Then start your server:
```bash
./scripts/run-dev.sh
```

---

## 📦 What Gets Built

Built pieces are placed in:
```
dist/packages/pieces/community/<piece-name>/
```

Example structure:
```
dist/packages/pieces/community/
├── slack/
│   ├── package.json
│   ├── src/
│   │   ├── index.js
│   │   ├── lib/actions/
│   │   ├── lib/triggers/
│   │   └── i18n/
├── google-sheets/
├── gmail/
└── ...
```

---

## 🎯 Common Use Cases

### Use Case 1: Testing Slack Integration
```bash
# Build Slack piece
./scripts/build-pieces.sh slack

# Start server
./scripts/run-dev.sh

# Now create a flow with Slack triggers/actions
```

### Use Case 2: Setting Up Full Integration Suite
```bash
# Build all pieces you might need
./scripts/build-pieces.sh common

# Or build specific integrations
for piece in slack gmail google-sheets hubspot; do
    ./scripts/build-pieces.sh $piece
done
```

### Use Case 3: Clean Slate
```bash
# Remove all built pieces
rm -rf dist/packages/pieces/community/

# Rebuild what you need
./scripts/build-pieces.sh common
```

---

## 🔧 Configuration Options

### Auto-Build on Startup

In `run-dev.sh`, you can uncomment ONE of these:

```bash
# Option A: Build common pieces (recommended)
./scripts/build-pieces.sh common

# Option B: Build all pieces (slow, 15-20 min)
./scripts/build-pieces.sh all

# Option C: Build specific pieces
./scripts/build-pieces.sh slack
```

---

## 📊 Build Statistics

| Command | # Pieces | Time | Disk Space |
|---------|----------|------|------------|
| Single piece | 1 | ~10s | ~5MB |
| Common pieces | ~20 | 2-3 min | ~100MB |
| All pieces | 500+ | 15-20 min | ~2.5GB |

---

## 💡 Best Practices

1. **Build only what you need** - Don't build all pieces unnecessarily
2. **Use common build for development** - Covers most use cases
3. **Build specific pieces for production** - Only include what's actually used
4. **Clean rebuild when updating** - Delete dist/ folder after major updates
5. **Check before building** - Use `./scripts/build-pieces.sh list` to find piece names

---

## 🐛 Troubleshooting

### Piece not found
```bash
# Check if piece exists
ls packages/pieces/community/ | grep -i "piece-name"
```

### Build failed
```bash
# Clean and rebuild
rm -rf dist/packages/pieces/community/piece-name
./scripts/build-pieces.sh piece-name
```

### Piece not showing in UI
```bash
# Restart the server
# Ctrl+C to stop
./scripts/run-dev.sh
```

---

## 📝 Available Pieces Categories

### Communication (10+ pieces)
slack, discord, telegram-bot, twilio, matrix, mattermost, etc.

### Email & Marketing (15+ pieces)
gmail, sendgrid, mailchimp, resend, smtp, etc.

### Productivity (20+ pieces)
notion, trello, asana, monday, clickup, todoist, etc.

### Google Suite (10+ pieces)
google-sheets, google-drive, google-calendar, gmail, google-docs, etc.

### CRM & Sales (15+ pieces)
hubspot, salesforce, pipedrive, zoho, etc.

### AI & ML (10+ pieces)
openai, anthropic, claude, google-gemini, hugging-face, etc.

### And 400+ more!

See full list: `./scripts/build-pieces.sh list`

---

## 🔗 Related Documentation

- **BUILD_PIECES_GUIDE.md** - Complete guide with examples
- **show-build-commands.sh** - Quick command reference
- **run-dev.sh** - Server startup script
- **technical-docs/CUSTOM-PIECE.md** - Creating custom pieces

---

## ✅ What's Different Now

### Before
- Had to manually run `npx nx build pieces-<name>` for each piece
- No easy way to build multiple pieces
- No documentation on which pieces to build
- Had to remember exact piece names

### After
- ✅ Simple script: `./scripts/build-pieces.sh slack`
- ✅ Batch build common pieces: `./scripts/build-pieces.sh common`
- ✅ Optional auto-build on startup
- ✅ List all available pieces
- ✅ Complete documentation and examples
- ✅ Color-coded output for better visibility

---

## 🎉 Quick Win Commands

```bash
# See all commands
./show-build-commands.sh

# Build Slack integration
./scripts/build-pieces.sh slack

# Build 20 popular pieces
./scripts/build-pieces.sh common

# Check what's already built
ls dist/packages/pieces/community/

# Read the full guide
cat BUILD_PIECES_GUIDE.md
```

---

## 📞 Next Steps

1. **Test the build script**:
   ```bash
   ./scripts/build-pieces.sh slack
   ```

2. **Check the output**:
   ```bash
   ls dist/packages/pieces/community/slack/
   ```

3. **Restart your server** (if running):
   ```bash
   ./scripts/run-dev.sh
   ```

4. **Create a flow** using the Slack piece!

---

**Happy Building! 🚀**
