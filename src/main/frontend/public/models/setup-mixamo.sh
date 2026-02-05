#!/bin/bash
# =============================================================================
# Mixamo Model Setup Script
# 
# Downloads placeholder files and provides instructions for Mixamo setup.
# Run this script after downloading FBX files from Mixamo.
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="$SCRIPT_DIR"

echo "🏊 Mixamo Swimmer Model Setup"
echo "=============================="
echo ""

# Check for Blender
if ! command -v blender &> /dev/null; then
    echo "❌ Blender not found. Install with:"
    echo "   sudo apt install blender"
    exit 1
fi

echo "✓ Blender found: $(blender --version | head -1)"
echo ""

# Check for required files
REQUIRED_FILES=("character.fbx" "swim_freestyle.fbx")
OPTIONAL_FILES=("swim_breaststroke.fbx" "swim_backstroke.fbx" "swim_butterfly.fbx" "swim_dive.fbx" "swim_turn_flip.fbx" "swim_turn_open.fbx")

echo "Checking required files..."
MISSING=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$MODELS_DIR/$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ❌ $file (REQUIRED)"
        MISSING=1
    fi
done

echo ""
echo "Checking optional files..."
for file in "${OPTIONAL_FILES[@]}"; do
    if [ -f "$MODELS_DIR/$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ○ $file (optional)"
    fi
done

echo ""

if [ $MISSING -eq 1 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📥 Download Instructions:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Go to https://www.mixamo.com and sign in"
    echo ""
    echo "2. Download CHARACTER:"
    echo "   - Click 'Characters' tab"
    echo "   - Select 'Y Bot' or 'X Bot'"
    echo "   - Download → Format: FBX for Unity, Pose: T-pose"
    echo "   - Save as: $MODELS_DIR/character.fbx"
    echo ""
    echo "3. Download ANIMATION:"
    echo "   - Click 'Animations' tab"
    echo "   - Search: 'Swimming'"
    echo "   - Select the swimming animation"
    echo "   - Download → Format: FBX for Unity, Skin: With Skin"
    echo "   - Save as: $MODELS_DIR/swim_freestyle.fbx"
    echo ""
    echo "4. Re-run this script after downloading"
    echo ""
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Running Blender export..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$MODELS_DIR"
blender --background --python blender-export.py

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "$MODELS_DIR/swimmer.glb" ]; then
    SIZE=$(du -h "$MODELS_DIR/swimmer.glb" | cut -f1)
    echo "✅ Success! Created swimmer.glb ($SIZE)"
    echo ""
    echo "The model will be automatically loaded when you run:"
    echo "   cd src/main/frontend && yarn dev"
else
    echo "❌ Export failed. Check Blender output above."
    exit 1
fi
