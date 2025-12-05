# OAuth2 Authentication Setup

## Problem: SOAP API Login Disabled

If you're seeing this error:
```
Error: INVALID_OPERATION: SOAP API login() is disabled by default in this org
```

Your Salesforce org has disabled SOAP API login for security. You need to use OAuth2 authentication instead.

## Solution: Get an Access Token

### Method 1: Using Salesforce CLI (Easiest)

1. **Install Salesforce CLI** (if not already installed):
   ```bash
   npm install -g @salesforce/cli
   ```

2. **Login to your org**:
   ```bash
   # For production
   sf org login web --alias my-org
   
   # For sandbox
   sf org login web --alias my-sandbox --instance-url https://test.salesforce.com
   ```

3. **Get the access token**:
   ```bash
   sf org display --target-org my-org --json
   ```

4. **Copy the access token from the output**:
   ```json
   {
     "result": {
       "accessToken": "00D...xyz",
       "instanceUrl": "https://mycompany.my.salesforce.com",
       ...
     }
   }
   ```

5. **Add to your .env file**:
   ```bash
   SF_ACCESS_TOKEN=00D...xyz
   SF_INSTANCE_URL=https://mycompany.my.salesforce.com
   ```

### Method 2: Using Workbench

1. Go to https://workbench.developerforce.com/
2. Login with your Salesforce credentials
3. Select: **utilities** → **REST Explorer**
4. Look in the browser's developer console (Network tab)
5. Find the `Authorization` header in any request
6. Copy the Bearer token

### Method 3: Manual OAuth2 Flow (Advanced)

1. **Create a Connected App** in Salesforce:
   - Setup → App Manager → New Connected App
   - Enable OAuth Settings
   - Callback URL: `http://localhost:3000/callback`
   - Selected OAuth Scopes: `api`, `refresh_token`
   - Save and get Consumer Key and Secret

2. **Get authorization code**:
   - Visit: `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/callback`
   - Login and approve
   - Copy the `code` from the redirect URL

3. **Exchange for access token**:
   ```bash
   curl -X POST https://login.salesforce.com/services/oauth2/token \
     -d "grant_type=authorization_code" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=http://localhost:3000/callback" \
     -d "code=YOUR_CODE"
   ```

## Update Your .env File

Replace username/password authentication with OAuth2:

**Before** (doesn't work with SOAP disabled):
```bash
SF_USERNAME=user@example.com
SF_PASSWORD=mypassword
SF_SECURITY_TOKEN=abc123
```

**After** (works with SOAP disabled):
```bash
SF_ACCESS_TOKEN=00D...xyz
SF_INSTANCE_URL=https://mycompany.my.salesforce.com
```

## Full .env Example

```bash
# OAuth2 Authentication (Recommended)
SF_ACCESS_TOKEN=00Dxx0000000000ABC123xyz456789
SF_INSTANCE_URL=https://mycompany.my.salesforce.com

# Optional: Specific objects to fetch
SF_OBJECTS=Account,Contact,Opportunity

# Optional: Output directory
SF_OUTPUT_DIR=./schemas

# Optional: Batch size
SF_BATCH_SIZE=10
```

## Run the Tool

Once your `.env` is configured:

```bash
npm start
```

Or:

```bash
SF_OBJECTS=Account,Contact npm start
```

## Access Token Expiration

Access tokens expire after some time (usually 2 hours). When it expires:

1. **Get a new token** using Salesforce CLI:
   ```bash
   sf org display --target-org my-org --json
   ```

2. **Update your .env** with the new token

3. **Run again**

## Tips

- **Use session ID** from an active Salesforce session (lasts longer)
- **Refresh tokens** can be used to get new access tokens automatically
- **Connected Apps** allow programmatic token refresh
- Consider using **JWT Bearer Flow** for unattended scripts

## Still Having Issues?

Make sure:
- ✅ Access token is valid (not expired)
- ✅ Instance URL is correct (includes https://)
- ✅ Your user has API access enabled
- ✅ Your IP is not blocked
- ✅ API limits are not exceeded





