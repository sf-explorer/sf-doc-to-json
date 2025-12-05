import React, { useMemo } from 'react';
import { MaterialReactTable } from 'material-react-table';
import { Box, Chip, Typography } from '@mui/material';
import NestedSchemaDisplay from './NestedSchemaDisplay';
import CloudIcon from './CloudIcon';

const FieldDetail = ({ object, onObjectSelect, availableObjects, cloudMetadata = {} }) => {
  // Check if this is a metadata object (has nested schemas)
  const isMetadataObject = useMemo(() => {
    return object?.cloud === 'Metadata API' || object?.module === 'Metadata API';
  }, [object]);
  
  const fields = useMemo(() => {
    if (!object || !object.fields) return [];
    
    // Check if fields is an empty object
    if (Object.keys(object.fields).length === 0) {
      return [];
    }
    
    return Object.entries(object.fields).map(([apiName, fieldData]) => {
      // Parse type to extract additional information
      const typeString = fieldData.type || 'Unknown';
      const isArray = typeString.includes('array');
      const baseType = typeString.replace('array of ', '').replace(/\[.*?\]/, '').trim();
      
      // Get enhanced metadata from Describe API
      const format = fieldData.format;
      const enumValues = fieldData.enum;
      const referenceTo = fieldData['x-object'] || null;
      const polymorphicRefs = fieldData['x-objects'] || null;
      const maxLength = fieldData.maxLength;
      const nullable = fieldData.nullable;
      const readOnly = fieldData.readOnly;
      const minimum = fieldData.minimum;
      const maximum = fieldData.maximum;
      
      // Determine if it's a reference field
      const isReference = referenceTo || polymorphicRefs || 
                         baseType.toLowerCase().includes('reference') || 
                         baseType.toLowerCase().includes('lookup') ||
                         (format === 'salesforce-id' && (referenceTo || polymorphicRefs));
      
      // Determine if it's a picklist with enum values
      const isPicklist = format === 'enum' || enumValues;
      
      // For metadata objects, check if field has nested schema
      const hasNestedSchema = fieldData.schema || (fieldData.items && fieldData.items.properties);
      const nestedSchema = fieldData.schema || (fieldData.items && fieldData.items.properties ? fieldData.items : null);
      const itemType = fieldData.itemType;
      
      return {
        apiName,
        label: apiName,
        type: baseType,
        format: format,
        length: maxLength || '-',
        required: nullable === false,
        unique: false,
        externalId: false,
        description: fieldData.description || '',
        isCustom: apiName.endsWith('__c') || apiName.includes('__'),
        referenceTo: referenceTo,
        polymorphicRefs: polymorphicRefs,
        picklistValues: enumValues,
        isArray: isArray,
        readOnly: readOnly || false,
        nullable: nullable,
        minimum: minimum,
        maximum: maximum,
        isReference: isReference,
        isPicklist: isPicklist,
        hasNestedSchema: hasNestedSchema,
        nestedSchema: nestedSchema,
        itemType: itemType,
        originalType: fieldData.originalType
      };
    });
  }, [object]);

  // Helper function to check if an object exists in available objects
  const objectExists = (objectName) => {
    return availableObjects?.some(obj => obj.apiName === objectName);
  };

  // Helper function to handle reference click
  const handleReferenceClick = (objectName) => {
    if (!objectExists(objectName) || !onObjectSelect) return;
    
    const targetObject = availableObjects.find(obj => obj.apiName === objectName);
    if (targetObject) {
      onObjectSelect(targetObject);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'label',
        header: 'Field Label',
        size: 180,
      },
      {
        accessorKey: 'apiName',
        header: 'API Name',
        size: 180,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        size: 150,
        Cell: ({ cell, row }) => (
          <Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip 
                label={cell.getValue()} 
                size="small"
                variant="outlined"
                color={row.original.isPicklist ? 'secondary' : row.original.isReference ? 'primary' : 'default'}
                sx={{ 
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}
              />
              {row.original.format && row.original.format !== 'enum' && row.original.format !== 'salesforce-id' && (
                <Chip 
                  label={row.original.format} 
                  size="small"
                  variant="filled"
                  sx={{ 
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    height: '18px',
                    backgroundColor: '#f3f2f2',
                    color: '#706e6b'
                  }}
                />
              )}
              {row.original.itemType && (
                <Chip 
                  label={`items: ${row.original.itemType}`} 
                  size="small"
                  variant="filled"
                  sx={{ 
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    height: '18px',
                    backgroundColor: '#e8f4f8',
                    color: '#014486'
                  }}
                />
              )}
              {row.original.readOnly && (
                <Chip 
                  label="Read-only" 
                  size="small"
                  sx={{ 
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    height: '18px',
                    backgroundColor: '#fef7e5',
                    color: '#826902'
                  }}
                />
              )}
            </Box>
            {/* Show reference relationships */}
            {row.original.referenceTo && (
              <Typography 
                variant="caption" 
                display="block" 
                sx={{ 
                  mt: 0.5, 
                  color: objectExists(row.original.referenceTo) ? '#0176d3' : '#706e6b',
                  fontWeight: 500,
                  cursor: objectExists(row.original.referenceTo) ? 'pointer' : 'default',
                  '&:hover': objectExists(row.original.referenceTo) ? {
                    textDecoration: 'underline'
                  } : {}
                }}
                onClick={() => handleReferenceClick(row.original.referenceTo)}
              >
                → {row.original.referenceTo}
              </Typography>
            )}
            {row.original.polymorphicRefs && (
              <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                <Typography variant="caption" sx={{ color: '#706e6b' }}>→ [</Typography>
                {row.original.polymorphicRefs.map((ref, idx) => (
                  <React.Fragment key={ref}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: objectExists(ref) ? '#0176d3' : '#706e6b',
                        fontWeight: 500,
                        cursor: objectExists(ref) ? 'pointer' : 'default',
                        '&:hover': objectExists(ref) ? {
                          textDecoration: 'underline'
                        } : {}
                      }}
                      onClick={() => handleReferenceClick(ref)}
                    >
                      {ref}
                    </Typography>
                    {idx < row.original.polymorphicRefs.length - 1 && (
                      <Typography variant="caption" sx={{ color: '#706e6b' }}>, </Typography>
                    )}
                  </React.Fragment>
                ))}
                <Typography variant="caption" sx={{ color: '#706e6b' }}>]</Typography>
              </Box>
            )}
            {/* Show picklist values count */}
            {row.original.picklistValues && (
              <Typography 
                variant="caption" 
                display="block" 
                sx={{ mt: 0.5, color: '#706e6b' }}
              >
                {row.original.picklistValues.length} values
              </Typography>
            )}
            {/* Show constraints */}
            {(row.original.minimum !== undefined || row.original.maximum !== undefined) && (
              <Typography 
                variant="caption" 
                display="block" 
                sx={{ mt: 0.5, color: '#706e6b', fontFamily: 'monospace', fontSize: '0.7rem' }}
              >
                {row.original.minimum !== undefined && `min: ${row.original.minimum}`}
                {row.original.minimum !== undefined && row.original.maximum !== undefined && ', '}
                {row.original.maximum !== undefined && `max: ${row.original.maximum}`}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        size: 300,
        Cell: ({ cell }) => {
          const description = cell.getValue();
          return description ? (
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.813rem',
                color: '#3e3e3c',
                lineHeight: 1.6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word'
              }}
            >
              {description}
            </Typography>
          ) : (
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.813rem',
                color: '#c9c7c5',
                fontStyle: 'italic'
              }}
            >
              No description
            </Typography>
          );
        },
      },
      {
        accessorKey: 'length',
        header: 'Length',
        size: 80,
        Cell: ({ cell }) => (
          <Box sx={{ textAlign: 'center' }}>
            {cell.getValue()}
          </Box>
        ),
      },
      {
        accessorKey: 'required',
        header: 'Required',
        size: 80,
        Cell: ({ cell }) => 
          cell.getValue() ? (
            <Chip 
              label="Yes" 
              size="small" 
              color="error"
              sx={{ borderRadius: '4px', fontSize: '0.7rem' }}
            />
          ) : null,
      },
      {
        accessorKey: 'unique',
        header: 'Unique',
        size: 80,
        Cell: ({ cell }) => 
          cell.getValue() ? (
            <Chip 
              label="Yes" 
              size="small" 
              color="info"
              sx={{ borderRadius: '4px', fontSize: '0.7rem' }}
            />
          ) : null,
      },
      {
        accessorKey: 'externalId',
        header: 'External ID',
        size: 90,
        Cell: ({ cell }) => 
          cell.getValue() ? (
            <Chip 
              label="Yes" 
              size="small" 
              color="success"
              sx={{ borderRadius: '4px', fontSize: '0.7rem' }}
            />
          ) : null,
      },
    ],
    [objectExists, handleReferenceClick]
  );

  return (
    <Box>
      {/* Object Summary */}
      <Box 
        sx={{ 
          mb: 3, 
          p: 2, 
          backgroundColor: '#fafaf9',
          borderRadius: '4px',
          border: '1px solid #dddbda'
        }}
      >
        <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem', fontWeight: 700 }}>
          {object.label}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#706e6b', fontWeight: 600 }}>
              API Name:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {object.apiName}
            </Typography>
          </Box>
          {object.keyPrefix && (
            <Box>
              <Typography variant="caption" sx={{ color: '#706e6b', fontWeight: 600 }}>
                Key Prefix:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {object.keyPrefix}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" sx={{ color: '#706e6b', fontWeight: 600 }}>
              Type:
            </Typography>
            <Typography variant="body2">
              {object.isCustom ? 'Custom Object' : 'Standard Object'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#706e6b', fontWeight: 600 }}>
              Cloud:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <CloudIcon 
                cloudName={object.cloud} 
                metadata={cloudMetadata[object.cloud]} 
                size={18} 
              />
              <Typography variant="body2">
                {object.cloud ? object.cloud.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#706e6b', fontWeight: 600 }}>
              Total Fields:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {fields.length}
            </Typography>
          </Box>
          {object.childRelationships && object.childRelationships.length > 0 && (() => {
            // Filter out noisy child relationships
            const excludedChildObjects = [
              'User', 'ContentVersion', 'AttachedContentDocument', 'AttachedContentNote',
              'FeedItem', 'FeedComment', 'Note', 'NoteAndAttachment', 'Attachment',
              'Task', 'Event', 'EmailMessage', 'ContentDocumentLink',
              'ProcessInstance', 'ProcessInstanceHistory', 'FlowRecordRelation',
              'TopicAssignment', 'EntitySubscription', 'CollaborationGroupRecord',
              'ActivityHistory', 'OpenActivity', 'CombinedAttachment',
              'RecordAction', 'RecordActionHistory', 'RecordType'
            ];
            
            const shouldExcludeChildObject = (objectName) => {
              if (excludedChildObjects.includes(objectName)) return true;
              if (objectName.endsWith('Feed')) return true;
              if (objectName.endsWith('History')) return true;
              if (objectName.endsWith('Share')) return true;
              if (objectName.endsWith('Event')) return true;
              if (objectName.endsWith('ChangeEvent')) return true;
              if (objectName.endsWith('EventRelation')) return true;
              if (objectName.endsWith('TaskRelation')) return true;
              if (objectName.startsWith('AI')) return true;
              if (objectName.endsWith('__hd')) return true;
              return false;
            };
            
            const filteredCount = object.childRelationships.filter(
              rel => !shouldExcludeChildObject(rel.childObject)
            ).length;
            
            if (filteredCount === 0) return null;
            
            return (
            <Box>
              <Typography variant="caption" sx={{ color: '#706e6b', fontWeight: 600 }}>
                Child Relationships:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {filteredCount}
              </Typography>
            </Box>
            );
          })()}
        </Box>
        {object.description && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#706e6b', fontWeight: 600 }}>
              Description:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                mt: 0.5,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxWidth: '100%'
              }}
            >
              {object.description}
            </Typography>
          </Box>
        )}
        {object.accessRules && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: '#fef9e7', border: '1px solid #f9e79f', borderRadius: '4px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <span style={{ fontSize: '1.2rem' }}>🔒</span>
              <Typography variant="caption" sx={{ color: '#856404', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Special Access Required
              </Typography>
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#856404',
                lineHeight: 1.6,
                fontWeight: 500
              }}
            >
              {object.accessRules}
            </Typography>
          </Box>
        )}
        {object.sourceUrl && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#706e6b', fontWeight: 600 }}>
              Documentation:
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              <a 
                href={object.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#0176d3',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                View Official Salesforce Documentation →
              </a>
            </Typography>
          </Box>
        )}
      </Box>

      {/* Fields Table */}
      {fields.length === 0 ? (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 8, 
            px: 2,
            backgroundColor: '#fafaf9',
            borderRadius: '0.5rem',
            border: '1px dashed #dddbda'
          }}
        >
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#706e6b', 
              mb: 1,
              fontSize: '1.125rem',
              fontWeight: 600
            }}
          >
            Field Data Not Available
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#706e6b',
              maxWidth: '500px',
              margin: '0 auto',
              lineHeight: 1.6
            }}
          >
            The detailed field information for <strong>{object.label || object.apiName}</strong> hasn't been 
            generated yet. The field count ({object.fieldCount}) indicates fields exist, but the detailed 
            schema file needs to be created.
          </Typography>
          {object.sourceUrl && (
            <Box sx={{ mt: 3 }}>
              <a 
                href={object.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#0176d3',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                View Official Documentation →
              </a>
            </Box>
          )}
        </Box>
      ) : (
        <MaterialReactTable
        columns={columns}
        data={fields}
        enableRowSelection={false}
        enableColumnActions={true}
        enableColumnFilters={true}
        enablePagination={true}
        enableSorting={true}
        enableGlobalFilter={true}
        enableGrouping={true}
        enableColumnDragging={true}
        initialState={{ 
          density: 'compact',
          pagination: { pageSize: 10, pageIndex: 0 }
        }}
        muiTableProps={{
          sx: {
            tableLayout: 'fixed',
          },
        }}
        muiTableHeadCellProps={{
          sx: {
            fontWeight: 700,
            fontSize: '0.875rem',
            backgroundColor: '#fafaf9',
            borderBottom: '2px solid #dddbda',
          },
        }}
        muiTableBodyCellProps={{
          sx: {
            fontSize: '0.875rem',
            borderBottom: '1px solid #f3f2f2',
          },
        }}
        muiSearchTextFieldProps={{
          placeholder: 'Search fields...',
          variant: 'outlined',
          size: 'small',
        }}
        muiTopToolbarProps={{
          sx: {
            backgroundColor: '#fafaf9',
            borderRadius: '4px',
            marginBottom: '1rem',
          },
        }}
        renderDetailPanel={({ row }) => (
          row.original.description || row.original.picklistValues || row.original.referenceTo || row.original.polymorphicRefs || row.original.hasNestedSchema ? (
            <Box sx={{ p: 2, backgroundColor: '#f3f2f2' }}>
              {row.original.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#706e6b' }}>
                    Description:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {row.original.description}
                  </Typography>
                </Box>
              )}
              {row.original.hasNestedSchema && row.original.nestedSchema && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#706e6b', mb: 1, display: 'block' }}>
                    {row.original.type === 'array' ? `${row.original.itemType} Schema:` : `${row.original.originalType || row.original.type} Schema:`}
                  </Typography>
                  <Box 
                    sx={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid #dddbda',
                      borderRadius: '4px',
                      p: 2
                    }}
                  >
                    <NestedSchemaDisplay
                      schema={row.original.nestedSchema}
                      onObjectClick={handleReferenceClick}
                      objectExists={objectExists}
                    />
                  </Box>
                </Box>
              )}
              {row.original.picklistValues && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#706e6b' }}>
                    Picklist Values ({row.original.picklistValues.length}):
                  </Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {row.original.picklistValues.map((value, idx) => (
                      <Chip 
                        key={idx} 
                        label={value} 
                        size="small"
                        variant="outlined"
                        color="secondary"
                        sx={{ fontSize: '0.75rem', borderRadius: '4px' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              {row.original.referenceTo && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#706e6b' }}>
                    References:
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip 
                      label={row.original.referenceTo}
                      size="small"
                      variant="outlined"
                      color="primary"
                      clickable={objectExists(row.original.referenceTo)}
                      onClick={() => handleReferenceClick(row.original.referenceTo)}
                      sx={{ 
                        fontSize: '0.75rem', 
                        fontFamily: 'monospace',
                        cursor: objectExists(row.original.referenceTo) ? 'pointer' : 'default'
                      }}
                      icon={objectExists(row.original.referenceTo) ? (
                        <span style={{ fontSize: '0.9rem' }}>🔗</span>
                      ) : undefined}
                    />
                  </Box>
                </Box>
              )}
              {row.original.polymorphicRefs && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#706e6b' }}>
                    Polymorphic References:
                  </Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {row.original.polymorphicRefs.map((ref, idx) => (
                      <Chip 
                        key={idx} 
                        label={ref} 
                        size="small"
                        variant="outlined"
                        color="primary"
                        clickable={objectExists(ref)}
                        onClick={() => handleReferenceClick(ref)}
                        sx={{ 
                          fontSize: '0.75rem', 
                          fontFamily: 'monospace',
                          cursor: objectExists(ref) ? 'pointer' : 'default'
                        }}
                        icon={objectExists(ref) ? (
                          <span style={{ fontSize: '0.9rem' }}>🔗</span>
                        ) : undefined}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              {(row.original.length !== '-' || row.original.minimum !== undefined || row.original.maximum !== undefined) && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#706e6b' }}>
                    Constraints:
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {row.original.length !== '-' && (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        • Max Length: {row.original.length}
                      </Typography>
                    )}
                    {row.original.minimum !== undefined && (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        • Minimum: {row.original.minimum}
                      </Typography>
                    )}
                    {row.original.maximum !== undefined && (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        • Maximum: {row.original.maximum}
                      </Typography>
                    )}
                    {row.original.nullable !== undefined && (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        • Nullable: {row.original.nullable ? 'Yes' : 'No'}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          ) : null
        )}
      />
      )}

      {/* Child Relationships Section */}
      {object.childRelationships && object.childRelationships.length > 0 && (() => {
        // Filter out noisy child relationships (same as graph visualization)
        const excludedChildObjects = [
          'User', 'ContentVersion', 'AttachedContentDocument', 'AttachedContentNote',
          'FeedItem', 'FeedComment', 'Note', 'NoteAndAttachment', 'Attachment',
          'Task', 'Event', 'EmailMessage', 'ContentDocumentLink',
          'ProcessInstance', 'ProcessInstanceHistory', 'FlowRecordRelation',
          'TopicAssignment', 'EntitySubscription', 'CollaborationGroupRecord',
          'ActivityHistory', 'OpenActivity', 'CombinedAttachment',
          'RecordAction', 'RecordActionHistory', 'RecordType'
        ];
        
        const shouldExcludeChildObject = (objectName) => {
          if (excludedChildObjects.includes(objectName)) return true;
          if (objectName.endsWith('Feed')) return true;
          if (objectName.endsWith('History')) return true;
          if (objectName.endsWith('Share')) return true;
          if (objectName.endsWith('Event')) return true;
          if (objectName.endsWith('ChangeEvent')) return true;
          if (objectName.endsWith('EventRelation')) return true;
          if (objectName.endsWith('TaskRelation')) return true;
          if (objectName.startsWith('AI')) return true;
          if (objectName.endsWith('__hd')) return true;
          return false;
        };
        
        const filteredRelationships = object.childRelationships.filter(
          rel => {
            // Skip excluded patterns
            if (shouldExcludeChildObject(rel.childObject)) return false;
            // Only show if object exists in availableObjects (passed from parent)
            if (availableObjects && !availableObjects.find(obj => obj.apiName === rel.childObject)) return false;
            return true;
          }
        );
        
        if (filteredRelationships.length === 0) return null;
        
        return (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem', fontWeight: 700 }}>
            Child Relationships ({filteredRelationships.length})
          </Typography>
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 2
            }}
          >
            {filteredRelationships.map((relationship, index) => {
              const childObjectExists = objectExists(relationship.childObject);
              
              return (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    backgroundColor: '#fafaf9',
                    borderRadius: '4px',
                    border: '1px solid #dddbda',
                    '&:hover': {
                      boxShadow: childObjectExists ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                    },
                    cursor: childObjectExists ? 'pointer' : 'default'
                  }}
                  onClick={() => {
                    if (childObjectExists) {
                      handleReferenceClick(relationship.childObject);
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 700,
                        color: childObjectExists ? '#0176d3' : '#080707',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                      }}
                    >
                      {relationship.childObject}
                    </Typography>
                    {childObjectExists && (
                      <Typography 
                        component="span" 
                        sx={{ ml: 0.5, fontSize: '0.9rem' }}
                      >
                        🔗
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#706e6b', 
                          fontWeight: 600,
                          minWidth: '100px'
                        }}
                      >
                        Field:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          color: '#3e3e3c'
                        }}
                      >
                        {relationship.field}
                      </Typography>
                    </Box>
                    
                    {relationship.relationshipName && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: '#706e6b', 
                            fontWeight: 600,
                            minWidth: '100px'
                          }}
                        >
                          Relationship:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            color: '#3e3e3c'
                          }}
                        >
                          {relationship.relationshipName}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#706e6b', 
                          fontWeight: 600,
                          minWidth: '100px'
                        }}
                      >
                        Cascade Delete:
                      </Typography>
                      <Chip 
                        label={relationship.cascadeDelete ? 'Yes' : 'No'}
                        size="small"
                        color={relationship.cascadeDelete ? 'warning' : 'default'}
                        sx={{ 
                          borderRadius: '4px', 
                          fontSize: '0.65rem',
                          height: '18px'
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
        );
      })()}
    </Box>
  );
};

export default FieldDetail;

