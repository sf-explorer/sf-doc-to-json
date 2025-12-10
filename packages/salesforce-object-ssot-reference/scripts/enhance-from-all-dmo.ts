/**
 * Enhance DMO objects with data from all-dmo.json
 * - Improve field types (use actual types from API instead of normalizing from docs)
 * - Add additional field metadata (label, isPrimaryKey, isDistinct, creationType, usageTag)
 * - Potentially discover more relationships
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AllDMOField {
    creationType: string;
    isDistinct: boolean;
    isPrimaryKey?: boolean;
    label: string;
    name: string; // API name
    type: string; // "Text", "Number", "DateTime", "Date", etc.
    usageTag: string;
}

interface AllDMOObject {
    category: string;
    creationType: string;
    dataSpaceName: string;
    fields: AllDMOField[];
    hasExternalDataLakeObjectMappings: boolean;
    id: string;
    isEditable: boolean;
    isEnabled: boolean;
    isSegmentable: boolean;
    label: string;
    name: string; // API name
    pluralLabel?: string;
}

interface AllDMOData {
    dataModelObject: AllDMOObject[];
}

async function enhanceFromAllDMO() {
    try {
        console.log('🔄 Enhancing DMO objects from all-dmo.json...\n');

        const docFolder = path.join(__dirname, '../src/doc');
        const allDmoPath = path.join(docFolder, 'all-dmo.json');
        const objectsFolder = path.join(docFolder, 'objects');

        // Load all-dmo.json
        const allDmoContent = await fs.readFile(allDmoPath, 'utf-8');
        const allDmoData: AllDMOData = JSON.parse(allDmoContent);

        console.log(`📊 Found ${allDmoData.dataModelObject.length} DMOs in all-dmo.json\n`);

        // Build a map of API name to DMO data
        const dmoMap = new Map<string, AllDMOObject>();
        for (const dmo of allDmoData.dataModelObject) {
            dmoMap.set(dmo.name, dmo);
        }

        // Process each object file
        let enhancedCount = 0;
        let fieldsUpdated = 0;
        let primaryKeysFound = 0;

        const folders = await fs.readdir(objectsFolder);
        
        for (const folder of folders) {
            const folderPath = path.join(objectsFolder, folder);
            const stat = await fs.stat(folderPath);
            
            if (!stat.isDirectory()) continue;

            const files = await fs.readdir(folderPath);
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const filePath = path.join(folderPath, file);
                const fileContent = await fs.readFile(filePath, 'utf-8');
                const fileData = JSON.parse(fileContent);

                const apiName = Object.keys(fileData)[0];
                const objectData = fileData[apiName];

                // Find matching DMO in all-dmo.json
                const allDmoDef = dmoMap.get(apiName);
                
                if (!allDmoDef) {
                    console.log(`  ⚠️  No match in all-dmo.json for ${apiName}`);
                    continue;
                }

                let updated = false;
                let fileFieldsUpdated = 0;

                // Update field types and add metadata
                if (allDmoDef.fields && allDmoDef.fields.length > 0) {
                    const fieldMap = new Map<string, AllDMOField>();
                    for (const field of allDmoDef.fields) {
                        fieldMap.set(field.name, field);
                    }

                    // Enhance existing fields
                    for (const [fieldApiName, fieldData] of Object.entries(objectData.properties || {})) {
                        const allDmoField = fieldMap.get(fieldApiName);
                        
                        if (allDmoField) {
                            // Update type with actual API type
                            const oldType = (fieldData as any).type;
                            const newType = normalizeApiType(allDmoField.type);
                            
                            if (oldType !== newType) {
                                (fieldData as any).type = newType;
                                fileFieldsUpdated++;
                            }

                            // Add title (JSON Schema standard) if not present
                            if (!(fieldData as any).title && allDmoField.label) {
                                (fieldData as any).title = allDmoField.label;
                                updated = true;
                            }

                            // Add isPrimaryKey
                            if (allDmoField.isPrimaryKey) {
                                (fieldData as any).isPrimaryKey = true;
                                updated = true;
                                
                                // Update object primary key
                                if (!objectData.primaryKey) {
                                    objectData.primaryKey = fieldApiName;
                                    primaryKeysFound++;
                                }
                            }

                            // Add creationType
                            if (allDmoField.creationType && allDmoField.creationType !== 'Standard') {
                                (fieldData as any).creationType = allDmoField.creationType;
                                updated = true;
                            }

                            // Add usageTag if meaningful
                            if (allDmoField.usageTag && allDmoField.usageTag !== 'None') {
                                (fieldData as any).usageTag = allDmoField.usageTag;
                                updated = true;
                            }
                        }
                    }

                    // Add missing fields from all-dmo.json
                    for (const allDmoField of allDmoDef.fields) {
                        if (!objectData.properties[allDmoField.name]) {
                            objectData.properties[allDmoField.name] = {
                                type: normalizeApiType(allDmoField.type),
                                title: allDmoField.label, // JSON Schema standard
                                description: '', // No description in all-dmo.json
                                creationType: allDmoField.creationType,
                                isPrimaryKey: allDmoField.isPrimaryKey || undefined,
                                usageTag: allDmoField.usageTag !== 'None' ? allDmoField.usageTag : undefined
                            };
                            fileFieldsUpdated++;
                            updated = true;
                        }
                    }
                }

                // Add pluralLabel if available
                if (allDmoDef.pluralLabel && !objectData.pluralLabel) {
                    objectData.pluralLabel = allDmoDef.pluralLabel;
                    updated = true;
                }

                // Add category if available
                if (allDmoDef.category && allDmoDef.category !== 'UNASSIGNED' && !objectData.category) {
                    objectData.category = allDmoDef.category;
                    updated = true;
                }

                // Add metadata flags
                if (allDmoDef.isSegmentable) {
                    objectData.isSegmentable = true;
                    updated = true;
                }

                if (updated) {
                    await fs.writeFile(filePath, JSON.stringify(fileData, null, 2), 'utf-8');
                    enhancedCount++;
                    fieldsUpdated += fileFieldsUpdated;
                    console.log(`✓ Enhanced ${objectData.name} (${fileFieldsUpdated} fields updated)`);
                }
            }
        }

        console.log('\n✨ Enhancement complete!\n');
        console.log('📊 Summary:');
        console.log(`   Enhanced objects: ${enhancedCount}`);
        console.log(`   Fields updated: ${fieldsUpdated}`);
        console.log(`   Primary keys found: ${primaryKeysFound}`);

    } catch (error) {
        console.error('❌ Error during enhancement:', error);
        throw error;
    }
}

/**
 * Normalize API type to our schema types
 */
function normalizeApiType(apiType: string): string {
    const typeMap: Record<string, string> = {
        'Text': 'string',
        'Number': 'number',
        'DateTime': 'dateTime',
        'Date': 'date',
        'Boolean': 'boolean',
        'Picklist': 'picklist',
        'MultiPicklist': 'multipicklist',
        'Currency': 'currency',
        'Percent': 'percent',
        'Email': 'email',
        'Phone': 'phone',
        'Url': 'url',
        'TextArea': 'textarea',
        'LongTextArea': 'textarea',
        'RichTextArea': 'richtextarea',
        'Lookup': 'reference',
        'MasterDetail': 'reference'
    };

    return typeMap[apiType] || apiType.toLowerCase();
}

// Run the enhancement
enhanceFromAllDMO().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

