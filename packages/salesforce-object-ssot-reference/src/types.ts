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
 * Represents a Salesforce object from SSOT/DMO APIs
 */
export interface SalesforceObject {
    name: string;
    description: string;
    label?: string;
    properties: {
        [fieldName: string]: SalesforceFieldProperty;
    };
    [key: string]: any;
}

/**
 * Collection of Salesforce objects indexed by name
 */
export interface SalesforceObjectCollection {
    [objectName: string]: SalesforceObject;
}

/**
 * Index entry for a single object
 */
export interface IndexObjectEntry {
    description: string;
    fieldCount: number;
    label?: string;
    file: string;
}

/**
 * Document index containing all SSOT objects
 */
export interface DocumentIndex {
    version: string;
    totalObjects: number;
    generatedAt?: string;
    objects: {
        [objectName: string]: IndexObjectEntry;
    };
}

