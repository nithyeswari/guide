import React, { useState } from 'react';

const HtmlToJsonLayout = () => {
  const [htmlInput, setHtmlInput] = useState(`<div class="container">
  <header class="header">
    <h1>Welcome to my website</h1>
    <nav>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  </header>
  <main>
    <section class="hero">
      <h2>Main Content</h2>
      <p>This is the main content of the page.</p>
    </section>
    <aside>
      <h3>Sidebar</h3>
      <p>This is a sidebar with additional information.</p>
    </aside>
  </main>
  <footer>
    <p>&copy; 2025 My Website</p>
  </footer>
</div>`);
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState('');
  const [detailLevel, setDetailLevel] = useState('standard');

  const parseHtml = () => {
    try {
      setError('');
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlInput, 'text/html');
      
      // Check for parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error('HTML parsing error: ' + parseError.textContent);
      }

      const jsonStructure = extractStructure(doc.body.firstChild, detailLevel);
      setJsonOutput(JSON.stringify(jsonStructure, null, 2));
    } catch (err) {
      setError(err.message);
      setJsonOutput('');
    }
  };

  const extractStructure = (node, level) => {
    if (!node) return null;

    const result = {
      type: node.nodeName.toLowerCase()
    };

    // Add attributes
    if (node.attributes && node.attributes.length > 0) {
      result.attributes = {};
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        result.attributes[attr.name] = attr.value;
      }
    }

    // Include ID if present
    if (node.id) {
      result.id = node.id;
    }

    // Include classes if present
    if (node.className) {
      result.classes = node.className.split(' ').filter(c => c.trim() !== '');
    }

    // Add text content for text nodes or if this is a leaf with text
    if (node.nodeType === 3) { // Text node
      const text = node.textContent.trim();
      if (text) {
        result.text = text;
      }
      return text ? result : null;
    } else if (node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
      // Element with only text inside
      const text = node.childNodes[0].textContent.trim();
      if (text) {
        result.text = text;
      }
    }

    // Add styles if detailed view is requested
    if (level === 'detailed' && node.style && typeof window.getComputedStyle === 'function') {
      const styles = window.getComputedStyle(node);
      if (styles) {
        result.computedStyles = {};
        ['width', 'height', 'display', 'position', 'margin', 'padding', 'color', 'background-color', 'font-size'].forEach(prop => {
          if (styles[prop]) {
            result.computedStyles[prop] = styles[prop];
          }
        });
      }
    }

    // Add children recursively
    if (node.childNodes.length > 0) {
      result.children = [];
      node.childNodes.forEach(child => {
        const childResult = extractStructure(child, level);
        if (childResult) {
          result.children.push(childResult);
        }
      });

      // If there are no valid children, remove the empty array
      if (result.children.length === 0) {
        delete result.children;
      }
    }

    return result;
  };

  const handleDetailLevelChange = (e) => {
    setDetailLevel(e.target.value);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">HTML to JSON Layout Extractor</h1>
      
      <div className="mb-4">
        <label className="block mb-2 font-medium">Detail Level:</label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="standard"
              checked={detailLevel === 'standard'}
              onChange={handleDetailLevelChange}
              className="mr-2"
            />
            Standard (Elements, Attributes, Text)
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="detailed"
              checked={detailLevel === 'detailed'}
              onChange={handleDetailLevelChange}
              className="mr-2"
            />
            Detailed (+ Computed Styles)
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block mb-2 font-medium">HTML Input:</label>
          <textarea 
            className="w-full h-96 p-2 border border-gray-300 rounded font-mono text-sm"
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            placeholder="Paste HTML here..."
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">JSON Output:</label>
          <textarea 
            className="w-full h-96 p-2 border border-gray-300 rounded font-mono text-sm bg-gray-50"
            value={jsonOutput}
            readOnly
            placeholder="JSON representation will appear here..."
          />
        </div>
      </div>
      
      <button 
        className="px-4 py-2 bg-blue-600 text-white rounded mb-4"
        onClick={parseHtml}
      >
        Convert HTML to JSON
      </button>
      
      {error && (
        <div className="p-2 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <h2 className="font-medium mb-2">Usage Instructions:</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Paste your HTML code in the left textarea</li>
          <li>Select your desired detail level</li>
          <li>Click "Convert HTML to JSON" to generate the JSON layout structure</li>
          <li>The resulting JSON represents the DOM hierarchy with element types, attributes, and content</li>
        </ol>
      </div>
    </div>
  );
};

export default HtmlToJsonLayout;