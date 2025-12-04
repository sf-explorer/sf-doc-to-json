import React, { useMemo } from 'react';
import { MaterialReactTable } from 'material-react-table';
import { Box, Chip, useMediaQuery, useTheme } from '@mui/material';
import SalesforceIcon from './SalesforceIcon';
import CloudIcon from './CloudIcon';

const ObjectList = ({ objects, loading, onObjectSelect, selectedObject, cloudMetadata = {}, hideCloudColumn = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const columns = useMemo(
    () => [
      {
        accessorKey: 'icon',
        header: '',
        size: 50,
        enableSorting: false,
        Cell: ({ row }) => (
          <SalesforceIcon 
            objectData={row.original}
          />
        ),
      },
      {
        accessorKey: 'label',
        header: 'Object Label',
        size: 180,
      },
      {
        accessorKey: 'apiName',
        header: 'API Name',
        size: 180,
      },
      {
        accessorKey: 'keyPrefix',
        header: 'Prefix',
        size: 80,
        enableHiding: true,
        Cell: ({ cell }) => {
          const prefix = cell.getValue();
          return prefix ? (
            <Box 
              sx={{ 
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#014486',
                backgroundColor: '#ecebea',
                padding: '2px 6px',
                borderRadius: '3px',
                display: 'inline-block'
              }}
            >
              {prefix}
            </Box>
          ) : (
            <Box 
              sx={{ 
                fontSize: '0.75rem',
                color: '#c9c7c5',
                fontStyle: 'italic',
                textAlign: 'center'
              }}
            >
              
            </Box>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        size: 300,
        enableHiding: true,
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
                WebkitLineClamp: 3,
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
        accessorKey: 'fieldCount',
        header: 'Fields',
        size: 80,
        enableHiding: true,
        Cell: ({ cell }) => (
          <Box sx={{ textAlign: 'center', fontWeight: 600 }}>
            {cell.getValue()}
          </Box>
        ),
      },
      {
        accessorKey: 'cloud',
        header: 'Cloud',
        size: 150,
        enableHiding: true,
        Cell: ({ cell }) => {
          const cloudName = cell.getValue();
          const friendlyName = cloudName
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloudIcon cloudName={cloudName} metadata={cloudMetadata[cloudName]} size={20} />
              <Chip 
                label={friendlyName} 
                size="small"
                variant="outlined"
                sx={{ 
                  borderRadius: '4px',
                  fontWeight: 500,
                  fontSize: '0.7rem'
                }}
              />
            </Box>
          );
        },
      },
    ],
    [isMobile]
  );

  return (
    <MaterialReactTable
      columns={columns}
      data={objects}
      state={{ 
        isLoading: loading,
        rowSelection: selectedObject ? { [objects.indexOf(selectedObject)]: true } : {},
        columnVisibility: isMobile ? {
          keyPrefix: false,
          description: false,
          fieldCount: false,
          cloud: false,
        } : {
          cloud: !hideCloudColumn // Hide cloud column if hideCloudColumn is true
        }
      }}
      enableRowSelection={false}
      enableColumnActions={true}
      enableColumnFilters={true}
      enablePagination={true}
      enableSorting={true}
      enableGlobalFilter={true}
      enableGrouping={false}
      enableColumnDragging={!isMobile}
      enableHiding={true}
      initialState={{ 
        density: isMobile ? 'compact' : 'comfortable',
        pagination: { pageSize: isMobile ? 10 : 15, pageIndex: 0 },
        sorting: [{ id: 'fieldCount', desc: true }] // Sort by field count descending by default
      }}
      muiTableBodyRowProps={({ row }) => ({
        onClick: () => onObjectSelect(row.original),
        sx: {
          cursor: 'pointer',
          backgroundColor: selectedObject?.apiName === row.original.apiName ? '#e8f4ff' : 'inherit',
          '&:hover': {
            backgroundColor: '#f3f2f2',
          },
          // Better touch targets on mobile
          '@media (max-width: 900px)': {
            '& td': {
              padding: '12px 8px !important',
            }
          }
        },
      })}
      muiTableProps={{
        sx: {
          tableLayout: 'fixed',
          // Improve horizontal scrolling on mobile
          '@media (max-width: 900px)': {
            minWidth: '100%',
          }
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
          overflow: 'hidden',
          padding: '8px 16px',
        },
      }}
      muiSearchTextFieldProps={{
        placeholder: isMobile ? 'Search...' : 'Search objects...',
        variant: 'outlined',
        size: 'small',
        sx: {
          '@media (max-width: 900px)': {
            minWidth: '100px',
            '& input': {
              fontSize: '14px',
            }
          }
        }
      }}
      muiTopToolbarProps={{
        sx: {
          backgroundColor: '#fafaf9',
          borderRadius: '4px',
          marginBottom: '1rem',
          '@media (max-width: 900px)': {
            padding: '8px',
            marginBottom: '0.5rem',
            flexWrap: 'wrap',
            gap: '8px',
          }
        },
      }}
      muiBottomToolbarProps={{
        sx: {
          '@media (max-width: 900px)': {
            padding: '8px',
            '& .MuiTablePagination-root': {
              fontSize: '0.75rem',
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.75rem',
              marginBottom: 0,
            }
          }
        }
      }}
    />
  );
};

export default ObjectList;

