import React, { useMemo, useState, useEffect } from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import CloudIcon from './CloudIcon';
import { loadIndex as loadActionsIndex } from '@sf-explorer/salesforce-agentforce-actions-reference'; 

const CloudTiles = ({ categories, onCloudSelect, cloudMetadata = {}, allObjects = [] }) => {
  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(true);

  const handleCloudClick = (cloudName) => {
    onCloudSelect(cloudName);
  };

  // Load actions
  useEffect(() => {
    const loadActions = async () => {
      try {
     
        const index = await loadActionsIndex();
        
        if (index && index.actions) {
          const actionsList = Object.entries(index.actions)
            .map(([name, metadata]) => ({
              name: name,
              category: metadata.category || 'Uncategorized',
              clouds: metadata.clouds || ['Core Salesforce'],
              apiName: metadata.apiName || ''
            }))
            .filter(action => action.apiName && action.apiName.trim() !== ''); // Filter out actions without API Name
          setActions(actionsList);
        }
      } catch (error) {
        console.error('Error loading actions:', error);
      } finally {
        setLoadingActions(false);
      }
    };
    
    loadActions();
  }, []);

  // Map cloud names to action cloud names (same mapping as CloudDetailView)
  const getActionCloudNames = (cloudName) => {
    const cloudMapping = {
      // Sales/Service Cloud - actions are tagged as Core Salesforce
      'Sales Cloud': ['Core Salesforce'],
      'sales-cloud': ['Core Salesforce'],
      'Service Cloud': ['Core Salesforce'],
      'service-cloud': ['Core Salesforce'],
      'Core Salesforce': ['Core Salesforce'],
      'core-salesforce': ['Core Salesforce'],
      
      // Cloud name variations - map UI names to action data names
      'Financial Services': ['Financial Services Cloud'],
      'financial-services-cloud': ['Financial Services Cloud'],
      'Financial Services Cloud': ['Financial Services Cloud'],
      
      'Manufacturing': ['Manufacturing Cloud'],
      'manufacturing-cloud': ['Manufacturing Cloud'],
      'Manufacturing Cloud': ['Manufacturing Cloud'],
      
      'Automotive': ['Automotive Cloud'],
      'automotive-cloud': ['Automotive Cloud'],
      'Automotive Cloud': ['Automotive Cloud'],
      
      'Field Service': ['Field Service Lightning'],
      'field-service-lightning': ['Field Service Lightning'],
      'Field Service Lightning': ['Field Service Lightning'],
      
      'Public Sector': ['Public Sector Cloud'],
      'public-sector-cloud': ['Public Sector Cloud'],
      'Public Sector Cloud': ['Public Sector Cloud'],
      
      'Loyalty Management': ['Loyalty'],
      'loyalty': ['Loyalty'],
      'Loyalty': ['Loyalty'],
      
      'Net Zero Cloud': ['Net Zero Cloud'],
      'net-zero-cloud': ['Net Zero Cloud'],
      
      'Education Cloud': ['Education Cloud'],
      'education-cloud': ['Education Cloud'],
      
      'Health Cloud': ['Health Cloud'],
      'health-cloud': ['Health Cloud'],
      
      'Nonprofit Cloud': ['Nonprofit Cloud'],
      'nonprofit-cloud': ['Nonprofit Cloud'],
      
      'Scheduler': ['Scheduler'],
      'scheduler': ['Scheduler'],
      
      'Marketing Cloud': ['Marketing Cloud'],
      'marketing-cloud': ['Marketing Cloud'],
      
      'Data Cloud': ['Data Cloud'],
      'data-cloud': ['Data Cloud'],
      
      'Agentforce for Service': ['Agentforce for Service'],
      'agentforce-for-service': ['Agentforce for Service'],
      
      'AI Agent for Employees': ['AI Agent for Employees'],
      'ai-agent-for-employees': ['AI Agent for Employees'],
    };
    return cloudMapping[cloudName] || [cloudName];
  };

  // Calculate statistics for each cloud
  const cloudStats = useMemo(() => {
    const stats = {};
    
    categories.forEach(cloudName => {
      const cloudObjects = allObjects.filter(obj => {
        const objectClouds = obj.clouds || [obj.cloud];
        return objectClouds.includes(cloudName);
      });
      
      const totalFields = cloudObjects.reduce((sum, obj) => sum + (obj.fieldCount || 0), 0);
      
      // Special handling for Sales Cloud and Service Cloud - they map to Core Salesforce
      // but we only want actions with the matching category
      let cloudActions;
      if (cloudName === 'Sales Cloud' || cloudName === 'sales-cloud') {
        cloudActions = actions.filter(action => action.category === 'Sales');
      } else if (cloudName === 'Service Cloud' || cloudName === 'service-cloud') {
        cloudActions = actions.filter(action => action.category === 'Service');
      } else {
        // For other clouds, use the cloud name mapping
        const actionCloudNames = getActionCloudNames(cloudName);
        
        cloudActions = actions.filter(action => {
          const actionClouds = action.clouds || ['Core Salesforce'];
          
          // Check if any of the mapped cloud names match
          return actionCloudNames.some(mappedCloud => actionClouds.includes(mappedCloud));
        });
      }
      
      stats[cloudName] = {
        objectCount: cloudObjects.length,
        fieldCount: totalFields,
        actionCount: cloudActions.length
      };
    });
    
    // Stats for "All Objects"
    stats['all'] = {
      objectCount: allObjects.length,
      fieldCount: allObjects.reduce((sum, obj) => sum + (obj.fieldCount || 0), 0),
      actionCount: actions.length
    };
    
    return stats;
  }, [categories, allObjects, actions]);

  // Sort categories by field count descending
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aFields = cloudStats[a]?.fieldCount || 0;
      const bFields = cloudStats[b]?.fieldCount || 0;
      return bFields - aFields; // Descending order
    });
  }, [categories, cloudStats]);

  // Get cloud description from metadata
  const getCloudDescription = (cloudName) => {
    return cloudMetadata[cloudName]?.description || 'Discover objects and features for this Salesforce cloud.';
  };

  // Get accent color - use a default Salesforce blue
  const getCloudAccentColor = () => {
    return '#0176d3'; // Salesforce blue
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700, 
            color: '#080707',
            fontSize: '1.125rem',
            mb: 0.5
          }}
        >
          Salesforce Clouds & Categories
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#706e6b',
            fontSize: '0.875rem'
          }}
        >
          Select a cloud to explore its objects and features
        </Typography>
      </Box>

      {/* Tiles Grid using Material UI Grid */}
      <Grid container spacing={2}>
        {/* All Objects Tile - Always First */}
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card
            onClick={() => handleCloudClick('all')}
            sx={{
              cursor: 'pointer',
              height: '100%',
              minHeight: '240px',
              position: 'relative',
              border: '2px solid #0176d3',
              borderRadius: '0.5rem',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 8px rgba(1, 118, 211, 0.15)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(1, 118, 211, 0.25)',
                transform: 'translateY(-4px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              }
            }}
          >
            {/* Accent bar at top */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #0176d3 0%, #1b96ff 100%)',
                borderTopLeftRadius: '0.5rem',
                borderTopRightRadius: '0.5rem',
              }}
            />

            <CardContent sx={{ p: 2, pb: '16px !important', pt: 2.5, display: 'flex', flexDirection: 'column', height: 'calc(100% - 4px)' }}>
              {/* Icon and Title */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  mb: 1.5,
                  gap: 1.5
                }}
              >
                <Box
                  sx={{
                    backgroundColor: '#e3f2fd',
                    borderRadius: '0.5rem',
                    p: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '56px',
                    minHeight: '56px',
                    flexShrink: 0,
                  }}
                >
                  <ViewModuleIcon sx={{ fontSize: 32, color: '#0176d3' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant="h6"
                    sx={{ 
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      lineHeight: 1.3,
                      color: '#0176d3',
                      mb: 0,
                      wordBreak: 'break-word'
                    }}
                  >
                    All Objects
                  </Typography>
                </Box>
              </Box>

              {/* Description */}
              <Typography 
                variant="body2"
                sx={{ 
                  color: '#706e6b',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  mb: 'auto',
                  flex: 1
                }}
              >
                Browse all available Salesforce objects across all clouds and categories in one comprehensive view.
              </Typography>

              {/* Footer with Statistics */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 2,
                  pt: 1.5,
                  mt: 1.5,
                  borderTop: '1px solid #e3f2fd',
                  flexWrap: 'wrap'
                }}
              >
                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      color: '#0176d3',
                      fontSize: '1.25rem',
                      lineHeight: 1
                    }}
                  >
                    {cloudStats['all']?.objectCount || 0}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#706e6b',
                      fontSize: '0.6875rem',
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}
                  >
                    Objects
                  </Typography>
                </Box>
                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      color: '#0176d3',
                      fontSize: '1.25rem',
                      lineHeight: 1
                    }}
                  >
                    {(cloudStats['all']?.fieldCount || 0).toLocaleString()}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#706e6b',
                      fontSize: '0.6875rem',
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}
                  >
                    Fields
                  </Typography>
                </Box>
                {!loadingActions && (cloudStats['all']?.actionCount || 0) > 0 && (
                  <Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 700, 
                        color: '#0176d3',
                        fontSize: '1.25rem',
                        lineHeight: 1
                      }}
                    >
                      {cloudStats['all']?.actionCount || 0}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#706e6b',
                        fontSize: '0.6875rem',
                        textTransform: 'uppercase',
                        fontWeight: 600
                      }}
                    >
                      Actions
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cloud Tiles */}
        {sortedCategories.map((category) => {
          const displayName = category; // Category already contains the display name
          const description = getCloudDescription(category);
          const accentColor = getCloudAccentColor();
          const stats = cloudStats[category] || { objectCount: 0, fieldCount: 0, actionCount: 0 };

          return (
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={4} 
              lg={3} 
              key={category}
            >
              <Card
                onClick={() => handleCloudClick(category)}
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  minHeight: '240px',
                  position: 'relative',
                  border: '1px solid #dddbda',
                  borderRadius: '0.5rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    border: `2px solid ${accentColor}`,
                    boxShadow: `0 0 0 3px ${accentColor}15, 0 6px 12px rgba(0,0,0,0.15)`,
                    transform: 'translateY(-4px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  }
                }}
              >
                {/* Accent bar at top */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    backgroundColor: accentColor,
                    borderTopLeftRadius: '0.5rem',
                    borderTopRightRadius: '0.5rem',
                  }}
                />

                <CardContent sx={{ p: 2, pb: '16px !important', pt: 2.5, display: 'flex', flexDirection: 'column', height: 'calc(100% - 4px)' }}>
                  {/* Icon and Title */}
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      mb: 1.5,
                      gap: 1.5
                    }}
                  >
                    <Box
                      sx={{
                        backgroundColor: `${accentColor}10`,
                        borderRadius: '0.5rem',
                        p: 1.25,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '56px',
                        minHeight: '56px',
                        flexShrink: 0,
                      }}
                    >
                      <CloudIcon 
                        cloudName={category} 
                        size={32} 
                        metadata={cloudMetadata[category]} 
                      />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="h6"
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '0.9375rem',
                          lineHeight: 1.3,
                          color: '#080707',
                          mb: 0,
                          wordBreak: 'break-word'
                        }}
                      >
                        {displayName}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Description */}
                  <Typography 
                    variant="body2"
                    sx={{ 
                      color: '#706e6b',
                      fontSize: '0.8125rem',
                      lineHeight: 1.5,
                      mb: 'auto',
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {description}
                  </Typography>

                  {/* Footer with Statistics */}
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      gap: 2,
                      pt: 1.5,
                      mt: 1.5,
                      borderTop: `1px solid ${accentColor}15`,
                      flexWrap: 'wrap'
                    }}
                  >
                    <Box>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700, 
                          color: accentColor,
                          fontSize: '1.25rem',
                          lineHeight: 1
                        }}
                      >
                        {stats.objectCount}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#706e6b',
                          fontSize: '0.6875rem',
                          textTransform: 'uppercase',
                          fontWeight: 600
                        }}
                      >
                        Objects
                      </Typography>
                    </Box>
                    <Box>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700, 
                          color: accentColor,
                          fontSize: '1.25rem',
                          lineHeight: 1
                        }}
                      >
                        {stats.fieldCount.toLocaleString()}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#706e6b',
                          fontSize: '0.6875rem',
                          textTransform: 'uppercase',
                          fontWeight: 600
                        }}
                      >
                        Fields
                      </Typography>
                    </Box>
                    {!loadingActions && (stats.actionCount || 0) > 0 && (
                      <Box>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700, 
                            color: accentColor,
                            fontSize: '1.25rem',
                            lineHeight: 1
                          }}
                        >
                          {stats.actionCount || 0}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: '#706e6b',
                            fontSize: '0.6875rem',
                            textTransform: 'uppercase',
                            fontWeight: 600
                          }}
                        >
                          Actions
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default CloudTiles;

