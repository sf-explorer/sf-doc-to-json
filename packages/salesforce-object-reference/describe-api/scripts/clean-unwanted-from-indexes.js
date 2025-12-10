#!/usr/bin/env node
/**
 * Script to remove unwanted objects from index files
 * Removes objects ending with: History, Event, Feed, Share
 * Updates: doc/index.json and all doc/*-cloud.json files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOC_DIR = path.join(__dirname, '../../doc');
const MAIN_INDEX = path.join(DOC_DIR, 'index.json');

// Suffixes to remove
const UNWANTED_SUFFIXES = ['History', 'Event', 'Feed', 'Share'];

/**
 * Check if an object name should be removed
 */
function shouldRemove(objectName) {
  return UNWANTED_SUFFIXES.some(suffix => objectName.endsWith(suffix));
}

/**
 * Clean the main index.json file
 */
function cleanMainIndex() {
  console.log('📄 Cleaning main index.json...\n');
  
  if (!fs.existsSync(MAIN_INDEX)) {
    console.error(`❌ Main index not found: ${MAIN_INDEX}`);
    return 0;
  }

  const index = JSON.parse(fs.readFileSync(MAIN_INDEX, 'utf8'));
  const originalCount = Object.keys(index.objects || {}).length;
  const removedObjects = [];

  // Filter out unwanted objects
  const cleanedObjects = {};
  for (const [objectName, objectData] of Object.entries(index.objects || {})) {
    if (shouldRemove(objectName)) {
      removedObjects.push(objectName);
    } else {
      cleanedObjects[objectName] = objectData;
    }
  }

  // Update the index
  index.objects = cleanedObjects;
  index.totalObjects = Object.keys(cleanedObjects).length;
  index.generated = new Date().toISOString();

  // Save the updated index
  fs.writeFileSync(MAIN_INDEX, JSON.stringify(index, null, 2));

  const removedCount = originalCount - index.totalObjects;
  console.log(`  ✅ Main index cleaned:`);
  console.log(`     Original: ${originalCount} objects`);
  console.log(`     Cleaned:  ${index.totalObjects} objects`);
  console.log(`     Removed:  ${removedCount} objects\n`);

  return removedCount;
}

/**
 * Clean cloud-specific index files
 */
function cleanCloudIndexes() {
  console.log('☁️  Cleaning cloud-specific indexes...\n');
  
  const cloudFiles = fs.readdirSync(DOC_DIR)
    .filter(file => file.endsWith('-cloud.json') || file === 'core-salesforce.json');

  let totalRemovedFromClouds = 0;
  const cloudStats = {};

  for (const cloudFile of cloudFiles) {
    const cloudPath = path.join(DOC_DIR, cloudFile);
    const cloud = JSON.parse(fs.readFileSync(cloudPath, 'utf8'));
    
    const originalCount = cloud.objects ? cloud.objects.length : 0;
    const removedObjects = [];

    // Filter out unwanted objects
    if (Array.isArray(cloud.objects)) {
      cloud.objects = cloud.objects.filter(objectName => {
        if (shouldRemove(objectName)) {
          removedObjects.push(objectName);
          return false;
        }
        return true;
      });
    }

    // Update count
    cloud.objectCount = cloud.objects ? cloud.objects.length : 0;
    
    // Save the updated cloud index
    fs.writeFileSync(cloudPath, JSON.stringify(cloud, null, 2));

    const removedCount = originalCount - cloud.objectCount;
    totalRemovedFromClouds += removedCount;
    
    if (removedCount > 0) {
      cloudStats[cloudFile] = {
        original: originalCount,
        cleaned: cloud.objectCount,
        removed: removedCount
      };
      console.log(`  📦 ${cloudFile}:`);
      console.log(`     Removed: ${removedCount} objects`);
    }
  }

  console.log(`\n  ✅ Total removed from cloud indexes: ${totalRemovedFromClouds}\n`);
  return { totalRemovedFromClouds, cloudStats };
}

/**
 * Clean other index files (like metadata.json)
 */
function cleanOtherIndexes() {
  console.log('📋 Checking other index files...\n');
  
  const otherIndexFiles = [
    'metadata.json',
    'tooling-api.json',
    'loyalty.json',
    'feedback-management.json',
    'field-service-lightning.json',
    'revenue-lifecycle-management.json',
    'scheduler.json'
  ];

  let totalRemoved = 0;

  for (const indexFile of otherIndexFiles) {
    const indexPath = path.join(DOC_DIR, indexFile);
    
    if (!fs.existsSync(indexPath)) {
      continue;
    }

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    // Handle different index formats
    if (Array.isArray(index.objects)) {
      // Array format
      const originalCount = index.objects.length;
      index.objects = index.objects.filter(obj => !shouldRemove(obj));
      const removedCount = originalCount - index.objects.length;
      
      if (removedCount > 0) {
        index.objectCount = index.objects.length;
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
        console.log(`  📦 ${indexFile}: Removed ${removedCount} objects`);
        totalRemoved += removedCount;
      }
    } else if (typeof index.objects === 'object') {
      // Object format
      const originalCount = Object.keys(index.objects).length;
      const cleanedObjects = {};
      
      for (const [name, data] of Object.entries(index.objects)) {
        if (!shouldRemove(name)) {
          cleanedObjects[name] = data;
        }
      }
      
      const removedCount = originalCount - Object.keys(cleanedObjects).length;
      
      if (removedCount > 0) {
        index.objects = cleanedObjects;
        index.objectCount = Object.keys(cleanedObjects).length;
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
        console.log(`  📦 ${indexFile}: Removed ${removedCount} objects`);
        totalRemoved += removedCount;
      }
    }
  }

  if (totalRemoved > 0) {
    console.log(`\n  ✅ Total removed from other indexes: ${totalRemoved}\n`);
  } else {
    console.log(`  ✅ No unwanted objects found in other indexes\n`);
  }

  return totalRemoved;
}

/**
 * Main function
 */
function cleanAllIndexes() {
  console.log('🧹 Cleaning all index files...\n');
  console.log('='.repeat(60) + '\n');

  const mainIndexRemoved = cleanMainIndex();
  const { totalRemovedFromClouds, cloudStats } = cleanCloudIndexes();
  const otherIndexRemoved = cleanOtherIndexes();

  console.log('='.repeat(60));
  console.log('📊 Final Summary:');
  console.log('='.repeat(60));
  console.log(`  Main index (index.json):     ${mainIndexRemoved} objects removed`);
  console.log(`  Cloud indexes:               ${totalRemovedFromClouds} objects removed`);
  console.log(`  Other indexes:               ${otherIndexRemoved} objects removed`);
  console.log('='.repeat(60));
  console.log(`  ✅ Total removed from all indexes: ${mainIndexRemoved + totalRemovedFromClouds + otherIndexRemoved}\n`);

  // Show detailed cloud breakdown
  if (Object.keys(cloudStats).length > 0) {
    console.log('📦 Cloud Index Breakdown:');
    console.log('='.repeat(60));
    for (const [cloudFile, stats] of Object.entries(cloudStats)) {
      console.log(`  ${cloudFile}:`);
      console.log(`    Before: ${stats.original} | After: ${stats.cleaned} | Removed: ${stats.removed}`);
    }
    console.log('='.repeat(60) + '\n');
  }

  console.log('✨ All indexes cleaned successfully!\n');
}

// Run the cleanup
try {
  cleanAllIndexes();
} catch (error) {
  console.error('❌ Error during cleanup:', error);
  process.exit(1);
}










