/**
 * Convenience functions for fetching and saving metadata types
 */

import { SalesforceMetadataClient } from './metadata-client.js';
import type { SalesforceConnection } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export interface FetchMetadataOptions {
  connection: SalesforceConnection;
  outputDir?: string;
  saveAsCloud?: boolean;
}

/**
 * Fetch metadata types and return as schemas
 */
export async function fetchMetadataSchemas(
  options: FetchMetadataOptions
): Promise<Record<string, any>> {
  const client = new SalesforceMetadataClient();
  
  try {
    console.log('Connecting to Salesforce...');
    await client.connect(options.connection);
    
    console.log('Fetching metadata types...');
    const schemas = await client.convertToSchemas();
    
    console.log(`Fetched ${Object.keys(schemas).length} metadata types`);
    
    return schemas;
  } finally {
    client.disconnect();
  }
}

/**
 * Fetch metadata types and save to file(s)
 */
export async function fetchAndSaveMetadata(
  options: FetchMetadataOptions
): Promise<void> {
  const schemas = await fetchMetadataSchemas(options);
  const outputDir = options.outputDir || './metadata-schemas';
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  if (options.saveAsCloud) {
    // Save as a cloud file (similar to core-salesforce.json)
    const cloudData = {
      cloud: 'Metadata API',
      description: 'Salesforce metadata types including ApexClass, CustomObject, Flow, and other components used in deployments and package development.',
      objectCount: Object.keys(schemas).length,
      objects: Object.keys(schemas).sort(),
    };
    
    const cloudPath = path.join(outputDir, 'metadata.json');
    fs.writeFileSync(cloudPath, JSON.stringify(cloudData, null, 2));
    console.log(`Saved cloud file: ${cloudPath}`);
    
    // Save individual metadata type files
    const objectsDir = path.join(outputDir, 'objects');
    for (const [name, schema] of Object.entries(schemas)) {
      const firstLetter = name.charAt(0).toUpperCase();
      const letterDir = path.join(objectsDir, firstLetter);
      
      if (!fs.existsSync(letterDir)) {
        fs.mkdirSync(letterDir, { recursive: true });
      }
      
      const filePath = path.join(letterDir, `${name}.json`);
      const fileData = { [name]: schema };
      fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
    }
    
    console.log(`Saved ${Object.keys(schemas).length} metadata type files to ${objectsDir}`);
  } else {
    // Save as a single schemas file
    const filePath = path.join(outputDir, 'metadata-types.json');
    fs.writeFileSync(filePath, JSON.stringify(schemas, null, 2));
    console.log(`Saved schemas to: ${filePath}`);
  }
}

