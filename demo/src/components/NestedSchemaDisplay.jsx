import React from 'react';
import { Box, Typography, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/**
 * Component to render nested metadata schema properties
 */
const NestedSchemaDisplay = ({ schema, level = 0, onObjectClick, objectExists }) => {
  if (!schema || !schema.properties) return null;
  
  const maxLevel = 3; // Prevent too deep nesting in UI
  if (level > maxLevel) {
    return (
      <Typography variant="caption" sx={{ color: '#706e6b', fontStyle: 'italic' }}>
        (nested schema - expand to view)
      </Typography>
    );
  }
  
  const properties = Object.entries(schema.properties);
  
  return (
    <Box sx={{ pl: level > 0 ? 2 : 0, mt: level > 0 ? 1 : 0 }}>
      {properties.map(([propName, propInfo], index) => {
        const hasNestedSchema = propInfo.schema || (propInfo.items && propInfo.items.properties);
        const nestedSchema = propInfo.schema || (propInfo.items && propInfo.items.properties ? propInfo.items : null);
        const isReference = propInfo.$ref || (propInfo.items && propInfo.items.$ref);
        const refType = isReference ? (propInfo.$ref || propInfo.items.$ref) : null;
        
        return (
          <Box
            key={propName}
            sx={{
              mb: 1,
              pb: 1,
              borderBottom: index < properties.length - 1 ? '1px solid #f3f2f2' : 'none'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: '#0070d2',
                  fontSize: '0.8rem'
                }}
              >
                {propName}
              </Typography>
              
              <Chip
                label={propInfo.type || 'unknown'}
                size="small"
                variant="outlined"
                sx={{
                  height: '20px',
                  fontSize: '0.7rem',
                  borderRadius: '3px'
                }}
              />
              
              {propInfo.itemType && (
                <Chip
                  label={`items: ${propInfo.itemType}`}
                  size="small"
                  variant="filled"
                  sx={{
                    height: '20px',
                    fontSize: '0.65rem',
                    borderRadius: '3px',
                    backgroundColor: '#e8f4f8',
                    color: '#014486'
                  }}
                />
              )}
              
              {propInfo.nullable && (
                <Chip
                  label="nullable"
                  size="small"
                  sx={{
                    height: '18px',
                    fontSize: '0.65rem',
                    borderRadius: '3px',
                    backgroundColor: '#fef7e5',
                    color: '#826902'
                  }}
                />
              )}
              
              {propInfo.readOnly && (
                <Chip
                  label="read-only"
                  size="small"
                  sx={{
                    height: '18px',
                    fontSize: '0.65rem',
                    borderRadius: '3px',
                    backgroundColor: '#fef7e5',
                    color: '#826902'
                  }}
                />
              )}
            </Box>
            
            {propInfo.description && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  color: '#706e6b',
                  fontSize: '0.75rem'
                }}
              >
                {propInfo.description}
              </Typography>
            )}
            
            {isReference && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  color: objectExists && objectExists(refType) ? '#0176d3' : '#706e6b',
                  fontWeight: 500,
                  cursor: objectExists && objectExists(refType) ? 'pointer' : 'default',
                  '&:hover': objectExists && objectExists(refType) ? {
                    textDecoration: 'underline'
                  } : {}
                }}
                onClick={() => {
                  if (objectExists && objectExists(refType) && onObjectClick) {
                    onObjectClick(refType);
                  }
                }}
              >
                → {refType}
              </Typography>
            )}
            
            {hasNestedSchema && nestedSchema && nestedSchema.properties && (
              <Accordion
                sx={{
                  mt: 1,
                  boxShadow: 'none',
                  border: '1px solid #e0e0e0',
                  '&:before': { display: 'none' },
                  backgroundColor: '#fafafa'
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: '36px',
                    '& .MuiAccordionSummary-content': {
                      margin: '8px 0'
                    }
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#014486' }}>
                    {propInfo.type === 'array' ? `${propInfo.itemType} Properties` : `${propInfo.originalType} Properties`}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <NestedSchemaDisplay
                    schema={nestedSchema}
                    level={level + 1}
                    onObjectClick={onObjectClick}
                    objectExists={objectExists}
                  />
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default NestedSchemaDisplay;

