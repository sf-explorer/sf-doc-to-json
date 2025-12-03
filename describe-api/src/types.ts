/**
 * Types for Salesforce Describe API integration
 */

export interface SalesforceConnection {
  loginUrl: string;
  username?: string;
  password?: string;
  securityToken?: string;
  // OAuth2 authentication (alternative to username/password)
  accessToken?: string;
  instanceUrl?: string;
  // OAuth2 client credentials
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface DescribeFieldResult {
  name: string;
  label: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  byteLength?: number;
  picklistValues?: PicklistValue[];
  referenceTo?: string[];
  relationshipName?: string | null;
  nillable?: boolean;
  updateable?: boolean;
  createable?: boolean;
  calculated?: boolean;
  defaultValue?: any;
  defaultValueFormula?: string | null;
  restrictedPicklist?: boolean;
  namePointing?: boolean;
  custom?: boolean;
  externalId?: boolean;
  unique?: boolean;
  caseSensitive?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  inlineHelpText?: string | null;
  deprecatedAndHidden?: boolean;
  permissionable?: boolean;  // Field-level security
  autoNumber?: boolean;
}

export interface PicklistValue {
  active: boolean;
  defaultValue: boolean;
  label: string;
  validFor: any;
  value: string;
}

export interface IconInfo {
  contentType?: string;
  height?: number;
  width?: number;
  theme?: string;
  url?: string;
}

export interface ThemeInfo {
  color?: string;
  iconUrl?: string;
}

export interface DescribeSObjectResult {
  name: string;
  label: string;
  labelPlural: string;
  keyPrefix?: string;
  custom: boolean;
  fields: DescribeFieldResult[];
  childRelationships?: ChildRelationship[];
  urls: { [key: string]: string };
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
  queryable: boolean;
  searchable: boolean;
  activateable: boolean;
  deprecatedAndHidden: boolean;
  // Icon metadata (from UI API)
  themeInfo?: ThemeInfo;
}

export interface ChildRelationship {
  cascadeDelete: boolean;
  childSObject: string;
  deprecatedAndHidden: boolean;
  field: string;
  junctionIdListNames: string[];
  junctionReferenceTo: string[];
  relationshipName: string | null;
  restrictedDelete: boolean;
}

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  format?: string;
  enum?: string[];
  'x-object'?: string;
  'x-objects'?: string[];
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  calculated?: boolean;
  permissionable?: boolean;
  autoNumber?: boolean;
  unique?: boolean;
  externalId?: boolean;
}

export interface JsonSchema {
  $schema?: string;
  title: string;
  description?: string;
  type: 'object';
  properties: { [key: string]: JsonSchemaProperty };
  required?: string[];
  'x-salesforce'?: {
    name: string;
    label: string;
    labelPlural: string;
    keyPrefix?: string;
    custom: boolean;
    createable: boolean;
    updateable: boolean;
    deletable: boolean;
    queryable: boolean;
    searchable: boolean;
    // Icon metadata
    iconUrl?: string;
    iconColor?: string;
  };
  'x-child-relations'?: Array<{
    childObject: string;
    field: string;
    relationshipName: string | null;
    cascadeDelete: boolean;
  }>;
}

