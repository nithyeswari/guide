import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, Lock, Server, Database, Globe, Layers, Edit, Check, X, Save, Upload, Download } from 'lucide-react';

const SecurityArchitecture = () => {
  const [activeLayer, setActiveLayer] = useState(null);
  const [applicationName, setApplicationName] = useState('Payment System');
  const [editingAppName, setEditingAppName] = useState(false);
  const [tempAppName, setTempAppName] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [importedJson, setImportedJson] = useState('');
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingControlIndex, setEditingControlIndex] = useState(null);
  const [jsonValidationError, setJsonValidationError] = useState('');
  
  const [layers, setLayers] = useState([
    {
      id: 'client',
      name: 'Client Layer',
      icon: <Globe size={24} />,
      component: 'Browser/Mobile Client',
      color: '#e3f2fd',
      borderColor: '#2196f3',
      enabled: true,
      securityControls: [
        { name: 'JWS Token Signing', description: 'Cryptographically signs requests to prevent tampering', enabled: true },
        { name: 'HttpOnly Cookies', description: 'Prevents JavaScript access to authentication cookies', enabled: true },
        { name: 'Certificate Pinning', description: 'Verifies server certificates against known good values', enabled: true },
        { name: 'Browser Fingerprinting', description: 'Binds session to device characteristics', enabled: true },
        { name: 'SameSite Cookies', description: 'Prevents cross-site request forgery attacks', enabled: true }
      ],
      dataProtection: 'Data is protected through TLS 1.3 encryption with forward secrecy',
      threats: ['XSS Attacks', 'Session Hijacking', 'Man-in-the-Middle', 'Phishing'],
    },
    {
      id: 'edge',
      name: 'Edge Security Layer',
      icon: <Shield size={24} />,
      component: 'Akamai CDN',
      color: '#e8f5e9',
      borderColor: '#4caf50',
      enabled: true,
      securityControls: [
        { name: 'WAF Protection', description: 'Blocks OWASP Top 10 attacks at the edge', enabled: true },
        { name: 'Bot Detection', description: 'Uses machine learning to identify and block malicious bots', enabled: true },
        { name: 'DDoS Mitigation', description: 'Absorbs attack traffic to maintain availability', enabled: true },
        { name: 'Request Rate Limiting', description: 'Prevents brute force and enumeration attacks', enabled: true },
        { name: 'Edge Authentication', description: 'Validates tokens and credentials at the edge', enabled: true }
      ],
      dataProtection: 'Data is protected through TLS termination and re-encryption',
      threats: ['DDoS Attacks', 'Bot Attacks', 'Injection Attacks', 'Request Flooding'],
    },
    {
      id: 'network',
      name: 'Network Security Layer',
      icon: <Lock size={24} />,
      component: 'F5 Load Balancer',
      color: '#fff8e1',
      borderColor: '#ffc107',
      enabled: true,
      securityControls: [
        { name: 'Protocol Validation', description: 'Ensures strict HTTP protocol compliance', enabled: true },
        { name: 'Advanced WAF', description: 'Deep inspection of requests with custom rules', enabled: true },
        { name: 'Header Sanitization', description: 'Normalizes and validates HTTP headers', enabled: true },
        { name: 'TLS Re-encryption', description: 'Maintains encryption throughout the request path', enabled: true },
        { name: 'JSON/XML Validation', description: 'Validates data structures against schemas', enabled: true }
      ],
      dataProtection: 'Data is protected through mTLS with certificate validation',
      threats: ['Protocol Attacks', 'Header Injection', 'XML/JSON Attacks', 'SSL Stripping'],
    },
    {
      id: 'platform',
      name: 'Platform Security Layer',
      icon: <Layers size={24} />,
      component: 'OpenShift Container Platform',
      color: '#f3e5f5',
      borderColor: '#9c27b0',
      enabled: true,
      securityControls: [
        { name: 'Service Mesh', description: 'Provides mTLS between services with Istio', enabled: true },
        { name: 'Network Policies', description: 'Restricts pod-to-pod communication', enabled: true },
        { name: 'Container Security', description: 'Scans images and monitors runtime', enabled: true },
        { name: 'Pod Security Contexts', description: 'Restricts container privileges', enabled: true },
        { name: 'RBAC', description: 'Fine-grained access control for resources', enabled: true }
      ],
      dataProtection: 'Data is protected through network segmentation and encryption',
      threats: ['Container Breakout', 'Unauthorized Access', 'Network Pivoting', 'Privilege Escalation'],
    },
    {
      id: 'application',
      name: 'Application Security Layer',
      icon: <Server size={24} />,
      component: 'Microservices',
      color: '#e0f7fa',
      borderColor: '#00bcd4',
      enabled: true,
      securityControls: [
        { name: 'Token Validation', description: 'Verifies JWTs and other security tokens', enabled: true },
        { name: 'Input Validation', description: 'Validates all input against schemas', enabled: true },
        { name: 'Transaction Signing', description: 'Cryptographically verifies transactions', enabled: true },
        { name: 'Idempotency Keys', description: 'Prevents duplicate transaction processing', enabled: true },
        { name: 'Nonce Validation', description: 'One-time values to prevent replay attacks', enabled: true }
      ],
      dataProtection: 'Data is protected through validation, authorization, and business rules',
      threats: ['Injection Attacks', 'Business Logic Flaws', 'Authentication Bypass', 'Authorization Flaws'],
    },
    {
      id: 'data',
      name: 'Data Security Layer',
      icon: <Database size={24} />,
      component: 'Secure Data Store',
      color: '#ffebee',
      borderColor: '#f44336',
      enabled: true,
      securityControls: [
        { name: 'Field-level Encryption', description: 'Encrypts sensitive fields individually', enabled: true },
        { name: 'Data Tokenization', description: 'Replaces sensitive data with non-sensitive tokens', enabled: true },
        { name: 'Data Masking', description: 'Hides portions of sensitive data', enabled: true },
        { name: 'Audit Logging', description: 'Records all data access and changes', enabled: true },
        { name: 'Access Controls', description: 'Restricts data access based on roles', enabled: true }
      ],
      dataProtection: 'Data is protected at rest through encryption and access controls',
      threats: ['Data Leakage', 'Unauthorized Access', 'Privilege Abuse', 'Data Tampering'],
    }
  ]);

  // Toggle a layer's enabled state
  const toggleLayerEnabled = (layerId) => {
    setLayers(layers.map(layer => 
      layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
    ));
  };

  // Toggle a security control's enabled state
  const toggleControlEnabled = (layerId, controlIndex) => {
    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        const updatedControls = [...layer.securityControls];
        updatedControls[controlIndex] = {
          ...updatedControls[controlIndex],
          enabled: !updatedControls[controlIndex].enabled
        };
        return { ...layer, securityControls: updatedControls };
      }
      return layer;
    }));
  };

  // Start editing application name
  const startEditing = () => {
    setTempAppName(applicationName);
    setEditingAppName(true);
  };

  // Save application name
  const saveAppName = () => {
    setApplicationName(tempAppName);
    setEditingAppName(false);
  };

  // Cancel editing application name
  const cancelEditing = () => {
    setEditingAppName(false);
  };

  // Start editing a layer
  const startEditingLayer = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      setEditingLayerId(layerId);
      setActiveLayer(layerId);
    }
  };
  
  // Start editing a control
  const startEditingControl = (layerId, controlIndex) => {
    setEditingLayerId(layerId);
    setEditingControlIndex(controlIndex);
    setActiveLayer(layerId);
  };
  
  // Update layer data
  const updateLayer = (layerId, updates) => {
    setLayers(layers.map(layer => 
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
  };
  
  // Update control data
  const updateControl = (layerId, controlIndex, updates) => {
    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        const updatedControls = [...layer.securityControls];
        updatedControls[controlIndex] = {
          ...updatedControls[controlIndex],
          ...updates
        };
        return { ...layer, securityControls: updatedControls };
      }
      return layer;
    }));
  };
  
  // Stop editing
  const stopEditing = () => {
    setEditingLayerId(null);
    setEditingControlIndex(null);
  };

  // Export configuration as JSON
  const exportConfiguration = () => {
    const config = {
      applicationName,
      layers: layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        component: layer.component,
        color: layer.color,
        borderColor: layer.borderColor,
        enabled: layer.enabled,
        dataProtection: layer.dataProtection,
        threats: [...layer.threats],
        securityControls: layer.securityControls.map(control => ({
          name: control.name,
          description: control.description,
          enabled: control.enabled
        }))
      }))
    };
    
    return JSON.stringify(config, null, 2);
  };
  
  // Import configuration from JSON
  const importConfiguration = (jsonConfig) => {
    try {
      setJsonValidationError('');
      const config = JSON.parse(jsonConfig);
      
      // Update application name
      if (config.applicationName) {
        setApplicationName(config.applicationName);
      }
      
      // Update layers and controls
      if (config.layers && Array.isArray(config.layers)) {
        setLayers(layers.map(layer => {
          const configLayer = config.layers.find(l => l.id === layer.id);
          if (!configLayer) return layer;
          
          const updatedControls = layer.securityControls.map(control => {
            const configControl = configLayer.securityControls?.find(c => c.name === control.name);
            return configControl 
              ? { ...control, description: configControl.description || control.description, enabled: configControl.enabled } 
              : control;
          });
          
          // Add any new controls from the config
          if (configLayer.securityControls) {
            configLayer.securityControls.forEach(configControl => {
              const exists = updatedControls.some(c => c.name === configControl.name);
              if (!exists) {
                updatedControls.push({
                  name: configControl.name,
                  description: configControl.description || '',
                  enabled: configControl.enabled || true
                });
              }
            });
          }
          
          return {
            ...layer,
            name: configLayer.name || layer.name,
            component: configLayer.component || layer.component,
            color: configLayer.color || layer.color,
            borderColor: configLayer.borderColor || layer.borderColor,
            enabled: configLayer.enabled ?? layer.enabled,
            dataProtection: configLayer.dataProtection || layer.dataProtection,
            threats: configLayer.threats || layer.threats,
            securityControls: updatedControls
          };
        }));
      }
      
      setShowExportDialog(false);
      return true;
    } catch (error) {
      console.error("Failed to parse configuration JSON:", error);
      setJsonValidationError("Invalid JSON configuration. Please check the format and try again.");
      return false;
    }
  };
  
  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setImportedJson(content);
    };
    reader.readAsText(file);
  };
  
  // Download configuration as JSON file
  const downloadConfig = () => {
    const config = exportConfiguration();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${applicationName.replace(/\s+/g, '-').toLowerCase()}-security-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Editable application name component
  const EditableAppName = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
      {editingAppName ? (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={tempAppName}
            onChange={(e) => setTempAppName(e.target.value)}
            style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              padding: '0.25rem 0.5rem',
              border: '1px solid #ccc',
              borderRadius: '0.25rem',
              width: '100%',
              maxWidth: '400px'
            }}
            autoFocus
          />
          <button 
            onClick={saveAppName}
            style={{ 
              margin: '0 0.25rem', 
              padding: '0.25rem', 
              backgroundColor: '#4caf50', 
              color: 'white', 
              borderRadius: '0.25rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex'
            }}
          >
            <Check size={20} />
          </button>
          <button 
            onClick={cancelEditing}
            style={{ 
              padding: '0.25rem', 
              backgroundColor: '#f44336', 
              color: 'white', 
              borderRadius: '0.25rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginRight: '0.5rem' }}>
            {applicationName} Security Architecture
          </h1>
          <button 
            onClick={startEditing} 
            style={{ 
              padding: '0.25rem', 
              backgroundColor: 'transparent', 
              color: '#666',
              borderRadius: '0.25rem',
              border: '1px solid #ccc',
              cursor: 'pointer',
              display: 'flex'
            }}
          >
            <Edit size={16} />
          </button>
        </div>
      )}
    </div>
  );

  // Layer checkbox component
  const LayerCheckbox = ({ layer }) => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
      <input
        type="checkbox"
        id={`layer-${layer.id}`}
        checked={layer.enabled}
        onChange={() => toggleLayerEnabled(layer.id)}
        style={{ marginRight: '0.5rem', width: '1.2rem', height: '1.2rem' }}
      />
      <label htmlFor={`layer-${layer.id}`} style={{ fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <div style={{ 
          padding: '0.25rem', 
          borderRadius: '0.25rem', 
          marginRight: '0.5rem', 
          backgroundColor: layer.enabled ? layer.borderColor : '#e5e7eb',
          color: 'white',
          display: 'flex'
        }}>
          {layer.icon}
        </div>
        {layer.name}
      </label>
    </div>
  );

  // Export/Import dialog component
  const ExportImportDialog = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>Export/Import Configuration</h3>
          <button 
            onClick={() => setShowExportDialog(false)}
            style={{ 
              padding: '0.25rem', 
              backgroundColor: 'transparent', 
              border: 'none',
              cursor: 'pointer',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Export Configuration</h4>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button 
              onClick={downloadConfig}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#2196f3', 
                color: 'white', 
                borderRadius: '0.25rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Download size={16} /> Download JSON
            </button>
          </div>
          
          <textarea
            value={exportConfiguration()}
            readOnly
            style={{
              width: '100%',
              height: '200px',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #ccc',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          />
        </div>
        
        <div>
          <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Import Configuration</h4>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <label 
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#4caf50', 
                color: 'white', 
                borderRadius: '0.25rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Upload size={16} /> Upload JSON
              <input 
                type="file" 
                accept=".json" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
              />
            </label>
            <button 
              onClick={() => importConfiguration(importedJson)}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#ff9800', 
                color: 'white', 
                borderRadius: '0.25rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Check size={16} /> Apply JSON
            </button>
          </div>
          
          {jsonValidationError && (
            <div style={{ 
              padding: '0.5rem', 
              backgroundColor: '#ffebee', 
              color: '#f44336', 
              borderRadius: '0.25rem', 
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {jsonValidationError}
            </div>
          )}
          
          <textarea
            value={importedJson}
            onChange={(e) => setImportedJson(e.target.value)}
            placeholder="Paste JSON configuration here"
            style={{
              width: '100%',
              height: '200px',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #ccc',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          />
        </div>
      </div>
    </div>
  );
  
  // Layer controls panel component
  const LayerControls = () => (
    <div style={{ 
      marginBottom: '1.5rem', 
      padding: '1rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontWeight: 'bold' }}>Configure Security Layers</h3>
        <button
          onClick={() => setShowExportDialog(true)}
          style={{ 
            padding: '0.5rem 0.75rem', 
            backgroundColor: '#2196f3', 
            color: 'white', 
            borderRadius: '0.25rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.875rem'
          }}
        >
          <Save size={16} /> Save/Load Configuration
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
        {layers.map(layer => (
          <LayerCheckbox key={layer.id} layer={layer} />
        ))}
      </div>
    </div>
  );

  // Expandable layer component
  const ExpandableLayer = ({ layer, isActive, index }) => {
    if (!layer.enabled) return null;
    
    const isEditingLayer = editingLayerId === layer.id && editingControlIndex === null;
    
    return (
      <div style={{ marginBottom: '1rem' }}>
        <div 
          style={{ 
            padding: '1rem', 
            borderRadius: '0.5rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            cursor: 'pointer', 
            transition: 'all 0.3s ease',
            backgroundColor: layer.color, 
            borderLeft: `4px solid ${layer.borderColor}`,
            boxShadow: isActive ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
            opacity: layer.enabled ? 1 : 0.5,
            pointerEvents: layer.enabled ? 'auto' : 'none'
          }}
          onClick={() => isEditingLayer ? null : setActiveLayer(isActive ? null : layer.id)}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ padding: '0.5rem', borderRadius: '9999px', marginRight: '0.75rem', backgroundColor: layer.borderColor, color: 'white' }}>
              {layer.icon}
            </div>
            <div>
              {isEditingLayer ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={layer.name}
                      onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                      style={{ 
                        padding: '0.25rem',
                        borderRadius: '0.25rem',
                        border: '1px solid #ccc',
                        fontWeight: 'bold',
                        fontSize: '1.125rem'
                      }}
                    />
                    <button 
                      onClick={stopEditing}
                      style={{ 
                        padding: '0.25rem',
                        display: 'flex',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={layer.component}
                      onChange={(e) => updateLayer(layer.id, { component: e.target.value })}
                      style={{ 
                        padding: '0.25rem',
                        borderRadius: '0.25rem',
                        border: '1px solid #ccc',
                        fontSize: '0.875rem',
                        width: '100%'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
                      <span style={{ marginRight: '0.25rem' }}>Background:</span>
                      <input
                        type="color"
                        value={layer.color}
                        onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                        style={{ width: '2rem', height: '1.5rem' }}
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
                      <span style={{ marginRight: '0.25rem' }}>Border:</span>
                      <input
                        type="color"
                        value={layer.borderColor}
                        onChange={(e) => updateLayer(layer.id, { borderColor: e.target.value })}
                        style={{ width: '2rem', height: '1.5rem' }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{layer.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>{layer.component}</p>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isEditingLayer && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  startEditingLayer(layer.id);
                }}
                style={{ 
                  padding: '0.25rem',
                  display: 'flex',
                  backgroundColor: 'transparent',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                <Edit size={16} />
              </button>
            )}
            <div style={{ color: '#4b5563' }}>
              {isActive ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
        </div>
        
        {isActive && (
          <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ fontWeight: '600' }}>Security Controls:</h4>
              {isEditingLayer && (
                <button 
                  onClick={() => {
                    const newControls = [...layer.securityControls, {
                      name: 'New Control',
                      description: 'Description of the new security control',
                      enabled: true
                    }];
                    updateLayer(layer.id, { securityControls: newControls });
                  }}
                  style={{ 
                    padding: '0.25rem 0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  + Add Control
                </button>
              )}
            </div>
            <ul style={{ marginBottom: '1rem' }}>
              {layer.securityControls.map((control, idx)