/**
 * Represents a Salesforce field property
 */
export interface SalesforceFieldProperty {
    type: string;
    description?: string;
    label?: string;
    [key: string]: any;
}

/**
 * Represents a Salesforce Metadata API object
 */
export interface SalesforceMetadataObject {
    name: string;
    description: string;
    label?: string;
    properties: {
        [fieldName: string]: SalesforceFieldProperty;
    };
    [key: string]: any;
}

/**
 * Collection of Salesforce metadata objects indexed by name
 */
export interface SalesforceMetadataCollection {
    [objectName: string]: SalesforceMetadataObject;
}

/**
 * Index entry for a single metadata object
 */
export interface IndexObjectEntry {
    description: string;
    fieldCount: number;
    label?: string;
    file: string;
}

/**
 * Document index containing all metadata objects
 */
export interface DocumentIndex {
    version: string;
    totalObjects: number;
    generatedAt?: string;
    objects: {
        [objectName: string]: IndexObjectEntry;
    };
}


