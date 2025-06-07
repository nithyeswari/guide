import React, { useState, useEffect } from 'react';
import { Search, Settings, Play, Save, Eye, Code, BarChart3, Filter, Plus, Trash2 } from 'lucide-react';

const ApiTestingDashboard = () => {
  const [endpoints, setEndpoints] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [commonHeaders, setCommonHeaders] = useState({});
  const [modelAnalysis, setModelAnalysis] = useState({});
  const [savedResponses, setSavedResponses] = useState({});
  const [activeTab, setActiveTab] = useState('endpoints');
  const [customHeaders, setCustomHeaders] = useState([{ key: '', value: '' }]);
  const [testResponse, setTestResponse] = useState(null);
  const [filterText, setFilterText] = useState('');

  // Mock OpenAPI data - replace with actual API calls
  useEffect(() => {
    const mockEndpoints = [
      {
        id: 1,
        path: '/api/users',
        method: 'GET',
        summary: 'Get all users',
        parameters: [
          { name: 'page', in: 'query', type: 'integer', required: false },
          { name: 'size', in: 'query', type: 'integer', required: false }
        ],
        responses: {
          '200': {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                users: { type: 'array', items: { $ref: '#/definitions/User' } },
                total: { type: 'integer' },
                page: { type: 'integer' }
              }
            }
          }
        }
      },
      {
        id: 2,
        path: '/api/users/{id}',
        method: 'GET',
        summary: 'Get user by ID',
        parameters: [
          { name: 'id', in: 'path', type: 'integer', required: true }
        ],
        responses: {
          '200': {
            description: 'Success',
            schema: { $ref: '#/definitions/User' }
          },
          '404': {
            description: 'User not found',
            schema: { $ref: '#/definitions/Error' }
          }
        }
      },
      {
        id: 3,
        path: '/api/users',
        method: 'POST',
        summary: 'Create new user',
        parameters: [
          { name: 'user', in: 'body', schema: { $ref: '#/definitions/CreateUser' } }
        ],
        responses: {
          '201': {
            description: 'Created',
            schema: { $ref: '#/definitions/User' }
          },
          '400': {
            description: 'Bad request',
            schema: { $ref: '#/definitions/Error' }
          }
        }
      }
    ];

    setEndpoints(mockEndpoints);
    analyzeEndpoints(mockEndpoints);
  }, []);

  const analyzeEndpoints = (endpoints) => {
    // Analyze common headers
    const headerAnalysis = {};
    const modelSchemas = {};

    endpoints.forEach(endpoint => {
      // Mock header analysis
      const commonHeadersForEndpoint = ['Content-Type', 'Authorization', 'Accept'];
      commonHeadersForEndpoint.forEach(header => {
        headerAnalysis[header] = (headerAnalysis[header] || 0) + 1;
      });

      // Analyze response models
      Object.keys(endpoint.responses || {}).forEach(statusCode => {
        const response = endpoint.responses[statusCode];
        if (response.schema) {
          const schemaKey = JSON.stringify(response.schema);
          modelSchemas[schemaKey] = (modelSchemas[schemaKey] || []);
          modelSchemas[schemaKey].push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            statusCode,
            description: response.description
          });
        }
      });
    });

    setCommonHeaders(headerAnalysis);
    setModelAnalysis(modelSchemas);
  };

  const handleTestEndpoint = async (endpoint) => {
    // Mock API call - replace with actual implementation
    const mockResponse = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': '45ms'
      },
      data: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date().toISOString()
      }
    };

    setTestResponse(mockResponse);
    setSelectedEndpoint(endpoint);
  };

  const saveResponse = (endpoint, response, label) => {
    const key = `${endpoint.method}_${endpoint.path}`;
    setSavedResponses(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { label, response, timestamp: new Date() }]
    }));
  };

  const addCustomHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const updateCustomHeader = (index, field, value) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  const removeCustomHeader = (index) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const filteredEndpoints = endpoints.filter(ep => 
    ep.path.toLowerCase().includes(filterText.toLowerCase()) ||
    ep.method.toLowerCase().includes(filterText.toLowerCase()) ||
    ep.summary.toLowerCase().includes(filterText.toLowerCase())
  );

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-green-100 text-green-800',
      POST: 'bg-blue-100 text-blue-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      PATCH: 'bg-purple-100 text-purple-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API Testing Dashboard</h1>
          <p className="text-gray-600">Analyze, test, and configure API endpoints for monkey testing</p>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <nav className="flex border-b">
            {[
              { id: 'endpoints', label: 'Endpoints', icon: Code },
              { id: 'analysis', label: 'Analysis', icon: BarChart3 },
              { id: 'testing', label: 'Testing', icon: Play },
              { id: 'saved', label: 'Saved Responses', icon: Save }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Endpoints Tab */}
        {activeTab === 'endpoints' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Endpoints List */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">API Endpoints</h2>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filter endpoints..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              <div className="divide-y">
                {filteredEndpoints.map(endpoint => (
                  <div key={endpoint.id} className="p-6 hover:bg-gray-50 cursor-pointer"
                       onClick={() => setSelectedEndpoint(endpoint)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getMethodColor(endpoint.method)}`}>
                          {endpoint.method}
                        </span>
                        <code className="text-sm font-mono text-gray-800">{endpoint.path}</code>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestEndpoint(endpoint);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-gray-600 text-sm">{endpoint.summary}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      Parameters: {endpoint.parameters?.length || 0} | 
                      Responses: {Object.keys(endpoint.responses || {}).length}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Endpoint Details */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Endpoint Details</h3>
              </div>
              {selectedEndpoint ? (
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getMethodColor(selectedEndpoint.method)}`}>
                        {selectedEndpoint.method}
                      </span>
                      <code className="text-sm font-mono">{selectedEndpoint.path}</code>
                    </div>
                    <p className="text-gray-600 mb-4">{selectedEndpoint.summary}</p>
                  </div>

                  {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Parameters</h4>
                      <div className="space-y-2">
                        {selectedEndpoint.parameters.map((param, idx) => (
                          <div key={idx} className="text-sm border rounded p-2">
                            <div className="font-mono text-blue-600">{param.name}</div>
                            <div className="text-gray-500">
                              {param.in} • {param.type} • {param.required ? 'Required' : 'Optional'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">Responses</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedEndpoint.responses || {}).map(([status, response]) => (
                        <div key={status} className="text-sm border rounded p-2">
                          <div className="font-mono text-green-600">{status}</div>
                          <div className="text-gray-600">{response.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  Select an endpoint to view details
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Common Headers */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Common Headers Analysis</h2>
              </div>
              <div className="p-6">
                {Object.entries(commonHeaders).map(([header, count]) => (
                  <div key={header} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <span className="font-mono text-sm">{header}</span>
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {count} endpoints
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(count / endpoints.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Similarities */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Response Model Analysis</h2>
              </div>
              <div className="p-6">
                {Object.entries(modelAnalysis).map(([schema, usages], idx) => (
                  <div key={idx} className="mb-4 p-3 border rounded">
                    <div className="font-medium mb-2">
                      Model Pattern #{idx + 1}
                      <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                        {usages.length} usages
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      <code className="bg-gray-100 p-1 rounded">{schema.substring(0, 100)}...</code>
                    </div>
                    <div className="space-y-1">
                      {usages.map((usage, uIdx) => (
                        <div key={uIdx} className="text-xs text-gray-500">
                          {usage.endpoint} → {usage.statusCode} ({usage.description})
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Testing Tab */}
        {activeTab === 'testing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Custom Headers Configuration */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Custom Headers</h2>
                  <button
                    onClick={addCustomHeader}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Header
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {customHeaders.map((header, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e) => updateCustomHeader(idx, 'key', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) => updateCustomHeader(idx, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeCustomHeader(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Results */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Test Results</h2>
              </div>
              <div className="p-6">
                {testResponse ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          testResponse.status < 300 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {testResponse.status}
                        </span>
                        <span className="text-sm text-gray-600">Response Time: {testResponse.headers['X-Response-Time']}</span>
                      </div>
                      <button
                        onClick={() => {
                          const label = prompt('Enter label for saved response:');
                          if (label) saveResponse(selectedEndpoint, testResponse, label);
                        }}
                        className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </button>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Response Headers</h4>
                      <div className="bg-gray-50 rounded p-3 text-sm font-mono">
                        {Object.entries(testResponse.headers).map(([key, value]) => (
                          <div key={key}>{key}: {value}</div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Response Body</h4>
                      <div className="bg-gray-50 rounded p-3 text-sm font-mono">
                        <pre>{JSON.stringify(testResponse.data, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Play className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Run a test from the Endpoints tab to see results here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Saved Responses Tab */}
        {activeTab === 'saved' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Saved Responses for Monkey Testing</h2>
            </div>
            <div className="p-6">
              {Object.keys(savedResponses).length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Save className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No saved responses yet. Test endpoints and save responses to build your monkey testing dataset.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(savedResponses).map(([endpoint, responses]) => (
                    <div key={endpoint} className="border rounded-lg">
                      <div className="p-4 bg-gray-50 border-b">
                        <h3 className="font-medium">{endpoint.replace('_', ' ')}</h3>
                      </div>
                      <div className="divide-y">
                        {responses.map((saved, idx) => (
                          <div key={idx} className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-medium">{saved.label}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  {new Date(saved.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                saved.response.status < 300 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {saved.response.status}
                              </span>
                            </div>
                            <div className="text-sm bg-gray-50 rounded p-2 font-mono">
                              {JSON.stringify(saved.response.data).substring(0, 200)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiTestingDashboard;
