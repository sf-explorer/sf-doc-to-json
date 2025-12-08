#!/bin/bash

# Helper script to get Salesforce access token using Salesforce CLI
# and update your .env file

echo "🔐 Salesforce Access Token Helper"
echo "=================================="
echo ""

# Check if Salesforce CLI is installed
if ! command -v sf &> /dev/null; then
    echo "❌ Salesforce CLI not found"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g @salesforce/cli"
    echo ""
    exit 1
fi

echo "✅ Salesforce CLI found"
echo ""

# List available orgs
echo "Available orgs:"
sf org list --json | grep -o '"alias":"[^"]*"' | cut -d'"' -f4 || echo "No orgs found. Please run: sf org login web --alias my-org"
echo ""

# Ask for org alias
read -p "Enter org alias (or press Enter to use default): " ORG_ALIAS

if [ -z "$ORG_ALIAS" ]; then
    ORG_ARG=""
else
    ORG_ARG="--target-org $ORG_ALIAS"
fi

# Get org info
echo ""
echo "Fetching org information..."
ORG_INFO_RAW=$(sf org display $ORG_ARG --json 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Failed to get org information"
    echo "$ORG_INFO_RAW"
    echo ""
    echo "Please login first:"
    echo "  sf org login web --alias my-org"
    exit 1
fi

# Filter out warnings and extract only the JSON part
# SF CLI outputs warnings like " ›   Warning: ..." which breaks JSON parsing
ORG_INFO=$(echo "$ORG_INFO_RAW" | grep -v "^[[:space:]]*›" | grep -v "^[[:space:]]*Warning:")

# Check if the output is valid JSON
if ! echo "$ORG_INFO" | jq empty 2>/dev/null; then
    echo "❌ Invalid JSON response from Salesforce CLI"
    echo ""
    echo "Raw response:"
    echo "$ORG_INFO_RAW"
    echo ""
    echo "💡 This might be because:"
    echo "  1. The org is not authenticated (try: sf org login web)"
    echo "  2. The CLI has warnings mixed with JSON output"
    echo "  3. The specified org doesn't exist"
    exit 1
fi

# Extract access token and instance URL
# Try parsing JSON with jq if available, otherwise use grep
if command -v jq &> /dev/null; then
    ACCESS_TOKEN=$(echo "$ORG_INFO" | jq -r '.result.accessToken // empty')
    INSTANCE_URL=$(echo "$ORG_INFO" | jq -r '.result.instanceUrl // empty')
else
    # Fallback to grep (less reliable but works without jq)
    ACCESS_TOKEN=$(echo "$ORG_INFO" | grep -o '"accessToken"\s*:\s*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')
    INSTANCE_URL=$(echo "$ORG_INFO" | grep -o '"instanceUrl"\s*:\s*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')
fi

if [ -z "$ACCESS_TOKEN" ] || [ -z "$INSTANCE_URL" ]; then
    echo "❌ Could not extract access token or instance URL"
    echo ""
    echo "Raw JSON response:"
    echo "$ORG_INFO"
    echo ""
    echo "💡 Tip: Install jq for better JSON parsing:"
    echo "  brew install jq  # macOS"
    echo "  apt install jq   # Linux"
    exit 1
fi

echo "✅ Access token retrieved"
echo ""
echo "Access Token: ${ACCESS_TOKEN:0:20}..."
echo "Instance URL: $INSTANCE_URL"
echo ""

# Ask if user wants to update .env
read -p "Update .env file? (y/n): " UPDATE_ENV

if [ "$UPDATE_ENV" = "y" ] || [ "$UPDATE_ENV" = "Y" ]; then
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        echo "Creating .env from template..."
        cp .env.example .env
    fi
    
    # Check if OAuth2 settings already exist
    if grep -q "^SF_ACCESS_TOKEN=" .env; then
        # Update existing
        sed -i.bak "s|^SF_ACCESS_TOKEN=.*|SF_ACCESS_TOKEN=$ACCESS_TOKEN|" .env
        sed -i.bak "s|^SF_INSTANCE_URL=.*|SF_INSTANCE_URL=$INSTANCE_URL|" .env
        rm .env.bak
        echo "✅ Updated existing OAuth2 settings in .env"
    else
        # Add new
        echo "" >> .env
        echo "# OAuth2 Authentication (added by get-token.sh)" >> .env
        echo "SF_ACCESS_TOKEN=$ACCESS_TOKEN" >> .env
        echo "SF_INSTANCE_URL=$INSTANCE_URL" >> .env
        echo "✅ Added OAuth2 settings to .env"
    fi
    
    echo ""
    echo "🎉 Ready to run!"
    echo ""
    echo "Try it:"
    echo "  npm start"
    echo ""
    echo "Or fetch specific objects:"
    echo "  SF_OBJECTS=Account,Contact npm start"
else
    echo ""
    echo "Add these to your .env file:"
    echo ""
    echo "SF_ACCESS_TOKEN=$ACCESS_TOKEN"
    echo "SF_INSTANCE_URL=$INSTANCE_URL"
fi

echo ""
echo "⏰ Note: Access tokens expire after ~2 hours"
echo "   Run this script again to get a fresh token"

