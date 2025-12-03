import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const Breadcrumb = ({ items, onNavigate }) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        mb: 2,
        p: 1.5,
        backgroundColor: '#fafaf9',
        borderRadius: '4px',
        border: '1px solid #dddbda'
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRightIcon sx={{ fontSize: '1.25rem', color: '#706e6b' }} />
          )}
          {index === 0 && (
            <HomeIcon sx={{ fontSize: '1.25rem', color: '#706e6b', mr: 0.5 }} />
          )}
          {index === items.length - 1 ? (
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600,
                color: '#080707',
                fontSize: '0.875rem'
              }}
            >
              {item.label}
            </Typography>
          ) : (
            <Link
              component="button"
              variant="body2"
              onClick={() => onNavigate(item)}
              sx={{
                textDecoration: 'none',
                color: '#0176d3',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                  color: '#014486'
                },
                border: 'none',
                background: 'none',
                padding: 0,
                font: 'inherit'
              }}
            >
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </Box>
  );
};

export default Breadcrumb;

