import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

const CategoryFilter = ({ categories, selectedCategories, onCategoryChange }) => {
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
      'scheduler': 'Scheduler',
      'feedback-management': 'Feedback Management'
    };
    return nameMap[cloudName] || cloudName;
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
            <Chip
              key={category}
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

