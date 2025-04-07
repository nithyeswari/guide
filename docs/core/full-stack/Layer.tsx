import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, Lock, Server, Database, Globe, Layers } from 'lucide-react';

const SecurityArchitecture = () => {
  const [activeLayer, setActiveLayer] = useState(null);
  
  const layers = [
    {
      id: 'client',
      name: 'Client Layer',
      icon: <Globe size={24} />,
      component: 'Browser/Mobile Client',
      color: '#e3f2fd',
      borderColor: '#2196f3',
      securityControls: [
        { name: 'JWS Token Signing', description: 'Cryptographically signs requests to prevent tampering' },
        { name: 'HttpOnly Cookies', description: 'Prevents JavaScript access to authentication cookies' },
        { name: 'Certificate Pinning', description: 'Verifies server certificates against known good values' },
        { name: 'Browser Fingerprinting', description: 'Binds session to device characteristics' },
        { name: 'SameSite Cookies', description: 'Prevents cross-site request forgery attacks' }
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
      securityControls: [
        { name: 'WAF Protection', description: 'Blocks OWASP Top 10 attacks at the edge' },
        { name: 'Bot Detection', description: 'Uses machine learning to identify and block malicious bots' },
        { name: 'DDoS Mitigation', description: 'Absorbs attack traffic to maintain availability' },
        { name: 'Request Rate Limiting', description: 'Prevents brute force and enumeration attacks' },
        { name: 'Edge Authentication', description: 'Validates tokens and credentials at the edge' }
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
      securityControls: [
        { name: 'Protocol Validation', description: 'Ensures strict HTTP protocol compliance' },
        { name: 'Advanced WAF', description: 'Deep inspection of requests with custom rules' },
        { name: 'Header Sanitization', description: 'Normalizes and validates HTTP headers' },
        { name: 'TLS Re-encryption', description: 'Maintains encryption throughout the request path' },
        { name: 'JSON/XML Validation', description: 'Validates data structures against schemas' }
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
      securityControls: [
        { name: 'Service Mesh', description: 'Provides mTLS between services with Istio' },
        { name: 'Network Policies', description: 'Restricts pod-to-pod communication' },
        { name: 'Container Security', description: 'Scans images and monitors runtime' },
        { name: 'Pod Security Contexts', description: 'Restricts container privileges' },
        { name: 'RBAC', description: 'Fine-grained access control for resources' }
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
      securityControls: [
        { name: 'Token Validation', description: 'Verifies JWTs and other security tokens' },
        { name: 'Input Validation', description: 'Validates all input against schemas' },
        { name: 'Transaction Signing', description: 'Cryptographically verifies transactions' },
        { name: 'Idempotency Keys', description: 'Prevents duplicate transaction processing' },
        { name: 'Nonce Validation', description: 'One-time values to prevent replay attacks' }
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
      securityControls: [
        { name: 'Field-level Encryption', description: 'Encrypts sensitive fields individually' },
        { name: 'Data Tokenization', description: 'Replaces sensitive data with non-sensitive tokens' },
        { name: 'Data Masking', description: 'Hides portions of sensitive data' },
        { name: 'Audit Logging', description: 'Records all data access and changes' },
        { name: 'Access Controls', description: 'Restricts data access based on roles' }
      ],
      dataProtection: 'Data is protected at rest through encryption and access controls',
      threats: ['Data Leakage', 'Unauthorized Access', 'Privilege Abuse', 'Data Tampering'],
    }
  ];

  const ExpandableLayer = ({ layer, isActive, index }) => {
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
            boxShadow: isActive ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none'
          }}

          onClick={() => setActiveLayer(isActive ? null : layer.id)}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ padding: '0.5rem', borderRadius: '9999px', marginRight: '0.75rem', backgroundColor: layer.borderColor, color: 'white' }} >
              {layer.icon}
            </div>
            <div>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{layer.name}</h3>
              <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>{layer.component}</p>
            </div>
          </div>
          <div style={{ color: '#4b5563' }}>
            {isActive ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
        
        {isActive && (
          <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Security Controls:</h4>
            <ul style={{ marginBottom: '1rem' }}>
              {layer.securityControls.map((control, idx) => (
                <li key={idx} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: '500' }}>{control.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>{control.description}</div>
                </li>
              ))}
            </ul>
            
            <h4 className="font-semibold mb-2">Data Protection:</h4>
            <p className="text-sm text-gray-700 mb-4">{layer.dataProtection}</p>
            
            <h4 className="font-semibold mb-2">Primary Threats Addressed:</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {layer.threats.map((threat, idx) => (
                <span key={idx} style={{ fontSize: '0.75rem', backgroundColor: '#f3f4f6', color: '#1f2937', padding: '0.25rem 0.5rem', borderRadius: '9999px' }}>
                  {threat}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {index < layers.length - 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
            <div style={{ width: 0, height: '1.5rem', borderLeft: '2px solid #d1d5db' }}></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Payment System Security Architecture</h1>
        <p style={{ color: '#4b5563' }}>Click on each layer to see detailed security controls</p>
      </div>
      
      <div>
        {layers.map((layer, index) => (
          <ExpandableLayer 
            key={layer.id} 
            layer={layer} 
            isActive={activeLayer === layer.id}
            index={index}
          />
        ))}
      </div>
      
      <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Security Architecture Overview</h3>
        <p style={{ fontSize: '0.875rem', color: '#374151' }}>
          This multi-layered security approach implements defense in depth for our payment system.
          Each layer provides independent security controls, ensuring that compromise of a single layer
          does not compromise the entire system. All data is protected in transit and at rest through
          multiple encryption mechanisms.
        </p>
      </div>
    </div>
  );
};

export default SecurityArchitecture;