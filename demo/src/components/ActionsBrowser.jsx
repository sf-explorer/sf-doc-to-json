import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MaterialReactTable } from 'material-react-table';
import { Box, Chip, CircularProgress, Typography, useMediaQuery, useTheme, Tabs, Tab, Paper, Card, CardContent, Grid } from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import CloudIcon from './CloudIcon';
import { loadIndex as loadActionsIndex, getAction } from '@sf-explorer/salesforce-agentforce-actions-reference';

const ActionsBrowser = () => {
  const navigate = useNavigate();
  const { actionName: urlActionName, cloudName: urlCloudName } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCloud, setSelectedCloud] = useState(urlCloudName || 'all');
  const [actionDetails, setActionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [clouds, setClouds] = useState([]);

  // Load actions index
  useEffect(() => {
    const loadActions = async () => {
      try {
        const index = await loadActionsIndex();
        
        if (index && index.actions) {
          const actionsList = Object.entries(index.actions)
            .map(([name, metadata]) => ({
              name: name,
              description: metadata.description || '',
              propertyCount: metadata.propertyCount || 0,
              category: metadata.category || 'Uncategorized',
              clouds: metadata.clouds || ['Core Salesforce'],
              sourceUrl: metadata.sourceUrl || '',
              file: metadata.file || '',
              apiName: metadata.apiName || ''
            }))
            .filter(action => action.apiName && action.apiName.trim() !== ''); // Filter out actions without API Name
          
          setActions(actionsList);
          
          // Extract unique clouds
          const cloudsSet = new Set();
          actionsList.forEach(action => {
            if (action.clouds && Array.isArray(action.clouds)) {
              action.clouds.forEach(cloud => cloudsSet.add(cloud));
            }
          });
          setClouds(['all', ...Array.from(cloudsSet).sort()]);
        }
      } catch (error) {
        console.error('Error loading actions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadActions();
  }, []);

  // Update selected cloud when URL changes
  useEffect(() => {
    if (urlCloudName) {
      setSelectedCloud(urlCloudName);
    } else {
      setSelectedCloud('all');
    }
  }, [urlCloudName]);

  const loadActionDetails = useCallback(async (actionName) => {
    if (!actionName) {
      setActionDetails(null);
      setSelectedAction(null);
      return;
    }
    
    setLoadingDetails(true);
    // Clear previous action details immediately to avoid showing stale data
    setActionDetails(null);
    setSelectedAction(null);
    
    try {
      const action = await getAction(actionName);
      setActionDetails(action);
      setSelectedAction(action);
    } catch (error) {
      console.error('Error loading action details:', error);
      setActionDetails(null);
      setSelectedAction(null);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Load action details if URL has actionName
  useEffect(() => {
    if (urlActionName) {
      loadActionDetails(urlActionName);
    } else {
      // Clear action details when navigating away from an action
      setActionDetails(null);
      setSelectedAction(null);
    }
  }, [urlActionName, loadActionDetails]);

  const handleCloudSelect = (cloudName) => {
    if (cloudName === 'all') {
      navigate('/actions');
    } else {
      navigate(`/actions/cloud/${encodeURIComponent(cloudName)}`);
    }
    setSelectedCloud(cloudName);
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(actions.map(a => a.category || 'Uncategorized'));
    return ['all', ...Array.from(cats).sort()];
  }, [actions]);

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

  // Filter actions by category and cloud
  const filteredActions = useMemo(() => {
    let filtered = actions;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(action => (action.category || 'Uncategorized') === selectedCategory);
    }
    
    // Filter by cloud
    if (selectedCloud !== 'all') {
      // Normalize cloud name for comparison (handle both hyphenated and spaced versions)
      const normalizedCloudName = selectedCloud?.toLowerCase().replace(/\s+/g, '-');
      
      // Special handling for Sales Cloud and Service Cloud - they map to Core Salesforce
      // but we only want actions with the matching category
      if (normalizedCloudName === 'sales-cloud' || selectedCloud === 'Sales Cloud') {
        filtered = filtered.filter(action => {
          const category = action.category || '';
          return category === 'Sales';
        });
      } else if (normalizedCloudName === 'service-cloud' || selectedCloud === 'Service Cloud') {
        filtered = filtered.filter(action => {
          const category = action.category || '';
          return category === 'Service';
        });
      } else {
        // For other clouds, use the cloud name mapping
        const actionCloudNames = getActionCloudNames(selectedCloud);
        filtered = filtered.filter(action => {
          const actionClouds = action.clouds || ['Core Salesforce'];
          // Check if any of the mapped cloud names match
          return actionCloudNames.some(mappedCloud => actionClouds.includes(mappedCloud));
        });
      }
    }
    
    return filtered;
  }, [actions, selectedCategory, selectedCloud]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Action Name',
        size: 250,
        Cell: ({ cell }) => (
          <Box
            sx={{
              fontWeight: 600,
              color: '#0176d3',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
            onClick={() => {
              const action = cell.row.original;
              if (urlCloudName) {
                navigate(`/actions/cloud/${encodeURIComponent(urlCloudName)}/${encodeURIComponent(action.name)}`);
              } else {
                navigate(`/actions/${encodeURIComponent(action.name)}`);
              }
              // Don't call loadActionDetails here - let the useEffect handle it based on URL change
            }}
          >
            {cell.getValue()}
          </Box>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Cloud',
        size: 250,
       
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
        accessorKey: 'referenceActionType',
        header: 'Type',
        size: 150,
        enableGrouping: true,
        GroupedCell: ({ cell, row }) => {
          const category = cell.getValue() || 'Uncategorized';
          const count = row.subRows?.length || 0;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <Chip
                label={category}
                size="small"
                sx={{
                  backgroundColor: '#e8f4ff',
                  color: '#014486',
                  fontWeight: 500,
                  fontSize: '0.75rem'
                }}
              />
              <Chip
                label={`${count} action${count !== 1 ? 's' : ''}`}
                size="small"
                sx={{
                  backgroundColor: '#fef9e7',
                  border: '1px solid #f9e79f',
                  color: '#014486',
                  fontWeight: 600,
                  fontSize: '0.7rem'
                }}
              />
            </Box>
          );
        },
        Cell: ({ cell, row }) => {
            const referenceActionType = row.original;
          console.log(referenceActionType);
            const category = cell.getValue() || 'Uncategorized';
          return (
            <Chip
              label={category}
              size="small"
              sx={{
                backgroundColor: '#e8f4ff',
                color: '#014486',
                fontWeight: 500,
                fontSize: '0.75rem'
              }}
            />
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
    [navigate]
  );

  // Calculate cloud statistics
  const cloudStats = useMemo(() => {
    const stats = {};
    
    clouds.filter(c => c !== 'all').forEach(cloudName => {
      const cloudActions = actions.filter(action => {
        const actionClouds = action.clouds || ['Core Salesforce'];
        return actionClouds.includes(cloudName);
      });
      
      stats[cloudName] = {
        actionCount: cloudActions.length,
        totalParams: cloudActions.reduce((sum, action) => sum + (action.propertyCount || 0), 0)
      };
    });
    
    stats['all'] = {
      actionCount: actions.length,
      totalParams: actions.reduce((sum, action) => sum + (action.propertyCount || 0), 0)
    };
    
    return stats;
  }, [clouds, actions]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show cloud tiles view when no cloud is selected and no action is selected
  const showCloudTiles = !urlCloudName && !urlActionName && selectedCloud === 'all';

  return (
    <Box sx={{ padding: '20px' }}>
      <Box sx={{ marginBottom: '20px' }}>
        <Typography variant="h4" sx={{ marginBottom: '8px', fontWeight: 700 }}>
          Agentforce Actions Browser
        </Typography>
        <Typography variant="body2" sx={{ color: '#706e6b' }}>
          {urlCloudName 
            ? `Browse actions available in ${urlCloudName}. Click on an action to view details.`
            : 'Browse and explore Salesforce Agentforce standard actions by cloud. Click on a cloud to view its actions.'
          }
        </Typography>
      </Box>

      {/* Cloud Tiles View */}
      {showCloudTiles && clouds.length > 1 && (
        <Box sx={{ mb: 3 }}>
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
              Salesforce Clouds
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#706e6b',
                fontSize: '0.875rem'
              }}
            >
              Select a cloud to explore its Agentforce actions
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {/* All Actions Tile */}
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Card
                onClick={() => handleCloudSelect('all')}
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
                }}
              >
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
                <CardContent sx={{ p: 2, pb: '16px !important', pt: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5, gap: 1.5 }}>
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
                      }}
                    >
                      <ViewModuleIcon sx={{ fontSize: 32, color: '#0176d3' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                        All Actions
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#706e6b', fontSize: '0.813rem' }}>
                        Browse all available Agentforce actions
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #dddbda' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0176d3', mb: 0.5 }}>
                      {cloudStats['all']?.actionCount || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#706e6b', fontSize: '0.75rem' }}>
                      Actions
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Cloud Tiles */}
            {clouds.filter(c => c !== 'all').map(cloudName => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={cloudName}>
                <Card
                  onClick={() => handleCloudSelect(cloudName)}
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    minHeight: '240px',
                    position: 'relative',
                    border: '2px solid #dddbda',
                    borderRadius: '0.5rem',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
                      transform: 'translateY(-4px)',
                      borderColor: '#0176d3',
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      backgroundColor: '#0176d3',
                      borderTopLeftRadius: '0.5rem',
                      borderTopRightRadius: '0.5rem',
                    }}
                  />
                  <CardContent sx={{ p: 2, pb: '16px !important', pt: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5, gap: 1.5 }}>
                      <Box
                        sx={{
                          backgroundColor: '#f3f2f2',
                          borderRadius: '0.5rem',
                          p: 1.25,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '56px',
                          minHeight: '56px',
                        }}
                      >
                        <CloudIcon cloudName={cloudName} size={32} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                          {cloudName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#706e6b', fontSize: '0.813rem' }}>
                          Actions available in {cloudName}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #dddbda' }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#0176d3', mb: 0.5 }}>
                        {cloudStats[cloudName]?.actionCount || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#706e6b', fontSize: '0.75rem' }}>
                        Actions
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Actions List View (when cloud is selected or action is selected) */}
      {!showCloudTiles && (
        <>

      {/* Category Filter Tabs */}
      <Paper sx={{ marginBottom: '20px', backgroundColor: '#fafaf9' }}>
        <Tabs
          value={selectedCategory}
          onChange={(e, newValue) => setSelectedCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid #dddbda',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: selectedCategory === 'all' ? 600 : 500,
              minWidth: '120px'
            }
          }}
        >
          {categories.map(category => (
            <Tab
              key={category}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{category === 'all' ? 'All' : category}</span>
                  {category !== 'all' && (
                    <Chip
                      label={actions.filter(a => (a.category || 'Uncategorized') === category).length}
                      size="small"
                      sx={{
                        height: '20px',
                        fontSize: '0.7rem',
                        backgroundColor: '#ecebea',
                        color: '#3e3e3c'
                      }}
                    />
                  )}
                </Box>
              }
              value={category}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Cloud Filter Tabs */}
      {clouds.length > 1 && (
        <Paper sx={{ marginBottom: '20px', backgroundColor: '#fafaf9' }}>
          <Tabs
            value={selectedCloud}
            onChange={(e, newValue) => handleCloudSelect(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: '1px solid #dddbda',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: selectedCloud === 'all' ? 600 : 500,
                minWidth: '120px'
              }
            }}
          >
            {clouds.map(cloud => (
              <Tab
                key={cloud}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{cloud === 'all' ? 'All Clouds' : cloud}</span>
                    {cloud !== 'all' && (
                      <Chip
                        label={actions.filter(a => {
                          const actionClouds = a.clouds || ['Core Salesforce'];
                          return actionClouds.includes(cloud);
                        }).length}
                        size="small"
                        sx={{
                          height: '20px',
                          fontSize: '0.7rem',
                          backgroundColor: '#ecebea',
                          color: '#3e3e3c'
                        }}
                      />
                    )}
                  </Box>
                }
                value={cloud}
              />
            ))}
          </Tabs>
        </Paper>
      )}

      {/* Actions Table */}
      <MaterialReactTable
        columns={columns}
        data={filteredActions}
        state={{
          isLoading: loading,
        }}
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
        }}
        muiTableBodyRowProps={({ row }) => ({
          onClick: () => {
            if (urlCloudName) {
              navigate(`/actions/cloud/${encodeURIComponent(urlCloudName)}/${encodeURIComponent(row.original.name)}`);
            } else {
              navigate(`/actions/${encodeURIComponent(row.original.name)}`);
            }
            // Don't call loadActionDetails here - let the useEffect handle it based on URL change
          },
          sx: {
            cursor: 'pointer',
            backgroundColor: selectedAction?.name === row.original.name ? '#e8f4ff' : 'inherit',
            '&:hover': {
              backgroundColor: '#f3f2f2',
            },
          },
        })}
        muiTableProps={{
          sx: {
            tableLayout: 'fixed',
          },
        }}
        muiSearchTextFieldProps={{
          placeholder: 'Search actions...',
          variant: 'outlined',
          size: 'small',
        }}
      />

      {/* Action Details Panel */}
      {actionDetails && (
        <Paper sx={{ marginTop: '30px', padding: '20px', backgroundColor: '#ffffff' }}>
          <Typography variant="h5" sx={{ marginBottom: '16px', fontWeight: 700 }}>
            {actionDetails.name}
          </Typography>
          
          <Box sx={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {actionDetails.category && (
              <Chip
                label={actionDetails.category}
                sx={{
                  backgroundColor: '#e8f4ff',
                  color: '#014486',
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
                    onClick={() => handleCloudSelect(cloud)}
                    sx={{
                      backgroundColor: '#e8f5e9',
                      color: '#2e7d32',
                      fontWeight: 500,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: '#c8e6c9'
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
                  backgroundColor: '#e8f5e9',
                  color: '#2e7d32',
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
                      borderLeft: '4px solid #0176d3'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#014486' }}>
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
                  color: '#0176d3',
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }}
              >
                View official documentation →
              </a>
            </Box>
          )}
        </Paper>
      )}
        </>
      )}
    </Box>
  );
};

export default ActionsBrowser;

