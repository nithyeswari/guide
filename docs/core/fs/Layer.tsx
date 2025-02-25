import React, { useState } from 'react';

const SecurityArchitecture = () => {
  const [applicationName, setApplicationName] = useState('Payment System');
  const [activeLayer, setActiveLayer] = useState(null);
  const [jsonConfig, setJsonConfig] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Initial security layers configuration
  const [layers, setLayers] = useState([
    {
      id: 'client',
      name: 'Client Layer',
      component: 'Browser/Mobile Client',
      color: '#e3f2fd',
      borderColor: '#2196f3',
      enabled: true,
      securityControls: [
        { name: 'JWS Token Signing', description: 'Cryptographically signs requests to prevent tampering', enabled: true },
        { name: 'HttpOnly Cookies', description: 'Prevents JavaScript access to authentication cookies', enabled: true },
        { name: 'Certificate Pinning', description: 'Verifies server certificates against known good values', enabled: true }
      ],
      dataProtection: 'Data is protected through TLS 1.3 encryption with forward secrecy',
      threats: ['XSS Attacks', 'Session Hijacking', 'Man-in-the-Middle', 'Phishing'],
    },
    {
      id: 'edge',
      name: 'Edge Security Layer',
      component: 'Akamai CDN',
      color: '#e8f5e9',
      borderColor: '#4caf50',
      enabled: true,
      securityControls: [
        { name: 'WAF Protection', description: 'Blocks OWASP Top 10 attacks at the edge', enabled: true },
        { name: 'Bot Detection', description: 'Uses machine learning to identify and block malicious bots', enabled: true },
        { name: 'DDoS Mitigation', description: 'Absorbs attack traffic to maintain availability', enabled: true }
      ],
      dataProtection: 'Data is protected through TLS termination and re-encryption',
      threats: ['DDoS Attacks', 'Bot Attacks', 'Injection Attacks', 'Request Flooding'],
    },
    {
      id: 'network',
      name: 'Network Security Layer',
      component: 'F5 Load Balancer',
      color: '#fff8e1',
      borderColor: '#ffc107',
      enabled: true,
      securityControls: [
        { name: 'Protocol Validation', description: 'Ensures strict HTTP protocol compliance', enabled: true },
        { name: 'Advanced WAF', description: 'Deep inspection of requests with custom rules', enabled: true },
        { name: 'Header Sanitization', description: 'Normalizes and validates HTTP headers', enabled: true }
      ],
      dataProtection: 'Data is protected through mTLS with certificate validation',
      threats: ['Protocol Attacks', 'Header Injection', 'XML/JSON Attacks', 'SSL Stripping'],
    },
    {
      id: 'platform',
      name: 'Platform Security Layer',
      component: 'OpenShift Container Platform',
      color: '#f3e5f5',
      borderColor: '#9c27b0',
      enabled: true,
      securityControls: [
        { name: 'Service Mesh', description: 'Provides mTLS between services with Istio', enabled: true },
        { name: 'Network Policies', description: 'Restricts pod-to-pod communication', enabled: true },
        { name: 'Container Security', description: 'Scans images and monitors runtime', enabled: true }
      ],
      dataProtection: 'Data is protected through network segmentation and encryption',
      threats: ['Container Breakout', 'Unauthorized Access', 'Network Pivoting', 'Privilege Escalation'],
    },
    {
      id: 'application',
      name: 'Application Security Layer',
      component: 'Microservices',
      color: '#e0f7fa',
      borderColor: '#00bcd4',
      enabled: true,
      securityControls: [
        { name: 'Token Validation', description: 'Verifies JWTs and other security tokens', enabled: true },
        { name: 'Input Validation', description: 'Validates all input against schemas', enabled: true },
        { name: 'Transaction Signing', description: 'Cryptographically verifies transactions', enabled: true }
      ],
      dataProtection: 'Data is protected through validation, authorization, and business rules',
      threats: ['Injection Attacks', 'Business Logic Flaws', 'Authentication Bypass', 'Authorization Flaws'],
    },
    {
      id: 'data',
      name: 'Data Security Layer',
      component: 'Secure Data Store',
      color: '#ffebee',
      borderColor: '#f44336',
      enabled: true,
      securityControls: [
        { name: 'Field-level Encryption', description: 'Encrypts sensitive fields individually', enabled: true },
        { name: 'Data Tokenization', description: 'Replaces sensitive data with non-sensitive tokens', enabled: true },
        { name: 'Data Masking', description: 'Hides portions of sensitive data', enabled: true }
      ],
      dataProtection: 'Data is protected at rest through encryption and access controls',
      threats: ['Data Leakage', 'Unauthorized Access', 'Privilege Abuse', 'Data Tampering'],
    }
  ]);

  // Toggle layer enabled state
  const toggleLayer = (layerId) => {
    setLayers(layers.map(layer => 
      layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
    ));
  };

  // Toggle control enabled state
  const toggleControl = (layerId, controlIndex) => {
    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        const newControls = [...layer.securityControls];
        newControls[controlIndex] = {
          ...newControls[controlIndex],
          enabled: !newControls[controlIndex].enabled
        };
        return { ...layer, securityControls: newControls };
      }
      return layer;
    }));
  };

  // Update layer properties
  const updateLayer = (layerId, updates) => {
    setLayers(layers.map(layer => 
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
  };

  // Update control properties
  const updateControl = (layerId, controlIndex, updates) => {
    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        const newControls = [...layer.securityControls];
        newControls[controlIndex] = { ...newControls[controlIndex], ...updates };
        return { ...layer, securityControls: newControls };
      }
      return layer;
    }));
  };

  // Add a new control to a layer
  const addControl = (layerId) => {
    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          securityControls: [
            ...layer.securityControls,
            { name: 'New Control', description: 'Description of the control', enabled: true }
          ]
        };
      }
      return layer;
    }));
  };

  // Delete a control from a layer
  const deleteControl = (layerId, controlIndex) => {
    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          securityControls: layer.securityControls.filter((_, i) => i !== controlIndex)
        };
      }
      return layer;
    }));
  };

  // Export configuration as JSON
  const exportConfig = () => {
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
    
    setJsonConfig(JSON.stringify(config, null, 2));
    setShowExportModal(true);
  };

  // Import configuration from JSON
  const importConfig = () => {
    try {
      const config = JSON.parse(jsonConfig);
      
      if (config.applicationName) {
        setApplicationName(config.applicationName);
      }
      
      if (config.layers && Array.isArray(config.layers)) {
        setLayers(layers.map(layer => {
          const configLayer = config.layers.find(l => l.id === layer.id);
          if (!configLayer) return layer;
          
          return {
            ...layer,
            name: configLayer.name || layer.name,
            component: configLayer.component || layer.component,
            color: configLayer.color || layer.color,
            borderColor: configLayer.borderColor || layer.borderColor,
            enabled: configLayer.enabled ?? layer.enabled,
            dataProtection: configLayer.dataProtection || layer.dataProtection,
            threats: configLayer.threats || layer.threats,
            securityControls: configLayer.securityControls ? 
              configLayer.securityControls.map(c => ({
                name: c.name,
                description: c.description || '',
                enabled: c.enabled
              })) : layer.securityControls
          };
        }));
      }
      
      alert('Configuration imported successfully');
      setShowExportModal(false);
    } catch (error) {
      alert('Invalid JSON configuration: ' + error.message);
    }
  };

  // Download configuration as a file
  const downloadConfig = () => {
    const blob = new Blob([jsonConfig], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${applicationName.replace(/\s+/g, '-').toLowerCase()}-security-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setJsonConfig(e.target.result);
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px' }}>
          <input 
            type="text" 
            value={applicationName} 
            onChange={(e) => setApplicationName(e.target.value)}
            style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              border: '1px solid #ddd', 
              padding: '5px 10px',
              borderRadius: '4px',
              marginRight: '10px'
            }}
          />
          <span style={{ fontSize: '24px', fontWeight: 'bold' }}>Security Architecture</span>
        </div>
        
        <button 
          onClick={exportConfig}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#2196f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          Export/Import Configuration
        </button>
      </div>
      
      {/* Layer Configuration */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Configure Security Layers</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
          {layers.map(layer => (
            <div key={layer.id} style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id={`layer-${layer.id}`}
                checked={layer.enabled}
                onChange={() => toggleLayer(layer.id)}
                style={{ marginRight: '8px' }}
              />
              <label 
                htmlFor={`layer-${layer.id}`} 
                style={{ 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center',
                  opacity: layer.enabled ? 1 : 0.6
                }}
              >
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: layer.borderColor, 
                  marginRight: '6px',
                  borderRadius: '3px'
                }}></div>
                {layer.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Security Layers */}
      {layers.filter(layer => layer.enabled).map((layer, index) => (
        <div 
          key={layer.id} 
          style={{ 
            marginBottom: '15px', 
            borderRadius: '8px', 
            overflow: 'hidden',
            border: '1px solid #ddd' 
          }}
        >
          {/* Layer Header */}
          <div 
            style={{ 
              backgroundColor: layer.color, 
              borderLeft: `5px solid ${layer.borderColor}`,
              padding: '12px 15px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
            onClick={() => setActiveLayer(activeLayer === layer.id ? null : layer.id)}
          >
            <div>
              <input 
                type="text" 
                value={layer.name} 
                onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  marginBottom: '4px'
                }}
              />
              <div>
                <input 
                  type="text" 
                  value={layer.component} 
                  onChange={(e) => updateLayer(layer.id, { component: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  style={{ 
                    fontSize: '14px', 
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '4px',
                    padding: '2px 6px'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', marginRight: '5px' }}>Color:</label>
                <input 
                  type="color" 
                  value={layer.color}
                  onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '25px', height: '25px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', marginRight: '5px' }}>Border:</label>
                <input 
                  type="color" 
                  value={layer.borderColor}
                  onChange={(e) => updateLayer(layer.id, { borderColor: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '25px', height: '25px' }}
                />
              </div>
              <span style={{ fontSize: '24px' }}>
                {activeLayer === layer.id ? '▲' : '▼'}
              </span>
            </div>
          </div>
          
          {/* Layer Details */}
          {activeLayer === layer.id && (
            <div style={{ padding: '15px', backgroundColor: 'white' }}>
              {/* Security Controls */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0 }}>Security Controls:</h4>
                  <button 
                    onClick={() => addControl(layer.id)} 
                    style={{ 
                      padding: '4px 8px', 
                      backgroundColor: '#4caf50', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    + Add Control
                  </button>
                </div>
                
                {layer.securityControls.map((control, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: '10px', 
                      backgroundColor: '#f9f9f9', 
                      borderRadius: '4px', 
                      marginBottom: '8px',
                      border: '1px solid #eee' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', flexGrow: 1 }}>
                        <input 
                          type="checkbox" 
                          checked={control.enabled} 
                          onChange={() => toggleControl(layer.id, idx)}
                          style={{ marginRight: '8px', marginTop: '5px' }}
                        />
                        <div style={{ flexGrow: 1, opacity: control.enabled ? 1 : 0.5 }}>
                          <input 
                            type="text" 
                            value={control.name} 
                            onChange={(e) => updateControl(layer.id, idx, { name: e.target.value })}
                            style={{ 
                              display: 'block',
                              width: '100%',
                              fontWeight: 'bold',
                              marginBottom: '5px',
                              padding: '5px',
                              border: '1px solid #ddd',
                              borderRadius: '4px'
                            }}
                          />
                          <textarea 
                            value={control.description} 
                            onChange={(e) => updateControl(layer.id, idx, { description: e.target.value })}
                            style={{ 
                              display: 'block',
                              width: '100%',
                              minHeight: '60px',
                              padding: '5px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteControl(layer.id, idx)}
                        style={{ 
                          padding: '4px 8px', 
                          backgroundColor: '#f44336', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          marginLeft: '10px',
                          fontSize: '12px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Data Protection */}
              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '8px' }}>Data Protection:</h4>
                <textarea 
                  value={layer.dataProtection} 
                  onChange={(e) => updateLayer(layer.id, { dataProtection: e.target.value })}
                  style={{ 
                    width: '100%',
                    minHeight: '60px',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              {/* Threats */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0 }}>Primary Threats Addressed:</h4>
                  <button 
                    onClick={() => {
                      const newThreat = prompt('Enter a new threat:');
                      if (newThreat && newThreat.trim() !== '') {
                        updateLayer(layer.id, { threats: [...layer.threats, newThreat.trim()] });
                      }
                    }}
                    style={{ 
                      padding: '4px 8px', 
                      backgroundColor: '#4caf50', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    + Add Threat
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {layer.threats.map((threat, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        fontSize: '12px', 
                        backgroundColor: '#f5f5f5', 
                        padding: '5px 10px', 
                        borderRadius: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        border: '1px solid #ddd'
                      }}
                    >
                      {threat}
                      <button 
                        onClick={() => {
                          const updatedThreats = [...layer.threats];
                          updatedThreats.splice(idx, 1);
                          updateLayer(layer.id, { threats: updatedThreats });
                        }}
                        style={{ 
                          marginLeft: '5px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#f44336',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '16px',
                          height: '16px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Overview Section */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f9f9f9', 
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Security Architecture Overview</h3>
        <p style={{ margin: 0 }}>
          This multi-layered security approach implements defense in depth for {applicationName}.
          Each layer provides independent security controls, ensuring that compromise of a single layer
          does not compromise the entire system. All data is protected in transit and at rest through
          multiple encryption mechanisms.
        </p>
      </div>
      
      {/* Export/Import Modal */}
      {showExportModal && (
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
            padding: '20px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Export/Import Configuration</h3>
              <button 
                onClick={() => setShowExportModal(false)}
                style={{ 
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '10px' }}>Export Configuration</h4>
              <button 
                onClick={downloadConfig}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#2196f3', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                Download JSON
              </button>
              <textarea
                value={jsonConfig}
                readOnly
                style={{
                  width: '100%',
                  height: '150px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            
            <div>
              <h4 style={{ marginTop: 0, marginBottom: '10px' }}>Import Configuration</h4>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <label 
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#4caf50', 
                    color: 'white', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    display: 'inline-block'
                  }}
                >
                  Upload JSON
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleFileUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>
                <button 
                  onClick={importConfig}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#ff9800', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer'
                  }}
                >
                  Apply JSON
                </button>
              </div>
              <textarea
                value={jsonConfig}
                onChange={(e) => setJsonConfig(e.target.value)}
                placeholder="Paste JSON configuration here"
                style={{
                  width: '100%',
                  height: '150px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityArchitecture;