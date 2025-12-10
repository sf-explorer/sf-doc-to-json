import * as fs from 'fs';
import * as path from 'path';

interface AMFValue {
  '@value': string;
}

interface AMFNode {
  '@id': string;
  '@type': string[];
  [key: string]: any;
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: {
    [path: string]: {
      [method: string]: {
        summary?: string;
        description?: string;
        operationId?: string;
        parameters?: any[];
        requestBody?: any;
        responses?: any;
      };
    };
  };
  components?: {
    schemas?: any;
  };
}

function extractValue(obj: any): string | undefined {
  if (!obj) return undefined;
  if (Array.isArray(obj) && obj.length > 0) {
    return obj[0]['@value'];
  }
  if (obj['@value']) {
    return obj['@value'];
  }
  return undefined;
}

function extractArray(obj: any): any[] {
  if (!obj) return [];
  return Array.isArray(obj) ? obj : [obj];
}

function convertAMFDataType(dataType: string): string {
  const typeMap: { [key: string]: string } = {
    'http://www.w3.org/2001/XMLSchema#string': 'string',
    'http://www.w3.org/2001/XMLSchema#integer': 'integer',
    'http://www.w3.org/2001/XMLSchema#number': 'number',
    'http://www.w3.org/2001/XMLSchema#boolean': 'boolean',
    'http://www.w3.org/2001/XMLSchema#dateTime': 'string',
    'http://www.w3.org/2001/XMLSchema#date': 'string',
  };
  return typeMap[dataType] || 'string';
}

function parseSchema(shapeNode: any, allNodes: Map<string, any>): any {
  if (!shapeNode) return {};

  const schema: any = {};

  // Handle scalar types
  if (shapeNode['@type']?.includes('shapes:ScalarShape') ||
      shapeNode['@type']?.includes('raml-shapes:ScalarShape')) {
    const datatype = shapeNode['shacl:datatype']?.[0]?.['\@id'];
    if (datatype) {
      schema.type = convertAMFDataType(datatype);
    }

    const description = extractValue(shapeNode['core:description']);
    if (description) schema.description = description;

    const example = extractValue(shapeNode['data:example']?.[0]);
    if (example) schema.example = example;

    const pattern = extractValue(shapeNode['shacl:pattern']);
    if (pattern) schema.pattern = pattern;

    const minLength = shapeNode['shacl:minLength']?.[0]?.['@value'];
    if (minLength) schema.minLength = parseInt(minLength);

    const maxLength = shapeNode['shacl:maxLength']?.[0]?.['@value'];
    if (maxLength) schema.maxLength = parseInt(maxLength);

    return schema;
  }

  // Handle object types (NodeShape)
  if (shapeNode['@type']?.includes('shapes:NodeShape') ||
      shapeNode['@type']?.includes('shacl:NodeShape') ||
      shapeNode['@type']?.includes('raml-shapes:NodeShape')) {
    schema.type = 'object';

    const description = extractValue(shapeNode['core:description']);
    if (description) schema.description = description;

    const properties = shapeNode['shacl:property'];
    if (properties) {
      schema.properties = {};
      const required: string[] = [];

      extractArray(properties).forEach((prop: any) => {
        // Try different ways to get property name
        const propName = extractValue(prop['shacl:name']) || 
                        extractValue(prop['shacl:path']?.[0]?.['core:name']) || 
                        extractValue(prop['core:name']);
        
        if (propName) {
          const range = prop['raml-shapes:range']?.[0];
          if (range) {
            let propSchema: any = {};
            
            // Check if it's a reference to another shape
            if (range['@id'] && allNodes.has(range['@id'])) {
              const referencedShape = allNodes.get(range['@id']);
              propSchema = parseSchema(referencedShape, allNodes);
            } else {
              propSchema = parseSchema(range, allNodes);
            }
            
            // Add description from property if available
            const propDescription = extractValue(prop['core:description']);
            if (propDescription && !propSchema.description) {
              propSchema.description = propDescription;
            }
            
            schema.properties[propName] = propSchema;
          }

          // Check if property is required
          const minCount = prop['shacl:minCount']?.[0]?.['@value'];
          if (minCount && parseInt(minCount) > 0) {
            required.push(propName);
          }
        }
      });

      if (required.length > 0) {
        schema.required = required;
      }
    }

    return schema;
  }

  // Handle array types
  if (shapeNode['@type']?.includes('shapes:ArrayShape') ||
      shapeNode['@type']?.includes('raml-shapes:ArrayShape')) {
    schema.type = 'array';

    const description = extractValue(shapeNode['core:description']);
    if (description) schema.description = description;

    const items = shapeNode['raml-shapes:items']?.[0];
    if (items) {
      if (items['@id'] && allNodes.has(items['@id'])) {
        const referencedShape = allNodes.get(items['@id']);
        schema.items = parseSchema(referencedShape, allNodes);
      } else {
        schema.items = parseSchema(items, allNodes);
      }
    }

    return schema;
  }

  // Handle union types (anyOf)
  if (shapeNode['@type']?.includes('shapes:UnionShape') ||
      shapeNode['@type']?.includes('raml-shapes:UnionShape')) {
    const anyOf = shapeNode['raml-shapes:anyOf'];
    if (anyOf) {
      schema.anyOf = extractArray(anyOf).map((item: any) => {
        if (item['@id'] && allNodes.has(item['@id'])) {
          return parseSchema(allNodes.get(item['@id']), allNodes);
        }
        return parseSchema(item, allNodes);
      });
    }
    return schema;
  }

  return schema;
}

function parseParameters(params: any[], allNodes: Map<string, any>): any[] {
  if (!params || params.length === 0) return [];

  return extractArray(params).map((param: any) => {
    const paramName = extractValue(param['core:name']);
    const paramIn = extractValue(param['apiContract:binding']) || 'query';
    const description = extractValue(param['core:description']);
    const required = param['apiContract:required']?.[0]?.['@value'] === 'true';

    const schema = param['raml-shapes:schema']?.[0];
    let paramSchema: any = { type: 'string' };
    
    if (schema) {
      if (schema['@id'] && allNodes.has(schema['@id'])) {
        paramSchema = parseSchema(allNodes.get(schema['@id']), allNodes);
      } else {
        paramSchema = parseSchema(schema, allNodes);
      }
    }

    return {
      name: paramName,
      in: paramIn === 'path' ? 'path' : 'query',
      description,
      required,
      schema: paramSchema,
    };
  });
}

function parseRequestBody(payloads: any[], allNodes: Map<string, any>): any {
  if (!payloads || payloads.length === 0) return undefined;

  const requestBody: any = {
    content: {},
  };

  extractArray(payloads).forEach((payload: any) => {
    const mediaType = extractValue(payload['core:mediaType']) || 'application/json';
    const schema = payload['raml-shapes:schema']?.[0];

    if (schema) {
      let payloadSchema: any = {};
      
      if (schema['@id'] && allNodes.has(schema['@id'])) {
        payloadSchema = parseSchema(allNodes.get(schema['@id']), allNodes);
      } else {
        payloadSchema = parseSchema(schema, allNodes);
      }

      requestBody.content[mediaType] = {
        schema: payloadSchema,
      };
    }
  });

  return Object.keys(requestBody.content).length > 0 ? requestBody : undefined;
}

function parseResponses(responses: any[], allNodes: Map<string, any>): any {
  if (!responses || responses.length === 0) {
    return {
      default: {
        description: 'Default response',
      },
    };
  }

  const responsesObj: any = {};

  extractArray(responses).forEach((response: any) => {
    const statusCode = extractValue(response['apiContract:statusCode']) || 'default';
    const description = extractValue(response['core:description']) || '';

    responsesObj[statusCode] = {
      description,
      content: {},
    };

    const payloads = response['apiContract:payload'];
    if (payloads) {
      extractArray(payloads).forEach((payload: any) => {
        const mediaType = extractValue(payload['core:mediaType']) || 'application/json';
        const schema = payload['raml-shapes:schema']?.[0];

        if (schema) {
          let responseSchema: any = {};
          
          if (schema['@id'] && allNodes.has(schema['@id'])) {
            responseSchema = parseSchema(allNodes.get(schema['@id']), allNodes);
          } else {
            responseSchema = parseSchema(schema, allNodes);
          }

          responsesObj[statusCode].content[mediaType] = {
            schema: responseSchema,
          };
        }
      });
    }

    // Clean up empty content
    if (Object.keys(responsesObj[statusCode].content).length === 0) {
      delete responsesObj[statusCode].content;
    }
  });

  return responsesObj;
}

function convertAMFToOpenAPI(amfData: any[]): OpenAPISpec {
  // Build a map of all nodes by @id for reference resolution
  const allNodes = new Map<string, any>();
  
  function indexNodes(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj['@id']) {
      allNodes.set(obj['@id'], obj);
    }
    
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        obj[key].forEach((item: any) => indexNodes(item));
      } else if (typeof obj[key] === 'object') {
        indexNodes(obj[key]);
      }
    }
  }
  
  indexNodes(amfData);

  const rootDoc = amfData[0];
  const apiContract = rootDoc['doc:encodes']?.[0];

  if (!apiContract) {
    throw new Error('No API contract found in AMF data');
  }

  const openapi: OpenAPISpec = {
    openapi: '3.0.3',
    info: {
      title: extractValue(apiContract['core:name']) || 'API',
      version: extractValue(apiContract['core:version']) || '1.0.0',
      description: extractValue(apiContract['core:description']),
    },
    paths: {},
  };

  // Parse endpoints
  const endpoints = apiContract['apiContract:endpoint'];
  if (endpoints) {
    extractArray(endpoints).forEach((endpoint: any) => {
      const pathStr = extractValue(endpoint['apiContract:path']);
      if (!pathStr) return;

      openapi.paths[pathStr] = {};

      const operations = endpoint['apiContract:supportedOperation'];
      if (operations) {
        extractArray(operations).forEach((operation: any) => {
          const method = extractValue(operation['apiContract:method'])?.toLowerCase();
          if (!method) return;

          const summary = extractValue(operation['core:name']);
          const description = extractValue(operation['core:description']);

          openapi.paths[pathStr][method] = {
            summary,
            description,
          };

          // Parse parameters
          const expects = operation['apiContract:expects']?.[0];
          if (expects) {
            const parameters = expects['apiContract:parameter'];
            if (parameters) {
              openapi.paths[pathStr][method].parameters = parseParameters(parameters, allNodes);
            }

            // Parse request body
            const payloads = expects['apiContract:payload'];
            if (payloads) {
              const requestBody = parseRequestBody(payloads, allNodes);
              if (requestBody) {
                openapi.paths[pathStr][method].requestBody = requestBody;
              }
            }
          }

          // Parse responses
          const returns = operation['apiContract:returns'];
          if (returns) {
            openapi.paths[pathStr][method].responses = parseResponses(returns, allNodes);
          }
        });
      }
    });
  }

  return openapi;
}

// Main execution
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputFile = path.join(__dirname, '..', 'energy-integrations.raml.amf.json');
const outputFile = path.join(__dirname, '..', 'energy-integrations-openapi.json');

console.log('Reading AMF file...');
const amfData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

console.log('Converting to OpenAPI...');
const openapi = convertAMFToOpenAPI(amfData);

console.log('Writing OpenAPI file...');
fs.writeFileSync(outputFile, JSON.stringify(openapi, null, 2));

console.log(`✓ Conversion complete! Output written to: ${outputFile}`);
console.log(`  API: ${openapi.info.title} v${openapi.info.version}`);
console.log(`  Paths: ${Object.keys(openapi.paths).length}`);

