import React, { useState } from 'react';
import ObjectExplorer from './components/ObjectExplorer';
import './App.css';

function App() {
  return (
    <div className="slds-scope">
      <div className="slds-page-header">
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-dataset">
                  <svg className="slds-icon slds-page-header__icon" aria-hidden="true">
                    <use xlinkHref="/assets/icons/standard-sprite/svg/symbols.svg#dataset"></use>
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
        </div>
      </div>
      <div className="app-container">
        <ObjectExplorer />
      </div>
    </div>
  );
}

export default App;

