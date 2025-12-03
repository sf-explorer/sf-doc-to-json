/**
 * Salesforce Describe API client using jsforce
 */

import { Connection } from 'jsforce';
import type {
  SalesforceConnection,
  DescribeSObjectResult,
} from './types.js';

/**
 * Client for interacting with Salesforce Describe API
 */
export class SalesforceDescribeClient {
  private conn: Connection | null = null;

  /**
   * Connect to Salesforce
   */
  async connect(config: SalesforceConnection): Promise<void> {
    // Option 1: Use existing access token
    if (config.accessToken && config.instanceUrl) {
      this.conn = new Connection({
        accessToken: config.accessToken,
        instanceUrl: config.instanceUrl,
      });
      return;
    }

    // Option 2: Use OAuth2 client credentials
    if (config.clientId && config.clientSecret) {
      this.conn = new Connection({
        oauth2: {
          loginUrl: config.loginUrl,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: config.redirectUri || 'http://localhost:3000/callback',
        },
      });
      
      // For client credentials flow (requires username/password)
      if (config.username && config.password) {
        const password = config.securityToken
          ? config.password + config.securityToken
          : config.password;
        await this.conn.login(config.username, password);
      }
      return;
    }

    // Option 3: Traditional username/password (SOAP login)
    if (config.username && config.password) {
      this.conn = new Connection({
        loginUrl: config.loginUrl,
      });

      const password = config.securityToken
        ? config.password + config.securityToken
        : config.password;

      try {
        await this.conn.login(config.username, password);
      } catch (error: any) {
        if (error.message?.includes('SOAP API login() is disabled')) {
          throw new Error(
            'SOAP API login is disabled in your org. Please use OAuth2 authentication instead.\n' +
            'Set SF_ACCESS_TOKEN and SF_INSTANCE_URL in your .env file.\n' +
            'See ENV_GUIDE.md for instructions on getting an access token.'
          );
        }
        throw error;
      }
      return;
    }

    throw new Error(
      'Invalid connection configuration. Provide either:\n' +
      '1. accessToken + instanceUrl (OAuth2)\n' +
      '2. clientId + clientSecret + username + password (OAuth2)\n' +
      '3. username + password (SOAP - may be disabled in your org)'
    );
  }

  /**
   * Get describe information for a single object
   */
  async describeObject(objectName: string): Promise<DescribeSObjectResult> {
    if (!this.conn) {
      throw new Error('Not connected to Salesforce. Call connect() first.');
    }

    const describe = await this.conn.sobject(objectName).describe();
    return describe as DescribeSObjectResult;
  }

  /**
   * Get describe information for multiple objects
   */
  async describeObjects(objectNames: string[]): Promise<DescribeSObjectResult[]> {
    if (!this.conn) {
      throw new Error('Not connected to Salesforce. Call connect() first.');
    }

    const results = await Promise.all(
      objectNames.map(name => this.describeObject(name))
    );
    return results;
  }

  /**
   * Get all available objects in the org
   */
  async describeGlobal(): Promise<Array<{ name: string; label: string; custom: boolean }>> {
    if (!this.conn) {
      throw new Error('Not connected to Salesforce. Call connect() first.');
    }

    const global = await this.conn.describeGlobal();
    return global.sobjects.map((obj: any) => ({
      name: obj.name,
      label: obj.label,
      custom: obj.custom,
    }));
  }

  /**
   * Get describe information for all objects in batches
   */
  async describeAllObjects(
    batchSize: number = 10,
    onProgress?: (current: number, total: number, objectName: string) => void
  ): Promise<DescribeSObjectResult[]> {
    const global = await this.describeGlobal();
    const results: DescribeSObjectResult[] = [];
    
    for (let i = 0; i < global.length; i++) {
      const obj = global[i];
      
      if (onProgress) {
        onProgress(i + 1, global.length, obj.name);
      }

      try {
        const describe = await this.describeObject(obj.name);
        results.push(describe);
        
        // Rate limiting: wait a bit between requests
        if ((i + 1) % batchSize === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Failed to describe ${obj.name}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get describe information for all objects and save incrementally
   * This is more memory efficient for large orgs
   */
  async describeAllObjectsWithSave(
    outputDir: string,
    includeMetadata: boolean,
    batchSize: number = 10,
    mergeWithDocs: boolean = false,
    startFromIndex: number = 0,
    skipCustomObjects: boolean = false,
    onProgress?: (current: number, total: number, objectName: string, skipped?: boolean) => void
  ): Promise<number> {
    const global = await this.describeGlobal();
    let savedCount = 0;
    let skippedCount = 0;
    
    // Import dependencies here to avoid circular dependency
    const { convertToJsonSchema } = await import('./converter.js');
    const { saveMergedToDocStructure } = await import('./merger.js');
    const { saveProgress } = await import('./progress.js');
    const fs = await import('fs');
    const path = await import('path');
    
    console.log(`Starting from index ${startFromIndex} of ${global.length} objects`);
    if (skipCustomObjects) {
      console.log('⚠️  Skipping custom objects (__c suffix)');
    }
    console.log('⚠️  Skipping objects ending with: History, Event, Feed, Share');
    
    for (let i = startFromIndex; i < global.length; i++) {
      const obj = global[i];
      
      // Skip custom objects if requested (any object with __)
      if (skipCustomObjects && obj.name.includes('__')) {
        skippedCount++;
        if (onProgress) {
          onProgress(i + 1, global.length, obj.name, true);
        }
        continue;
      }
      
      // Skip objects ending with History, Event, Feed, or Share
      if (obj.name.endsWith('History') || obj.name.endsWith('Event') || obj.name.endsWith('Feed') || obj.name.endsWith('Share')) {
        skippedCount++;
        if (onProgress) {
          onProgress(i + 1, global.length, obj.name, true);
        }
        continue;
      }
      
      if (onProgress) {
        onProgress(i + 1, global.length, obj.name, false);
      }

      try {
        const describe = await this.describeObject(obj.name);
        
        // Convert to JSON Schema immediately
        const schema = convertToJsonSchema(describe, includeMetadata);
        
        if (mergeWithDocs) {
          // Merge with existing docs and save to doc/objects structure
          saveMergedToDocStructure(schema, outputDir);
        } else {
          // Save as new schema file
          const firstLetter = describe.name.charAt(0).toUpperCase();
          const letterDir = path.join(outputDir, firstLetter);
          
          if (!fs.existsSync(letterDir)) {
            fs.mkdirSync(letterDir, { recursive: true });
          }
          
          const filePath = path.join(letterDir, `${describe.name}.json`);
          fs.writeFileSync(filePath, JSON.stringify(schema, null, 2));
        }
        
        savedCount++;
        
        // Save progress every 10 objects
        if (savedCount % 10 === 0) {
          saveProgress({
            lastProcessedIndex: i,
            lastProcessedObject: obj.name,
            totalObjects: global.length,
            startedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
            processedCount: savedCount,
          }, outputDir);
        }
        
        // Rate limiting: wait a bit between requests
        if ((i + 1) % batchSize === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Failed to describe ${obj.name}:`, error);
      }
    }
    
    // Clear progress on completion
    const { clearProgress } = await import('./progress.js');
    clearProgress(outputDir);
    
    if (skipCustomObjects && skippedCount > 0) {
      console.log(`\n✅ Skipped ${skippedCount} custom objects`);
    }
    
    return savedCount;
  }

  /**
   * Disconnect from Salesforce
   */
  disconnect(): void {
    if (this.conn) {
      this.conn.logout();
      this.conn = null;
    }
  }
}

