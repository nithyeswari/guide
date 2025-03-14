import React, { useState } from 'react';
import _ from 'lodash';

// Default YAML examples
const DEFAULT_YAML_EXAMPLES = {
  "users-api.yaml": `
openapi: 3.0.0
info:
  title: Users API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get all users
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                    name:
                      type: string
                    email:
                      type: string
                    createdAt:
                      type: string
    post:
      summary: Create a user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
                password:
                  type: string
  /users/{id}:
    get:
      summary: Get user by ID
      responses:
        '200':
          description: User details
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
                  email:
                    type: string
                  createdAt:
                    type: string
`,
  "products-api.yaml": `
openapi: 3.0.0
info:
  title: Products API
  version: 1.0.0
paths:
  /products:
    get:
      summary: Get all products
      responses:
        '200':
          description: List of products
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                    name:
                      type: string
                    price:
                      type: number
                    description:
                      type: string
                    createdAt:
                      type: string
    post:
      summary: Create a product
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                price:
                  type: number
                description:
                  type: string
  /products/{id}:
    get:
      summary: Get product by ID
      responses:
        '200':
          description: Product details
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
                  price:
                    type: number
                  description:
                    type: string
                  createdAt:
                    type: string
`,
  "auth-api.yaml": `
openapi: 3.0.0
info:
  title: Authentication API
  version: 1.0.0
paths:
  /login:
    post:
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                password:
                  type: string
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                  user:
                    type: object
                    properties:
                      id:
                        type: integer
                      name:
                        type: string
                      email:
                        type: string
  /register:
    post:
      summary: User registration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
                password:
                  type: string
      responses:
        '201':
          description: Registration successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
                  email:
                    type: string
                  createdAt:
                    type: string
`
};

const APIAnalyzer = () => {
  const [files, setFiles] = useState([]);
  const [parsedApis, setParsedApis] = useState({});
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle file upload
  const handleFileUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files);
    setFiles(uploadedFiles);
  };

  // Parse a YAML OpenAPI spec
  const parseOpenApiYaml = (content) => {
    // Extract endpoints (paths)
    const endpoints = [];
    const pathsSection = content.match(/paths:([\s\S]*?)(?:\n\w+:|$)/);
    
    if (pathsSection && pathsSection[1]) {
      const pathRegex = /\s+(\/.+?):/g;
      let match;
      
      while ((match = pathRegex.exec(pathsSection[1])) !== null) {
        endpoints.push(match[1]);
      }
    }
    
    // Extract request fields
    const requestFields = new Set();
    const requestRegex = /requestBody:[\s\S]*?properties:([\s\S]*?)(?:required:|responses:|$)/g;
    let requestMatch;
    
    while ((requestMatch = requestRegex.exec(content)) !== null) {
      if (requestMatch[1]) {
        const fieldsSection = requestMatch[1];
        const fieldRegex = /\s+(\w+):/g;
        let fieldMatch;
        
        while ((fieldMatch = fieldRegex.exec(fieldsSection)) !== null) {
          if (!["type", "required", "items", "properties"].includes(fieldMatch[1])) {
            requestFields.add(fieldMatch[1]);
          }
        }
      }
    }
    
    // Extract response fields
    const responseFields = new Set();
    const responseRegex = /responses:[\s\S]*?properties:([\s\S]*?)(?:required:|$)/g;
    let responseMatch;
    
    while ((responseMatch = responseRegex.exec(content)) !== null) {
      if (responseMatch[1]) {
        const fieldsSection = responseMatch[1];
        const fieldRegex = /\s+(\w+):/g;
        let fieldMatch;
        
        while ((fieldMatch = fieldRegex.exec(fieldsSection)) !== null) {
          if (!["type", "required", "items", "properties"].includes(fieldMatch[1])) {
            responseFields.add(fieldMatch[1]);
          }
        }
      }
    }
    
    return {
      endpoints,
      requestFields: Array.from(requestFields),
      responseFields: Array.from(responseFields)
    };
  };

  // Parse YAML files
  const parseYamlFiles = async () => {
    if (files.length === 0) {
      setError("Please upload YAML API contract files");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const yamlPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const content = e.target.result;
              // Use our improved OpenAPI YAML parser
              const parsedData = parseOpenApiYaml(content);
              
              const apiData = {
                name: file.name,
                endpoints: parsedData.endpoints,
                requestFields: parsedData.requestFields,
                responseFields: parsedData.responseFields
              };
              
              resolve(apiData);
            } catch (error) {
              reject(new Error(`Failed to parse ${file.name}: ${error.message}`));
            }
          };
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsText(file);
        });
      });

      const parsedResults = await Promise.all(yamlPromises);
      
      // Convert array of results to object with file names as keys
      const parsedApisObj = {};
      parsedResults.forEach(result => {
        parsedApisObj[result.name] = result;
      });
      
      setParsedApis(parsedApisObj);
      analyzeApis(parsedApisObj);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load default examples as files
  const loadDefaultExamples = () => {
    const defaultFiles = [];
    
    // Convert YAML strings to File objects
    Object.entries(DEFAULT_YAML_EXAMPLES).forEach(([fileName, content]) => {
      const blob = new Blob([content], { type: 'application/x-yaml' });
      const file = new File([blob], fileName, { type: 'application/x-yaml' });
      defaultFiles.push(file);
    });
    
    setFiles(defaultFiles);
  };

  // Analyze default examples
  const analyzeDefaultExamples = () => {
    // First load the default examples
    loadDefaultExamples();
    
    // Then manually parse them (simulating file upload)
    const parsedApisObj = {};
    
    Object.entries(DEFAULT_YAML_EXAMPLES).forEach(([fileName, content]) => {
      const parsedData = parseOpenApiYaml(content);
      
      parsedApisObj[fileName] = {
        name: fileName,
        endpoints: parsedData.endpoints,
        requestFields: parsedData.requestFields,
        responseFields: parsedData.responseFields
      };
    });
    
    setParsedApis(parsedApisObj);
    analyzeApis(parsedApisObj);
  };

  // Analyze APIs for commonalities
  const analyzeApis = (apis) => {
    if (Object.keys(apis).length < 1) {
      setError("Please upload at least 1 YAML file for analysis");
      return;
    }

    // Find common endpoints
    const apiNames = Object.keys(apis);
    const commonalities = {
      endpoints: {},
      requestFields: {},
      responseFields: {}
    };

    // For each pair of APIs
    for (let i = 0; i < apiNames.length; i++) {
      for (let j = i + 1; j < apiNames.length; j++) {
        const api1 = apiNames[i];
        const api2 = apiNames[j];
        const pairKey = `${api1} ∩ ${api2}`;

        // Find common endpoints
        const commonEndpoints = _.intersection(apis[api1].endpoints, apis[api2].endpoints);
        if (commonEndpoints.length > 0) {
          commonalities.endpoints[pairKey] = commonEndpoints;
        }

        // Find common request fields
        const commonRequestFields = _.intersection(apis[api1].requestFields, apis[api2].requestFields);
        if (commonRequestFields.length > 0) {
          commonalities.requestFields[pairKey] = commonRequestFields;
        }

        // Find common response fields
        const commonResponseFields = _.intersection(apis[api1].responseFields, apis[api2].responseFields);
        if (commonResponseFields.length > 0) {
          commonalities.responseFields[pairKey] = commonResponseFields;
        }
      }
    }

    // Calculate field frequencies for visualization
    const fieldFrequencies = {};
    
    // Process all APIs to count field frequencies
    Object.values(apis).forEach(api => {
      // Count request fields
      api.requestFields.forEach(field => {
        if (!fieldFrequencies[field]) {
          fieldFrequencies[field] = { count: 0, apis: [], type: 'request' };
        }
        fieldFrequencies[field].count += 1;
        if (!fieldFrequencies[field].apis.includes(api.name)) {
          fieldFrequencies[field].apis.push(api.name);
        }
        // Update type if it's in both request and response
        if (api.responseFields.includes(field) && fieldFrequencies[field].type === 'request') {
          fieldFrequencies[field].type = 'both';
        }
      });
      
      // Count response fields
      api.responseFields.forEach(field => {
        if (!fieldFrequencies[field]) {
          fieldFrequencies[field] = { count: 0, apis: [], type: 'response' };
        }
        fieldFrequencies[field].count += 1;
        if (!fieldFrequencies[field].apis.includes(api.name)) {
          fieldFrequencies[field].apis.push(api.name);
        }
        // Update type if it's in both request and response
        if (api.requestFields.includes(field) && fieldFrequencies[field].type === 'response') {
          fieldFrequencies[field].type = 'both';
        }
      });
    });
    
    // Convert to array and sort by frequency
    const allFieldsData = Object.entries(fieldFrequencies)
      .map(([field, data]) => ({ 
        field, 
        count: data.count,
        apis: data.apis,
        apiCount: data.apis.length,
        type: data.type
      }))
      .sort((a, b) => b.count - a.count);

    setAnalysisResult({
      commonalities,
      allFieldsData
    });
  };

  // Render the field frequency graph
  const renderFrequencyGraph = () => {
    if (!analysisResult || !analysisResult.allFieldsData) {
      return <div className="text-center p-4 text-gray-500">No data to visualize</div>;
    }

    const sortedFields = analysisResult.allFieldsData;
    
    // Calculate max frequency for scaling
    const maxCount = sortedFields.length > 0 ? sortedFields[0].count : 0;
    
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">API Field Frequency Analysis</h3>
        <div className="text-sm text-gray-600 mb-4">
          This chart shows how frequently fields appear across all APIs, highlighting potential standardization opportunities.
        </div>
        
        <div className="flex items-center justify-end mb-2 space-x-4">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-1"></span>
            <span className="text-xs">Request</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-blue-400 rounded-full mr-1"></span>
            <span className="text-xs">Response</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-purple-400 rounded-full mr-1"></span>
            <span className="text-xs">Both</span>
          </div>
        </div>
        
        <div className="overflow-auto max-h-96">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APIs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedFields.map((item, index) => {
                // Determine bar color based on field type
                let barColor;
                switch(item.type) {
                  case 'request':
                    barColor = 'bg-green-400';
                    break;
                  case 'response':
                    barColor = 'bg-blue-400';
                    break;
                  case 'both':
                    barColor = 'bg-purple-400';
                    break;
                  default:
                    barColor = 'bg-gray-400';
                }
                
                return (
                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.field}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center">
                        <div 
                          className={`${barColor} h-4 rounded-sm`} 
                          style={{ width: `${(item.count / maxCount) * 100}%`, minWidth: "4px" }}
                        />
                        <span className="ml-2 text-sm text-gray-600">{item.count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {item.apis.map((api, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {api.split('.')[0]}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render pattern analysis
  const renderPatternAnalysis = () => {
    return (
      <div className="bg-white p-4 rounded-lg shadow mt-4">
        <h3 className="text-lg font-medium mb-4">Common API Patterns</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Endpoint Patterns */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">Endpoint Pattern Analysis</h4>
            <ul className="space-y-2">
              {Object.keys(parsedApis).some(api => 
                parsedApis[api].endpoints.some(ep => ep.includes('{id}'))
              ) && (
                <li className="bg-green-50 p-3 rounded border border-green-100">
                  <span className="font-medium text-green-800">Resource Identifier Pattern</span>
                  <p className="text-sm text-gray-600 mt-1">
                    APIs use <code className="bg-green-100 px-1 rounded">/resource/{'{id}'}</code> pattern for accessing individual resources.
                  </p>
                </li>
              )}
              
              {Object.keys(parsedApis).length > 0 && (
                <li className="bg-blue-50 p-3 rounded border border-blue-100">
                  <span className="font-medium text-blue-800">Collection Access Pattern</span>
                  <p className="text-sm text-gray-600 mt-1">
                    {Object.keys(parsedApis).filter(api => 
                      parsedApis[api].endpoints.some(ep => !ep.includes('{'))
                    ).length} APIs use collection endpoints (e.g., <code className="bg-blue-100 px-1 rounded">/resources</code>).
                  </p>
                </li>
              )}
            </ul>
          </div>
          
          {/* Field Patterns */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">Field Pattern Analysis</h4>
            <ul className="space-y-2">
              {['id', 'createdAt', 'updatedAt'].some(field => 
                Object.values(parsedApis).some(api => 
                  api.responseFields.includes(field)
                )
              ) && (
                <li className="bg-purple-50 p-3 rounded border border-purple-100">
                  <span className="font-medium text-purple-800">Common Metadata Fields</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Standard metadata fields like <code className="bg-purple-100 px-1 rounded">id</code>, 
                    <code className="bg-purple-100 px-1 rounded">createdAt</code> appear in multiple APIs.
                  </p>
                </li>
              )}
              
              {['email', 'name'].some(field => 
                Object.values(parsedApis).some(api => 
                  api.requestFields.includes(field) || api.responseFields.includes(field)
                )
              ) && (
                <li className="bg-yellow-50 p-3 rounded border border-yellow-100">
                  <span className="font-medium text-yellow-800">Common Entity Fields</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Entity fields like <code className="bg-yellow-100 px-1 rounded">name</code>, 
                    <code className="bg-yellow-100 px-1 rounded">email</code> appear across APIs.
                  </p>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // Render API summary table
  const renderApiSummary = () => {
    return (
      <div className="bg-white p-4 rounded-lg shadow mt-4">
        <h3 className="text-lg font-medium mb-4">API Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoints</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Fields</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Fields</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(parsedApis).map(([name, api], idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {api.endpoints.map((endpoint, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{endpoint}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{api.requestFields.length}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{api.responseFields.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API Contract Analyzer</h1>
      
      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload YAML API Contract Files
        </label>
        <div className="flex items-center">
          <input
            type="file"
            multiple
            accept=".yaml,.yml"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={parseYamlFiles}
            disabled={loading || files.length === 0}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Analyze Files'}
          </button>
        </div>
        
        <div className="mt-4 flex items-center">
          <span className="text-sm text-gray-500 mr-2">Or</span>
          <button
            onClick={analyzeDefaultExamples}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Use Default Examples
          </button>
        </div>
        
        {files.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </div>
        )}
        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
      
      {/* Analysis Results */}
      {analysisResult && (
        <div className="grid grid-cols-1 gap-6">
          {renderFrequencyGraph()}
          {renderPatternAnalysis()}
          {renderApiSummary()}
        </div>
      )}
      
      {/* Empty State */}
      {!analysisResult && !loading && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Analysis Yet</h3>
          <p className="text-gray-500 mb-4">
            Upload YAML API contract files and click "Analyze Files" to visualize commonalities between your APIs.
          </p>
          <p className="text-gray-500">
            Or click "Use Default Examples" to test the app with pre-defined OpenAPI specifications.
          </p>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left">
            <h4 className="text-sm font-medium text-blue-700 mb-2">Default Examples Include:</h4>
            <ul className="text-sm text-gray-600 pl-5 list-disc">
              <li>Users API - endpoints for user management</li>
              <li>Products API - endpoints for product management</li>
              <li>Auth API - endpoints for authentication</li>
            </ul>
            <p className="mt-2 text-xs text-gray-500">These examples demonstrate common API patterns and potential duplications.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIAnalyzer;