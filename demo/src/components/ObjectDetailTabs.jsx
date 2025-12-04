import React, { useState, useMemo } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import FieldDetail from './FieldDetail';
import SimpleGraphVisualization from './SimpleGraphVisualization';

const ObjectDetailTabs = ({ object, onObjectSelect, availableObjects, cloudMetadata = {} }) => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // Check if the object has any relationships (parent or child)
  const hasRelationships = useMemo(() => {
    // Check for parent relationships (fields with references)
    const hasParentRelationships = Object.values(object.properties || {}).some(field => 
      field.referenceTo || field['x-object']
    );
    
    // Check for child relationships
    const hasChildRelationships = object.childRelationships && 
      Array.isArray(object.childRelationships) && 
      object.childRelationships.length > 0;
    
    return hasParentRelationships || hasChildRelationships;
  }, [object]);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={selectedTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
              minHeight: '48px',
              color: '#3e3e3c',
              '&.Mui-selected': {
                color: '#0176d3',
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#0176d3',
              height: '3px',
            }
          }}
        >
          <Tab 
            label="Fields" 
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
            }
            iconPosition="start"
          />
          {hasRelationships && (
            <Tab 
              label="Relationships Graph" 
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
              }
              iconPosition="start"
            />
          )}
        </Tabs>
      </Box>

      {selectedTab === 0 && (
        <FieldDetail 
          object={object}
          onObjectSelect={onObjectSelect}
          availableObjects={availableObjects}
          cloudMetadata={cloudMetadata}
        />
      )}

      {selectedTab === 1 && hasRelationships && (
        <Box sx={{ mt: 2 }}>
          <SimpleGraphVisualization objectName={object.apiName} />
        </Box>
      )}
    </Box>
  );
};

export default ObjectDetailTabs;

