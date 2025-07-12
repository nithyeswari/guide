import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, File, X, Bot, User, Loader2 } from 'lucide-react';

const GemmaChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('ollama'); // 'ollama', 'huggingface', 'custom'
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [showApiInput, setShowApiInput] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    for (const file of files) {
      try {
        const content = await readFileContent(file);
        const newFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          content: content
        };
        
        setUploadedFiles(prev => [...prev, newFile]);
        
        // Add system message about file upload
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          type: 'system',
          content: `📎 Uploaded: ${file.name} (${formatFileSize(file.size)})`
        }]);
      } catch (error) {
        console.error('Error reading file:', error);
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          type: 'error',
          content: `❌ Error uploading ${file.name}: ${error.message}`
        }]);
      }
    }
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          
          // Try to parse JSON files
          if (file.type === 'application/json' || file.name.endsWith('.json')) {
            const jsonData = JSON.parse(content);
            resolve(JSON.stringify(jsonData, null, 2));
          } else {
            resolve(content);
          }
        } catch (error) {
          // If JSON parsing fails, treat as text
          resolve(e.target.result);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const callGemmaAPI = async (message, files) => {
    const contextData = files.map(file => ({
      filename: file.name,
      content: file.content.substring(0, 4000) // Limit content to avoid token limits
    }));

    let prompt = message;
    
    if (contextData.length > 0) {
      prompt = `Based on the following uploaded documents, please answer the user's question:

Documents:
${contextData.map(file => `
--- ${file.filename} ---
${file.content}
`).join('\n')}

User Question: ${message}

Please provide a comprehensive answer based on the document content.`;
    }

    try {
      let response;
      
      if (apiEndpoint === 'ollama') {
        // Ollama local API call
        response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gemma:7b',
            prompt: prompt,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
              num_predict: 1000
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Ollama API Error: ${response.status} - Make sure Ollama is running with Gemma model`);
        }
        
        const data = await response.json();
        return data.response;
        
      } else if (apiEndpoint === 'huggingface') {
        // Hugging Face API call
        response = await fetch('https://api-inference.huggingface.co/models/google/gemma-7b-it', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 1000,
              temperature: 0.7,
              top_p: 0.9,
              do_sample: true
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Hugging Face API Error: ${response.status} - Check your API key`);
        }
        
        const data = await response.json();
        return data[0]?.generated_text || 'No response generated';
        
      } else if (apiEndpoint === 'custom') {
        // Custom endpoint
        response = await fetch(customEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
          },
          body: JSON.stringify({
            prompt: prompt,
            max_tokens: 1000,
            temperature: 0.7,
            model: 'gemma'
          })
        });
        
        if (!response.ok) {
          throw new Error(`Custom API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response || data.text || data.content || 'No response received';
      }
      
    } catch (error) {
      console.error('API call failed:', error);
      
      // Provide helpful error messages
      if (error.message.includes('Failed to fetch')) {
        if (apiEndpoint === 'ollama') {
          throw new Error('Cannot connect to Ollama. Please ensure:\n1. Ollama is installed and running\n2. Gemma model is pulled: `ollama pull gemma:7b`\n3. Ollama is running on localhost:11434');
        } else {
          throw new Error('Network error. Please check your internet connection and API endpoint.');
        }
      }
      
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await callGemmaAPI(inputMessage, uploadedFiles);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `Error: ${error.message}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (showApiInput) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <Bot className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Gemma Chat Agent</h1>
            <p className="text-gray-600">Configure your Gemma LLM connection</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Endpoint
              </label>
              <select
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="huggingface">Hugging Face</option>
                <option value="custom">Custom Endpoint</option>
              </select>
            </div>

            {apiEndpoint === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Endpoint URL
                </label>
                <input
                  type="url"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="https://your-api-endpoint.com/v1/chat"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {(apiEndpoint === 'huggingface' || apiEndpoint === 'custom') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${apiEndpoint === 'huggingface' ? 'Hugging Face' : 'API'} key`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            <button
              onClick={() => setShowApiInput(false)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Connect to Gemma
            </button>
          </div>
          
          <div className="mt-6 space-y-3">
            {apiEndpoint === 'ollama' && (
              <div className="p-4 bg-blue-50 rounded-md">
                <h3 className="font-semibold text-blue-900 mb-2">Ollama Setup:</h3>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Install Ollama: <code className="bg-blue-100 px-1 rounded">curl -fsSL https://ollama.com/install.sh | sh</code></li>
                  <li>2. Pull Gemma: <code className="bg-blue-100 px-1 rounded">ollama pull gemma:7b</code></li>
                  <li>3. Start Ollama: <code className="bg-blue-100 px-1 rounded">ollama serve</code></li>
                </ol>
              </div>
            )}
            
            {apiEndpoint === 'huggingface' && (
              <div className="p-4 bg-green-50 rounded-md">
                <h3 className="font-semibold text-green-900 mb-2">Hugging Face Setup:</h3>
                <ol className="text-sm text-green-800 space-y-1">
                  <li>1. Create account at huggingface.co</li>
                  <li>2. Generate API token in Settings → Access Tokens</li>
                  <li>3. Enter token above to connect</li>
                </ol>
              </div>
            )}
            
            {apiEndpoint === 'custom' && (
              <div className="p-4 bg-purple-50 rounded-md">
                <p className="text-sm text-purple-800">
                  <strong>Custom Endpoint:</strong> Enter your Gemma API endpoint URL and authentication key.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Gemma Chat Agent</h1>
          </div>
          <button
            onClick={() => setShowApiInput(true)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white border-b px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map(file => (
              <div key={file.id} className="flex items-center bg-blue-50 rounded-md px-3 py-1 text-sm">
                <File className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-blue-800">{file.name}</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Welcome to Gemma Chat!</h2>
            <p className="text-gray-500">Upload documents or JSON files and start chatting</p>
          </div>
        )}

        {messages.map(message => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-xs lg:max-w-md xl:max-w-lg ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                message.type === 'user' ? 'bg-blue-600 ml-2' : 'bg-gray-300 mr-2'
              }`}>
                {message.type === 'user' ? (
                  <User className="h-4 w-4 text-white" />
                ) : (
                  <Bot className="h-4 w-4 text-gray-600" />
                )}
              </div>
              <div className={`px-4 py-2 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : message.type === 'error'
                  ? 'bg-red-100 text-red-800'
                  : message.type === 'system'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-white text-gray-900 shadow-sm border'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex max-w-xs lg:max-w-md xl:max-w-lg">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-300 mr-2 flex items-center justify-center">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
              <div className="px-4 py-2 rounded-lg bg-white text-gray-900 shadow-sm border">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t px-4 py-3">
        <div className="flex items-end space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept=".json,.txt,.pdf,.doc,.docx,.csv,.md"
            className="hidden"
            style={{ display: 'none' }}
          />
          
          <button
            onClick={handleUploadClick}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Upload files"
          >
            <Upload className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="1"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="flex-shrink-0 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GemmaChatApp;