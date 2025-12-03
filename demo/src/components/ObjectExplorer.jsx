import React, { useState, useEffect, useMemo } from 'react';
import ObjectList from './ObjectList';
import FieldDetail from './FieldDetail';
import CategoryFilter from './CategoryFilter';
import Breadcrumb from './Breadcrumb';
import { Box, CircularProgress, Typography } from '@mui/material';

const ObjectExplorer = () => {
  const [selectedObject, setSelectedObject] = useState(null);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loadingObjectDetails, setLoadingObjectDetails] = useState(false);
  const [cloudMetadata, setCloudMetadata] = useState({});
  const [navigationHistory, setNavigationHistory] = useState([]);

  useEffect(() => {
    // Load object metadata from the package
    const loadObjects = async () => {
      try {
        // Import the salesforce object reference package
        const { loadAllDescriptions, getAllCloudMetadata } = await import('@sf-explorer/salesforce-object-reference');
        
        // Load cloud metadata (includes emoji and iconFile)
        const clouds = await getAllCloudMetadata();
        const cloudMap = {};
        clouds.forEach(cloud => {
          cloudMap[cloud.cloud] = cloud;
        });
        setCloudMetadata(cloudMap);
        
        // Load object descriptions
        const descriptionsData = await loadAllDescriptions();
        
        // Convert descriptions to array format
        const allObjects = [];
        
        if (descriptionsData) {
          for (const [objectName, metadata] of Object.entries(descriptionsData)) {
            allObjects.push({
              apiName: objectName,
              name: objectName, // Add name property for icon matching
              label: metadata.label || objectName,
              pluralLabel: objectName,
              keyPrefix: metadata.keyPrefix || '',
              isCustom: objectName.endsWith('__c') || objectName.includes('__'),
              category: metadata.cloud,
              description: metadata.description || '',
              fields: null, // Fields not loaded until object is selected
              fieldCount: metadata.fieldCount,
              module: metadata.cloud,
              cloud: metadata.cloud,
              sourceUrl: metadata.sourceUrl,
              icon: metadata.icon // Add icon property
            });
          }
        }

        setObjects(allObjects);
        setLoading(false);
      } catch (error) {
        console.error('Error loading objects:', error);
        setLoading(false);
      }
    };

    loadObjects();
  }, []);

  const handleObjectSelect = async (object) => {
    setLoadingObjectDetails(true);
    
    // If fields are not loaded yet, fetch the full object data
    if (!object.fields) {
      try {
        const { getObject } = await import('@sf-explorer/salesforce-object-reference');
        const fullObjectData = await getObject(object.apiName);
        
        if (fullObjectData) {
          // Update the object with full field data and child relationships
          const updatedObject = {
            ...object,
            fields: fullObjectData.properties || {},
            childRelationships: fullObjectData.childRelationships || []
          };
          
          // Add to navigation history
          setNavigationHistory(prev => [...prev, updatedObject]);
          setSelectedObject(updatedObject);
          
          // Also update the object in the list for caching
          setObjects(prevObjects => 
            prevObjects.map(obj => 
              obj.apiName === object.apiName ? updatedObject : obj
            )
          );
        } else {
          setNavigationHistory(prev => [...prev, object]);
          setSelectedObject(object);
        }
      } catch (error) {
        console.error('Error loading object details:', error);
        setNavigationHistory(prev => [...prev, object]);
        setSelectedObject(object);
      }
    } else {
      // Add to navigation history
      setNavigationHistory(prev => [...prev, object]);
      setSelectedObject(object);
    }
    
    setLoadingObjectDetails(false);
  };

  const handleBackToList = () => {
    setSelectedObject(null);
    setNavigationHistory([]);
  };

  // Build breadcrumb items from navigation history
  const breadcrumbItems = useMemo(() => {
    const items = [{ label: 'All Objects', path: 'list', index: -1 }];
    
    navigationHistory.forEach((obj, index) => {
      items.push({ 
        label: obj.label || obj.apiName, 
        path: 'detail',
        index: index,
        object: obj
      });
    });
    
    return items;
  }, [navigationHistory]);

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

  // Filter objects by selected categories - match if ANY selected cloud is in the object's clouds array
  const filteredObjects = useMemo(() => {
    if (selectedCategories.length === 0) {
      return objects;
    }
    return objects.filter(obj => {
      // Support both single cloud and multiple clouds
      const objectClouds = obj.clouds || [obj.cloud];
      return selectedCategories.some(category => objectClouds.includes(category));
    });
  }, [objects, selectedCategories]);

  return (
    <div className="object-explorer-container">
      <div className="single-panel">
        {/* Breadcrumb Navigation */}
        <Breadcrumb 
          items={breadcrumbItems} 
          onNavigate={(item) => {
            if (item.path === 'list') {
              handleBackToList();
            } else if (item.index >= 0) {
              // Navigate to a specific object in the history
              const newHistory = navigationHistory.slice(0, item.index + 1);
              setNavigationHistory(newHistory);
              setSelectedObject(item.object);
            }
          }}
        />
        
        {/* Panel Header */}
        <div className="panel-header">
          <h2 className="panel-title">
            {selectedObject 
              ? `${selectedObject.label} Fields`
              : `Salesforce Objects (${filteredObjects.length}${selectedCategories.length > 0 ? ` of ${objects.length}` : ''})`
            }
          </h2>
        </div>

        {/* Content Area */}
        {!selectedObject ? (
          <>
            <CategoryFilter 
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoryChange={setSelectedCategories}
              cloudMetadata={cloudMetadata}
            />
            <ObjectList 
              objects={filteredObjects} 
              loading={loading}
              onObjectSelect={handleObjectSelect} 
              selectedObject={selectedObject}
              cloudMetadata={cloudMetadata}
            />
          </>
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
          <FieldDetail 
            object={selectedObject} 
            onObjectSelect={handleObjectSelect}
            availableObjects={objects}
            cloudMetadata={cloudMetadata}
          />
        )}
      </div>
    </div>
  );
};

export default ObjectExplorer;

