/**
 * Salesforce Describe API integration
 * 
 * This module provides tools to fetch object metadata from Salesforce orgs
 * using the Describe API via jsforce, and convert it to JSON Schema format.
 */

export * from './types.js';
export * from './client.js';
export * from './converter.js';
export * from './merger.js';
export * from './progress.js';
export * from './metadata-client.js';
export { fetchAndConvert, fetchAndSave } from './runner.js';
export { fetchMetadataSchemas, fetchAndSaveMetadata } from './metadata-runner.js';

