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
}

export interface DocumentIndex {
    generated: string;
    version: string;
    totalObjects: number;
    totalClouds: number;
    objects: Record<string, ObjectIndexEntry>;
}

export interface DocumentMapping {
    items: any[];
    header: any;
}

export type SalesforceObjectCollection = Record<string, SalesforceObject>;

export interface CloudData {
    [cloudName: string]: SalesforceObjectCollection;
}

