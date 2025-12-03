/**
 * Salesforce Metadata API client using jsforce
 * Reuses jsforce's ApiSchemas for comprehensive metadata type information
 */

import { Connection } from 'jsforce';
import type { 
  SalesforceConnection,
} from './types.js';

// Import jsforce metadata types
import type { 
  DescribeMetadataObject,
  DescribeMetadataResult 
} from 'jsforce/lib/api/metadata/schema.js';

// Import ApiSchemas dynamically to get all metadata type definitions
let ApiSchemas: any = null;

async function loadApiSchemas() {
  if (!ApiSchemas) {
    try {
      const module = await import('jsforce/lib/api/metadata/schema.js');
      ApiSchemas = module.ApiSchemas;
    } catch (error) {
      console.warn('Could not load jsforce ApiSchemas, using basic metadata info only');
      ApiSchemas = {};
    }
  }
  return ApiSchemas;
}

export interface MetadataTypeDescription {
  name: string;
  label: string;
  description: string;
  inFolder: boolean;
  metaFile: boolean;
  suffix?: string;
  directoryName: string;
  childTypes?: string[];
  fields?: Record<string, any>;
}

/**
 * Client for interacting with Salesforce Metadata API
 */
export class SalesforceMetadataClient {
  private conn: Connection | null = null;

  /**
   * Connect to Salesforce (reuses connection logic from SalesforceDescribeClient)
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
   * Get all metadata types available in the org
   */
  async describeMetadata(): Promise<DescribeMetadataObject[]> {
    if (!this.conn) {
      throw new Error('Not connected to Salesforce. Call connect() first.');
    }

    const result: DescribeMetadataResult = await this.conn.metadata.describe();
    return result.metadataObjects || [];
  }

  /**
   * Get enriched metadata type descriptions with better formatting
   */
  async getMetadataTypeDescriptions(): Promise<MetadataTypeDescription[]> {
    const types = await this.describeMetadata();
    const schemas = await loadApiSchemas();
    
    return types.map(type => {
      const schemaInfo = schemas[type.xmlName];
      
      return {
        name: type.xmlName,
        label: this.formatLabel(type.xmlName),
        description: this.generateDescription(type),
        inFolder: type.inFolder,
        metaFile: type.metaFile,
        suffix: type.suffix || undefined,
        directoryName: type.directoryName,
        childTypes: type.childXmlNames,
        fields: schemaInfo?.props || undefined,
      };
    });
  }

  /**
   * Format XML name to readable label
   */
  private formatLabel(xmlName: string): string {
    // Split by capital letters and join with spaces
    return xmlName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Generate description for metadata type
   */
  private generateDescription(type: DescribeMetadataObject): string {
    const parts: string[] = [];
    
    // Base description
    parts.push(`Represents ${type.xmlName} metadata component`);
    
    // Add storage details
    if (type.directoryName) {
      parts.push(`stored in ${type.directoryName} directory`);
    }
    
    // Add file details
    if (type.suffix) {
      parts.push(`with .${type.suffix} extension`);
    }
    
    // Add folder info
    if (type.inFolder) {
      parts.push('(organized in folders)');
    }
    
    // Add child info
    if (type.childXmlNames && type.childXmlNames.length > 0) {
      parts.push(`with child types: ${type.childXmlNames.join(', ')}`);
    }
    
    return parts.join(', ') + '.';
  }

  /**
   * Convert metadata types to JSON Schema format similar to object schemas
   */
  async convertToSchemas(): Promise<Record<string, any>> {
    const descriptions = await this.getMetadataTypeDescriptions();
    const schemas: Record<string, any> = {};
    
    for (const desc of descriptions) {
      // Convert jsforce schema fields to our field format
      const fields: Record<string, any> = {};
      
      if (desc.fields) {
        for (const [fieldName, fieldDef] of Object.entries(desc.fields)) {
          const fieldType = typeof fieldDef === 'string' ? fieldDef : 'string';
          const isOptional = fieldType.startsWith('?');
          const isArray = Array.isArray(fieldDef);
          const cleanType = isOptional ? fieldType.substring(1) : fieldType;
          const arrayType = isArray ? fieldDef[0] : null;
          
          fields[fieldName] = {
            name: fieldName,
            label: this.formatLabel(fieldName),
            type: isArray ? 'array' : this.mapJsforceTypeToSfType(cleanType),
            description: `${fieldName} field of ${desc.name} metadata`,
            updateable: true,
            createable: true,
            nillable: isOptional,
            ...(isArray && { itemType: arrayType }),
          };
        }
      } else {
        // Default fields for all metadata types
        fields.FullName = {
          name: 'FullName',
          label: 'Full Name',
          type: 'string',
          description: 'The unique identifier for this metadata component',
          updateable: true,
          createable: true,
          nillable: false,
        };
      }
      
      schemas[desc.name] = {
        name: desc.name,
        label: desc.label,
        description: desc.description,
        module: 'Metadata API',
        fields,
        x_metadata: {
          directoryName: desc.directoryName,
          inFolder: desc.inFolder,
          metaFile: desc.metaFile,
          suffix: desc.suffix,
          childTypes: desc.childTypes,
        },
      };
    }
    
    return schemas;
  }
  
  /**
   * Map jsforce type names to Salesforce field types
   */
  private mapJsforceTypeToSfType(jsforceType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'boolean': 'boolean',
      'number': 'double',
      'int': 'int',
      'double': 'double',
      'date': 'date',
      'datetime': 'datetime',
    };
    
    return typeMap[jsforceType] || 'string';
  }

  /**
   * List specific metadata of a given type
   */
  async listMetadata(type: string, folder?: string): Promise<any[]> {
    if (!this.conn) {
      throw new Error('Not connected to Salesforce. Call connect() first.');
    }

    const query: any = { type };
    if (folder) {
      query.folder = folder;
    }

    const result = await this.conn.metadata.list([query]);
    return Array.isArray(result) ? result : [result];
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

