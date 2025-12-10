#!/bin/bash

echo "🔄 Updating all doc files..."
echo ""

# Step 1: Copy from src to dist in parent package
echo "1️⃣  Copying src/doc → dist/doc"
cd "$(dirname "$0")/.."
npm run copy:doc

if [ $? -ne 0 ]; then
  echo "❌ Failed to copy doc files in parent package"
  exit 1
fi

echo ""
echo "2️⃣  Copying to demo/public/doc"
cd demo
npm run copy-doc

if [ $? -ne 0 ]; then
  echo "❌ Failed to copy doc files to demo"
  exit 1
fi

echo ""
echo "✅ All doc files updated successfully!"
echo ""
echo "📍 Files updated:"
echo "   - dist/doc/*.json (NPM package)"
echo "   - demo/public/doc/*.json (Demo dev)"
echo ""
echo "💡 Run 'cd demo && npm run dev' to see changes in development"
echo "💡 Run 'cd demo && npm run build' to create production build"



