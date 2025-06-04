import React, { useState, useRef } from 'react';
import { 
  Upload, Download, Database, Globe, Settings, Eye, EyeOff, 
  Plus, Trash2, Save, RotateCcw, FileText, Table, Code, 
  Zap, RefreshCw, Copy, Edit3, Check, X
} from 'lucide-react';

const FormBuilderUI = () => {
  const [forms, setForms] = useState([
    { id: 1, name: 'Settlement Form', fields: 5, source: 'CSV', status: 'active' },
    { id: 2, name: 'Banking Details', fields: 8, source: 'API', status: 'draft' }
  ]);
  
  const [currentForm, setCurrentForm] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [importSource, setImportSource] = useState('csv');
  const [showImportModal, setShowImportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const dataSources = [
    { id: 'csv', name: 'CSV File', icon: FileText, description: 'Import from CSV with headers' },
    { id: 'excel', name: 'Excel File', icon: Table, description: 'Import from XLSX/XLS files' },
    { id: 'api', name: 'REST API', icon: Globe, description: 'Fetch schema from API endpoint' },
    { id: 'mcp', name: 'MCP Server', icon: Zap, description: 'Connect to MCP data source' },
    { id: 'json', name: 'JSON Schema', icon: Code, description: 'Import from JSON schema file' },
    { id: 'database', name: 'Database', icon: Database, description: 'Import from database schema' }
  ];

  const fieldTypes = [
    'text', 'email', 'number', 'tel', 'url', 'password',
    'textarea', 'select', 'radio', 'checkbox', 'date', 
    'datetime-local', 'time', 'file', 'range', 'color'
  ];

  const mockApiEndpoints = [
    'https://api.example.com/schema/user',
    'https://api.example.com/schema/payment',
    'https://api.example.com/schema/settlement'
  ];

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    
    try {
      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock field extraction based on file type
      const mockFields = [
        { id: 1, name: 'firstName', label: 'First Name', type: 'text', required: true, validation: '' },
        { id: 2, name: 'lastName', label: 'Last Name', type: 'text', required: true, validation: '' },
        { id: 3, name: 'email', label: 'Email Address', type: 'email', required: true, validation: 'email' },
        { id: 4, name: 'phone', label: 'Phone Number', type: 'tel', required: false, validation: 'phone' },
        { id: 5, name: 'amount', label: 'Settlement Amount', type: 'number', required: true, validation: 'min:0' }
      ];
      
      setFormFields(mockFields);
      setCurrentForm({ name: file.name.split('.')[0], source: importSource.toUpperCase() });
      setShowImportModal(false);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiImport = async (endpoint) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockApiFields = [
        { id: 1, name: 'userId', label: 'User ID', type: 'text', required: true, validation: 'uuid' },
        { id: 2, name: 'accountNumber', label: 'Account Number', type: 'text', required: true, validation: 'account' },
        { id: 3, name: 'iban', label: 'IBAN', type: 'text', required: true, validation: 'iban' },
        { id: 4, name: 'swiftCode', label: 'SWIFT Code', type: 'text', required: false, validation: 'swift' },
        { id: 5, name: 'transactionDate', label: 'Transaction Date', type: 'date', required: true, validation: '' }
      ];
      
      setFormFields(mockApiFields);
      setCurrentForm({ name: 'API Import Form', source: 'API' });
      setShowImportModal(false);
    } catch (error) {
      console.error('API import failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addField = () => {
    const newField = {
      id: Date.now(),
      name: `field_${formFields.length + 1}`,
      label: 'New Field',
      type: 'text',
      required: false,
      validation: ''
    };
    setFormFields([...formFields, newField]);
  };

  const updateField = (id, property, value) => {
    setFormFields(fields => 
      fields.map(field => 
        field.id === id ? { ...field, [property]: value } : field
      )
    );
  };

  const removeField = (id) => {
    setFormFields(fields => fields.filter(field => field.id !== id));
  };

  const saveForm = () => {
    if (!currentForm || formFields.length === 0) return;
    
    const newForm = {
      id: Date.now(),
      name: currentForm.name,
      fields: formFields.length,
      source: currentForm.source,
      status: 'active'
    };
    
    setForms([...forms, newForm]);
    setCurrentForm(null);
    setFormFields([]);
  };

  const ImportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Import Form Fields</h2>
          <button
            onClick={() => setShowImportModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {dataSources.map((source) => {
            const IconComponent = source.icon;
            return (
              <div
                key={source.id}
                onClick={() => setImportSource(source.id)}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                  importSource === source.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <IconComponent className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{source.name}</h3>
                </div>
                <p className="text-sm text-gray-600">{source.description}</p>
              </div>
            );
          })}
        </div>

        {importSource === 'csv' || importSource === 'excel' || importSource === 'json' ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload {importSource.toUpperCase()} File
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your file here, or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={importSource === 'csv' ? '.csv' : importSource === 'excel' ? '.xlsx,.xls' : '.json'}
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Choose File'}
            </button>
          </div>
        ) : importSource === 'api' ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">API Endpoint</h3>
            <div className="space-y-3">
              {mockApiEndpoints.map((endpoint, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <span className="text-gray-700">{endpoint}</span>
                  <button
                    onClick={() => handleApiImport(endpoint)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Import'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Configuration for {importSource} coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dynamic Form Builder</h1>
                <p className="text-sm text-gray-500">Create forms from multiple data sources</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Import Fields</span>
              </button>
              {currentForm && (
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{previewMode ? 'Edit' : 'Preview'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!currentForm ? (
          // Forms List View
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Forms</h2>
              <div className="text-sm text-gray-500">{forms.length} forms created</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map((form) => (
                <div key={form.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{form.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      form.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {form.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex justify-between">
                      <span>Fields:</span>
                      <span>{form.fields}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Source:</span>
                      <span>{form.source}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="flex-1 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm">
                      <Edit3 className="w-4 h-4 inline mr-1" />
                      Edit
                    </button>
                    <button className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Form Builder View
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Field Configuration */}
            {!previewMode && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{currentForm.name}</h2>
                    <p className="text-sm text-gray-500">Source: {currentForm.source}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={addField}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Field</span>
                    </button>
                    <button
                      onClick={saveForm}
                      className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Form</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {formFields.map((field, index) => (
                    <div key={field.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900">Field {index + 1}</h3>
                        <button
                          onClick={() => removeField(field.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Field Name</label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => updateField(field.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateField(field.id, 'label', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => updateField(field.id, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          >
                            {fieldTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Validation</label>
                          <input
                            type="text"
                            value={field.validation}
                            onChange={(e) => updateField(field.id, 'validation', e.target.value)}
                            placeholder="e.g., email, min:5, max:100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Required field</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Panel */}
            <div className={previewMode ? 'col-span-full' : ''}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Form Preview</h2>
                
                <div className="space-y-4">
                  {formFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {field.type === 'textarea' ? (
                        <textarea
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      ) : field.type === 'select' ? (
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                          <option value="">Select {field.label.toLowerCase()}</option>
                          <option value="option1">Option 1</option>
                          <option value="option2">Option 2</option>
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}
                      
                      {field.validation && (
                        <p className="text-xs text-gray-500">Validation: {field.validation}</p>
                      )}
                    </div>
                  ))}
                  
                  {formFields.length > 0 && (
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                      <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        Reset
                      </button>
                      <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Submit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showImportModal && <ImportModal />}
    </div>
  );
};

export default FormBuilderUI;