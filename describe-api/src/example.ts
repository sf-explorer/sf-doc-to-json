/**
 * Example: Fetch Salesforce object schemas using Describe API
 */

import { config } from 'dotenv';
import { fetchAndConvert, fetchAndSave } from './index.js';

// Load environment variables from .env file
config();

async function example1_FetchSpecificObjects() {
  console.log('Example 1: Fetch specific objects\n');
  
  if (!process.env.SF_USERNAME || !process.env.SF_PASSWORD) {
    console.error('Please set SF_USERNAME and SF_PASSWORD in your .env file');
    process.exit(1);
  }

  const schemas = await fetchAndConvert({
    connection: {
      loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
      username: process.env.SF_USERNAME,
      password: process.env.SF_PASSWORD,
      securityToken: process.env.SF_SECURITY_TOKEN,
    },
    objects: ['Account', 'Contact', 'Opportunity'],
  });

  console.log('\nFetched schemas:');
  for (const [objectName, schema] of Object.entries(schemas)) {
    console.log(`\n${objectName}:`);
    console.log(`  Title: ${schema.title}`);
    console.log(`  Properties: ${Object.keys(schema.properties).length}`);
    console.log(`  Required: ${schema.required?.length || 0}`);
    
    // Show a sample property
    const firstProp = Object.keys(schema.properties)[0];
    console.log(`  Sample property (${firstProp}):`, schema.properties[firstProp]);
  }
}

async function example2_SaveAllObjects() {
  console.log('Example 2: Fetch and save all objects\n');
  
  if (!process.env.SF_USERNAME || !process.env.SF_PASSWORD) {
    console.error('Please set SF_USERNAME and SF_PASSWORD in your .env file');
    process.exit(1);
  }

  await fetchAndSave({
    connection: {
      loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
      username: process.env.SF_USERNAME,
      password: process.env.SF_PASSWORD,
      securityToken: process.env.SF_SECURITY_TOKEN,
    },
    outputDir: './schemas',
    batchSize: 5, // Fetch 5 at a time
  });
}

async function example3_ShowEnrichedSchema() {
  console.log('Example 3: Show enriched schema with references and enums\n');
  
  if (!process.env.SF_USERNAME || !process.env.SF_PASSWORD) {
    console.error('Please set SF_USERNAME and SF_PASSWORD in your .env file');
    process.exit(1);
  }

  const schemas = await fetchAndConvert({
    connection: {
      loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
      username: process.env.SF_USERNAME,
      password: process.env.SF_PASSWORD,
      securityToken: process.env.SF_SECURITY_TOKEN,
    },
    objects: ['Account'],
  });

  const accountSchema = schemas['Account'];
  
  console.log('\nAccount Schema:');
  console.log('==============\n');
  
  // Show fields with references
  console.log('Reference Fields (Lookups):');
  for (const [fieldName, prop] of Object.entries(accountSchema.properties)) {
    if (prop['x-object']) {
      console.log(`  ${fieldName} -> ${prop['x-object']}`);
    }
    if (prop['x-objects']) {
      console.log(`  ${fieldName} -> [${prop['x-objects'].join(', ')}] (polymorphic)`);
    }
  }
  
  // Show picklist fields with enum values
  console.log('\nPicklist Fields:');
  for (const [fieldName, prop] of Object.entries(accountSchema.properties)) {
    if (prop.format === 'enum' && prop.enum) {
      console.log(`  ${fieldName}:`);
      console.log(`    Values: ${prop.enum.join(', ')}`);
    }
  }
  
  // Show metadata
  console.log('\nSalesforce Metadata:');
  if (accountSchema['x-salesforce']) {
    console.log(`  Key Prefix: ${accountSchema['x-salesforce'].keyPrefix}`);
    console.log(`  Createable: ${accountSchema['x-salesforce'].createable}`);
    console.log(`  Updateable: ${accountSchema['x-salesforce'].updateable}`);
    console.log(`  Deletable: ${accountSchema['x-salesforce'].deletable}`);
  }
}

// Run examples
const exampleNumber = process.argv[2] || '1';

switch (exampleNumber) {
  case '1':
    example1_FetchSpecificObjects().catch(console.error);
    break;
  case '2':
    example2_SaveAllObjects().catch(console.error);
    break;
  case '3':
    example3_ShowEnrichedSchema().catch(console.error);
    break;
  default:
    console.log('Usage: npm run example [1|2|3]');
    process.exit(1);
}

