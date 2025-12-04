import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getObject, getObjectDescription } from '@sf-explorer/salesforce-object-reference';
import 'vis-network/styles/vis-network.css';
import { validateObjectForGraph, formatValidationReport } from '../utils/graphValidator';

/**
 * Pure Browser-Based Graph Visualization
 * 
 * No Neo4j required! Uses the JSON data directly with D3.js or vis.js
 * Perfect for demos and lightweight visualization needs
 */
// Helper to get Salesforce icon URL - using PNG images from public folder
const getIconUrl = (iconString) => {
  if (!iconString) return null;
  
  const [iconType, iconName] = iconString.split(':');
  
  if (!iconType || !iconName) return null;
  
  // Use 60px PNG version from public folder
  return `/icons/${iconType}/${iconName}_60.png`;
};

export default function SimpleGraphVisualization({ objectName = 'Account' }) {
  const containerRef = useRef(null);
  const graphContainerRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const networkRef = useRef(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set([objectName])); // Track expanded nodes
  const availableObjectsRef = useRef(null); // Store available objects for expand operations
  const [selectedNode, setSelectedNode] = useState(null); // Track selected node for detail panel
  const [selectedNodeData, setSelectedNodeData] = useState(null); // Store full object data for selected node
  const [fieldFilter, setFieldFilter] = useState(''); // Filter for fields in side panel

  useEffect(() => {
    setExpandedNodes(new Set([objectName])); // Reset expanded nodes when object changes
    loadGraphData();
  }, [objectName]);

  // Reload graph when expanded nodes change
  useEffect(() => {
    if (expandedNodes.size > 0 && expandedNodes.has(objectName)) {
      loadGraphData();
    }
  }, [expandedNodes]);

  // Load selected node data
  useEffect(() => {
    const loadSelectedNodeData = async () => {
      if (selectedNode) {
        setFieldFilter(''); // Clear filter when selecting a new node
        try {
          const nodeData = await getObject(selectedNode);
          const nodeDesc = await getObjectDescription(selectedNode);
          setSelectedNodeData({ ...nodeData, ...nodeDesc });
        } catch (err) {
          console.error('Failed to load selected node data:', err);
          setSelectedNodeData(null);
        }
      } else {
        setSelectedNodeData(null);
      }
    };
    loadSelectedNodeData();
  }, [selectedNode]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Resize network when entering/exiting fullscreen
      if (networkRef.current) {
        setTimeout(() => {
          networkRef.current.fit();
        }, 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!graphContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await graphContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  const loadGraphData = async () => {
    try {
      setLoading(true);
      setError(null);
      setValidation(null);

      // Load all objects from index to check existence
      const { loadAllDescriptions } = await import('@sf-explorer/salesforce-object-reference');
      const allDescriptions = await loadAllDescriptions();
      const availableObjects = new Set(Object.keys(allDescriptions));
      availableObjectsRef.current = availableObjects; // Store for expand operations
      
      console.log(`📚 Loaded ${availableObjects.size} objects from index`);

      // Helper functions
      const objectExistsInIndex = (objectName) => {
        return availableObjects.has(objectName);
      };

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

      // Load the main object
      const mainObject = await getObject(objectName);
      if (!mainObject) {
        throw new Error(`Object ${objectName} not found`);
      }

      // Validate object structure
      console.log(`🔍 Validating ${objectName}...`);
      const validationResult = await validateObjectForGraph(objectName, mainObject, getObjectDescription);
      setValidation(validationResult);
      
      // Log validation report to console
      console.log(formatValidationReport(validationResult, objectName));
      
      if (!validationResult.valid) {
        throw new Error(`Object ${objectName} failed validation. Check console for details.`);
      }

      // Build graph structure
      const nodes = [];
      const edges = [];
      const processedObjects = new Set();

      // Get icon for main object
      const mainObjectDesc = await getObjectDescription(objectName);
      const mainIconUrl = getIconUrl(mainObjectDesc?.icon);

      // Add main object node
      nodes.push({
        id: objectName,
        label: mainObject.name,
        title: `${mainObject.name}\n${mainObject.description?.substring(0, 100)}...`,
        ...(mainIconUrl ? {
          shape: 'image',
          image: mainIconUrl,
          size: 35,
        } : {
          shape: 'dot',
          color: {
            background: '#0176d3',
            border: '#014486',
            highlight: {
              background: '#005FB2',
              border: '#032d60'
            }
          },
          size: 35,
          borderWidth: 3,
        }),
        font: { 
          color: mainIconUrl ? '#000' : '#fff',
          size: 14,
          face: 'Salesforce Sans, Arial',
          bold: true
        },
        fieldCount: Object.keys(mainObject.properties).length
      });
      processedObjects.add(objectName);

      // Process fields and references (parent relationships)
      const excludedParentFields = [
        'LastModifiedById',
        'CreatedById',
        'OwnerId',
        'RecordTypeId',
        'SystemModstamp'
      ];
      
      for (const [fieldName, fieldData] of Object.entries(mainObject.properties)) {
        // Skip system/audit fields
        if (excludedParentFields.includes(fieldName)) continue;
        
        // Only show references with explicit x-object or referenceTo data
        let referencedObjects = [];
        
        if (fieldData.referenceTo && Array.isArray(fieldData.referenceTo)) {
          referencedObjects = fieldData.referenceTo;
        } else if (fieldData['x-object']) {
          // Single reference from scraped data
          referencedObjects = [fieldData['x-object']];
        }
        // Skip references without explicit object data
        
        for (const referencedObject of referencedObjects) {
          // Check if object exists in our index
          if (!objectExistsInIndex(referencedObject)) {
            console.log(`Skipping ${referencedObject} - not in index`);
            continue;
          }
          
          // Add referenced object node if not already added
          if (!processedObjects.has(referencedObject)) {
            // Get icon for referenced object
            const refObjectDesc = await getObjectDescription(referencedObject);
            const refIconUrl = getIconUrl(refObjectDesc?.icon);
            
            nodes.push({
              id: referencedObject,
              label: referencedObject,
              title: `${referencedObject}${refObjectDesc?.label ? ` (${refObjectDesc.label})` : ''}\n${refObjectDesc?.description ? refObjectDesc.description.substring(0, 150) + '...' : 'Referenced by ' + objectName + '.' + fieldName}`,
              ...(refIconUrl ? {
                shape: 'image',
                image: refIconUrl,
                size: 25,
              } : {
                shape: 'dot',
                color: {
                  background: '#FFD86E',
                  border: '#E6A23C',
                  highlight: {
                    background: '#F5BA3A',
                    border: '#E6A23C'
                  }
                },
                size: 25,
                borderWidth: 2,
              }),
              font: {
                size: 12
              }
            });
            processedObjects.add(referencedObject);
          }

          // Add edge (parent relationship: main object -> referenced object)
          edges.push({
            from: objectName,
            to: referencedObject,
            label: fieldName,
            title: `${fieldName}${fieldData.relationshipName ? ` (${fieldData.relationshipName})` : ''}`,
            arrows: 'to',
            color: { color: '#0176d3' }
          });
        }
      }

      // Process child relationships (objects that reference this object)
      if (mainObject.childRelationships && Array.isArray(mainObject.childRelationships)) {
        for (const childRel of mainObject.childRelationships) {
          const childObject = childRel.childObject;
          const relationshipName = childRel.relationshipName || childRel.field;
          
          if (!childObject) continue;
          
          // Skip excluded child objects
          if (shouldExcludeChildObject(childObject)) continue;
          
          // Check if child object exists in our index
          if (!objectExistsInIndex(childObject)) {
            console.log(`Skipping child ${childObject} - not in index`);
            continue;
          }
          
          // Add child object node if not already added
          if (!processedObjects.has(childObject)) {
            const childObjectDesc = await getObjectDescription(childObject);
            const childIconUrl = getIconUrl(childObjectDesc?.icon);
            
            nodes.push({
              id: childObject,
              label: childObject,
              title: `${childObject}${childObjectDesc?.label ? ` (${childObjectDesc.label})` : ''}\n${childObjectDesc?.description ? childObjectDesc.description.substring(0, 150) + '...' : childObject + ' references ' + objectName}`,
              ...(childIconUrl ? {
                shape: 'image',
                image: childIconUrl,
                size: 25,
              } : {
                shape: 'dot',
                color: {
                  background: '#95E1D3',
                  border: '#4ECDC4',
                  highlight: {
                    background: '#4ECDC4',
                    border: '#44A6A0'
                  }
                },
                size: 25,
                borderWidth: 2,
              }),
              font: {
                size: 12
              }
            });
            processedObjects.add(childObject);
          }

          // Add edge (child relationship: child object -> main object)
          // Use different color and style for cascade delete relationships
          const isCascadeDelete = childRel.cascadeDelete === true;
          edges.push({
            from: childObject,
            to: objectName,
            label: relationshipName,
            title: `${childObject}.${childRel.field} → ${objectName}${isCascadeDelete ? ' (CASCADE DELETE)' : ''}`,
            arrows: 'to',
            color: { 
              color: isCascadeDelete ? '#E74C3C' : '#4ECDC4',
              highlight: isCascadeDelete ? '#C0392B' : '#44A6A0'
            },
            width: isCascadeDelete ? 3 : 1,
            dashes: isCascadeDelete ? false : [5, 5] // Solid for cascade delete, dashed for normal
          });
        }
      }

      // Load relationships for expanded nodes
      const referencedObjectNames = [...processedObjects].filter(name => name !== objectName);
      for (const refObjName of referencedObjectNames) {
        // Only load relationships for expanded nodes
        if (!expandedNodes.has(refObjName)) continue;
        
        try {
          const refObject = await getObject(refObjName);
          if (refObject && refObject.properties) {
            for (const [fieldName, fieldData] of Object.entries(refObject.properties)) {
              // Only show references with explicit data
              let secondLevelRefs = [];
              
              if (fieldData.referenceTo && Array.isArray(fieldData.referenceTo)) {
                secondLevelRefs = fieldData.referenceTo;
              } else if (fieldData['x-object']) {
                secondLevelRefs = [fieldData['x-object']];
              }
              
              for (const secondLevelRef of secondLevelRefs) {
                if (processedObjects.has(secondLevelRef)) {
                  // Add edge if both objects are already in our graph
                  edges.push({
                    from: refObjName,
                    to: secondLevelRef,
                    label: fieldName,
                    title: `${fieldName}`,
                    arrows: 'to',
                    color: '#ccc',
                    dashes: true
                  });
                }
              }
            }
          }
        } catch (err) {
          console.warn(`Could not load ${refObjName}:`, err);
        }
      }

      setGraphData({ nodes, edges });
      setLoading(false);
    } catch (err) {
      console.error('Failed to load graph data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!graphData || !containerRef.current) return;

    // Dynamically import vis-network
    const loadVisNetwork = async () => {
      try {
        const visModule = await import('vis-network/standalone/esm/vis-network.js');
        const Network = visModule.Network;
        
        const data = {
          nodes: graphData.nodes,
          edges: graphData.edges
        };

        const options = {
          nodes: {
            shape: 'dot',
            font: {
              size: 13,
              color: '#000000',
              face: 'Salesforce Sans, Arial'
            },
            borderWidth: 2,
            shadow: {
              enabled: true,
              color: 'rgba(0,0,0,0.15)',
              size: 8,
              x: 2,
              y: 2
            },
            shapeProperties: {
              interpolation: false
            }
          },
          edges: {
            width: 2,
            color: { 
              color: '#848484',
              highlight: '#0176d3',
              hover: '#0176d3'
            },
            smooth: {
              type: 'continuous'
            },
            font: {
              size: 11,
              align: 'middle'
            },
            arrows: {
              to: {
                enabled: true,
                scaleFactor: 0.5
              }
            }
          },
          physics: {
            stabilization: {
              iterations: 150
            },
            barnesHut: {
              gravitationalConstant: -8000,
              springConstant: 0.001,
              springLength: 200
            }
          },
          interaction: {
            hover: true,
            tooltipDelay: 100,
            navigationButtons: true,
            keyboard: true
          }
        };

        // Clear previous network
        if (networkRef.current) {
          networkRef.current.destroy();
        }

        const network = new Network(containerRef.current, data, options);
        networkRef.current = network;

        // Event handlers
        // Single click to select node and show details
        network.on('click', async (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            console.log('Clicked node:', nodeId);
            setSelectedNode(nodeId);
          } else {
            // Clicked on empty space - deselect
            setSelectedNode(null);
          }
        });

        // Double-click to navigate to object
        network.on('doubleClick', (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            console.log('Double-clicked node:', nodeId, '- navigating to object view');
            navigate(`/object/${nodeId}`);
          }
        });

        // Show tooltip on hover
        network.on('hoverNode', (params) => {
          const nodeId = params.node;
          network.canvas.body.container.style.cursor = 'pointer';
        });

        network.on('blurNode', () => {
          network.canvas.body.container.style.cursor = 'default';
        });

      } catch (err) {
        console.error('Failed to load vis-network:', err);
        setError('Failed to load visualization library');
      }
    };

    loadVisNetwork();

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [graphData]);

  return (
    <div 
      ref={graphContainerRef}
      className="simple-graph-visualization"
      style={{
        background: isFullscreen ? '#fff' : 'transparent',
        padding: isFullscreen ? '20px' : '0',
        display: 'flex',
        gap: '20px'
      }}
    >
      {/* Main graph area */}
      <div style={{ flex: selectedNode ? '1 1 60%' : '1 1 100%', minWidth: 0 }}>
      <div className="graph-header" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h3>Object Relationships: {objectName}</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '0.9em', color: '#666', margin: 0 }}>
                <strong>Click</strong> a node to view fields • <strong>Double-click</strong> to open full details
              </p>
              {validation && (
                <button
                  onClick={() => setShowValidation(!showValidation)}
                  style={{
                    padding: '4px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85em'
                  }}
                >
                  {showValidation ? 'Hide' : 'Show'} Validation
                </button>
              )}
            </div>
            {/* Legend */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.85em',
              color: '#666'
            }}>
              {/* Relationship types legend */}
              <div style={{
                display: 'flex',
                gap: '15px',
                padding: '8px 12px',
                background: '#f8f9fa',
                borderRadius: '4px',
                borderLeft: '3px solid #0176d3'
              }}>
                <strong style={{ marginRight: '10px' }}>Relationships:</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="20" height="2">
                    <line x1="0" y1="1" x2="20" y2="1" stroke="#0176d3" strokeWidth="2"/>
                  </svg>
                  Parent
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="20" height="2">
                    <line x1="0" y1="1" x2="20" y2="1" stroke="#4ECDC4" strokeWidth="2" strokeDasharray="5,5"/>
                  </svg>
                  Child
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="20" height="3">
                    <line x1="0" y1="1.5" x2="20" y2="1.5" stroke="#E74C3C" strokeWidth="3"/>
                  </svg>
                  Cascade Delete
                </span>
              </div>
              
              {/* Node colors legend */}
              <div style={{
                display: 'flex',
                gap: '15px',
                padding: '8px 12px',
                background: '#f0f9ff',
                borderRadius: '4px',
                borderLeft: '3px solid #0176d3'
              }}>
                <strong style={{ marginRight: '10px' }}>Nodes:</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16">
                    <circle cx="8" cy="8" r="7" fill="#0176d3" stroke="#014486" strokeWidth="2"/>
                  </svg>
                  Main Object
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16">
                    <circle cx="8" cy="8" r="6" fill="#FFD86E" stroke="#E6A23C" strokeWidth="1.5"/>
                  </svg>
                  Parent Reference
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16">
                    <circle cx="8" cy="8" r="6" fill="#95E1D3" stroke="#4ECDC4" strokeWidth="1.5"/>
                  </svg>
                  Child Reference
                </span>
              </div>
            </div>
          </div>
          
          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9em'
            }}
            title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                </svg>
                Exit Fullscreen
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
                Fullscreen
              </>
            )}
          </button>
        </div>
        
        {validation && showValidation && (
          <div style={{ 
            marginTop: '10px',
            padding: '12px', 
            background: validation.valid ? '#f0f9ff' : '#fff3cd',
            border: `1px solid ${validation.valid ? '#0176d3' : '#ffc107'}`,
            borderRadius: '4px',
            fontSize: '0.85em',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap'
          }}>
            {formatValidationReport(validation, objectName)}
          </div>
        )}
      </div>

      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div>Loading graph data...</div>
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', color: 'red', border: '1px solid red', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {graphData && validation && (
        <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#666' }}>
          {graphData.nodes.length} objects, {graphData.edges.length} relationships
          {validation.stats.invalidReferences > 0 && (
            <span style={{ color: '#999', marginLeft: '10px' }}>
              ({validation.stats.invalidReferences} incomplete refs skipped)
            </span>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 120px)' : '600px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          display: loading ? 'none' : 'block'
        }}
      />
      </div>

      {/* Side panel for selected node details */}
      {selectedNode && selectedNodeData && (
        <div style={{
          flex: '0 0 35%',
          minWidth: '300px',
          maxWidth: '400px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '15px',
          background: '#fff',
          maxHeight: isFullscreen ? 'calc(100vh - 120px)' : '600px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedNode}</h3>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.5rem',
                color: '#666',
                padding: '0 5px',
                lineHeight: 1
              }}
              title="Close"
            >
              ×
            </button>
          </div>
          
          {selectedNodeData.label && (
            <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
              {selectedNodeData.label}
            </p>
          )}
          
          {selectedNodeData.description && (
            <p style={{ fontSize: '0.85em', color: '#666', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
              {selectedNodeData.description}
            </p>
          )}

          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '0.9rem', margin: 0 }}>
                Fields ({selectedNodeData.properties ? Object.keys(selectedNodeData.properties).length : 0})
              </h4>
            </div>
            
            {/* Filter input */}
            <input
              type="text"
              placeholder="Filter fields..."
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.85em',
                marginBottom: '10px',
                boxSizing: 'border-box'
              }}
            />
            
            {selectedNodeData.properties && (() => {
              const allFields = Object.entries(selectedNodeData.properties);
              const filteredFields = fieldFilter 
                ? allFields.filter(([fieldName, fieldData]) => 
                    fieldName.toLowerCase().includes(fieldFilter.toLowerCase()) ||
                    (fieldData.description && fieldData.description.toLowerCase().includes(fieldFilter.toLowerCase())) ||
                    (fieldData.type && fieldData.type.toLowerCase().includes(fieldFilter.toLowerCase()))
                  )
                : allFields;
              
              return (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredFields.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '0.85em' }}>
                    No fields match "{fieldFilter}"
                  </div>
                ) : (
                  <>
                    {filteredFields.slice(0, 50).map(([fieldName, fieldData]) => (
                  <div
                    key={fieldName}
                    style={{
                      padding: '8px',
                      marginBottom: '5px',
                      background: '#f8f9fa',
                      borderRadius: '3px',
                      fontSize: '0.85em'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#0176d3', fontFamily: 'monospace' }}>
                      {fieldName}
                    </div>
                    <div style={{ color: '#666', fontSize: '0.9em', marginTop: '2px' }}>
                      {fieldData.type || 'unknown'}
                      {fieldData['x-object'] && ` → ${fieldData['x-object']}`}
                      {fieldData.referenceTo && ` → ${Array.isArray(fieldData.referenceTo) ? fieldData.referenceTo.join(', ') : fieldData.referenceTo}`}
                    </div>
                    {fieldData.description && (
                      <div style={{ color: '#999', fontSize: '0.85em', marginTop: '3px' }}>
                        {fieldData.description.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                    ))}
                    {filteredFields.length > 50 && (
                      <div style={{ textAlign: 'center', padding: '10px', color: '#666', fontSize: '0.85em' }}>
                        Showing 50 of {filteredFields.length} matching fields
                      </div>
                    )}
                  </>
                )}
              </div>
              );
            })()}
          </div>

          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
            <button
              onClick={() => navigate(`/object/${selectedNode}`)}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: '#0176d3',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9em',
                fontWeight: 600
              }}
            >
              View Full Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

