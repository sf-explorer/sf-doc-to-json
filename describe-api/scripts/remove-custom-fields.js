#!/usr/bin/env node

/**
 * Remove custom fields from existing object files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanObjectFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    let modified = false;
    let removedCount = 0;
    
    // Process each object in the file
    for (const objectName in data) {
      const obj = data[objectName];
      
      if (obj.properties) {
        // Remove custom fields
        for (const propName in obj.properties) {
          if (propName.includes('__c') || propName.includes('__r')) {
            delete obj.properties[propName];
            modified = true;
            removedCount++;
          }
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return removedCount;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function cleanDirectory(dirPath) {
  let totalRemoved = 0;
  let filesModified = 0;
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      const result = cleanDirectory(fullPath);
      totalRemoved += result.removed;
      filesModified += result.files;
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      const removed = cleanObjectFile(fullPath);
      if (removed > 0) {
        filesModified++;
        totalRemoved += removed;
        console.log(`✓ ${path.basename(fullPath)}: removed ${removed} custom fields`);
      }
    }
  }
  
  return { removed: totalRemoved, files: filesModified };
}

// Main execution
const objectsDir = path.join(__dirname, '../../doc/objects');

console.log('Removing custom fields from object files...\n');

const result = cleanDirectory(objectsDir);

console.log(`\n✅ Removed ${result.removed} custom fields from ${result.files} files`);




