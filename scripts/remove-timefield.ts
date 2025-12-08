/**
 * Script to remove timeField from all existing object files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function removeTimeField() {
  const docDir = path.join(__dirname, '../src/doc/objects');
  
  let totalUpdated = 0;
  let totalSkipped = 0;
  
  console.log('Removing timeField from all object files...\n');
  
  try {
    // Read all object files
    const letters = await fs.readdir(docDir);
    
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
          
          // Check if has timeField
          if (objectData.timeField !== undefined) {
            // Remove timeField
            delete objectData.timeField;
            
            // Save updated file
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
            console.log(`✓ ${objectName}: Removed timeField`);
            totalUpdated++;
          } else {
            totalSkipped++;
          }
          
        } catch (error: any) {
          console.error(`❌ ${objectName}: ${error.message}`);
        }
      }
    }
    
    console.log(`\n✅ Complete!`);
    console.log(`   Removed timeField from: ${totalUpdated} objects`);
    console.log(`   Skipped (no timeField): ${totalSkipped} objects`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
removeTimeField().catch(console.error);

