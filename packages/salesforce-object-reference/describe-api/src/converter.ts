/**
 * Converts Salesforce Describe API results to JSON Schema format
 */

import type {
  DescribeSObjectResult,
  DescribeFieldResult,
  JsonSchema,
  JsonSchemaProperty,
} from './types.js';

/**
 * Maps Salesforce field types to JSON Schema types and formats
 */
const TYPE_MAPPING: Record<string, { type: string; format?: string }> = {
  // String types
  string: { type: 'string' },
  id: { type: 'string', format: 'salesforce-id' },
  reference: { type: 'string', format: 'salesforce-id' },
  email: { type: 'string', format: 'email' },
  url: { type: 'string', format: 'uri' },
  phone: { type: 'string', format: 'phone' },
  picklist: { type: 'string' },  // enum values are added via the enum property
  multipicklist: { type: 'string' },  // enum values are added via the enum property
  textarea: { type: 'string' },
  encryptedstring: { type: 'string' },
  combobox: { type: 'string' },
  
  // Number types
  int: { type: 'integer' },
  double: { type: 'number' },
  currency: { type: 'number', format: 'currency' },
  percent: { type: 'number', format: 'percent' },
  
  // Boolean
  boolean: { type: 'boolean' },
  
  // Date/Time types
  date: { type: 'string', format: 'date' },
  datetime: { type: 'string', format: 'date-time' },
  time: { type: 'string', format: 'time' },
  
  // Special types
  address: { type: 'object' }, // Compound address field
  location: { type: 'object' }, // Geolocation field
  base64: { type: 'string', format: 'byte' },
  anyType: { type: 'string' },
  
  // Complex types
  json: { type: 'object' },
};

/**
 * Converts a Salesforce field to a JSON Schema property
 */
export function convertFieldToProperty(field: DescribeFieldResult): JsonSchemaProperty {
  const typeInfo = TYPE_MAPPING[field.type.toLowerCase()] || { type: 'string' };
  
  const property: JsonSchemaProperty = {
    type: typeInfo.type,
    title: field.label, // Display name/title
    description: field.inlineHelpText || undefined, // Help text (only if present)
  };

  // Add format if present
  if (typeInfo.format) {
    property.format = typeInfo.format;
  }

  // Handle picklist enum values
  if ((field.type === 'picklist' || field.type === 'multipicklist') && field.picklistValues) {
    const activeValues = field.picklistValues
      .filter(pv => pv.active)
      .map(pv => pv.value);
    
    if (activeValues.length > 0) {
      property.enum = activeValues;
    }
  }

  // Handle reference (lookup/master-detail) fields
  if (field.type === 'reference' && field.referenceTo && field.referenceTo.length > 0) {
    if (field.referenceTo.length === 1) {
      // Single reference
      property['x-object'] = field.referenceTo[0];
    } else {
      // Polymorphic reference
      property['x-objects'] = field.referenceTo;
    }
  }

  // Add constraints based on field metadata
  if (field.length && typeInfo.type === 'string') {
    property.maxLength = field.length;
  }

  if (field.precision !== undefined && field.scale !== undefined) {
    if (typeInfo.type === 'number' || typeInfo.type === 'integer') {
      // For numbers, precision is total digits, scale is decimal places
      const maxValue = Math.pow(10, field.precision - field.scale) - Math.pow(10, -field.scale);
      property.maximum = maxValue;
      property.minimum = -maxValue;
      
      // Only add multipleOf if it's meaningful (scale <= 8 decimal places)
      // Very high precision (e.g., 1e-15) is not useful for validation
      if (field.scale > 0 && field.scale <= 8) {
        property.multipleOf = Math.pow(10, -field.scale);
      }
    }
  }

  // Add nullability
  if (field.nillable !== undefined) {
    property.nullable = field.nillable;
  }

  // Add read-only flag for calculated/formula fields
  if (field.calculated) {
    property.readOnly = true;
  }

  // Add updateable/createable flags as custom extensions
  if (!field.updateable) {
    property.readOnly = true;
  }

  return property;
}

/**
 * Converts a Salesforce object describe result to JSON Schema
 */
export function convertToJsonSchema(
  describe: DescribeSObjectResult,
  includeMetadata: boolean = true
): JsonSchema {
  const schema: JsonSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: describe.label,
    description: `${describe.labelPlural} - ${describe.name}`,
    type: 'object',
    properties: {},
  };

  // Convert all fields to properties
  for (const field of describe.fields) {
    schema.properties[field.name] = convertFieldToProperty(field);
  }

  // Identify required fields (non-nillable, non-defaulted, non-calculated)
  const requiredFields = describe.fields
    .filter(field => 
      !field.nillable && 
      !field.calculated && 
      !field.defaultValue && 
      !field.defaultValueFormula &&
      field.createable
    )
    .map(field => field.name);

  if (requiredFields.length > 0) {
    schema.required = requiredFields;
  }

  // Add Salesforce-specific metadata
  if (includeMetadata) {
    schema['x-salesforce'] = {
      name: describe.name,
      label: describe.label,
      labelPlural: describe.labelPlural,
      keyPrefix: describe.keyPrefix,
      custom: describe.custom,
      createable: describe.createable,
      updateable: describe.updateable,
      deletable: describe.deletable,
      queryable: describe.queryable,
      searchable: describe.searchable,
    };

    // Add name field if present (take first one if multiple)
    if (describe.nameFields && describe.nameFields.length > 0) {
      schema['x-salesforce'].nameField = describe.nameFields[0];
    }

    // Add icon metadata from UI API if available
    if (describe.themeInfo) {
      if (describe.themeInfo.iconUrl) {
        // Extract only the last part of the icon URL (e.g., "standard/category_120.png")
        // from URLs like: https://.../img/icon/t4v35/standard/category_120.png
        const iconUrlMatch = describe.themeInfo.iconUrl.match(/\/icon\/[^/]+\/(.+)$/);
        if (iconUrlMatch) {
          schema['x-salesforce'].iconUrl = iconUrlMatch[1];
        }
      }
      if (describe.themeInfo.color) {
        schema['x-salesforce'].iconColor = describe.themeInfo.color;
      }
    }

    // Add child relationships if present
    if (describe.childRelationships && describe.childRelationships.length > 0) {
      schema['x-child-relations'] = describe.childRelationships
        .filter(rel => !rel.deprecatedAndHidden && rel.childSObject)
        .filter(rel => !rel.childSObject.endsWith('Feed')) // Exclude Feed objects
        .map(rel => ({
          childObject: rel.childSObject,
          field: rel.field,
          relationshipName: rel.relationshipName,
          cascadeDelete: rel.cascadeDelete,
        }));
    }
  }

  return schema;
}

/**
 * Converts multiple objects to a schema collection
 */
export function convertMultipleToJsonSchema(
  describes: DescribeSObjectResult[],
  includeMetadata: boolean = true
): Record<string, JsonSchema> {
  const schemas: Record<string, JsonSchema> = {};
  
  for (const describe of describes) {
    schemas[describe.name] = convertToJsonSchema(describe, includeMetadata);
  }
  
  return schemas;
}

