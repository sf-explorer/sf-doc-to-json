/**
 * Represents a Salesforce Agentforce action property/parameter
 */
export interface AgentforceActionProperty {
    type: string;
    description?: string;
    required?: boolean;
    default?: string;
    [key: string]: any;
}

/**
 * Represents a Salesforce Agentforce standard action
 */
export interface AgentforceAction {
    name: string;
    description: string;
    label?: string;
    category?: string;
    clouds?: string[]; // Array of clouds this action is available in
    properties: {
        [propertyName: string]: AgentforceActionProperty;
    };
    returnType?: string;
    sourceUrl: string;
    module: string;
    [key: string]: any;
}

/**
 * Collection of Salesforce Agentforce actions indexed by name
 */
export interface AgentforceActionCollection {
    [actionName: string]: AgentforceAction;
}

/**
 * Index entry for a single action
 */
export interface IndexActionEntry {
    description: string;
    propertyCount: number;
    label?: string;
    category?: string;
    clouds?: string[];
    file: string;
    apiName?: string; // API name of the action (from properties["API Name"])
}

/**
 * Document index containing all actions
 */
export interface DocumentIndex {
    version: string;
    totalActions: number;
    generatedAt?: string;
    actions: {
        [actionName: string]: IndexActionEntry;
    };
}

