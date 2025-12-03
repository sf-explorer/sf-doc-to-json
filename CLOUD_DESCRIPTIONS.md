# Cloud Descriptions

Each Salesforce Cloud has a descriptive summary that helps developers understand its purpose and the types of objects it contains.

## All Cloud Descriptions

### Core Salesforce
Standard Salesforce objects including Account, Contact, Opportunity, Case, Lead, and other core CRM functionality.

### Financial Services Cloud
Objects for financial services including banking, wealth management, insurance, client relationships, and financial accounts.

### Health Cloud
Objects for healthcare and life sciences including patient care, clinical data, care plans, and health assessments.

### Consumer Goods Cloud
Objects for consumer goods and retail including store operations, promotions, product assortment, and retail execution.

### Manufacturing Cloud
Objects for manufacturing operations including sales agreements, forecasting, production planning, and partner management.

### Automotive Cloud
Objects for automotive industry including vehicle inventory, sales, service, warranties, and dealership management.

### Education Cloud
Objects for educational institutions including student recruitment, enrollment, academic programs, and alumni relations.

### Energy and Utilities Cloud
Objects for energy and utility companies including meter management, billing, consumption tracking, and grid operations.

### Public Sector Cloud
Objects for government and public sector organizations including permits, inspections, and regulatory compliance.

### Nonprofit Cloud
Objects for nonprofit organizations including fundraising, donor management, grant tracking, and program management.

### Net Zero Cloud
Objects for sustainability management, carbon accounting, emissions tracking, and environmental reporting.

### Field Service Lightning
Objects for managing field service operations, work orders, service appointments, and mobile workforce.

### Loyalty
Objects for loyalty program management including member enrollment, points, rewards, and promotions.

### Scheduler
Objects for scheduling appointments, managing availability, and coordinating resources.

### Tooling API
Objects for metadata management, deployment, and development operations.

### Metadata API
Salesforce metadata types including ApexClass, CustomObject, Flow, and other components used in deployments and package development.

### Feedback Management
Objects for collecting, managing, and analyzing customer feedback and survey responses.

### Sales Cloud
Objects for sales operations including leads, opportunities, quotes, forecasts, and sales performance management.

### Service Cloud
Objects for customer service and support including cases, knowledge articles, service contracts, and omnichannel routing.

## Accessing Descriptions Programmatically

When you load a cloud index file, the description is included:

```typescript
import { promises as fs } from 'fs';

const cloudData = JSON.parse(
  await fs.readFile('./doc/core-salesforce.json', 'utf-8')
);

console.log(cloudData.cloud);        // "Core Salesforce"
console.log(cloudData.description);  // "Standard Salesforce objects including..."
console.log(cloudData.objectCount);  // 1717
```

## In Configuration

These descriptions are also available in the source configuration:

```typescript
import { CONFIGURATION } from '@sf-explorer/salesforce-object-reference';

// Access descriptions from configuration
Object.entries(CONFIGURATION).forEach(([key, config]) => {
  console.log(`${config.label}: ${config.description}`);
});
```

