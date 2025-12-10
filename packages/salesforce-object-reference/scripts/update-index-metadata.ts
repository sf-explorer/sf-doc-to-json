#!/usr/bin/env tsx
/**
 * Script to update the index.json file with missing metadata from object files
 * Adds keyPrefix, label, and sourceUrl where they exist in object files but are missing in index
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOC_DIR = path.join(__dirname, '../src/doc');
const OBJECTS_DIR = path.join(DOC_DIR, 'objects');
const METADATA_DIR = path.join(DOC_DIR, 'metadata');
const INDEX_FILE = path.join(DOC_DIR, 'index.json');

interface ObjectData {
  [key: string]: {
    name?: string;
    description?: string;
    properties?: any;
    module?: string;
    keyPrefix?: string;
    label?: string;
    sourceUrl?: string;
    createable?: boolean;
    updateable?: boolean;
    deletable?: boolean;
    queryable?: boolean;
    searchable?: boolean;
  };
}

interface IndexEntry {
  cloud?: string;
  file?: string;
  description?: string;
  fieldCount?: number;
  sourceUrl?: string;
  clouds?: string[];
  keyPrefix?: string;
  label?: string;
  icon?: string;
  accessRules?: string;
}

interface Index {
  generated: string;
  version: string;
  totalObjects: number;
  totalClouds: number;
  objects: Record<string, IndexEntry>;
  clouds?: any;
}

// Get all object files from both objects and metadata directories
function getAllObjectFiles(): Array<{ path: string; dir: 'objects' | 'metadata' }> {
  const objectFiles: Array<{ path: string; dir: 'objects' | 'metadata' }> = [];
  
  function scanDirectory(dir: string, type: 'objects' | 'metadata') {
    if (!fs.existsSync(dir)) {
      return;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath, type);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        objectFiles.push({ path: fullPath, dir: type });
      }
    }
  }
  
  scanDirectory(OBJECTS_DIR, 'objects');
  scanDirectory(METADATA_DIR, 'metadata');
  
  return objectFiles.sort((a, b) => a.path.localeCompare(b.path));
}

// Get object name from file path
function getObjectNameFromPath(filePath: string): string {
  return path.basename(filePath, '.json');
}

interface UpdateStats {
  total: number;
  updated: number;
  byField: {
    keyPrefix: number;
    label: number;
    sourceUrl: number;
  };
}

// Main function
async function updateIndex() {
  console.log('🔄 Loading index...');
  const indexData: Index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  
  console.log('📂 Scanning object files...\n');
  const allObjectFiles = getAllObjectFiles();
  
  const stats: UpdateStats = {
    total: 0,
    updated: 0,
    byField: {
      keyPrefix: 0,
      label: 0,
      sourceUrl: 0
    }
  };
  
  const updatedObjects: string[] = [];
  
  for (const { path: filePath, dir } of allObjectFiles) {
    const objectName = getObjectNameFromPath(filePath);
    const indexEntry = indexData.objects[objectName];
    
    if (!indexEntry) {
      continue; // Skip if not in index at all
    }
    
    stats.total++;
    
    // Read the object file
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const objectData: ObjectData = JSON.parse(fileContent);
      const objectInfo = objectData[objectName];
      
      if (!objectInfo) {
        continue;
      }
      
      let updated = false;
      
      // Update keyPrefix if missing
      if (objectInfo.keyPrefix && !indexEntry.keyPrefix) {
        indexEntry.keyPrefix = objectInfo.keyPrefix;
        stats.byField.keyPrefix++;
        updated = true;
      }
      
      // Update label if missing
      if (objectInfo.label && !indexEntry.label) {
        indexEntry.label = objectInfo.label;
        stats.byField.label++;
        updated = true;
      }
      
      // Update sourceUrl if missing
      if (objectInfo.sourceUrl && !indexEntry.sourceUrl) {
        indexEntry.sourceUrl = objectInfo.sourceUrl;
        stats.byField.sourceUrl++;
        updated = true;
      }
      
      if (updated) {
        stats.updated++;
        updatedObjects.push(objectName);
      }
    } catch (err) {
      console.error(`❌ Error reading ${filePath}:`, err);
    }
  }
  
  console.log('📊 Update Statistics:');
  console.log(`   Total objects processed: ${stats.total}`);
  console.log(`   Objects updated: ${stats.updated}`);
  console.log(`   Fields added:`);
  console.log(`     - keyPrefix: ${stats.byField.keyPrefix}`);
  console.log(`     - label: ${stats.byField.label}`);
  console.log(`     - sourceUrl: ${stats.byField.sourceUrl}`);
  console.log();
  
  if (stats.updated > 0) {
    // Update the generated timestamp
    indexData.generated = new Date().toISOString();
    
    // Write the updated index back to file
    console.log('💾 Writing updated index...');
    fs.writeFileSync(INDEX_FILE, JSON.stringify(indexData, null, 2), 'utf-8');
    
    console.log('✅ Index updated successfully!');
    console.log();
    
    // Show sample of updated objects
    console.log('📝 Sample of updated objects:');
    for (const objName of updatedObjects.slice(0, 10)) {
      const entry = indexData.objects[objName];
      console.log(`   - ${objName}`);
      if (entry.keyPrefix) console.log(`       keyPrefix: ${entry.keyPrefix}`);
      if (entry.label) console.log(`       label: ${entry.label}`);
      if (entry.sourceUrl) console.log(`       sourceUrl: ${entry.sourceUrl.substring(0, 60)}...`);
    }
    
    if (updatedObjects.length > 10) {
      console.log(`   ... and ${updatedObjects.length - 10} more`);
    }
    
    // Verify DataflowNode specifically
    console.log();
    console.log('🔍 Verifying DataflowNode:');
    const dataflowNode = indexData.objects['DataflowNode'];
    if (dataflowNode) {
      console.log(JSON.stringify(dataflowNode, null, 2));
    } else {
      console.log('   ❌ DataflowNode not found in index');
    }
  } else {
    console.log('✅ No updates needed - index is already complete!');
  }
}

updateIndex().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

