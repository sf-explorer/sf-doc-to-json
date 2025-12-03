/**
 * Merge Describe API data with existing documentation
 */

import * as fs from 'fs';
import * as path from 'path';
import type { JsonSchema, JsonSchemaProperty } from './types.js';

export interface ExistingObject {
  name: string;
  description: string;
  properties: Record<string, ExistingProperty>;
  module?: string;
  sourceUrl?: string;
  keyPrefix?: string;
  label?: string;
  iconUrl?: string;
  iconColor?: string;
}

export interface ExistingProperty {
  type: string;
  description?: string;
  format?: string;
  enum?: string[];
  'x-object'?: string;
  'x-objects'?: string[];
  [key: string]: any;
}

/**
 * Merge new schema data with existing documentation
 * Preserves descriptions from docs, adds metadata from Describe
 */
export function mergeWithExisting(
  newSchema: JsonSchema,
  existingData: any
): any {
  const objectName = newSchema['x-salesforce']?.name || newSchema.title;
  const existing = existingData[objectName] as ExistingObject;
  
  if (!existing) {
    // No existing data, convert new schema to doc format
    // This handles custom objects not in the documentation
    console.log(`  ℹ️  New object not in docs: ${objectName} (adding to N/A cloud)`);
    return {
      [objectName]: {
        name: objectName,
        description: newSchema.description || newSchema.title || `${objectName} object from Salesforce org`,
        properties: convertPropertiesToDocFormat(newSchema.properties),
        module: 'N/A',
        ...(newSchema['x-salesforce']?.keyPrefix && { keyPrefix: newSchema['x-salesforce'].keyPrefix }),
        ...(newSchema['x-salesforce']?.label && { label: newSchema['x-salesforce'].label }),
        ...(newSchema['x-salesforce']?.iconUrl && { iconUrl: newSchema['x-salesforce'].iconUrl }),
        ...(newSchema['x-salesforce']?.iconColor && { iconColor: newSchema['x-salesforce'].iconColor }),
        ...(newSchema['x-salesforce']?.custom !== undefined && { 
          sourceUrl: newSchema['x-salesforce'].custom 
            ? undefined 
            : 'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/' 
        }),
        // Add Salesforce metadata for new objects
        ...(newSchema['x-salesforce'] && {
          createable: newSchema['x-salesforce'].createable,
          updateable: newSchema['x-salesforce'].updateable,
          deletable: newSchema['x-salesforce'].deletable,
          queryable: newSchema['x-salesforce'].queryable,
          searchable: newSchema['x-salesforce'].searchable,
        }),
        // Add child relationships
        ...(newSchema['x-child-relations'] && newSchema['x-child-relations'].length > 0 && {
          childRelationships: newSchema['x-child-relations']
        }),
      }
    };
  }

  // Merge properties
  const mergedProperties: Record<string, any> = {};
  
  // Get all property names from both sources
  const allPropertyNames = new Set([
    ...Object.keys(existing.properties || {}),
    ...Object.keys(newSchema.properties || {})
  ]);

  for (const propName of allPropertyNames) {
    // Skip custom fields (__c suffix or __r for custom relationships)
    if (propName.includes('__c') || propName.includes('__r')) {
      continue;
    }
    
    const existingProp = existing.properties?.[propName];
    const newProp = newSchema.properties?.[propName];

    if (existingProp && newProp) {
      // Both exist - merge them, keeping existing description
      mergedProperties[propName] = {
        type: existingProp.type || newProp.type,
        description: existingProp.description, // Keep existing description!
        // Add enhanced metadata from Describe API
        ...(newProp.format && { format: newProp.format }),
        ...(newProp.enum && { enum: newProp.enum }),
        ...(newProp['x-object'] && { 'x-object': newProp['x-object'] }),
        ...(newProp['x-objects'] && { 'x-objects': newProp['x-objects'] }),
        ...(newProp.maxLength && { maxLength: newProp.maxLength }),
        ...(newProp.nullable !== undefined && { nullable: newProp.nullable }),
        ...(newProp.readOnly && { readOnly: newProp.readOnly }),
        ...(newProp.calculated && { calculated: newProp.calculated }),
        ...(newProp.permissionable !== undefined && { permissionable: newProp.permissionable }),
        ...(newProp.autoNumber && { autoNumber: newProp.autoNumber }),
        ...(newProp.unique && { unique: newProp.unique }),
        ...(newProp.externalId && { externalId: newProp.externalId }),
        // Skip minimum/maximum - not useful for documentation
        ...(newProp.multipleOf !== undefined && { multipleOf: newProp.multipleOf }),
      };
    } else if (existingProp) {
      // Only in existing - keep it
      mergedProperties[propName] = existingProp;
    } else if (newProp) {
      // Only in new - add it (likely a custom field)
      mergedProperties[propName] = {
        type: newProp.type,
        description: newProp.description || `${propName} field`,
        ...(newProp.format && { format: newProp.format }),
        ...(newProp.enum && { enum: newProp.enum }),
        ...(newProp['x-object'] && { 'x-object': newProp['x-object'] }),
        ...(newProp['x-objects'] && { 'x-objects': newProp['x-objects'] }),
        ...(newProp.maxLength && { maxLength: newProp.maxLength }),
        ...(newProp.nullable !== undefined && { nullable: newProp.nullable }),
        ...(newProp.readOnly && { readOnly: newProp.readOnly }),
      };
    }
  }

  // Return merged object
  return {
    [objectName]: {
      name: objectName,
      description: existing.description, // Keep existing description!
      properties: mergedProperties,
      module: existing.module, // Keep existing module
      sourceUrl: existing.sourceUrl, // Keep existing sourceUrl
      ...(newSchema['x-salesforce']?.keyPrefix && { keyPrefix: newSchema['x-salesforce'].keyPrefix }),
      ...(existing.label && { label: existing.label }),
      // Add icon metadata from UI API
      ...(newSchema['x-salesforce']?.iconUrl && { iconUrl: newSchema['x-salesforce'].iconUrl }),
      ...(newSchema['x-salesforce']?.iconColor && { iconColor: newSchema['x-salesforce'].iconColor }),
      // Add Salesforce metadata
      ...(newSchema['x-salesforce'] && {
        createable: newSchema['x-salesforce'].createable,
        updateable: newSchema['x-salesforce'].updateable,
        deletable: newSchema['x-salesforce'].deletable,
        queryable: newSchema['x-salesforce'].queryable,
        searchable: newSchema['x-salesforce'].searchable,
      }),
      // Add child relationships
      ...(newSchema['x-child-relations'] && newSchema['x-child-relations'].length > 0 && {
        childRelationships: newSchema['x-child-relations']
      }),
    }
  };
}

/**
 * Convert JSON Schema properties to doc format
 */
function convertPropertiesToDocFormat(
  properties: Record<string, JsonSchemaProperty>
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [name, prop] of Object.entries(properties)) {
    result[name] = {
      type: prop.type,
      description: prop.description,
      ...(prop.format && { format: prop.format }),
      ...(prop.enum && { enum: prop.enum }),
      ...(prop['x-object'] && { 'x-object': prop['x-object'] }),
      ...(prop['x-objects'] && { 'x-objects': prop['x-objects'] }),
      ...(prop.maxLength && { maxLength: prop.maxLength }),
      ...(prop.nullable !== undefined && { nullable: prop.nullable }),
      ...(prop.readOnly && { readOnly: prop.readOnly }),
    };
  }
  
  return result;
}

/**
 * Save merged data to doc/objects structure
 */
export function saveMergedToDocStructure(
  schema: JsonSchema,
  docRootDir: string
): void {
  const objectName = schema['x-salesforce']?.name || schema.title;
  const firstLetter = objectName.charAt(0).toUpperCase();
  const filePath = path.join(docRootDir, 'objects', firstLetter, `${objectName}.json`);
  
  let merged: any;
  
  // Try to read existing file
  if (fs.existsSync(filePath)) {
    const existingContent = fs.readFileSync(filePath, 'utf-8');
    const existingData = JSON.parse(existingContent);
    merged = mergeWithExisting(schema, existingData);
  } else {
    // New file - convert schema to doc format
    merged = mergeWithExisting(schema, {});
  }
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Save merged data
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
}

