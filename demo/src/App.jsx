import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ComponentSettings } from 'react-lightning-design-system';
import ObjectExplorer from './components/ObjectExplorer';
import SimpleGraphVisualization from './components/SimpleGraphVisualization';
import CloudGraphVisualization from './components/CloudGraphVisualization';
import './App.css';

function App() {
  // Get the base URL from Vite's environment and convert to absolute
  const baseUrl = import.meta.env.BASE_URL;
  // Use window.location.origin to get absolute URL for SVG sprites (needed for HashRouter)
  const absoluteAssetRoot = `${window.location.origin}${baseUrl}assets`;
  const location = useLocation();
  
  return (
    <ComponentSettings assetRoot={absoluteAssetRoot}>
      <div className="slds-scope">
      <div className="slds-page-header">
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-dataset">
                  <svg className="slds-icon slds-page-header__icon" aria-hidden="true">
                    <use xlinkHref={`${baseUrl}assets/icons/standard-sprite/svg/symbols.svg#dataset`}></use>
                  </svg>
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title="Salesforce Object Explorer">
                        Salesforce Object Explorer
                      </span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Browse Salesforce Standard and Custom Objects</p>
              </div>
            </div>
          </div>
          <div className="slds-page-header__col-actions">
            <div className="slds-page-header__controls" style={{ display: 'flex', gap: '0.5rem' }}>
              <Link 
                to="/graph"
                className={`slds-button ${location.pathname === '/graph' ? 'slds-button_brand' : 'slds-button_neutral'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <svg height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                Graph View
              </Link>
              <a 
                href="https://github.com/sf-explorer/sf-doc-to-json" 
                target="_blank" 
                rel="noopener noreferrer"
                className="slds-button slds-button_neutral"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<ObjectExplorer />} />
          <Route path="/cloud/:cloudName" element={<ObjectExplorer />} />
          <Route path="/cloud/:cloudName/object/:objectName" element={<ObjectExplorer />} />
          <Route path="/object/:objectName" element={<ObjectExplorer />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/graph/:objectName" element={<GraphPage />} />
        </Routes>
      </div>
    </div>
    </ComponentSettings>
  );
}

function GraphPage() {
  const [viewMode, setViewMode] = React.useState('object'); // 'object' or 'cloud'
  const [objectName, setObjectName] = React.useState('Case');
  const [cloudName, setCloudName] = React.useState('Financial Services Cloud');
  const [maxObjects, setMaxObjects] = React.useState(30);
  
  return (
    <div style={{ padding: '20px' }}>
      {/* View Mode Selector */}
      <div style={{ 
        marginBottom: '20px', 
        display: 'flex', 
        gap: '10px',
        borderBottom: '2px solid #ddd',
        paddingBottom: '10px'
      }}>
        <button
          onClick={() => setViewMode('object')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: viewMode === 'object' ? '3px solid #0176d3' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: viewMode === 'object' ? 'bold' : 'normal',
            color: viewMode === 'object' ? '#0176d3' : '#666'
          }}
        >
          Object View
        </button>
        <button
          onClick={() => setViewMode('cloud')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: viewMode === 'cloud' ? '3px solid #0176d3' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: viewMode === 'cloud' ? 'bold' : 'normal',
            color: viewMode === 'cloud' ? '#0176d3' : '#666'
          }}
        >
          Cloud View
        </button>
      </div>

      {viewMode === 'object' ? (
        <>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label htmlFor="objectInput">
              <strong>Object:</strong>
            </label>
            <input
              id="objectInput"
              type="text"
              value={objectName}
              onChange={(e) => setObjectName(e.target.value)}
              placeholder="Enter object name"
              style={{ 
                padding: '8px 12px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '200px'
              }}
            />
            <select
              onChange={(e) => e.target.value && setObjectName(e.target.value)}
              style={{ 
                padding: '8px 12px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">-- Quick Select --</option>
              <option value="Account">Account</option>
              <option value="Contact">Contact</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Lead">Lead</option>
              <option value="Case">Case</option>
              <option value="User">User</option>
              <option value="Campaign">Campaign</option>
              <option value="Product2">Product</option>
            </select>
          </div>
          
          <SimpleGraphVisualization objectName={objectName} />
          
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: '#f0f9ff', 
            borderLeft: '4px solid #0176d3',
            borderRadius: '4px'
          }}>
            <strong>💡 Tips:</strong>
            <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
              <li>Click and drag nodes to rearrange the layout</li>
              <li>Scroll to zoom in/out</li>
              <li>Hover over nodes and edges to see details</li>
              <li>Try different objects to explore relationships!</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label htmlFor="cloudSelect">
              <strong>Cloud:</strong>
            </label>
            <select
              id="cloudSelect"
              value={cloudName}
              onChange={(e) => setCloudName(e.target.value)}
              style={{ 
                padding: '8px 12px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '250px'
              }}
            >
              <option value="Core Salesforce">Core Salesforce</option>
              <option value="Financial Services Cloud">Financial Services Cloud</option>
              <option value="Health Cloud">Health Cloud</option>
              <option value="Manufacturing Cloud">Manufacturing Cloud</option>
              <option value="Consumer Goods Cloud">Consumer Goods Cloud</option>
              <option value="Education Cloud">Education Cloud</option>
              <option value="Automotive Cloud">Automotive Cloud</option>
              <option value="Energy and Utilities Cloud">Energy and Utilities Cloud</option>
              <option value="Nonprofit Cloud">Nonprofit Cloud</option>
              <option value="Public Sector Cloud">Public Sector Cloud</option>
              <option value="Revenue Lifecycle Management">Revenue Lifecycle Management</option>
              <option value="Sales Cloud">Sales Cloud</option>
              <option value="Service Cloud">Service Cloud</option>
              <option value="Shield">Shield</option>
              <option value="Field Service Lightning">Field Service Lightning</option>
              <option value="Net Zero Cloud">Net Zero Cloud</option>
              <option value="Loyalty">Loyalty</option>
              <option value="Feedback Management">Feedback Management</option>
              <option value="Scheduler">Scheduler</option>
              <option value="Data Cloud">Data Cloud</option>
              <option value="Tooling API">Tooling API</option>
              <option value="Metadata API">Metadata API</option>
            </select>
            
            <label htmlFor="maxObjectsInput" style={{ marginLeft: '20px' }}>
              <strong>Max Objects:</strong>
            </label>
            <input
              id="maxObjectsInput"
              type="number"
              value={maxObjects}
              onChange={(e) => setMaxObjects(Math.max(10, Math.min(100, parseInt(e.target.value) || 30)))}
              min="10"
              max="100"
              style={{ 
                padding: '8px 12px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '14px',
                width: '80px'
              }}
            />
          </div>
          
          <CloudGraphVisualization cloudName={cloudName} maxObjects={maxObjects} />
        </>
      )}
    </div>
  );
}

export default App;

