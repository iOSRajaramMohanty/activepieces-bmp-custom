# 🚀 Quick Start: Building Community Pieces

## TL;DR

```bash
# Build a specific piece (e.g., Slack)
./scripts/build-pieces.sh slack

# Build 20 popular pieces (Gmail, Slack, Google Sheets, etc.)
./scripts/build-pieces.sh common

# See all available commands
./show-build-commands.sh

# Read the full guide
cat BUILD_PIECES_GUIDE.md
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **BUILD_PIECES_SUMMARY.md** | 📋 Overview and quick reference |
| **BUILD_PIECES_GUIDE.md** | 📖 Complete guide with examples |
| **show-build-commands.sh** | 🎯 Display all build commands |
| **build-pieces.sh** | 🛠️ Main build script |

---

## 🎯 Common Scenarios

### Scenario 1: I need Slack integration NOW
```bash
./scripts/build-pieces.sh slack
./scripts/run-dev.sh
# Done! Use Slack in your flows
```

### Scenario 2: I want all popular integrations ready
```bash
./scripts/build-pieces.sh common
# Builds: Slack, Gmail, Google Sheets, Notion, Trello, 
#         HubSpot, Stripe, OpenAI, and more...
```

### Scenario 3: Auto-build on every server start
Edit `run-dev.sh`, uncomment line 52:
```bash
./scripts/build-pieces.sh common
```

### Scenario 4: I don't know what pieces are available
```bash
./scripts/build-pieces.sh list
# Shows first 50 pieces
# For all: ls packages/pieces/community/
```

---

## ✅ Current Status

You now have:
- ✅ **Slack** - Built and ready ✨
- ✅ **Gmail** - Built and ready ✨
- ✅ **Google Sheets** - Built and ready ✨
- ✅ **Store** - Built and ready ✨
- ✅ **ada-bmp** (custom) - Auto-built ✨

---

## 🔄 Auto-Build Options

**Option A: Build on every startup** (Good for development)
```bash
# Edit run-dev.sh, uncomment:
./scripts/build-pieces.sh common
```

**Option B: Build on demand** (Good for production)
```bash
# Build when you need them:
./scripts/build-pieces.sh slack
./scripts/build-pieces.sh gmail
```

**Option C: Build once and forget**
```bash
# Build all pieces one time
./scripts/build-pieces.sh all
# Takes 15-20 minutes, ~2.5GB disk space
```

---

## 💡 Pro Tips

1. **Start with common**: `./scripts/build-pieces.sh common` covers 80% of use cases
2. **Check before building**: Use `./scripts/build-pieces.sh list` to find exact names
3. **Verify builds**: Run `ls dist/packages/pieces/community/`
4. **Clean when updating**: Delete `dist/` folder after major Activepieces updates
5. **Restart after building**: Ctrl+C and run `./scripts/run-dev.sh` again

---

## 🆘 Quick Help

```bash
# Show all commands
./show-build-commands.sh

# Build Gmail
./scripts/build-pieces.sh gmail

# List all available pieces
./scripts/build-pieces.sh list

# Check what's built
ls dist/packages/pieces/community/

# Clean everything
rm -rf dist/packages/pieces/community/

# Read full guide
cat BUILD_PIECES_GUIDE.md
```

---

## 🎉 That's It!

You're all set! Start building the pieces you need and create amazing workflows! 🚀

**Questions?** Check `BUILD_PIECES_GUIDE.md` for detailed documentation.
