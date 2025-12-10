import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ObjectList from './ObjectList';
import ObjectDetailTabs from './ObjectDetailTabs';
import CloudTiles from './CloudTiles';
import CloudDetailView from './CloudDetailView';
import Breadcrumb from './Breadcrumb';
import { Box, CircularProgress, Typography } from '@mui/material';

const ObjectExplorer = ({ initialObjects, cloudMetadata: externalCloudMetadata, hideCloudFilter = false, cloudName: externalCloudName }) => {
  const navigate = useNavigate();
  const { cloudName: urlCloudName, objectName: urlObjectName } = useParams();
  const location = useLocation();
  
  const [selectedObject, setSelectedObject] = useState(null);
  const [objects, setObjects] = useState(initialObjects || []);
  const [loading, setLoading] = useState(!initialObjects);
  const [loadingObjectDetails, setLoadingObjectDetails] = useState(false);
  const [cloudMetadata, setCloudMetadata] = useState(externalCloudMetadata || {});
  const [navigationHistory, setNavigationHistory] = useState([]);

  // Determine the current cloud from URL or props
  const selectedCloud = urlCloudName || externalCloudName || null;

  useEffect(() => {
    // Skip loading if initialObjects provided (used when called from CloudDetailView)
    if (initialObjects) {
      return;
    }

    // Load object metadata from the package
    const loadObjects = async () => {
      try {
        // Import the salesforce object reference package
        const { loadAllDescriptions, getAllCloudMetadata } = await import('@sf-explorer/salesforce-object-reference');
        
        // Import SSOT package
        const ssot = await import('@sf-explorer/salesforce-object-ssot-reference');
        
        // Load cloud metadata
        const clouds = await getAllCloudMetadata();
        const cloudMap = {};
        clouds.forEach(cloud => {
          cloudMap[cloud.cloud] = cloud;
        });
        
        // Add SSOT cloud metadata
        cloudMap['Data Cloud - SSOT'] = {
          cloud: 'Data Cloud - SSOT',
          description: 'Data Cloud Data Model Objects (DMOs) - The Single Source of Truth for customer data integration across Salesforce.',
          emoji: '🔷',
          objectCount: 0 // Will be updated below
        };
        
        setCloudMetadata(cloudMap);
        
        // Load standard object descriptions
        const descriptionsData = await loadAllDescriptions();
        
        // Load SSOT index
        const ssotIndex = await ssot.loadIndex();
        
        // Convert descriptions to array format
        const allObjects = [];
        
        if (descriptionsData) {
          for (const [objectName, metadata] of Object.entries(descriptionsData)) {
            allObjects.push({
              ...metadata, // Spread all metadata first (includes description, fieldCount, keyPrefix, icon, accessRules, label, etc.)
              apiName: objectName,
              name: objectName,
              label: metadata.label || objectName, // Override label to ensure it falls back to objectName
              pluralLabel: objectName,
              isCustom: objectName.endsWith('__c') || objectName.includes('__'),
              category: metadata.cloud,
              fields: null,
              module: metadata.cloud,
              source: 'standard'
            });
          }
        }
        
        // Add SSOT objects
        if (ssotIndex && ssotIndex.objects) {
          for (const [apiName, metadata] of Object.entries(ssotIndex.objects)) {
            allObjects.push({
              apiName: apiName,
              name: metadata.name,
              label: metadata.name,
              pluralLabel: metadata.name,
              description: metadata.description || '',
              fieldCount: metadata.fieldCount || 0,
              isCustom: false,
              category: 'Data Cloud - SSOT',
              cloud: 'Data Cloud - SSOT',
              fields: null,
              module: 'Data Cloud - SSOT',
              source: 'ssot',
              sourceUrl: metadata.sourceUrl
            });
          }
          
          // Update SSOT cloud object count
          cloudMap['Data Cloud - SSOT'].objectCount = Object.keys(ssotIndex.objects).length;
        }

        setObjects(allObjects);
        setLoading(false);
      } catch (error) {
        console.error('Error loading objects:', error);
        setLoading(false);
      }
    };

    loadObjects();
  }, [initialObjects]);

  // Load object details when URL changes
  useEffect(() => {
    if (urlObjectName && objects.length > 0) {
      const objectToLoad = objects.find(obj => obj.apiName === urlObjectName);
      if (objectToLoad) {
        handleObjectSelect(objectToLoad, true);
      }
    } else {
      setSelectedObject(null);
      setNavigationHistory([]);
    }
  }, [urlObjectName, objects]);

  const handleObjectSelect = async (object, fromUrl = false) => {
    setLoadingObjectDetails(true);
    
    // If fields are not loaded yet, fetch the full object data
    if (!object.fields) {
      try {
        let fullObjectData = null;
        
        // Load from appropriate source
        if (object.source === 'ssot') {
          const { getObject } = await import('@sf-explorer/salesforce-object-ssot-reference');
          // For SSOT objects, use the display name (the file name)
          fullObjectData = await getObject(object.name);
        } else {
          const { getObject } = await import('@sf-explorer/salesforce-object-reference');
          fullObjectData = await getObject(object.apiName);
        }
        
        if (fullObjectData) {
          // Update the object with full field data and child relationships
          const updatedObject = {
            ...object,
            fields: fullObjectData.properties || {},
            childRelationships: fullObjectData.childRelationships || []
          };
          
          setSelectedObject(updatedObject);
          
          // Update navigation only if not from URL
          if (!fromUrl) {
            if (selectedCloud) {
              navigate(`/cloud/${selectedCloud}/object/${object.apiName}`);
            } else {
              navigate(`/object/${object.apiName}`);
            }
          }
          
          // Also update the object in the list for caching
          setObjects(prevObjects => 
            prevObjects.map(obj => 
              obj.apiName === object.apiName ? updatedObject : obj
            )
          );
        } else {
          setSelectedObject(object);
          if (!fromUrl) {
            if (selectedCloud) {
              navigate(`/cloud/${selectedCloud}/object/${object.apiName}`);
            } else {
              navigate(`/object/${object.apiName}`);
            }
          }
        }
      } catch (error) {
        console.error('Error loading object details:', error);
        setSelectedObject(object);
        if (!fromUrl) {
          if (selectedCloud) {
            navigate(`/cloud/${selectedCloud}/object/${object.apiName}`);
          } else {
            navigate(`/object/${object.apiName}`);
          }
        }
      }
    } else {
      setSelectedObject(object);
      if (!fromUrl) {
        if (selectedCloud) {
          navigate(`/cloud/${selectedCloud}/object/${object.apiName}`);
        } else {
          navigate(`/object/${object.apiName}`);
        }
      }
    }
    
    setLoadingObjectDetails(false);
  };

  const handleBackToList = () => {
    if (selectedCloud) {
      navigate(`/cloud/${selectedCloud}`);
    } else {
      navigate('/');
    }
  };

  const handleBackToClouds = () => {
    navigate('/');
  };

  const handleCloudSelect = (cloudName) => {
    navigate(`/cloud/${cloudName}`);
  };

  // Build breadcrumb items based on URL
  const breadcrumbItems = useMemo(() => {
    const items = [];
    
    if (selectedCloud) {
      items.push({ label: selectedCloud === 'all' ? 'All Objects' : selectedCloud, path: 'cloud', cloudName: selectedCloud });
    } else {
      items.push({ label: 'All Objects', path: 'list' });
    }
    
    if (selectedObject) {
      items.push({ 
        label: selectedObject.label || selectedObject.apiName, 
        path: 'object',
        object: selectedObject
      });
    }
    
    return items;
  }, [selectedCloud, selectedObject]);

  // Get unique categories for filtering - collect all clouds from objects
  const categories = useMemo(() => {
    const allClouds = new Set();
    objects.forEach(obj => {
      // Support both single cloud and multiple clouds
      if (obj.clouds && Array.isArray(obj.clouds)) {
        obj.clouds.forEach(cloud => allClouds.add(cloud));
      } else if (obj.cloud) {
        allClouds.add(obj.cloud);
      }
    });
    return [...allClouds].sort();
  }, [objects]);

  // Don't filter if showing within CloudDetailView (hideCloudFilter is true)
  const filteredObjects = hideCloudFilter ? objects : objects;

  return (
    <div className="object-explorer-container">
      {!hideCloudFilter && !selectedCloud && !urlObjectName ? (
        // Cloud Selection View (only when no cloud and no object in URL)
        <div className="single-panel">
          <CloudTiles 
            categories={categories}
            onCloudSelect={handleCloudSelect}
            cloudMetadata={cloudMetadata}
            allObjects={objects}
          />
        </div>
      ) : !hideCloudFilter && selectedCloud && !urlObjectName ? (
        // Cloud Detail View with Tabs (only when cloud selected but no object)
        <div className="single-panel">
          <CloudDetailView 
            cloudName={selectedCloud}
            cloudMetadata={cloudMetadata}
            onBack={handleBackToClouds}
            allObjects={objects}
          />
        </div>
      ) : (
        // Object Explorer View (when hideCloudFilter is true OR object is selected)
        <div className="single-panel">
          {/* Breadcrumb Navigation */}
          <Breadcrumb 
            items={breadcrumbItems} 
            onNavigate={(item) => {
              if (item.path === 'list') {
                navigate('/');
              } else if (item.path === 'cloud') {
                navigate(`/cloud/${item.cloudName}`);
              } else if (item.path === 'object') {
                // Don't navigate to the same object
                if (item.object && item.object.apiName !== selectedObject?.apiName) {
                  handleObjectSelect(item.object);
                }
              }
            }}
          />
          
          {/* Panel Header */}
          <div className="panel-header">
            <h2 className="panel-title">
              {selectedObject 
                ? `${selectedObject.label} Fields`
                : `Salesforce Objects (${filteredObjects.length})`
              }
            </h2>
          </div>

          {/* Content Area */}
          {!selectedObject ? (
            <ObjectList 
              objects={filteredObjects} 
              loading={loading}
              onObjectSelect={handleObjectSelect} 
              selectedObject={selectedObject}
              cloudMetadata={cloudMetadata}
              hideCloudColumn={hideCloudFilter} // Hide cloud column when embedded in CloudDetailView
            />
          ) : loadingObjectDetails ? (
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '400px' 
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <ObjectDetailTabs 
              object={selectedObject} 
              onObjectSelect={handleObjectSelect}
              availableObjects={objects}
              cloudMetadata={cloudMetadata}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ObjectExplorer;
