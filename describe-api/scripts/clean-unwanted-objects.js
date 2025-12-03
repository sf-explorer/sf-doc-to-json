#!/usr/bin/env node
/**
 * Script to clean up unwanted objects from doc/objects directory
 * Removes objects ending with: History, Event, Feed, Share
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOC_OBJECTS_DIR = path.join(__dirname, '../../doc/objects');

// Suffixes to remove
const UNWANTED_SUFFIXES = ['History', 'Event', 'Feed', 'Share'];

function cleanUnwantedObjects() {
  if (!fs.existsSync(DOC_OBJECTS_DIR)) {
    console.error(`❌ Directory not found: ${DOC_OBJECTS_DIR}`);
    process.exit(1);
  }

  let totalDeleted = 0;
  const deletedByType = {
    History: 0,
    Event: 0,
    Feed: 0,
    Share: 0,
  };

  console.log(`🔍 Scanning ${DOC_OBJECTS_DIR}...\n`);

  // Get all letter directories (A, B, C, etc.)
  const letterDirs = fs.readdirSync(DOC_OBJECTS_DIR)
    .filter(name => {
      const fullPath = path.join(DOC_OBJECTS_DIR, name);
      return fs.statSync(fullPath).isDirectory() && /^[A-Z]$/.test(name);
    });

  console.log(`📁 Found ${letterDirs.length} letter directories\n`);

  // Process each letter directory
  for (const letter of letterDirs) {
    const letterPath = path.join(DOC_OBJECTS_DIR, letter);
    const files = fs.readdirSync(letterPath)
      .filter(name => name.endsWith('.json'));

    for (const file of files) {
      const objectName = file.replace('.json', '');
      
      // Check if this object ends with any unwanted suffix
      for (const suffix of UNWANTED_SUFFIXES) {
        if (objectName.endsWith(suffix)) {
          const filePath = path.join(letterPath, file);
          
          try {
            fs.unlinkSync(filePath);
            deletedByType[suffix]++;
            totalDeleted++;
            console.log(`  🗑️  Deleted: ${letter}/${file}`);
          } catch (error) {
            console.error(`  ❌ Failed to delete ${letter}/${file}:`, error.message);
          }
          
          break; // Don't check other suffixes for this file
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Cleanup Summary:');
  console.log('='.repeat(60));
  console.log(`  History objects: ${deletedByType.History} deleted`);
  console.log(`  Event objects:   ${deletedByType.Event} deleted`);
  console.log(`  Feed objects:    ${deletedByType.Feed} deleted`);
  console.log(`  Share objects:   ${deletedByType.Share} deleted`);
  console.log('='.repeat(60));
  console.log(`  ✅ Total deleted: ${totalDeleted} files\n`);

  if (totalDeleted === 0) {
    console.log('✨ No unwanted objects found. Directory is clean!');
  }
}

// Run the cleanup
try {
  cleanUnwantedObjects();
} catch (error) {
  console.error('❌ Error during cleanup:', error);
  process.exit(1);
}

