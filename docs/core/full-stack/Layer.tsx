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
          <div className="text-gray-600">
            {isActive ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
        
        {isActive && (
          <div className="mt-2 p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-2">Security Controls:</h4>
            <ul className="mb-4">
              {layer.securityControls.map((control, idx) => (
                <li key={idx} className="mb-2">
                  <div className="font-medium">{control.name}</div>
                  <div className="text-sm text-gray-600">{control.description}</div>
                </li>
              ))}
            </ul>
            
            <h4 className="font-semibold mb-2">Data Protection:</h4>
            <p className="text-sm text-gray-700 mb-4">{layer.dataProtection}</p>
            
            <h4 className="font-semibold mb-2">Primary Threats Addressed:</h4>
            <div className="flex flex-wrap gap-2">
              {layer.threats.map((threat, idx) => (
                <span key={idx} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                  {threat}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {index < layers.length - 1 && (
          <div className="flex justify-center my-2">
            <div className="w-0 h-6 border-l-2 border-gray-300"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Payment System Security Architecture</h1>
        <p className="text-gray-600">Click on each layer to see detailed security controls</p>
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
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-bold mb-2">Security Architecture Overview</h3>
        <p className="text-sm text-gray-700">
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