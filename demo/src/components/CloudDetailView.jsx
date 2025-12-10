import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, Typography, IconButton, Chip, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloudIcon from './CloudIcon';
import ObjectExplorer from './ObjectExplorer';

const CloudDetailView = ({ cloudName, cloudMetadata, onBack, allObjects }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleBackClick = () => {
    navigate('/');
  };

  // Helper function for fallback description
  const getCloudDescription = (cloudName) => {
    if (cloudName === 'all') {
      return 'Browse all available Salesforce objects across all clouds and categories.';
    }
    return 'Discover objects and features for this Salesforce cloud.';
  };

  // Get friendly name - just use the cloud name from metadata
  const friendlyName = cloudMetadata[cloudName]?.cloud || cloudName;

  // Get description from metadata
  const description = cloudMetadata[cloudName]?.description || getCloudDescription(cloudName);

  // Accent colors for clouds (UI presentation only)
  const getCloudAccentColor = (cloudName) => {
    if (cloudName === 'all') return '#0176d3';
    
    const colorMap = {
      'Core Salesforce': '#0176d3',
      'Financial Services Cloud': '#06a59a',
      'Health Cloud': '#e83e8c',
      'Education Cloud': '#f59f00',
      'Nonprofit Cloud': '#7f8de1',
      'Manufacturing Cloud': '#5867e8',
      'Automotive Cloud': '#706e6b',
      'Consumer Goods Cloud': '#e9696f',
      'Energy and Utilities Cloud': '#16b378',
      'Field Service Lightning': '#1b96ff',
      'Loyalty': '#ea74a2',
      'Net Zero Cloud': '#3ba755',
      'Public Sector Cloud': '#3c8ce7',
      'Sales Cloud': '#0176d3',
      'Service Cloud': '#00a1e0',
      'Scheduler': '#9050e9',
      'Feedback Management': '#ea74a2',
      'Revenue Lifecycle Management': '#00a8b0',
      'Tooling API': '#706e6b',
      'Metadata API': '#706e6b'
    };
    return colorMap[cloudName] || '#0176d3';
  };

  const accentColor = getCloudAccentColor(cloudName);

  // Filter objects by cloud (or show all if cloudName is 'all')
  const filteredObjects = cloudName === 'all' 
    ? allObjects 
    : allObjects.filter(obj => {
        const objectClouds = obj.clouds || [obj.cloud];
        return objectClouds.includes(cloudName);
      });

  return (
    <Box>
      {/* Header with back button */}
      <Box 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          pb: 2,
          borderBottom: `3px solid ${accentColor}`,
        }}
      >
        <IconButton 
          onClick={handleBackClick}
          sx={{
            color: accentColor,
            '&:hover': {
              backgroundColor: `${accentColor}15`,
            }
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        <Box
          sx={{
            backgroundColor: `${accentColor}10`,
            borderRadius: '0.75rem',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '64px',
            minHeight: '64px',
          }}
        >
          <CloudIcon 
            cloudName={cloudName === 'all' ? 'core-salesforce' : cloudName}
            size={40} 
            metadata={cloudMetadata[cloudName]} 
          />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              color: accentColor,
              mb: 0.5,
              fontSize: { xs: '1.5rem', md: '2rem' }
            }}
          >
            {friendlyName}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#706e6b',
              lineHeight: 1.5
            }}
          >
            {description}
          </Typography>
        </Box>

        <Chip 
          label={`${cloudMetadata[cloudName]?.objectCount || filteredObjects.length} Objects`}
          sx={{
            backgroundColor: `${accentColor}15`,
            color: accentColor,
            fontWeight: 600,
            fontSize: '0.875rem',
            height: '32px'
          }}
        />
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9375rem',
              minHeight: '48px',
            },
            '& .Mui-selected': {
              color: `${accentColor} !important`,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: accentColor,
              height: '3px',
            }
          }}
        >
          <Tab label="Objects" />
          <Tab label="Overview" />
          <Tab label="Documentation" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box>
        {activeTab === 0 && (
          <ObjectExplorer 
            initialObjects={filteredObjects}
            cloudMetadata={cloudMetadata}
            hideCloudFilter={true}
            cloudName={cloudName}
          />
        )}
        {activeTab === 1 && (
          <Box sx={{ p: 3, backgroundColor: '#fafaf9', borderRadius: '0.5rem' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              {friendlyName} Overview
            </Typography>
            <Typography variant="body1" sx={{ color: '#706e6b', mb: 2 }}>
              {description}
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" sx={{ color: '#706e6b' }}>
                <strong>Total Objects:</strong> {filteredObjects.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#706e6b' }}>
                <strong>Standard Objects:</strong> {filteredObjects.filter(obj => !obj.isCustom).length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#706e6b' }}>
                <strong>Custom Objects:</strong> {filteredObjects.filter(obj => obj.isCustom).length}
              </Typography>
            </Box>

            {/* Entity Relationship Diagram */}
            {cloudMetadata[cloudName]?.erd && (
              <Box sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Entity Relationship Diagram
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => window.open(cloudMetadata[cloudName].erd, '_blank')}
                    sx={{
                      textTransform: 'none',
                      borderColor: accentColor,
                      color: accentColor,
                      '&:hover': {
                        borderColor: accentColor,
                        backgroundColor: `${accentColor}10`,
                      }
                    }}
                  >
                    Open in Full Screen
                  </Button>
                </Box>
                <Box 
                  sx={{ 
                    width: '100%',
                    height: '600px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    backgroundColor: '#fff'
                  }}
                >
                  <iframe
                    src={cloudMetadata[cloudName].erd}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                    title={`${friendlyName} Entity Relationship Diagram`}
                    allow="fullscreen"
                  />
                </Box>
              </Box>
            )}
          </Box>
        )}
        {activeTab === 2 && (
          <Box sx={{ p: 3, backgroundColor: '#fafaf9', borderRadius: '0.5rem' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Documentation
            </Typography>
            <Typography variant="body1" sx={{ color: '#706e6b', mb: 2 }}>
              Explore the official Salesforce documentation for {friendlyName}.
            </Typography>
            <Typography variant="body2" sx={{ color: '#706e6b', fontStyle: 'italic' }}>
              Documentation links and resources will be available here.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CloudDetailView;

