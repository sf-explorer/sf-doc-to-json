/**
 * Script to add nameField to all existing object files
 * This reads from Salesforce Describe API and updates the JSON files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { SalesforceDescribeClient } from '../describe-api/dist/client.js';
import type { SalesforceConnection } from '../describe-api/dist/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read connection from environment
const connection: SalesforceConnection = {
  loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
  accessToken: process.env.SF_ACCESS_TOKEN,
  instanceUrl: process.env.SF_INSTANCE_URL,
};

async function addNameField() {
  const docDir = path.join(__dirname, '../src/doc/objects');
  
  console.log('Connecting to Salesforce...');
  const client = new SalesforceDescribeClient();
  
  try {
    await client.connect(connection);
    console.log('Connected successfully!\n');
    
    // Read all object files
    const letters = await fs.readdir(docDir);
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    for (const letter of letters) {
      const letterPath = path.join(docDir, letter);
      const stat = await fs.stat(letterPath);
      
      if (!stat.isDirectory()) continue;
      
      const files = await fs.readdir(letterPath);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const objectName = file.replace('.json', '');
        const filePath = path.join(letterPath, file);
        
        try {
          // Read existing file
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          const objectData = data[objectName];
          
          if (!objectData) {
            console.log(`⚠️  ${objectName}: No object data found in file`);
            totalSkipped++;
            continue;
          }
          
          // Check if already has nameField
          if (objectData.nameField !== undefined) {
            console.log(`⏭️  ${objectName}: Already has nameField`);
            totalSkipped++;
            continue;
          }
          
          // Fetch from Salesforce
          console.log(`🔍 ${objectName}: Fetching describe info...`);
          const describe = await client.describeObject(objectName);
          
          let updated = false;
          
          // Add nameField if present
          if (describe.nameFields && describe.nameFields.length > 0) {
            objectData.nameField = describe.nameFields[0];
            console.log(`   ✓ Added nameField: ${describe.nameFields[0]}`);
            updated = true;
          }
          
          if (updated) {
            // Save updated file
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
            totalUpdated++;
          } else {
            console.log(`   ℹ️  No nameField available`);
            totalSkipped++;
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error: any) {
          console.error(`❌ ${objectName}: ${error.message}`);
          totalErrors++;
        }
      }
    }
    
    console.log(`\n✅ Complete!`);
    console.log(`   Updated: ${totalUpdated}`);
    console.log(`   Skipped: ${totalSkipped}`);
    console.log(`   Errors: ${totalErrors}`);
    
  } finally {
    client.disconnect();
  }
}

// Run the script
addNameField().catch(console.error);

