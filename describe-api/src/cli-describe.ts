#!/usr/bin/env node
/**
 * CLI tool for fetching Salesforce object schemas using Describe API
 */

import { config } from 'dotenv';
import { fetchAndSave } from './runner.js';
import type { SalesforceConnection } from './types.js';

// Load environment variables from .env file
config();

async function main() {
  const args = process.argv.slice(2);
  
  // Get configuration from environment variables or command line
  const sfConfig: SalesforceConnection = {
    loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
    username: process.env.SF_USERNAME || args[0],
    password: process.env.SF_PASSWORD || args[1],
    securityToken: process.env.SF_SECURITY_TOKEN || args[2],
    // OAuth2 options
    accessToken: process.env.SF_ACCESS_TOKEN,
    instanceUrl: process.env.SF_INSTANCE_URL,
    clientId: process.env.SF_CLIENT_ID,
    clientSecret: process.env.SF_CLIENT_SECRET,
    redirectUri: process.env.SF_REDIRECT_URI,
  };

  // Check if we have valid authentication
  const hasUsernamePassword = sfConfig.username && sfConfig.password;
  const hasOAuth2Token = sfConfig.accessToken && sfConfig.instanceUrl;
  const hasOAuth2Client = sfConfig.clientId && sfConfig.clientSecret;

  if (!hasUsernamePassword && !hasOAuth2Token && !hasOAuth2Client) {
    console.error(`
Usage: sf-describe-fetch [username] [password] [securityToken]

Or create a .env file (copy from .env.example):

METHOD 1 - OAuth2 Access Token (Recommended - works when SOAP is disabled):
  SF_ACCESS_TOKEN=your-access-token
  SF_INSTANCE_URL=https://your-instance.salesforce.com

  Get access token using Salesforce CLI:
  sf org display --target-org your-org --json

METHOD 2 - Username/Password (Traditional - may be disabled):
  SF_LOGIN_URL=https://login.salesforce.com
  SF_USERNAME=your-username@example.com
  SF_PASSWORD=your-password
  SF_SECURITY_TOKEN=your-token

Additional options:
  SF_OUTPUT_DIR (optional, defaults to ../src/doc when SF_MERGE_WITH_DOCS=true, else ./schemas)
  SF_MERGE_WITH_DOCS (optional, set to 'true' to merge with existing doc/objects files)
  SF_OBJECTS (optional, comma-separated list of specific objects to fetch)
  SF_BATCH_SIZE (optional, defaults to 10)

Example .env file with OAuth2:
  SF_ACCESS_TOKEN=00D...xyz
  SF_INSTANCE_URL=https://mycompany.my.salesforce.com
  SF_OBJECTS=Account,Contact,Opportunity

Example .env file with username/password:
  SF_USERNAME=user@example.com
  SF_PASSWORD=mypassword
  SF_SECURITY_TOKEN=abc123xyz

If you get "SOAP API login() is disabled" error, use OAuth2 method (Method 1).
`);
    process.exit(1);
  }

  const mergeWithDocs = process.env.SF_MERGE_WITH_DOCS === 'true';
  // When merging with docs, default to ../src/doc, otherwise use ./schemas
  const defaultOutputDir = mergeWithDocs ? '../src/doc' : './schemas';
  const outputDir = process.env.SF_OUTPUT_DIR || defaultOutputDir;
  const objectsStr = process.env.SF_OBJECTS;
  const objects = objectsStr ? objectsStr.split(',').map(s => s.trim()) : undefined;
  const batchSize = process.env.SF_BATCH_SIZE ? parseInt(process.env.SF_BATCH_SIZE) : 10;
  const resume = process.env.SF_RESUME !== 'false'; // Default to true
  const startFromIndex = process.env.SF_START_FROM_INDEX ? parseInt(process.env.SF_START_FROM_INDEX) : undefined;
  const skipCustomObjects = process.env.SF_SKIP_CUSTOM !== 'false'; // Default to true

  try {
    await fetchAndSave({
      connection: sfConfig,
      outputDir,
      objects,
      batchSize,
      includeMetadata: true,
      mergeWithDocs,
      resume,
      startFromIndex,
      skipCustomObjects,
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

