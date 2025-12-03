/**
 * High-level functions to fetch and convert Salesforce objects
 */

import * as fs from 'fs';
import * as path from 'path';
import { SalesforceDescribeClient } from './client.js';
import { convertToJsonSchema, convertMultipleToJsonSchema } from './converter.js';
import { saveMergedToDocStructure } from './merger.js';
import { loadProgress, shouldResume, clearProgress } from './progress.js';
import type { SalesforceConnection, JsonSchema, DescribeSObjectResult } from './types.js';

export interface FetchOptions {
  connection: SalesforceConnection;
  objects?: string[]; // Specific objects to fetch, or all if not specified
  outputDir?: string; // Directory to save files
  includeMetadata?: boolean; // Include Salesforce metadata in schema
  batchSize?: number; // Batch size for rate limiting
  mergeWithDocs?: boolean; // Merge with existing doc/objects structure (preserves descriptions)
  resume?: boolean; // Resume from last saved progress
  startFromIndex?: number; // Start from specific index (manual override)
  skipCustomObjects?: boolean; // Skip custom objects (__c suffix)
}

/**
 * Fetch object schemas from Salesforce and convert to JSON Schema
 */
export async function fetchAndConvert(
  options: FetchOptions
): Promise<Record<string, JsonSchema>> {
  const client = new SalesforceDescribeClient();
  
  try {
    console.log('Connecting to Salesforce...');
    await client.connect(options.connection);
    
    let describes;
    
    if (options.objects && options.objects.length > 0) {
      console.log(`Fetching ${options.objects.length} specific objects...`);
      describes = await Promise.all(
        options.objects.map(obj => client.describeObject(obj))
      );
    } else {
      console.log('Fetching all objects...');
      describes = await client.describeAllObjects(
        options.batchSize || 10,
        (current, total, objectName) => {
          console.log(`Progress: ${current}/${total} - ${objectName}`);
        }
      );
    }
    
    console.log(`Converting ${describes.length} objects to JSON Schema...`);
    const schemas = convertMultipleToJsonSchema(
      describes,
      options.includeMetadata ?? true
    );
    
    return schemas;
  } finally {
    client.disconnect();
  }
}

/**
 * Fetch object schemas and save them to files
 */
export async function fetchAndSave(options: FetchOptions): Promise<void> {
  if (!options.outputDir) {
    throw new Error('outputDir is required for fetchAndSave');
  }

  const client = new SalesforceDescribeClient();
  
  try {
    console.log('Connecting to Salesforce...');
    await client.connect(options.connection);
    
    // Ensure output directory exists
    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    let describes: DescribeSObjectResult[];
    
    if (options.objects && options.objects.length > 0) {
      console.log(`Fetching ${options.objects.length} specific objects...`);
      describes = await Promise.all(
        options.objects.map(obj => client.describeObject(obj))
      );
      
      // Save each one
      console.log(`Saving ${describes.length} schemas...`);
      for (const describe of describes) {
        const schema = convertToJsonSchema(describe, options.includeMetadata ?? true);
        
        if (options.mergeWithDocs) {
          saveMergedToDocStructure(schema, options.outputDir);
        } else {
          saveSchema(schema, describe, options.outputDir, options.includeMetadata ?? true);
        }
      }
    } else {
      // Fetch all objects with incremental saving
      console.log('Fetching all objects...');
      if (options.mergeWithDocs) {
        console.log('⚠️  Merging with existing doc/objects structure - descriptions will be preserved!');
      }
      
      // Check for resume capability
      let startIndex = options.startFromIndex || 0;
      
      if (options.resume && shouldResume(options.outputDir)) {
        const progress = loadProgress(options.outputDir);
        if (progress) {
          console.log(`\n📍 Found previous progress:`);
          console.log(`   Last processed: ${progress.lastProcessedObject} (index ${progress.lastProcessedIndex})`);
          console.log(`   Processed: ${progress.processedCount}/${progress.totalObjects}`);
          console.log(`   Last updated: ${new Date(progress.lastUpdatedAt).toLocaleString()}`);
          console.log(`\n🔄 Resuming from index ${progress.lastProcessedIndex + 1}...\n`);
          startIndex = progress.lastProcessedIndex + 1;
        }
      } else if (startIndex > 0) {
        console.log(`\n▶️  Starting from index ${startIndex} (manual override)\n`);
      }
      
      // Clear old progress if starting fresh
      if (startIndex === 0) {
        clearProgress(options.outputDir);
      }
      
      await client.describeAllObjectsWithSave(
        options.outputDir,
        options.includeMetadata ?? true,
        options.batchSize || 10,
        options.mergeWithDocs ?? false,
        startIndex,
        options.skipCustomObjects ?? false,
        (current, total, objectName, skipped) => {
          if (skipped) {
            console.log(`Progress: ${current}/${total} - ${objectName} (skipped - custom)`);
          } else {
            console.log(`Progress: ${current}/${total} - ${objectName}`);
          }
        }
      );
    }

    console.log('Done!');
  } finally {
    client.disconnect();
  }
}

/**
 * Save a single schema to a file
 */
function saveSchema(
  schema: JsonSchema,
  describe: DescribeSObjectResult,
  outputDir: string,
  includeMetadata: boolean
): void {
  // Organize by first letter
  const firstLetter = describe.name.charAt(0).toUpperCase();
  const letterDir = path.join(outputDir, firstLetter);
  
  if (!fs.existsSync(letterDir)) {
    fs.mkdirSync(letterDir, { recursive: true });
  }
  
  const filePath = path.join(letterDir, `${describe.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(schema, null, 2));
}

