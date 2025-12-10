#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Mapping between cloud JSON filenames and ERD template values from @sf-explorer/salesforce-data-models
 */
const erdMappings: Record<string, { template: string; label: string }> = {
  'service-cloud.json': { 
    template: 'serviceCloud', 
    label: 'Service Cloud' 
  },
  'sales-cloud.json': { 
    template: 'salescloud', 
    label: 'Sales Cloud' 
  },
  'data-cloud.json': { 
    template: 'datacloud', 
    label: 'SSOT Model' 
  },
  'energy-and-utilities-cloud.json': { 
    template: 'euc', 
    label: 'EUC Core Data Model' 
  },
  'field-service-lightning.json': { 
    template: 'fieldService', 
    label: 'FSL Core Data Model' 
  },
  'financial-services-cloud.json': { 
    template: 'insurancePolicy', 
    label: 'Insurance Data Model' 
  },
  'shield.json': { 
    template: 'shield', 
    label: 'Real Time Event Monitoring' 
  },
  'revenue-lifecycle-management.json': {
    template: 'billingAccounting',
    label: 'Invoicing Data Model'
  },
};

const docDir = join(process.cwd(), 'src', 'doc');

function addERDToCloudFile(filename: string, erdInfo: { template: string; label: string }) {
  const filePath = join(docDir, filename);
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const cloudData = JSON.parse(content);
    
    // Build ERD URL
    const erdUrl = `https://app.sf-explorer.com/well-architected.html#sfe.erd?template=${erdInfo.template}`;
    
    // Add or update ERD property
    cloudData.erd = erdUrl;
    
    // Write back to file with proper formatting
    writeFileSync(filePath, JSON.stringify(cloudData, null, 2) + '\n', 'utf-8');
    
    console.log(`✓ Added ERD to ${filename}: ${erdInfo.label}`);
  } catch (error) {
    console.error(`✗ Error processing ${filename}:`, error);
  }
}

// Process all mapped cloud files
console.log('Adding ERD links to cloud JSON files...\n');

for (const [filename, erdInfo] of Object.entries(erdMappings)) {
  addERDToCloudFile(filename, erdInfo);
}

console.log('\n✓ Done! ERD links have been added to cloud files.');
console.log('\nAvailable ERDs from @sf-explorer/salesforce-data-models:');
console.log('  - Service Cloud (serviceCloud)');
console.log('  - Sales Cloud (salescloud)');
console.log('  - Data Cloud SSOT (datacloud)');
console.log('  - Energy & Utilities Cloud (euc)');
console.log('  - Field Service Lightning (fieldService)');
console.log('  - Financial Services Cloud - Insurance (insurancePolicy)');
console.log('  - Shield Event Monitoring (shield)');
console.log('  - Revenue Lifecycle Management - Billing (billingAccounting)');
console.log('\nOther available ERDs (not yet mapped):');
console.log('  - Product Catalog (cpq) - Revenue Cloud');
console.log('  - Know Your Customer (kyc) - Financial Services Cloud');
console.log('  - Agentforce (agentForce)');
console.log('  - Agentforce Feedback (agentfeedback)');
console.log('  - Agent Interactions (agentInteractions)');
console.log('  - Security Model (security)');
console.log('  - Business Rule Engine (businessRuleEngine)');
console.log('  - Discovery Framework (discoveryFramework)');
console.log('  - Action Plan (actionPlan)');

