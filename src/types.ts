export interface FieldProperty {
    type: string;
    description: string;
}

export interface SalesforceObject {
    name: string;
    description: string;
    properties: Record<string, FieldProperty>;
    module: string;
    sourceUrl?: string;
    clouds?: string[]; // Track multiple clouds if object appears in multiple places
    accessRules?: string; // Special Access Rules / permissions required to access this object
}

export interface CloudConfiguration {
    label: string;
    description?: string;
}

export interface ObjectIndexEntry {
    cloud: string;
    file: string;
    description: string;
    fieldCount: number;
    keyPrefix?: string;
    label?: string;
    sourceUrl?: string;
    icon?: string;
    clouds?: string[]; // Track all clouds this object appears in
    accessRules?: string; // Special Access Rules / permissions required
}

export interface CloudIndexEntry {
    cloud: string;
    fileName: string;
    description?: string;
    objectCount?: number;
    emoji?: string;
    iconFile?: string;
}

export interface DocumentIndex {
    generated: string;
    version: string;
    totalObjects: number;
    totalClouds: number;
    objects: Record<string, ObjectIndexEntry>;
    clouds?: Record<string, CloudIndexEntry>; // Maps cloud file name to metadata (optional for backwards compatibility)
}

export interface DocumentMapping {
    items: any[];
    header: any;
}

export type SalesforceObjectCollection = Record<string, SalesforceObject>;

export interface CloudData {
    [cloudName: string]: SalesforceObjectCollection;
}

