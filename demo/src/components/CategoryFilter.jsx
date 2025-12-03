import React from 'react';
import { Box, Chip, Typography, Tooltip } from '@mui/material';

const CategoryFilter = ({ categories, selectedCategories, onCategoryChange, cloudDescriptions = {} }) => {
  const handleToggle = (category) => {
    const currentIndex = selectedCategories.indexOf(category);
    const newSelected = [...selectedCategories];

    if (currentIndex === -1) {
      newSelected.push(category);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    onCategoryChange(newSelected);
  };

  const handleClearAll = () => {
    onCategoryChange([]);
  };

  // Map cloud names to friendly display names
  const getFriendlyName = (cloudName) => {
    const nameMap = {
      'core-salesforce': 'Core Salesforce',
      'financial-services-cloud': 'Financial Services',
      'health-cloud': 'Health Cloud',
      'education-cloud': 'Education Cloud',
      'nonprofit-cloud': 'Nonprofit Cloud',
      'manufacturing-cloud': 'Manufacturing',
      'automotive-cloud': 'Automotive',
      'consumer-goods-cloud': 'Consumer Goods',
      'energy-and-utilities-cloud': 'Energy & Utilities',
      'field-service-lightning': 'Field Service',
      'loyalty': 'Loyalty Management',
      'net-zero-cloud': 'Net Zero Cloud',
      'public-sector-cloud': 'Public Sector',
      'sales-cloud': 'Sales Cloud',
      'service-cloud': 'Service Cloud',
      'scheduler': 'Scheduler',
      'feedback-management': 'Feedback Management',
      'revenue-lifecycle-management': 'Revenue Lifecycle Management',
      'tooling-api': 'Tooling API',
      'metadata': 'Metadata API',
      'Metadata API': 'Metadata API'
    };
    return nameMap[cloudName] || cloudName;
  };

  // Get cloud description - use prop if available, otherwise fallback to hardcoded
  const getCloudDescription = (cloudName) => {
    // Try to get from prop first
    if (cloudDescriptions[cloudName]) {
      return cloudDescriptions[cloudName];
    }
    
    // Fallback to hardcoded descriptions
    const descriptionMap = {
      'core-salesforce': 'Standard Salesforce objects including Account, Contact, Opportunity, Case, Lead, and other core CRM functionality.',
      'financial-services-cloud': 'Objects for financial services including banking, wealth management, insurance, client relationships, and financial accounts.',
      'health-cloud': 'Objects for healthcare and life sciences including patient care, clinical data, care plans, and health assessments.',
      'education-cloud': 'Objects for educational institutions including student recruitment, enrollment, academic programs, and alumni relations.',
      'nonprofit-cloud': 'Objects for nonprofit organizations including fundraising, donor management, grant tracking, and program management.',
      'manufacturing-cloud': 'Objects for manufacturing operations including sales agreements, forecasting, production planning, and partner management.',
      'automotive-cloud': 'Objects for automotive industry including vehicle inventory, sales, service, warranties, and dealership management.',
      'consumer-goods-cloud': 'Objects for consumer goods and retail including store operations, promotions, product assortment, and retail execution.',
      'energy-and-utilities-cloud': 'Objects for energy and utility companies including meter management, billing, consumption tracking, and grid operations.',
      'field-service-lightning': 'Objects for managing field service operations, work orders, service appointments, and mobile workforce.',
      'loyalty': 'Objects for loyalty program management including member enrollment, points, rewards, and promotions.',
      'net-zero-cloud': 'Objects for sustainability management, carbon accounting, emissions tracking, and environmental reporting.',
      'public-sector-cloud': 'Objects for government and public sector organizations including permits, inspections, and regulatory compliance.',
      'sales-cloud': 'Objects for sales operations including leads, opportunities, quotes, forecasts, and sales performance management.',
      'service-cloud': 'Objects for customer service and support including cases, knowledge articles, service contracts, and omnichannel routing.',
      'scheduler': 'Objects for scheduling appointments, managing availability, and coordinating resources.',
      'feedback-management': 'Objects for collecting, managing, and analyzing customer feedback and survey responses.',
      'revenue-lifecycle-management': 'Objects for revenue lifecycle management including product configuration, pricing, billing, and revenue recognition.',
      'tooling-api': 'Salesforce Tooling API objects for metadata management, deployment, and development operations.',
      'metadata': 'Salesforce metadata types including ApexClass, CustomObject, Flow, and other components used in deployments and package development.',
      'Metadata API': 'Salesforce metadata types including ApexClass, CustomObject, Flow, and other components used in deployments and package development.'
    };
    return descriptionMap[cloudName] || 'No description available';
  };

  // Get color for each category
  const getCategoryColor = (cloudName) => {
    const colorMap = {
      'core-salesforce': 'primary',
      'financial-services-cloud': 'success',
      'health-cloud': 'error',
      'education-cloud': 'warning',
      'nonprofit-cloud': 'secondary',
      'manufacturing-cloud': 'info',
      'field-service-lightning': 'primary',
      'metadata': 'secondary',
      'Metadata API': 'secondary',
      'tooling-api': 'info'
    };
    return colorMap[cloudName] || 'default';
  };

  return (
    <Box sx={{ mb: 2, p: 2, backgroundColor: '#fafaf9', borderRadius: '4px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#080707' }}>
          Filter by Cloud / Category
        </Typography>
        {selectedCategories.length > 0 && (
          <Chip
            label="Clear All"
            size="small"
            onClick={handleClearAll}
            sx={{ 
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          />
        )}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category);
          return (
            <Tooltip 
              key={category}
              title={getCloudDescription(category)}
              arrow
              placement="top"
              enterDelay={300}
              sx={{
                '& .MuiTooltip-tooltip': {
                  maxWidth: '400px',
                  fontSize: '0.813rem',
                  padding: '12px 16px',
                  backgroundColor: '#16325c',
                }
              }}
            >
              <Chip
                label={getFriendlyName(category)}
                onClick={() => handleToggle(category)}
                color={isSelected ? getCategoryColor(category) : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                size="small"
                sx={{
                  cursor: 'pointer',
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '0.75rem',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
      {selectedCategories.length > 0 && (
        <Typography 
          variant="caption" 
          sx={{ 
            mt: 1, 
            display: 'block', 
            color: '#706e6b',
            fontStyle: 'italic'
          }}
        >
          Showing {selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'}
        </Typography>
      )}
    </Box>
  );
};

export default CategoryFilter;

