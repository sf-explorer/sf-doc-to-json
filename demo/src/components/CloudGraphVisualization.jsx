import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadAllDescriptions, getObject, getObjectDescription } from '@sf-explorer/salesforce-object-reference';
import 'vis-network/styles/vis-network.css';
import { validateCloudForGraph, formatValidationReport } from '../utils/graphValidator';

// Helper to get Salesforce icon URL - using PNG images from public folder
const getIconUrl = (iconString) => {
  if (!iconString) return null;
  
  const [iconType, iconName] = iconString.split(':');
  
  if (!iconType || !iconName) return null;
  
  // Use 60px PNG version from public folder
  return `/icons/${iconType}/${iconName}_60.png`;
};

/**
 * Cloud-Based Graph Visualization
 * 
 * Shows all objects within a cloud and their interconnections
 * Perfect for understanding cloud architecture and dependencies
 */
export default function CloudGraphVisualization({ cloudName = 'Core Salesforce', maxObjects = 50 }) {
  const containerRef = useRef(null);
  const graphContainerRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [stats, setStats] = useState(null);
  const [validation, setValidation] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const networkRef = useRef(null);

  useEffect(() => {
    loadCloudGraph();
  }, [cloudName, maxObjects]);

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

  const loadCloudGraph = async () => {
    try {
      setLoading(true);
      setError(null);
      setValidation(null);

      // Load all objects
      const allDescriptions = await loadAllDescriptions();
      if (!allDescriptions) {
        throw new Error('Failed to load object descriptions');
      }

      // Filter objects by cloud
      const cloudObjectNames = Object.entries(allDescriptions)
        .filter(([name, metadata]) => metadata.cloud === cloudName)
        .map(([name]) => name);

      console.log(`Found ${cloudObjectNames.length} objects in ${cloudName}, loading to sort by importance...`);

      // Load objects and count fields to find the most important ones
      const objectsWithFieldCounts = [];
      for (const objectName of cloudObjectNames) {
        try {
          const obj = await getObject(objectName);
          if (obj && obj.properties) {
            objectsWithFieldCounts.push({
              name: objectName,
              fieldCount: Object.keys(obj.properties).length,
              object: obj
            });
          }
        } catch (err) {
          console.warn(`Failed to load ${objectName} for sorting:`, err);
        }
      }

      // Sort by field count (most fields = most important) and take top N
      const sortedObjects = objectsWithFieldCounts
        .sort((a, b) => b.fieldCount - a.fieldCount)
        .slice(0, maxObjects);

      const cloudObjects = sortedObjects.map(o => o.name);
      
      console.log(`Loaded ${cloudObjects.length} most important objects from ${cloudName}:`,
        sortedObjects.slice(0, 10).map(o => `${o.name} (${o.fieldCount} fields)`));

      // Validate cloud structure
      console.log(`🔍 Validating ${cloudName}...`);
      const validationResult = await validateCloudForGraph(cloudName, cloudObjects, getObject, getObjectDescription);
      setValidation(validationResult);
      
      // Log validation report to console
      console.log(formatValidationReport(validationResult, cloudName));

      const nodes = [];
      const edges = [];
      const processedObjects = new Set();
      let totalRelationships = 0;

      // Create a map for quick lookup
      const objectDataMap = new Map(sortedObjects.map(o => [o.name, o]));

      // Load each object and find relationships
      for (const objectName of cloudObjects) {
        try {
          const objectData = objectDataMap.get(objectName);
          const obj = objectData.object;
          const fieldCount = objectData.fieldCount;
          
          if (!obj || !obj.properties) continue;

          // Get icon for object
          const objDesc = await getObjectDescription(objectName);
          const iconUrl = getIconUrl(objDesc?.icon);

          // Calculate node size based on field count (more fields = more important = larger)
          const minSize = 25;
          const maxSize = 50;
          const maxFields = sortedObjects[0].fieldCount;
          const nodeSize = minSize + ((fieldCount / maxFields) * (maxSize - minSize));

          // Add object node
          nodes.push({
            id: objectName,
            label: objectName,
            title: `${objectName}\n${fieldCount} fields\n${obj.description?.substring(0, 100) || 'No description'}...`,
            ...(iconUrl ? {
              shape: 'image',
              image: iconUrl,
              size: nodeSize,
            } : {
              shape: 'dot',
              color: {
                background: getColorByCategory(objectName),
                border: '#2C3E50'
              },
              size: nodeSize,
              borderWidth: 2,
            }),
            fieldCount // Store for reference
          });
          processedObjects.add(objectName);

          // Find references to other objects in the same cloud
          for (const [fieldName, fieldData] of Object.entries(obj.properties)) {
            let referencedObjects = [];
            
            // Only show references with explicit x-object or referenceTo data
            if (fieldData.referenceTo && Array.isArray(fieldData.referenceTo)) {
              referencedObjects = fieldData.referenceTo;
            } else if (fieldData['x-object']) {
              referencedObjects = [fieldData['x-object']];
            }
            // Skip references without explicit object data

            for (const refObj of referencedObjects) {
              // Only create edge if both objects are in this cloud
              if (cloudObjects.includes(refObj)) {
                edges.push({
                  from: objectName,
                  to: refObj,
                  label: fieldName,
                  title: `${objectName}.${fieldName} → ${refObj}`,
                  smooth: { type: 'curvedCW', roundness: 0.2 }
                });
                totalRelationships++;
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to load ${objectName}:`, err);
        }
      }

      setGraphData({ nodes, edges });
      setStats({
        objectCount: nodes.length,
        relationshipCount: edges.length,
        cloudName,
        topObjects: sortedObjects.slice(0, 5).map(o => ({
          name: o.name,
          fieldCount: o.fieldCount
        }))
      });
      setLoading(false);
    } catch (err) {
      console.error('Failed to load cloud graph:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const getColorByCategory = (objectName) => {
    // Custom objects
    if (objectName.includes('__c')) return '#FF6B6B';
    // Common core objects
    if (['Account', 'Contact', 'Opportunity', 'Lead', 'Case'].includes(objectName)) return '#4ECDC4';
    // Others
    return '#95E1D3';
  };

  useEffect(() => {
    if (!graphData || !containerRef.current) return;

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
              size: 11,
              color: '#000000',
              face: 'Salesforce Sans, Arial'
            },
            borderWidth: 2,
            shadow: {
              enabled: true,
              color: 'rgba(0,0,0,0.12)',
              size: 6,
              x: 2,
              y: 2
            },
            shapeProperties: {
              interpolation: false
            }
          },
          edges: {
            width: 1.5,
            color: { 
              color: '#848484', 
              highlight: '#0176d3',
              hover: '#0176d3'
            },
            smooth: {
              type: 'continuous'
            },
            font: {
              size: 10,
              align: 'middle',
              background: 'rgba(255,255,255,0.7)'
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
              iterations: 300
            },
            barnesHut: {
              gravitationalConstant: -10000,
              springConstant: 0.002,
              springLength: 150,
              avoidOverlap: 0.5
            }
          },
          interaction: {
            hover: true,
            tooltipDelay: 100,
            navigationButtons: true,
            keyboard: true
          },
          layout: {
            improvedLayout: true,
            randomSeed: 42
          }
        };

        if (networkRef.current) {
          networkRef.current.destroy();
        }

        const network = new Network(containerRef.current, data, options);
        networkRef.current = network;

        network.on('click', (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            console.log('Clicked object:', nodeId);
          }
        });

        // Double-click to navigate to object
        network.on('doubleClick', (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            console.log('Double-clicked object:', nodeId, '- navigating to object view');
            navigate(`/object/${nodeId}`);
          }
        });

        // Change cursor on hover
        network.on('hoverNode', () => {
          network.canvas.body.container.style.cursor = 'pointer';
        });

        network.on('blurNode', () => {
          network.canvas.body.container.style.cursor = 'default';
        });

        network.on('stabilizationIterationsDone', () => {
          network.setOptions({ physics: false });
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

  const handleFit = () => {
    if (networkRef.current) {
      networkRef.current.fit({ animation: true });
    }
  };

  const handleStabilize = () => {
    if (networkRef.current) {
      networkRef.current.stabilize();
    }
  };

  return (
    <div 
      ref={graphContainerRef}
      className="cloud-graph-visualization"
      style={{
        background: isFullscreen ? '#fff' : 'transparent',
        padding: isFullscreen ? '20px' : '0'
      }}
    >
      <div className="graph-header" style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 5px 0' }}>Cloud Architecture: {cloudName}</h3>
            <p style={{ fontSize: '0.9em', color: '#666', margin: '0 0 10px 0' }}>
              <strong>Double-click</strong> any object to view its details
            </p>
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
        
        {stats && !loading && (
          <>
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              fontSize: '0.9em', 
              color: '#666',
              marginBottom: '10px',
              alignItems: 'center'
            }}>
              <span>📦 {stats.objectCount} objects</span>
              <span>🔗 {stats.relationshipCount} relationships</span>
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
            
            {stats.topObjects && (
              <div style={{
                fontSize: '0.85em',
                color: '#666',
                marginBottom: '10px',
                padding: '8px 12px',
                background: '#f8f9fa',
                borderRadius: '4px',
                borderLeft: '3px solid #0176d3'
              }}>
                <strong>Top objects by field count:</strong>{' '}
                {stats.topObjects.map((o, i) => (
                  <span key={o.name}>
                    {i > 0 && ', '}
                    {o.name} ({o.fieldCount})
                  </span>
                ))}
              </div>
            )}
          </>
        )}
        
        {validation && showValidation && (
          <div style={{ 
            marginBottom: '10px',
            padding: '12px', 
            background: validation.valid ? '#f0f9ff' : '#fff3cd',
            border: `1px solid ${validation.valid ? '#0176d3' : '#ffc107'}`,
            borderRadius: '4px',
            fontSize: '0.85em',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {formatValidationReport(validation, cloudName)}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button
            onClick={handleFit}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Fit to Screen
          </button>
          <button
            onClick={handleStabilize}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Stabilize Layout
          </button>
          <button
            onClick={() => loadCloudGraph()}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          background: '#f5f5f5',
          borderRadius: '4px'
        }}>
          <div>Loading cloud graph...</div>
          <div style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
            This may take a moment for large clouds
          </div>
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '20px', 
          color: '#c00', 
          border: '1px solid #fcc', 
          borderRadius: '4px',
          background: '#fee'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 140px)' : '700px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          display: loading ? 'none' : 'block'
        }}
      />

      {!loading && graphData && (
        <div style={{ 
          marginTop: '15px', 
          padding: '15px', 
          background: '#f0f9ff', 
          borderLeft: '4px solid #0176d3',
          borderRadius: '4px'
        }}>
          <strong>💡 Understanding the Graph:</strong>
          <ul style={{ marginBottom: 0, paddingLeft: '20px', marginTop: '10px' }}>
            <li><span style={{ color: '#4ECDC4' }}>●</span> Core objects (Account, Contact, etc.)</li>
            <li><span style={{ color: '#FF6B6B' }}>●</span> Custom objects (ending with __c)</li>
            <li><span style={{ color: '#95E1D3' }}>●</span> Other standard objects</li>
            <li>Arrows show relationships between objects</li>
            <li>Hover over nodes/edges for details</li>
            <li>Click and drag nodes to rearrange</li>
          </ul>
        </div>
      )}
    </div>
  );
}

