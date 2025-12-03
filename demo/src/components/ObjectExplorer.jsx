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

  useEffect(() => {
    // Load object metadata from the package
    const loadObjects = async () => {
      try {
        // Import the salesforce object reference package
        // Use loadAllDescriptions() instead of loadAllClouds() to avoid loading full object data
        const { loadAllDescriptions } = await import('@sf-explorer/salesforce-object-reference');
        const descriptionsData = await loadAllDescriptions();
        
        // Convert descriptions to array format
        const allObjects = [];
        
        if (descriptionsData) {
          for (const [objectName, metadata] of Object.entries(descriptionsData)) {
            allObjects.push({
              apiName: objectName,
              label: objectName,
              pluralLabel: objectName,
              keyPrefix: metadata.keyPrefix || '',
              isCustom: objectName.endsWith('__c') || objectName.includes('__'),
              category: metadata.cloud,
              description: metadata.description || '',
              fields: null, // Fields not loaded until object is selected
              fieldCount: metadata.fieldCount,
              module: metadata.cloud,
              cloud: metadata.cloud
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
          // Update the object with full field data
          const updatedObject = {
            ...object,
            fields: fullObjectData.properties || {}
          };
          setSelectedObject(updatedObject);
          
          // Also update the object in the list for caching
          setObjects(prevObjects => 
            prevObjects.map(obj => 
              obj.apiName === object.apiName ? updatedObject : obj
            )
          );
        } else {
          setSelectedObject(object);
        }
      } catch (error) {
        console.error('Error loading object details:', error);
        setSelectedObject(object);
      }
    } else {
      setSelectedObject(object);
    }
    
    setLoadingObjectDetails(false);
  };

  const handleBackToList = () => {
    setSelectedObject(null);
  };

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const items = [{ label: 'All Objects', path: 'list' }];
    
    if (selectedObject) {
      items.push({ 
        label: selectedObject.label || selectedObject.apiName, 
        path: 'detail' 
      });
    }
    
    return items;
  }, [selectedObject]);

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(objects.map(obj => obj.cloud))];
    return uniqueCategories.sort();
  }, [objects]);

  // Filter objects by selected categories
  const filteredObjects = useMemo(() => {
    if (selectedCategories.length === 0) {
      return objects;
    }
    return objects.filter(obj => selectedCategories.includes(obj.cloud));
  }, [objects, selectedCategories]);

  return (
    <div className="object-explorer-container">
      <div className="single-panel">
        {/* Breadcrumb Navigation */}
        <Breadcrumb 
          items={breadcrumbItems} 
          onNavigate={(path) => {
            if (path === 'list') {
              handleBackToList();
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
            />
            <ObjectList 
              objects={filteredObjects} 
              loading={loading}
              onObjectSelect={handleObjectSelect} 
              selectedObject={selectedObject}
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
          <FieldDetail object={selectedObject} />
        )}
      </div>
    </div>
  );
};

export default ObjectExplorer;

