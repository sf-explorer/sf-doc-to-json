import React, { useMemo } from 'react';
import { MaterialReactTable } from 'material-react-table';
import { Box, Chip, Typography } from '@mui/material';

const FieldDetail = ({ object }) => {
  const fields = useMemo(() => {
    if (!object || !object.fields) return [];
    
    return Object.entries(object.fields).map(([apiName, fieldData]) => {
      // Parse type to extract additional information
      const typeString = fieldData.type || 'Unknown';
      const isArray = typeString.includes('array');
      const baseType = typeString.replace('array of ', '').replace(/\[.*?\]/, '').trim();
      
      // Determine if it's a reference field
      const isReference = baseType.toLowerCase().includes('reference') || 
                         baseType.toLowerCase().includes('lookup') ||
                         baseType.toLowerCase().includes('id');
      
      return {
        apiName,
        label: apiName,
        type: baseType,
        length: '-',
        required: false,
        unique: false,
        externalId: false,
        description: fieldData.description || '',
        isCustom: apiName.endsWith('__c') || apiName.includes('__'),
        referenceTo: null,
        picklistValues: null,
        isArray: isArray
      };
    });
  }, [object]);

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
        size: 120,
        Cell: ({ cell, row }) => (
          <Box>
            <Chip 
              label={cell.getValue()} 
              size="small"
              variant="outlined"
              sx={{ 
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 500
              }}
            />
            {row.original.referenceTo && (
              <Typography 
                variant="caption" 
                display="block" 
                sx={{ mt: 0.5, color: '#706e6b' }}
              >
                → {row.original.referenceTo}
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
                lineHeight: 1.4
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
    []
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
            <Typography variant="body2">
              {object.cloud ? object.cloud.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#706e6b', fontWeight: 600 }}>
              Total Fields:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {fields.length}
            </Typography>
          </Box>
        </Box>
        {object.description && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#706e6b', fontWeight: 600 }}>
              Description:
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {object.description}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Fields Table */}
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
          row.original.description || row.original.picklistValues ? (
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
              {row.original.picklistValues && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#706e6b' }}>
                    Picklist Values:
                  </Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {row.original.picklistValues.map((value, idx) => (
                      <Chip 
                        key={idx} 
                        label={value} 
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : null
        )}
      />
    </Box>
  );
};

export default FieldDetail;

