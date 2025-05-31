import React, { useState, useEffect } from 'react';
import { Search, Settings, Play, Save, Eye, Code, BarChart3, Filter, Plus, Trash2, Menu, X, ChevronDown, ChevronRight } from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});

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
    setActiveTab('testing');
    setSidebarOpen(false);
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

  const toggleCard = (cardId) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
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

  const tabs = [
    { id: 'endpoints', label: 'Endpoints', icon: Code },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'testing', label: 'Testing', icon: Play },
    { id: 'saved', label: 'Saved', icon: Save }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">API Testing</h1>
            <p className="text-xs text-gray-600">Dashboard</p>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex h-screen lg:h-auto">
        {/* Sidebar */}
        <div className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:relative z-50 w-64 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out overflow-y-auto`}>
          
          {/* Desktop Header */}
          <div className="hidden lg:block p-6 border-b">
            <h1 className="text-xl font-bold text-gray-900 mb-1">API Testing Dashboard</h1>
            <p className="text-sm text-gray-600">Analyze, test, and configure endpoints</p>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-3 mb-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Stats */}
          <div className="p-4 border-t mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Endpoints:</span>
                <span className="font-medium">{endpoints.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Headers:</span>
                <span className="font-medium">{Object.keys(commonHeaders).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Saved:</span>
                <span className="font-medium">{Object.keys(savedResponses).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-0 overflow-hidden">
          <div className="p-4 lg:p-6 h-full overflow-y-auto">
            
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search endpoints, methods, or descriptions..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'endpoints' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900">API Endpoints</h2>
                  <span className="text-sm text-gray-500">{filteredEndpoints.length} endpoints</span>
                </div>

                {/* Endpoints Grid */}
                <div className="grid gap-4">
                  {filteredEndpoints.map(endpoint => (
                    <div key={endpoint.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded flex-shrink-0 ${getMethodColor(endpoint.method)}`}>
                                {endpoint.method}
                              </span>
                              <code className="text-sm font-mono text-gray-800 truncate">{endpoint.path}</code>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{endpoint.summary}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                              <span>Parameters: {endpoint.parameters?.length || 0}</span>
                              <span>Responses: {Object.keys(endpoint.responses || {}).length}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2 flex-shrink-0">
                            <button
                              onClick={() => setSelectedEndpoint(endpoint)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleTestEndpoint(endpoint)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Test endpoint"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Details */}
                        {selectedEndpoint?.id === endpoint.id && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="grid gap-4 lg:grid-cols-2">
                              {/* Parameters */}
                              {endpoint.parameters && endpoint.parameters.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2 text-sm">Parameters</h4>
                                  <div className="space-y-2">
                                    {endpoint.parameters.map((param, idx) => (
                                      <div key={idx} className="text-xs border rounded p-2 bg-gray-50">
                                        <div className="font-mono text-blue-600 font-semibold">{param.name}</div>
                                        <div className="text-gray-500 mt-1">
                                          {param.in} • {param.type} • {param.required ? 'Required' : 'Optional'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Responses */}
                              <div>
                                <h4 className="font-medium mb-2 text-sm">Responses</h4>
                                <div className="space-y-2">
                                  {Object.entries(endpoint.responses || {}).map(([status, response]) => (
                                    <div key={status} className="text-xs border rounded p-2 bg-gray-50">
                                      <div className="font-mono text-green-600 font-semibold">{status}</div>
                                      <div className="text-gray-600 mt-1">{response.description}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Tab */}
            {activeTab === 'analysis' && (
              <div className="space-y-6">
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900">API Analysis</h2>
                
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Common Headers */}
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Common Headers</h3>
                        <button
                          onClick={() => toggleCard('headers')}
                          className="p-1 rounded hover:bg-gray-100 lg:hidden"
                        >
                          {expandedCards.headers ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className={`${expandedCards.headers ? 'block' : 'hidden lg:block'} p-4`}>
                      <div className="space-y-3">
                        {Object.entries(commonHeaders).map(([header, count]) => (
                          <div key={header} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="font-mono text-sm font-medium">{header}</span>
                            <div className="flex items-center space-x-2">
                              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                {count} endpoint{count !== 1 ? 's' : ''}
                              </div>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${(count / endpoints.length) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Model Analysis */}
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Response Models</h3>
                        <button
                          onClick={() => toggleCard('models')}
                          className="p-1 rounded hover:bg-gray-100 lg:hidden"
                        >
                          {expandedCards.models ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className={`${expandedCards.models ? 'block' : 'hidden lg:block'} p-4`}>
                      <div className="space-y-4">
                        {Object.entries(modelAnalysis).map(([schema, usages], idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">Model Pattern #{idx + 1}</span>
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {usages.length} usage{usages.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mb-2">
                              <code className="bg-gray-100 p-1 rounded break-all">
                                {schema.substring(0, 80)}...
                              </code>
                            </div>
                            <div className="space-y-1">
                              {usages.slice(0, 3).map((usage, uIdx) => (
                                <div key={uIdx} className="text-xs text-gray-500 truncate">
                                  {usage.endpoint} → {usage.statusCode} ({usage.description})
                                </div>
                              ))}
                              {usages.length > 3 && (
                                <div className="text-xs text-gray-400">
                                  +{usages.length - 3} more...
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Testing Tab */}
            {activeTab === 'testing' && (
              <div className="space-y-6">
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900">API Testing</h2>
                
                <div className="grid gap-6 xl:grid-cols-2">
                  {/* Custom Headers */}
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-4 border-b">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <h3 className="text-lg font-semibold">Custom Headers</h3>
                        <button
                          onClick={addCustomHeader}
                          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Header
                        </button>
                      </div>
                    </div>
                    <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                      {customHeaders.map((header, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Header name"
                            value={header.key}
                            onChange={(e) => updateCustomHeader(idx, 'key', e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Header value"
                            value={header.value}
                            onChange={(e) => updateCustomHeader(idx, 'value', e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <button
                            onClick={() => removeCustomHeader(idx)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Test Results */}
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-semibold">Test Results</h3>
                    </div>
                    <div className="p-4">
                      {testResponse ? (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                testResponse.status < 300 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {testResponse.status}
                              </span>
                              <span className="text-sm text-gray-600">
                                {testResponse.headers['X-Response-Time']}
                              </span>
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
                            <h4 className="font-medium mb-2 text-sm">Response Headers</h4>
                            <div className="bg-gray-50 rounded p-3 text-xs font-mono overflow-x-auto">
                              {Object.entries(testResponse.headers).map(([key, value]) => (
                                <div key={key} className="break-all">{key}: {value}</div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2 text-sm">Response Body</h4>
                            <div className="bg-gray-50 rounded p-3 text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto">
                              <pre className="whitespace-pre-wrap break-all">
                                {JSON.stringify(testResponse.data, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <Play className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">Run a test from the Endpoints tab to see results here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Saved Responses Tab */}
            {activeTab === 'saved' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Saved Responses</h2>
                  <span className="text-sm text-gray-500">For monkey testing</span>
                </div>
                
                {Object.keys(savedResponses).length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-8">
                    <div className="text-center text-gray-500">
                      <Save className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No saved responses yet</p>
                      <p className="text-sm">Test endpoints and save responses to build your monkey testing dataset.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(savedResponses).map(([endpoint, responses]) => (
                      <div key={endpoint} className="bg-white rounded-lg shadow-sm">
                        <div className="p-4 bg-gray-50 border-b rounded-t-lg">
                          <h3 className="font-medium text-gray-900">{endpoint.replace('_', ' ')}</h3>
                        </div>
                        <div className="divide-y">
                          {responses.map((saved, idx) => (
                            <div key={idx} className="p-4">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-gray-900">{saved.label}</span>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                      saved.response.status < 300 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {saved.response.status}
                                    </span>
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    {new Date(saved.timestamp).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm bg-gray-50 rounded p-3 font-mono overflow-x-auto">
                                <div className="break-all">
                                  {JSON.stringify(saved.response.data).substring(0, 200)}
                                  {JSON.stringify(saved.response.data).length > 200 && '...'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiTestingDashboard;