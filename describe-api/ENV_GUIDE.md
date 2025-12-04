# Using .env File for Configuration

## Quick Start

1. **Copy the example file**:
   ```bash
   cd describe-api
   cp .env.example .env
   ```

2. **Edit `.env` with your Salesforce credentials**:
   ```bash
   nano .env
   # or
   code .env
   ```

3. **Run the tool**:
   ```bash
   npm start
   ```

## .env File Format

Your `.env` file should look like this:

```bash
# Salesforce Connection Configuration
SF_LOGIN_URL=https://login.salesforce.com
SF_USERNAME=your-username@example.com
SF_PASSWORD=your-password
SF_SECURITY_TOKEN=your-token

# Optional: Specific objects to fetch
SF_OBJECTS=Account,Contact,Opportunity

# Optional: Output directory
SF_OUTPUT_DIR=./schemas

# Optional: Batch size
SF_BATCH_SIZE=10
```

## Configuration Options

### Required

- **SF_USERNAME**: Your Salesforce username (email)
- **SF_PASSWORD**: Your Salesforce password

### Optional

- **SF_LOGIN_URL**: 
  - `https://login.salesforce.com` for production (default)
  - `https://test.salesforce.com` for sandbox
  
- **SF_SECURITY_TOKEN**: 
  - Required if your IP is not whitelisted
  - Get from: Setup → Personal Information → Reset Security Token
  
- **SF_OUTPUT_DIR**: 
  - Where to save the schema files
  - Default: `./schemas`
  
- **SF_OBJECTS**: 
  - Comma-separated list of specific objects to fetch
  - Leave empty or omit to fetch all objects
  - Example: `Account,Contact,Opportunity,Lead`
  
- **SF_BATCH_SIZE**: 
  - Number of objects to fetch before pausing
  - Default: `10`
  - Lower values = slower but more polite to the API

## Examples

### Production Org - All Objects

```bash
SF_LOGIN_URL=https://login.salesforce.com
SF_USERNAME=admin@mycompany.com
SF_PASSWORD=mySecurePassword123
SF_SECURITY_TOKEN=abc123XYZ456
SF_OUTPUT_DIR=./production-schemas
```

### Sandbox - Specific Objects

```bash
SF_LOGIN_URL=https://test.salesforce.com
SF_USERNAME=admin@mycompany.com.sandbox
SF_PASSWORD=myPassword
SF_OBJECTS=Account,Contact,Opportunity,Case,Lead
SF_OUTPUT_DIR=./sandbox-schemas
SF_BATCH_SIZE=5
```

### Development - Quick Test

```bash
SF_USERNAME=developer@mycompany.com
SF_PASSWORD=devPass123
SF_SECURITY_TOKEN=token456
SF_OBJECTS=Account,Contact
```

## Security Best Practices

1. **Never commit `.env` file to git**
   - Already in `.gitignore`
   - Contains sensitive credentials

2. **Use environment-specific files**
   ```bash
   .env.production    # Production credentials
   .env.sandbox       # Sandbox credentials
   .env.dev           # Development credentials
   ```

3. **Use different users for different purposes**
   - Read-only user for schema extraction
   - Avoid using admin credentials when possible

4. **Rotate security tokens regularly**
   - Reset from Setup → Personal Information → Reset Security Token

## Troubleshooting

### Authentication Failed

**Problem**: "INVALID_LOGIN: Invalid username, password, security token"

**Solutions**:
- Verify username and password are correct
- If using security token, ensure it's appended correctly (password + token)
- Check if you're using the correct login URL (production vs sandbox)
- Verify your IP isn't blocked

### Security Token Not Working

**Problem**: "INVALID_LOGIN" even with correct credentials

**Solutions**:
- Your IP might be whitelisted - try without security token
- Reset security token: Setup → Personal Information → Reset Security Token
- Check email for new security token
- Make sure there's no space between password and token

### Rate Limiting

**Problem**: Getting rate limit errors

**Solutions**:
- Reduce `SF_BATCH_SIZE` to a lower number (e.g., 5)
- Fetch specific objects instead of all objects
- Wait a few minutes between runs

## Advanced Usage

### Multiple Environments

Create separate .env files:

```bash
# Use specific env file
SF_USERNAME=user@example.com ... npm start

# Or load different .env file
node -r dotenv/config dist/cli-describe.js dotenv_config_path=.env.sandbox
```

### Override Specific Variables

```bash
# Use .env for most settings, override specific ones
SF_OBJECTS=Account,Contact npm start
```

### Check Current Configuration

The CLI will show you what configuration it's using when it runs.



