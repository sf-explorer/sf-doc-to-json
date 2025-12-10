#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOC_DIR = path.join(__dirname, '../src/doc');
const OBJECTS_DIR = path.join(DOC_DIR, 'objects');
const INDEX_FILE = path.join(DOC_DIR, 'index.json');

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
}

interface Index {
  generated: string;
  version: string;
  totalObjects: number;
  totalClouds: number;
  objects: Record<string, IndexEntry>;
  clouds?: any[];
}

// Get all object files
function getAllObjectFiles(): string[] {
  const objectFiles: string[] = [];
  
  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Get relative path from objects dir
        const relativePath = path.relative(OBJECTS_DIR, fullPath);
        objectFiles.push(relativePath);
      }
    }
  }
  
  scanDirectory(OBJECTS_DIR);
  return objectFiles.sort();
}

// Get object name from file path
function getObjectNameFromPath(filePath: string): string {
  return path.basename(filePath, '.json');
}

// Main function
function findMissingObjects() {
  console.log('Loading index...');
  const indexData: Index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  
  console.log('Scanning object files...');
  const allObjectFiles = getAllObjectFiles();
  
  console.log(`\nTotal object files found: ${allObjectFiles.length}`);
  console.log(`Total objects in index: ${Object.keys(indexData.objects).length}`);
  console.log(`Index reports total objects: ${indexData.totalObjects}\n`);
  
  // Find missing objects
  const missingObjects: string[] = [];
  const filePathToObjectName = new Map<string, string>();
  
  for (const filePath of allObjectFiles) {
    const objectName = getObjectNameFromPath(filePath);
    filePathToObjectName.set(filePath, objectName);
    
    if (!indexData.objects[objectName]) {
      missingObjects.push(objectName);
    }
  }
  
  if (missingObjects.length === 0) {
    console.log('✅ All objects are in the index!');
  } else {
    console.log(`❌ Found ${missingObjects.length} missing objects:\n`);
    
    // Group by first letter for easier viewing
    const grouped = new Map<string, string[]>();
    for (const obj of missingObjects) {
      const firstLetter = obj[0].toUpperCase();
      if (!grouped.has(firstLetter)) {
        grouped.set(firstLetter, []);
      }
      grouped.get(firstLetter)!.push(obj);
    }
    
    // Display grouped results
    for (const [letter, objects] of Array.from(grouped.entries()).sort()) {
      console.log(`${letter}: ${objects.length} objects`);
      for (const obj of objects) {
        const filePath = Array.from(filePathToObjectName.entries())
          .find(([_, name]) => name === obj)?.[0] || '';
        console.log(`  - ${obj} (objects/${filePath})`);
      }
      console.log();
    }
    
    // Show a sample of the actual data from one missing object
    if (missingObjects.length > 0) {
      const sampleObj = missingObjects[0];
      const sampleFilePath = Array.from(filePathToObjectName.entries())
        .find(([_, name]) => name === sampleObj)?.[0] || '';
      const fullPath = path.join(OBJECTS_DIR, sampleFilePath);
      
      console.log(`\n📄 Sample data from ${sampleObj}:`);
      try {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...\n');
      } catch (err) {
        console.log(`Error reading file: ${err}\n`);
      }
    }
  }
  
  // Check for orphaned index entries (in index but file doesn't exist)
  const orphanedEntries: string[] = [];
  for (const [objectName, entry] of Object.entries(indexData.objects)) {
    if (entry.file && entry.file.startsWith('objects/')) {
      const filePath = path.join(DOC_DIR, entry.file);
      if (!fs.existsSync(filePath)) {
        orphanedEntries.push(objectName);
      }
    }
  }
  
  if (orphanedEntries.length > 0) {
    console.log(`\n⚠️  Found ${orphanedEntries.length} orphaned index entries (no file exists):`);
    for (const obj of orphanedEntries.slice(0, 10)) {
      console.log(`  - ${obj}`);
    }
    if (orphanedEntries.length > 10) {
      console.log(`  ... and ${orphanedEntries.length - 10} more`);
    }
  }
}

findMissingObjects();

