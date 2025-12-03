import React, { useMemo } from 'react';
import { MaterialReactTable } from 'material-react-table';
import { Box, Chip } from '@mui/material';
import SalesforceIcon from './SalesforceIcon';
import CloudIcon from './CloudIcon';

const ObjectList = ({ objects, loading, onObjectSelect, selectedObject, cloudMetadata = {} }) => {
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
              —
            </Box>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        size: 300,
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
        accessorKey: 'isCustom',
        header: 'Type',
        size: 100,
        Cell: ({ cell }) => (
          <Chip 
            label={cell.getValue() ? 'Custom' : 'Standard'} 
            size="small"
            color={cell.getValue() ? 'primary' : 'default'}
            sx={{ 
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          />
        ),
      },
      {
        accessorKey: 'fieldCount',
        header: 'Fields',
        size: 80,
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
    []
  );

  return (
    <MaterialReactTable
      columns={columns}
      data={objects}
      state={{ 
        isLoading: loading,
        rowSelection: selectedObject ? { [objects.indexOf(selectedObject)]: true } : {}
      }}
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
        pagination: { pageSize: 15, pageIndex: 0 }
      }}
      muiTableBodyRowProps={({ row }) => ({
        onClick: () => onObjectSelect(row.original),
        sx: {
          cursor: 'pointer',
          backgroundColor: selectedObject?.apiName === row.original.apiName ? '#e8f4ff' : 'inherit',
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
        placeholder: 'Search objects...',
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
    />
  );
};

export default ObjectList;

