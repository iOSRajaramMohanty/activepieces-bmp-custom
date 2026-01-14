# Technical Docs (Local)

This folder is a **developer-oriented** view of the Activepieces codebase. It is intended to help you **understand and customize** the project (architecture, runtime flow, extension points, and where EE plugs in).

## Docs

### Core Architecture & Backend
- **Project architecture & customization guide**: `./PROJECT.md`
- **Enterprise Edition (EE) architecture & customization guide**: `./EE.md`
- **Create and run your own custom piece (CE / ignore EE)**: `./CUSTOM-PIECE.md`

### Frontend / UI Customization (NEW)
- **React UI Customization Guide**: `./REACT-UI-CUSTOMIZATION.md` - Comprehensive guide covering:
  - Branding & theming (colors, logos, fonts)
  - Component development & customization
  - Styling with TailwindCSS
  - Internationalization (i18n) - 11 languages supported
  - Routes & navigation
  - API configuration & integration
  - Assets management
  - Build configuration
  - Advanced customizations
  - Best practices
  
- **React UI Quick Reference**: `./REACT-UI-CUSTOMIZATION-QUICK-REF.md` - Fast lookup for:
  - Branding checklist
  - Component locations
  - Common tasks
  - File structure map
  - Debugging tips

## Quick Start by Goal

### 🎨 "I want to customize the UI/branding"
→ Start with: **`REACT-UI-CUSTOMIZATION-QUICK-REF.md`** (quick tasks)  
→ Deep dive: **`REACT-UI-CUSTOMIZATION.md`** (comprehensive guide)

### 🔌 "I want to create a custom integration"
→ Read: **`CUSTOM-PIECE.md`** (step-by-step guide with examples)

### 🏗️ "I want to understand the project structure"
→ Read: **`PROJECT.md`** (architecture overview)

### 💼 "I'm working with Enterprise features"
→ Read: **`EE.md`** (EE architecture & features)

## Scope / disclaimer

- This documentation is written from reading the repository source; it focuses on **how the code is structured and wired**, not on product usage (those are in `docs/`).
- "EE" in this repo appears in two places:
  - **Server-side EE implementation**: `packages/server/api/src/app/ee/**`
  - **EE shared contracts + embed SDK**: `packages/ee/**`

