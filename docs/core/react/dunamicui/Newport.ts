import React, { useState } from 'react';
import { Settings, Save, ChevronDown, ArrowRight } from 'lucide-react';

const FinancialFormBuilder = () => {
  const [activeTab, setActiveTab] = useState('layout');
  const [activeStep, setActiveStep] = useState(1);
  
  const [channelValue, setChannelValue] = useState('o4b');
  const [productValue, setProductValue] = useState('International Payments');
  const [journeyValue, setJourneyValue] = useState('Beneficiary');
  
  const [selectedSource, setSelectedSource] = useState('masterFields');
  const [jsonConfig, setJsonConfig] = useState(`{
  "path": "/Document/CstmrCdtTrfInitn/PmtInf/CdtTrfTxInf/Amt/InstdAmt",
  "businessName": "Settlement Amount Credit",
  "validation": {
    "length": {
      "max": 17
    },
    "type": "string",
    "validators": []
  }
}`);

  const [fields, setFields] = useState([
    {
      id: 1,
      label: 'Settlement Amount Credit',
      fieldType: 'TextField',
      required: true,
      hidden: false,
      systemName: '',
      order: 1
    },
    {
      id: 2,
      label: 'Settlement Amount Debit',
      fieldType: 'TextField',
      required: true,
      hidden: false,
      systemName: '',
      order: 2
    }
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-700 rounded"></div>
            <span className="ml-3 font-semibold text-green-700">Form Builder</span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <Settings size={20} />
            </button>
            <button className="bg-green-700 text-white px-4 py-2 rounded text-sm font-medium">Save</button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <nav className="flex -mb-px">
            <button 
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'layout' ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('layout')}
            >
              Layout JSON
            </button>
            <button 
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'compare' ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('compare')}
            >
              Compare 2 Layout JSON
            </button>
            <button 
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'html' ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('html')}
            >
              HTML to Layout JSON
            </button>
            <button 
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'csv' ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('csv')}
            >
              CSV to JSON
            </button>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">Workflow Steps</h2>
            <div className="space-y-1">
              <button 
                className={`w-full flex items-center text-left px-4 py-2 rounded-md text-sm ${activeStep === 1 ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveStep(1)}
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs mr-3 ${activeStep === 1 ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-700'}`}>1</span>
                Selection
              </button>
              <button 
                className={`w-full flex items-center text-left px-4 py-2 rounded-md text-sm ${activeStep === 2 ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveStep(2)}
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs mr-3 ${activeStep === 2 ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-700'}`}>2</span>
                Load Fields
              </button>
              <button 
                className={`w-full flex items-center text-left px-4 py-2 rounded-md text-sm ${activeStep === 3 ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveStep(3)}
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs mr-3 ${activeStep === 3 ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-700'}`}>3</span>
                Configure Fields
              </button>
              <button 
                className={`w-full flex items-center text-left px-4 py-2 rounded-md text-sm ${activeStep === 4 ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveStep(4)}
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs mr-3 ${activeStep === 4 ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-700'}`}>4</span>
                Preview
              </button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 overflow-auto">
          {activeStep === 1 && (
            <div>
              <h1 className="text-xl font-semibold mb-6">Step 1 - Selection</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
                  <h3 className="font-medium text-gray-700 mb-4">Channel</h3>
                  <div className="relative">
                    <select 
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                      value={channelValue}
                      onChange={(e) => setChannelValue(e.target.value)}
                    >
                      <option value="o4b">o4b</option>
                      <option value="online">Online</option>
                      <option value="mobile">Mobile</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
                  <h3 className="font-medium text-gray-700 mb-4">Product</h3>
                  <div className="relative">
                    <select 
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                      value={productValue}
                      onChange={(e) => setProductValue(e.target.value)}
                    >
                      <option value="International Payments">International Payments</option>
                      <option value="Domestic Payments">Domestic Payments</option>
                      <option value="Trade Finance">Trade Finance</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
                  <h3 className="font-medium text-gray-700 mb-4">Journey</h3>
                  <div className="relative">
                    <select 
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                      value={journeyValue}
                      onChange={(e) => setJourneyValue(e.target.value)}
                    >
                      <option value="Beneficiary">Beneficiary</option>
                      <option value="Payment">Payment</option>
                      <option value="Confirmation">Confirmation</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button 
                  className="bg-green-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-800"
                  onClick={() => setActiveStep(2)}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          
          {activeStep === 2 && (
            <div>
              <h1 className="text-xl font-semibold mb-6">Step 2 - Load Fields</h1>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div 
                  className={`p-4 bg-white rounded-lg shadow-sm border cursor-pointer ${selectedSource === 'masterFields' ? 'border-green-700 ring-1 ring-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setSelectedSource('masterFields')}
                >
                  <h3 className="font-medium mb-2">New Layout from Master Fields</h3>
                  <p className="text-xs text-gray-500">Use fields from master template</p>
                </div>
                
                <div 
                  className={`p-4 bg-white rounded-lg shadow-sm border cursor-pointer ${selectedSource === 'decree' ? 'border-green-700 ring-1 ring-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setSelectedSource('decree')}
                >
                  <h3 className="font-medium mb-2">Existing Layout + Decree</h3>
                  <p className="text-xs text-gray-500">Use fields from decree</p>
                </div>
                
                <div 
                  className={`p-4 bg-white rounded-lg shadow-sm border cursor-pointer ${selectedSource === 'existing' ? 'border-green-700 ring-1 ring-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setSelectedSource('existing')}
                >
                  <h3 className="font-medium mb-2">Existing Layout Only</h3>
                  <p className="text-xs text-gray-500">Use only existing layout</p>
                </div>
                
                <div 
                  className={`p-4 bg-white rounded-lg shadow-sm border cursor-pointer ${selectedSource === 'library' ? 'border-green-700 ring-1 ring-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setSelectedSource('library')}
                >
                  <h3 className="font-medium mb-2">From Library</h3>
                  <p className="text-xs text-gray-500">Use component library</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="border-b border-gray-200 p-4 bg-gray-50">
                    <h3 className="font-medium">JSON Configuration</h3>
                  </div>
                  <div className="p-4">
                    <textarea 
                      className="w-full h-64 font-mono text-sm p-3 border border-gray-300 rounded"
                      value={jsonConfig}
                      onChange={(e) => setJsonConfig(e.target.value)}
                    />
                  </div>
                  <div className="border-t border-gray-200 p-4 flex justify-end">
                    <button className="bg-green-700 text-white px-4 py-2 rounded text-sm font-medium">
                      Load
                    </button>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="bg-green-700 text-white p-4 rounded-t-lg">
                    <h3 className="font-medium">Rendered Screen for International Payments</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Settlement Amount Credit
                        </label>
                        <input 
                          type="text"
                          placeholder="Enter Amount in Beneficiary Acct"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Settlement Amount Debit
                        </label>
                        <input 
                          type="text"
                          placeholder="Enter Amount in Own Account"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Beneficiary Bank SWIFT BIC Code
                        </label>
                        <input 
                          type="text"
                          placeholder="Enter 11 character SWIFT BIC of Bank"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Beneficiary Name
                        </label>
                        <input 
                          type="text"
                          placeholder="Enter Full Beneficiary Name"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs text-gray-500 text-right">
                      Current dimensions: 375px × 667px
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-between">
                <button 
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50"
                  onClick={() => setActiveStep(1)}
                >
                  Back
                </button>
                <button 
                  className="bg-green-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-800"
                  onClick={() => setActiveStep(3)}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          
          {activeStep === 3 && (
            <div>
              <h1 className="text-xl font-semibold mb-6">Step 3 - Configure Fields</h1>
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="border-b border-gray-200 p-4 flex justify-between items-center">
                        <h3 className="font-medium flex items-center gap-2">
                          <span className="text-gray-500">{index + 1}</span> {field.label}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button className="text-gray-500 p-1 hover:bg-gray-100 rounded">
                            <ArrowRight size={16} />
                          </button>
                          <button className="text-gray-500 p-1 hover:bg-gray-100 rounded">
                            <ChevronDown size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Label
                            </label>
                            <input 
                              type="text"
                              className="w-full p-2 border border-gray-300 rounded"
                              value={field.label}
                              onChange={(e) => {
                                const updatedFields = [...fields];
                                updatedFields[index].label = e.target.value;
                                setFields(updatedFields);
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              System Name
                            </label>
                            <input 
                              type="text"
                              className="w-full p-2 border border-gray-300 rounded"
                              value={field.systemName}
                              onChange={(e) => {
                                const updatedFields = [...fields];
                                updatedFields[index].systemName = e.target.value;
                                setFields(updatedFields);
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`required-${field.id}`}
                              checked={field.required}
                              onChange={(e) => {
                                const updatedFields = [...fields];
                                updatedFields[index].required = e.target.checked;
                                setFields(updatedFields);
                              }}
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`required-${field.id}`} className="ml-2 block text-sm text-gray-700">
                              Required
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`hidden-${field.id}`}
                              checked={field.hidden}
                              onChange={(e) => {
                                const updatedFields = [...fields];
                                updatedFields[index].hidden = e.target.checked;
                                setFields(updatedFields);
                              }}
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`hidden-${field.id}`} className="ml-2 block text-sm text-gray-700">
                              Hidden
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="bg-green-700 text-white p-4 rounded-t-lg">
                    <h3 className="font-medium">Preview</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {fields.filter(f => !f.hidden).map(field => (
                        <div key={`preview-${field.id}`}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <input 
                            type="text"
                            placeholder={`Enter ${field.label}`}
                            className="w-full p-2 border border-gray-300 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-between">
                <button 
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50"
                  onClick={() => setActiveStep(2)}
                >
                  Back
                </button>
                <button 
                  className="bg-green-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-800"
                  onClick={() => setActiveStep(4)}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          
          {activeStep === 4 && (
            <div>
              <h1 className="text-xl font-semibold mb-6">Step 4 - Preview</h1>
              
              <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="bg-green-700 text-white p-4 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">International Payments</h3>
                    <div className="flex items-center gap-2">
                      <div className="bg-white text-green-700 rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <span className="text-xs">Safe & Secure</span>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    {fields.filter(f => !f.hidden).map(field => (
                      <div key={`final-${field.id}`}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <input 
                          type="text"
                          placeholder={`Enter ${field.label}`}
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8">
                    <button className="w-full bg-green-700 text-white py-2 rounded font-medium hover:bg-green-800">
                      Submit Payment
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-between">
                <button 
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50"
                  onClick={() => setActiveStep(3)}
                >
                  Back
                </button>
                <button 
                  className="bg-green-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-800"
                >
                  Finish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialFormBuilder;