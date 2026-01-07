import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, Typography, IconButton, Chip, Button, Paper, useMediaQuery, useTheme, CircularProgress } from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloudIcon from './CloudIcon';
import ObjectExplorer from './ObjectExplorer';
import { loadIndex as loadActionsIndex, getAction } from '@sf-explorer/salesforce-agentforce-actions-reference';

const CloudDetailView = ({ cloudName, cloudMetadata, onBack, allObjects }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(true);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleBackClick = () => {
    navigate('/');
  };

  // Load actions for this cloud
  useEffect(() => {
    const loadActions = async () => {
      try {
        setLoadingActions(true);
        const index = await loadActionsIndex();
        
        if (index && index.actions) {
          const actionsList = Object.entries(index.actions)
            .map(([name, metadata]) => ({
              name: name,
              description: metadata.description || '',
              category: metadata.category || 'Uncategorized',
              clouds: metadata.clouds || ['Core Salesforce'],
              propertyCount: metadata.propertyCount || 0,
              sourceUrl: metadata.sourceUrl || '',
              apiName: metadata.apiName || '',
              referenceActionType: metadata.referenceActionType || ''
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

  // Map cloud names to action cloud names (some clouds use different names in actions)
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

  // Filter actions by cloud
  const cloudActions = useMemo(() => {
    if (cloudName === 'all') {
      return actions;
    }
    
    // Normalize cloud name for comparison (handle both hyphenated and spaced versions)
    const normalizedCloudName = cloudName?.toLowerCase().replace(/\s+/g, '-');
    
    // Special handling for Sales Cloud and Service Cloud - they map to Core Salesforce
    // but we only want actions with the matching category
    if (normalizedCloudName === 'sales-cloud' || cloudName === 'Sales Cloud') {
      const filtered = actions.filter(action => {
        const category = action.category || '';
        return category === 'Sales';
      });
      console.log(`Sales Cloud filter: cloudName="${cloudName}", normalized="${normalizedCloudName}", found ${filtered.length} actions (from ${actions.length} total)`);
      if (filtered.length === 0 && actions.length > 0) {
        console.log('Sample action categories:', actions.slice(0, 5).map(a => ({ name: a.name, category: a.category })));
      }
      return filtered;
    }
    
    if (normalizedCloudName === 'service-cloud' || cloudName === 'Service Cloud') {
      const filtered = actions.filter(action => {
        const category = action.category || '';
        return category === 'Service';
      });
      console.log(`Service Cloud filter: cloudName="${cloudName}", normalized="${normalizedCloudName}", found ${filtered.length} actions (from ${actions.length} total)`);
      return filtered;
    }
    
    // For other clouds, use the cloud name mapping
    const actionCloudNames = getActionCloudNames(cloudName);
    
    return actions.filter(action => {
      const actionClouds = action.clouds || ['Core Salesforce'];
      
      // Check if any of the mapped cloud names match
      return actionCloudNames.some(mappedCloud => actionClouds.includes(mappedCloud));
    });
  }, [actions, cloudName]);

  // Calculate stats
  const stats = useMemo(() => {
    const cloudObjects = cloudName === 'all' 
      ? allObjects 
      : allObjects.filter(obj => {
          const objectClouds = obj.clouds || [obj.cloud];
          return objectClouds.includes(cloudName);
        });
    
    const totalFields = cloudObjects.reduce((sum, obj) => sum + (obj.fieldCount || 0), 0);
    const totalActionParams = cloudActions.reduce((sum, action) => sum + (action.propertyCount || 0), 0);
    
    return {
      objectCount: cloudObjects.length,
      fieldCount: totalFields,
      actionCount: cloudActions.length,
      totalActionParams: totalActionParams
    };
  }, [allObjects, cloudActions, cloudName]);

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

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`${stats.objectCount} Objects`}
            sx={{
              backgroundColor: `${accentColor}15`,
              color: accentColor,
              fontWeight: 600,
              fontSize: '0.875rem',
              height: '32px'
            }}
          />
          <Chip 
            label={`${stats.fieldCount.toLocaleString()} Fields`}
            sx={{
              backgroundColor: `${accentColor}15`,
              color: accentColor,
              fontWeight: 600,
              fontSize: '0.875rem',
              height: '32px'
            }}
          />
          {!loadingActions && stats.actionCount > 0 && (
            <Chip 
              label={`${stats.actionCount} Actions`}
              sx={{
                backgroundColor: `${accentColor}15`,
                color: accentColor,
                fontWeight: 600,
                fontSize: '0.875rem',
                height: '32px'
              }}
            />
          )}
        </Box>
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
          {stats.actionCount > 0 && <Tab label={`Actions (${stats.actionCount})`} />}
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
        {/* Actions tab - only shown if there are actions */}
        {activeTab === 1 && stats.actionCount > 0 && (
          <ActionsListForCloud 
            cloudName={cloudName}
            cloudActions={cloudActions}
            accentColor={accentColor}
          />
        )}
        {/* Overview tab - tab index depends on whether Actions tab exists */}
        {((activeTab === 1 && stats.actionCount === 0) || (activeTab === 2 && stats.actionCount > 0)) && (
          <Box sx={{ p: 3, backgroundColor: '#fafaf9', borderRadius: '0.5rem' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              {friendlyName} Overview
            </Typography>
            <Typography variant="body1" sx={{ color: '#706e6b', mb: 2 }}>
              {description}
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: accentColor }}>
                Statistics
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
                <Box sx={{ p: 2, backgroundColor: '#fff', borderRadius: '0.5rem', border: `1px solid ${accentColor}20` }}>
                  <Typography variant="caption" sx={{ color: '#706e6b', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                    Objects
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: accentColor, mt: 0.5 }}>
                    {stats.objectCount.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#706e6b', mt: 1 }}>
                    <strong>Standard:</strong> {filteredObjects.filter(obj => !obj.isCustom).length} • 
                    <strong> Custom:</strong> {filteredObjects.filter(obj => obj.isCustom).length}
                  </Typography>
                </Box>
                
                <Box sx={{ p: 2, backgroundColor: '#fff', borderRadius: '0.5rem', border: `1px solid ${accentColor}20` }}>
                  <Typography variant="caption" sx={{ color: '#706e6b', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                    Fields
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: accentColor, mt: 0.5 }}>
                    {stats.fieldCount.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#706e6b', mt: 1 }}>
                    Across {stats.objectCount} objects
                  </Typography>
                </Box>
                
                {!loadingActions && stats.actionCount > 0 && (
                  <Box sx={{ p: 2, backgroundColor: '#fff', borderRadius: '0.5rem', border: `1px solid ${accentColor}20` }}>
                    <Typography variant="caption" sx={{ color: '#706e6b', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                      Actions
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: accentColor, mt: 0.5 }}>
                      {stats.actionCount.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#706e6b', mt: 1 }}>
                      {stats.totalActionParams > 0 && (
                        <>With {stats.totalActionParams.toLocaleString()} total parameters</>
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>
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
        {/* Documentation tab - tab index depends on whether Actions tab exists */}
        {((activeTab === 2 && stats.actionCount === 0) || (activeTab === 3 && stats.actionCount > 0)) && (
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

// Actions List Component for Cloud Detail View
const ActionsListForCloud = ({ cloudName, cloudActions, accentColor }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionDetails, setActionDetails] = useState(null);
  const [loadingActionDetails, setLoadingActionDetails] = useState(false);

  // Load full action details from the index
  const actionsWithDetails = useMemo(() => {
    return cloudActions.map(action => ({
      ...action,
      description: action.description || '',
      category: action.category || 'Uncategorized',
      clouds: action.clouds || ['Core Salesforce']
    }));
  }, [cloudActions]);

  const handleActionSelect = async (action) => {
    setLoadingActionDetails(true);
    setSelectedAction(action);
    try {
      const fullAction = await getAction(action.name);
      setActionDetails(fullAction);
    } catch (error) {
      console.error('Error fetching action details:', error);
      setActionDetails(action); // Fallback to basic info
    } finally {
      setLoadingActionDetails(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'category',
        header: 'Cloud',
      },
      {
        accessorKey: 'name',
        header: 'Action Name',
        size: 250,
        Cell: ({ cell, row }) => (
          <Box
            sx={{
              fontWeight: 600,
              color: accentColor,
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleActionSelect(row.original);
            }}
          >
            {cell.getValue()}
          </Box>
        ),
      },
     
      {
        accessorKey: 'apiName',
        header: 'API Name',
        size: 200,
        Cell: ({ cell }) => {
          const apiName = cell.getValue();
          return apiName ? (
            <Box
              sx={{
                fontSize: '0.813rem',
                fontFamily: 'monospace',
                color: '#3e3e3c',
                fontWeight: 500
              }}
            >
              {apiName}
            </Box>
          ) : (
            <Box
              sx={{
                fontSize: '0.813rem',
                color: '#c9c7c5',
                fontStyle: 'italic'
              }}
            >
              —
            </Box>
          );
        },
      },
      {
        accessorKey: 'referenceActionType',
        header: 'Type',
        size: 150,
        Cell: ({ cell }) => {
          const referenceActionType = cell.getValue() || '';
          return referenceActionType ? (
            <Chip
              label={referenceActionType}
              size="small"
              sx={{
                backgroundColor: `${accentColor}15`,
                color: accentColor,
                fontWeight: 500,
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">-</Typography>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        size: 400,
        Cell: ({ cell }) => {
          const description = cell.getValue();
          return description ? (
            <Box
              sx={{
                fontSize: '0.813rem',
                whiteSpace: 'normal',
                color: '#3e3e3c',
                lineHeight: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word'
              }}
            >
              {description}
            </Box>
          ) : (
            <Box
              sx={{
                fontSize: '0.813rem',
                color: '#c9c7c5',
                fontStyle: 'italic'
              }}
            >
              No description
            </Box>
          );
        },
      },
      {
        accessorKey: 'propertyCount',
        header: 'Parameters',
        size: 100,
        Cell: ({ cell }) => (
          <Box sx={{ textAlign: 'center', fontWeight: 600 }}>
            {cell.getValue()}
          </Box>
        ),
      },
    ],
    [accentColor, handleActionSelect]
  );

  return (
    <Box sx={{ display: 'flex', gap: 3 }}>
      <Box sx={{ flex: 1 }}>
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#fafaf9' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>
            {cloudName} Actions
          </Typography>
          <Typography variant="body2" sx={{ color: '#706e6b' }}>
            Browse and explore {cloudActions.length} Agentforce actions available in {cloudName}. Click on an action to view details.
          </Typography>
        </Paper>

        <MaterialReactTable
          columns={columns}
          data={actionsWithDetails}
          enableColumnActions={true}
          enableColumnFilters={true}
          enablePagination={true}
          enableSorting={true}
          enableGlobalFilter={true}
          enableGrouping={true}
          enableColumnDragging={!isMobile}
          enableHiding={true}
          initialState={{
            density: isMobile ? 'compact' : 'comfortable',
            pagination: { pageSize: isMobile ? 10 : 20, pageIndex: 0 },
            sorting: [{ id: 'name', desc: false }],
            //grouping: ['category'] // Group by category by default
          }}
          muiTableBodyRowProps={({ row }) => ({
            onClick: () => handleActionSelect(row.original),
            sx: {
              cursor: 'pointer',
              backgroundColor: selectedAction?.name === row.original.name ? `${accentColor}10` : 'inherit',
              '&:hover': {
                backgroundColor: `${accentColor}05`,
              },
            },
          })}
          muiTableProps={{
            sx: {
              tableLayout: 'fixed',
            },
          }}
          muiSearchTextFieldProps={{
            placeholder: `Search ${cloudName} actions...`,
            variant: 'outlined',
            size: 'small',
          }}
        />
      </Box>

      {selectedAction && actionDetails && (
        <Paper sx={{ width: '400px', padding: '20px', backgroundColor: '#ffffff', flexShrink: 0, maxHeight: '80vh', overflowY: 'auto' }}>
          {loadingActionDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="h5" sx={{ marginBottom: '16px', fontWeight: 700 }}>
                {actionDetails.name}
              </Typography>
              
              <Box sx={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {actionDetails.category && (
                  <Chip
                    label={actionDetails.category}
                    sx={{
                      backgroundColor: `${accentColor}15`,
                      color: accentColor,
                      fontWeight: 500
                    }}
                  />
                )}
                {actionDetails.clouds && actionDetails.clouds.length > 0 && (
                  <>
                    {actionDetails.clouds.map(cloud => (
                      <Chip
                        key={cloud}
                        label={cloud}
                        onClick={() => navigate(`/actions/cloud/${cloud}`)}
                        sx={{
                          backgroundColor: `${accentColor}15`,
                          color: accentColor,
                          fontWeight: 500,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: `${accentColor}25`
                          }
                        }}
                      />
                    ))}
                  </>
                )}
              </Box>

              <Typography variant="body1" sx={{ marginBottom: '20px', color: '#3e3e3c', lineHeight: 1.6 }}>
                {actionDetails.description}
              </Typography>

              {actionDetails.returnType && (
                <Box sx={{ marginBottom: '20px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, marginBottom: '8px' }}>
                    Return Type:
                  </Typography>
                  <Chip
                    label={actionDetails.returnType}
                    sx={{
                      backgroundColor: `${accentColor}15`,
                      color: accentColor,
                      fontWeight: 500
                    }}
                  />
                </Box>
              )}

              {actionDetails.properties && Object.keys(actionDetails.properties).length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, marginBottom: '12px' }}>
                    Parameters ({Object.keys(actionDetails.properties).length}):
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(actionDetails.properties).map(([paramName, param]) => (
                      <Paper
                        key={paramName}
                        sx={{
                          padding: '12px',
                          backgroundColor: '#fafaf9',
                          borderLeft: `4px solid ${accentColor}`
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: accentColor }}>
                            {paramName}
                          </Typography>
                          {param.required && (
                            <Chip
                              label="Required"
                              size="small"
                              sx={{
                                backgroundColor: '#fef9e7',
                                color: '#014486',
                                fontSize: '0.7rem',
                                height: '20px'
                              }}
                            />
                          )}
                          {param.type && (
                            <Chip
                              label={param.type}
                              size="small"
                              sx={{
                                backgroundColor: '#ecebea',
                                color: '#3e3e3c',
                                fontSize: '0.7rem',
                                height: '20px'
                              }}
                            />
                          )}
                        </Box>
                        {param.description && (
                          <Typography variant="body2" sx={{ color: '#706e6b', fontSize: '0.813rem' }}>
                            {param.description}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}
              {actionDetails.sourceUrl && (
                <Box sx={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #dddbda' }}>
                  <a
                    href={actionDetails.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: accentColor,
                      textDecoration: 'none',
                      fontSize: '0.875rem'
                    }}
                  >
                    View official documentation →
                  </a>
                </Box>
              )}
            </>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default CloudDetailView;

