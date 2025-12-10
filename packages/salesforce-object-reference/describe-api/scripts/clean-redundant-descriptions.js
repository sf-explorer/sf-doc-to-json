#!/usr/bin/env node
/**
 * Script to remove redundant/low-value descriptions from object JSON files
 * Removes descriptions that just repeat the field label with no additional information
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOC_OBJECTS_DIR = path.join(__dirname, '../../doc/objects');

/**
 * Convert a field name like "LastModifiedById" to "Last Modified By ID"
 */
function fieldNameToLabel(fieldName) {
  // Handle special cases
  const specialCases = {
    'ID': 'ID',
    'Id': 'ID',
    'URL': 'URL',
    'API': 'API'
  };
  
  // Split camelCase into words
  let label = fieldName
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')  // Handle consecutive capitals
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')      // Handle camelCase
    .split(' ')
    .map(word => {
      // Check special cases
      if (specialCases[word]) return specialCases[word];
      return word;
    })
    .join(' ');
  
  return label;
}

/**
 * Check if a description is redundant (just repeats the field label)
 * Very conservative - only removes if extremely similar
 */
function isRedundantDescription(fieldName, description) {
  if (!description) return false;
  
  const expectedLabel = fieldNameToLabel(fieldName);
  const cleanDesc = description.trim();
  
  // Only remove if it's an exact match (case-insensitive)
  if (cleanDesc.toLowerCase() === expectedLabel.toLowerCase()) return true;
  
  // Or exact match with "The" prefix
  if (cleanDesc.toLowerCase() === `the ${expectedLabel.toLowerCase()}`) return true;
  
  // That's it - be very conservative
  // If there's any other variation, keep it
  return false;
}

/**
 * Process a single object file
 */
function processObjectFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const obj = JSON.parse(content);
    
    // The structure is: { ObjectName: { properties: { ... } } }
    const objectName = Object.keys(obj)[0];
    if (!objectName || !obj[objectName] || !obj[objectName].properties) {
      return { removed: 0, file: path.basename(filePath) };
    }
    
    let removedCount = 0;
    
    // Process each field
    for (const [fieldName, fieldDef] of Object.entries(obj[objectName].properties)) {
      if (fieldDef.description && isRedundantDescription(fieldName, fieldDef.description)) {
        delete fieldDef.description;
        removedCount++;
      }
    }
    
    // Save if we made changes
    if (removedCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
    }
    
    return { removed: removedCount, file: path.basename(filePath) };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { removed: 0, file: path.basename(filePath), error: error.message };
  }
}

/**
 * Process all object files
 */
function cleanRedundantDescriptions() {
  console.log('🧹 Cleaning redundant descriptions from object files...\n');
  
  if (!fs.existsSync(DOC_OBJECTS_DIR)) {
    console.error(`❌ Directory not found: ${DOC_OBJECTS_DIR}`);
    process.exit(1);
  }

  let totalRemoved = 0;
  let filesModified = 0;
  let filesProcessed = 0;
  const modifiedFiles = [];

  // Get all letter directories
  const letterDirs = fs.readdirSync(DOC_OBJECTS_DIR)
    .filter(name => {
      const fullPath = path.join(DOC_OBJECTS_DIR, name);
      return fs.statSync(fullPath).isDirectory() && /^[A-Z]$/.test(name);
    })
    .sort();

  console.log(`📁 Found ${letterDirs.length} letter directories\n`);
  console.log('Processing files...\n');

  // Process each letter directory
  for (const letter of letterDirs) {
    const letterPath = path.join(DOC_OBJECTS_DIR, letter);
    const files = fs.readdirSync(letterPath)
      .filter(name => name.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(letterPath, file);
      const result = processObjectFile(filePath);
      
      filesProcessed++;
      if (result.removed > 0) {
        filesModified++;
        totalRemoved += result.removed;
        modifiedFiles.push({ letter, file, removed: result.removed });
        
        // Show progress every 10 files
        if (filesModified % 10 === 0) {
          console.log(`  📝 Modified ${filesModified} files so far...`);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Cleanup Summary:');
  console.log('='.repeat(60));
  console.log(`  Files processed:  ${filesProcessed}`);
  console.log(`  Files modified:   ${filesModified}`);
  console.log(`  Descriptions removed: ${totalRemoved}`);
  console.log('='.repeat(60));

  // Show sample of modified files
  if (modifiedFiles.length > 0) {
    console.log('\n📝 Sample of modified files (first 20):\n');
    modifiedFiles.slice(0, 20).forEach(({ letter, file, removed }) => {
      console.log(`  ${letter}/${file}: ${removed} descriptions removed`);
    });
    
    if (modifiedFiles.length > 20) {
      console.log(`  ... and ${modifiedFiles.length - 20} more files`);
    }
  }

  console.log('\n✨ Cleanup complete!\n');
  
  return { totalRemoved, filesModified, filesProcessed };
}

// Run the cleanup
try {
  cleanRedundantDescriptions();
} catch (error) {
  console.error('❌ Error during cleanup:', error);
  process.exit(1);
}

