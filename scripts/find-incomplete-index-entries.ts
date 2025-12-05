#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOC_DIR = path.join(__dirname, '../src/doc');
const OBJECTS_DIR = path.join(DOC_DIR, 'objects');
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
}

interface Index {
  generated: string;
  version: string;
  totalObjects: number;
  totalClouds: number;
  objects: Record<string, IndexEntry>;
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
        objectFiles.push(fullPath);
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

interface MissingFieldsIssue {
  objectName: string;
  filePath: string;
  missingInIndex: string[];
  objectData: any;
  indexData: IndexEntry;
}

// Main function
function findIncompleteEntries() {
  console.log('Loading index...');
  const indexData: Index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  
  console.log('Scanning object files...\n');
  const allObjectFiles = getAllObjectFiles();
  
  const issues: MissingFieldsIssue[] = [];
  const importantFields = ['keyPrefix', 'label', 'sourceUrl'];
  
  for (const filePath of allObjectFiles) {
    const objectName = getObjectNameFromPath(filePath);
    const indexEntry = indexData.objects[objectName];
    
    if (!indexEntry) {
      continue; // Skip if not in index at all
    }
    
    // Read the object file
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const objectData: ObjectData = JSON.parse(fileContent);
      const objectInfo = objectData[objectName];
      
      if (!objectInfo) {
        continue;
      }
      
      // Check for missing fields
      const missingFields: string[] = [];
      
      for (const field of importantFields) {
        if (objectInfo[field as keyof typeof objectInfo] && !indexEntry[field as keyof IndexEntry]) {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        issues.push({
          objectName,
          filePath: path.relative(DOC_DIR, filePath),
          missingInIndex: missingFields,
          objectData: objectInfo,
          indexData: indexEntry
        });
      }
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err);
    }
  }
  
  console.log(`Found ${issues.length} objects with incomplete index entries\n`);
  
  if (issues.length > 0) {
    // Group by missing fields
    const byMissingFields = new Map<string, MissingFieldsIssue[]>();
    
    for (const issue of issues) {
      const key = issue.missingInIndex.sort().join(',');
      if (!byMissingFields.has(key)) {
        byMissingFields.set(key, []);
      }
      byMissingFields.get(key)!.push(issue);
    }
    
    console.log('Grouped by missing fields:\n');
    for (const [fields, issueList] of Array.from(byMissingFields.entries()).sort()) {
      console.log(`Missing [${fields}]: ${issueList.length} objects`);
      for (const issue of issueList.slice(0, 5)) {
        console.log(`  - ${issue.objectName}`);
        for (const field of issue.missingInIndex) {
          const value = issue.objectData[field];
          if (value) {
            console.log(`      ${field}: ${JSON.stringify(value).substring(0, 80)}`);
          }
        }
      }
      if (issueList.length > 5) {
        console.log(`  ... and ${issueList.length - 5} more`);
      }
      console.log();
    }
    
    // Show a specific example
    console.log('\n📄 Example: DataflowNode');
    const dataflowIssue = issues.find(i => i.objectName === 'DataflowNode');
    if (dataflowIssue) {
      console.log('Missing fields:', dataflowIssue.missingInIndex);
      console.log('\nObject file has:');
      for (const field of dataflowIssue.missingInIndex) {
        console.log(`  ${field}: ${JSON.stringify(dataflowIssue.objectData[field])}`);
      }
      console.log('\nIndex entry:');
      console.log(JSON.stringify(dataflowIssue.indexData, null, 2));
    }
  } else {
    console.log('✅ All objects in the index have complete information!');
  }
}

findIncompleteEntries();

