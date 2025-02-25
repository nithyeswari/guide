import React, { useState, useEffect } from 'react';
import _ from 'lodash';

const JsonDiffHighlighter = () => {
  const [json1, setJson1] = useState('{\n  "name": "John",\n  "age": 30,\n  "address": {\n    "street": "123 Main St",\n    "city": "New York"\n  },\n  "hobbies": ["reading", "coding"]\n}');
  const [json2, setJson2] = useState('{\n  "name": "John",\n  "age": 32,\n  "address": {\n    "street": "456 Elm St",\n    "city": "New York"\n  },\n  "hobbies": ["reading", "gaming"]\n}');
  const [highlightedJson1, setHighlightedJson1] = useState('');
  const [highlightedJson2, setHighlightedJson2] = useState('');
  const [error, setError] = useState('');

  const compareJson = () => {
    try {
      // Parse the JSON strings
      const obj1 = JSON.parse(json1);
      const obj2 = JSON.parse(json2);
      setError('');

      // Get all paths from both objects
      const allPaths = getAllPaths(obj1, obj2);
      
      // Create highlighted versions
      const highlighted1 = createHighlightedJson(obj1, obj2, allPaths);
      const highlighted2 = createHighlightedJson(obj2, obj1, allPaths);
      
      setHighlightedJson1(highlighted1);
      setHighlightedJson2(highlighted2);
    } catch (err) {
      setError(`Error parsing JSON: ${err.message}`);
      setHighlightedJson1('');
      setHighlightedJson2('');
    }
  };

  // Get all possible paths from both objects
  const getAllPaths = (obj1, obj2) => {
    const paths = new Set();
    
    const extractPaths = (obj, currentPath = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach(key => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        paths.add(newPath);
        
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          extractPaths(obj[key], newPath);
        } else if (Array.isArray(obj[key])) {
          obj[key].forEach((item, index) => {
            const arrayPath = `${newPath}[${index}]`;
            paths.add(arrayPath);
            if (item && typeof item === 'object') {
              extractPaths(item, arrayPath);
            }
          });
        }
      });
    };
    
    extractPaths(obj1);
    extractPaths(obj2);
    
    return Array.from(paths);
  };

  // Create highlighted JSON
  const createHighlightedJson = (sourceObj, targetObj, allPaths) => {
    let result = JSON.stringify(sourceObj, null, 2);
    
    // Process paths in reverse order (from most nested to least nested)
    // to avoid messing up string positions when inserting HTML
    const sortedPaths = [...allPaths].sort((a, b) => b.length - a.length);
    
    for (const path of sortedPaths) {
      const sourceValue = _.get(sourceObj, path);
      const targetValue = _.get(targetObj, path);
      
      // Skip if path doesn't exist in source
      if (sourceValue === undefined) continue;
      
      // Check if values are different or if path doesn't exist in target
      if (targetValue === undefined || !_.isEqual(sourceValue, targetValue)) {
        const stringToFind = path.includes('[') 
          ? JSON.stringify(sourceValue)
          : `"${path.split('.').pop()}": ${JSON.stringify(sourceValue)}`;
          
        // Only highlight if we can find the exact string
        if (result.includes(stringToFind)) {
          const highlighted = `<span style="background-color: #ffcccc;">${stringToFind}</span>`;
          result = result.replace(stringToFind, highlighted);
        }
      }
    }
    
    // Convert the string to HTML
    return result;
  };

  useEffect(() => {
    if (json1 && json2) {
      compareJson();
    }
  }, [json1, json2]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">JSON Difference Highlighter</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block mb-2 font-medium">First JSON:</label>
          <textarea 
            className="w-full h-64 p-2 border border-gray-300 rounded font-mono text-sm"
            value={json1}
            onChange={(e) => setJson1(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Second JSON:</label>
          <textarea 
            className="w-full h-64 p-2 border border-gray-300 rounded font-mono text-sm"
            value={json2}
            onChange={(e) => setJson2(e.target.value)}
          />
        </div>
      </div>
      
      <button 
        className="px-4 py-2 bg-blue-600 text-white rounded mb-4"
        onClick={compareJson}
      >
        Compare JSON
      </button>
      
      {error && (
        <div className="p-2 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <h2 className="text-lg font-medium mb-2">Differences in First JSON:</h2>
          <div 
            className="p-4 border border-gray-300 rounded font-mono text-sm bg-gray-50 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: highlightedJson1 }}
          />
        </div>
        <div>
          <h2 className="text-lg font-medium mb-2">Differences in Second JSON:</h2>
          <div 
            className="p-4 border border-gray-300 rounded font-mono text-sm bg-gray-50 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: highlightedJson2 }}
          />
        </div>
      </div>
    </div>
  );
};

export default JsonDiffHighlighter;