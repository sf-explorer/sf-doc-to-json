import { CloudConfiguration } from './types.js';

export const CHUNK_SIZE = 50;

export const CONFIGURATION: Record<string, CloudConfiguration> = {
    'atlas.en-us.object_reference.meta': {
        label: 'Core Salesforce',
        description: 'Standard Salesforce objects including Account, Contact, Opportunity, Case, Lead, and other core CRM functionality.'
    },
    'atlas.en-us.api_tooling.meta': {
        label: 'Tooling API',
        description: 'Salesforce Tooling API objects for metadata management, deployment, and development operations.'
    },
    'atlas.en-us.api_metadata.meta': {
        label: 'Metadata API',
        description: 'Salesforce metadata types including ApexClass, CustomObject, Flow, and other components used in deployments and package development.'
    },
    'atlas.en-us.salesforce_feedback_management_dev_guide.meta': {
        label: 'Feedback Management',
        description: 'Objects for collecting, managing, and analyzing customer feedback and survey responses.'
    },
    'atlas.en-us.salesforce_scheduler_developer_guide.meta': {
        label: 'Scheduler',
        description: 'Objects for scheduling appointments, managing availability, and coordinating resources.'
    },
    'atlas.en-us.field_service_dev.meta': {
        label: 'Field Service Lightning',
        description: 'Objects for managing field service operations, work orders, service appointments, and mobile workforce.'
    },
    'atlas.en-us.loyalty.meta': {
        label: 'Loyalty',
        description: 'Objects for loyalty program management including member enrollment, points, rewards, and promotions.'
    },
    'atlas.en-us.psc_api.meta': {
        label: 'Public Sector Cloud',
        description: 'Objects for government and public sector organizations including permits, inspections, and regulatory compliance.'
    },
    'atlas.en-us.netzero_cloud_dev_guide.meta': {
        label: 'Net Zero Cloud',
        description: 'Objects for sustainability management, carbon accounting, emissions tracking, and environmental reporting.'
    },
    'atlas.en-us.edu_cloud_dev_guide.meta': {
        label: 'Education Cloud',
        description: 'Objects for educational institutions including student recruitment, enrollment, academic programs, and alumni relations.'
    },
    'atlas.en-us.automotive_cloud.meta': {
        label: 'Automotive Cloud',
        description: 'Objects for automotive industry including vehicle inventory, sales, service, warranties, and dealership management.'
    },
    'atlas.en-us.eu_developer_guide.meta': {
        label: 'Energy and Utilities Cloud',
        description: 'Objects for energy and utility companies including meter management, billing, consumption tracking, and grid operations.'
    },
    'atlas.en-us.health_cloud_object_reference.meta': {
        label: 'Health Cloud',
        description: 'Objects for healthcare and life sciences including patient care, clinical data, care plans, and health assessments.'
    },
    'atlas.en-us.retail_api.meta': {
        label: 'Consumer Goods Cloud',
        description: 'Objects for consumer goods and retail including store operations, promotions, product assortment, and retail execution.'
    },
    'atlas.en-us.financial_services_cloud_object_reference.meta': {
        label: 'Financial Services Cloud',
        description: 'Objects for financial services including banking, wealth management, insurance, client relationships, and financial accounts.'
    },
    'atlas.en-us.mfg_api_devguide.meta': {
        label: 'Manufacturing Cloud',
        description: 'Objects for manufacturing operations including sales agreements, forecasting, production planning, and partner management.'
    },
    'atlas.en-us.nonprofit_cloud.meta': {
        label: 'Nonprofit Cloud',
        description: 'Objects for nonprofit organizations including fundraising, donor management, grant tracking, and program management.'
    },
    'atlas.en-us.revenue_lifecycle_management_dev_guide.meta': {
        label: 'Revenue Lifecycle Management',
        description: 'Objects for revenue lifecycle management including product configuration, pricing, billing, and revenue recognition.'
    },
    'atlas.en-us.sales_cloud.meta': {
        label: 'Sales Cloud',
        description: 'Objects for sales operations including leads, opportunities, quotes, forecasts, and sales performance management.'
    },
    'atlas.en-us.service_cloud.meta': {
        label: 'Service Cloud',
        description: 'Objects for customer service and support including cases, knowledge articles, service contracts, and omnichannel routing.'
    }
};
