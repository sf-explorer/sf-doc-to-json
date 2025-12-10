#!/bin/bash

# Setup script for the describe-api package

echo "Setting up @sf-explorer/describe-api..."
echo ""

cd "$(dirname "$0")"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the package
echo "Building package..."
npm run build

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  Please edit .env and add your Salesforce credentials:"
    echo "   - SF_USERNAME"
    echo "   - SF_PASSWORD"
    echo "   - SF_SECURITY_TOKEN (optional)"
else
    echo ""
    echo "✅ .env file already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit your .env file with Salesforce credentials:"
echo "   nano .env"
echo ""
echo "2. Fetch schemas from your org:"
echo "   npm start"
echo ""
echo "Or run examples:"
echo "   npm run example 1  # Fetch specific objects"
echo "   npm run example 2  # Save all objects"
echo "   npm run example 3  # Show enriched schema"
echo ""

