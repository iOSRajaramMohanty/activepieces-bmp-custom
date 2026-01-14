#!/bin/bash

# Script to toggle between single-tenant and multi-tenant modes

MODE=$1

if [ -z "$MODE" ]; then
    echo "Usage: ./toggle-multi-tenant.sh [on|off|status]"
    echo ""
    echo "Commands:"
    echo "  on      - Enable multi-tenant mode (each signup = new platform)"
    echo "  off     - Disable multi-tenant mode (shared platform)"
    echo "  status  - Show current configuration"
    exit 1
fi

CONFIG_FILE="scripts/run-dev.sh"

case "$MODE" in
    on)
        echo "🔧 Enabling multi-tenant mode..."
        sed -i '' 's/export AP_MULTI_TENANT_MODE=.*/export AP_MULTI_TENANT_MODE=true/' "$CONFIG_FILE"
        echo "✅ Multi-tenant mode ENABLED"
        echo "   → Each signup will create an isolated platform"
        echo "   → Restart your server for changes to take effect"
        ;;
    off)
        echo "🔧 Disabling multi-tenant mode..."
        sed -i '' 's/export AP_MULTI_TENANT_MODE=.*/export AP_MULTI_TENANT_MODE=false/' "$CONFIG_FILE"
        echo "✅ Multi-tenant mode DISABLED"
        echo "   → All users will share the same platform"
        echo "   → Restart your server for changes to take effect"
        ;;
    status)
        CURRENT=$(grep "AP_MULTI_TENANT_MODE" "$CONFIG_FILE" | grep -o "true\|false")
        echo "📊 Current Configuration:"
        echo ""
        if [ "$CURRENT" = "true" ]; then
            echo "✅ Multi-tenant mode: ENABLED"
            echo "   → Each signup creates isolated platform"
            echo "   → Best for: SaaS applications"
        else
            echo "❌ Multi-tenant mode: DISABLED"
            echo "   → All users share same platform"
            echo "   → Best for: Team collaboration"
        fi
        echo ""
        echo "Edition: $(grep "export AP_EDITION" "$CONFIG_FILE" | grep -o "ce\|ee\|cloud")"
        ;;
    *)
        echo "❌ Invalid option: $MODE"
        echo "Use: on, off, or status"
        exit 1
        ;;
esac
