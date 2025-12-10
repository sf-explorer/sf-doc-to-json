#!/usr/bin/env node

/**
 * Clean up minimum/maximum constraints from existing object files
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
    
    // Process each object in the file
    for (const objectName in data) {
      const obj = data[objectName];
      
      if (obj.properties) {
        // Clean each property
        for (const propName in obj.properties) {
          const prop = obj.properties[propName];
          
          if (prop.minimum !== undefined) {
            delete prop.minimum;
            modified = true;
          }
          
          if (prop.maximum !== undefined) {
            delete prop.maximum;
            modified = true;
          }
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function cleanDirectory(dirPath) {
  let cleanedCount = 0;
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      cleanedCount += cleanDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      if (cleanObjectFile(fullPath)) {
        cleanedCount++;
        console.log(`✓ Cleaned ${path.basename(fullPath)}`);
      }
    }
  }
  
  return cleanedCount;
}

// Main execution
const objectsDir = path.join(__dirname, '../../doc/objects');

console.log('Cleaning minimum/maximum constraints from object files...\n');

const totalCleaned = cleanDirectory(objectsDir);

console.log(`\n✅ Cleaned ${totalCleaned} files`);

