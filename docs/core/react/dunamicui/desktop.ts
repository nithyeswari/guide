import React, { useState, useEffect } from 'react';

const MobileDesktopViewer = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(375); // Default iPhone viewport width
  const [viewportHeight, setViewportHeight] = useState(667); // Default iPhone viewport height
  const [deviceType, setDeviceType] = useState('iphone'); // Default device

  // Device presets
  const devicePresets = {
    iphone: { width: 375, height: 667, name: 'iPhone 8' },
    iphoneX: { width: 375, height: 812, name: 'iPhone X/11/12' },
    iphone12ProMax: { width: 428, height: 926, name: 'iPhone 12/13 Pro Max' },
    ipad: { width: 768, height: 1024, name: 'iPad' },
    ipadPro: { width: 1024, height: 1366, name: 'iPad Pro' },
    android: { width: 360, height: 740, name: 'Android (avg)' },
    galaxyS20: { width: 412, height: 915, name: 'Galaxy S20' }
  };

  // Apply device preset
  const applyDevicePreset = (preset) => {
    setDeviceType(preset);
    setViewportWidth(devicePresets[preset].width);
    setViewportHeight(devicePresets[preset].height);
  };

  // Handle URL input change
  const handleUrlChange = (e) => {
    setUrl(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url) return;
    
    // Ensure URL has http/https prefix
    let processedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      processedUrl = `https://${url}`;
    }
    
    setUrl(processedUrl);
    setIsLoading(true);
    
    // This timeout simulates the loading state
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Custom dimension input handlers
  const handleWidthChange = (e) => {
    const width = parseInt(e.target.value);
    if (!isNaN(width) && width > 0) {
      setViewportWidth(width);
      setDeviceType('custom');
    }
  };

  const handleHeightChange = (e) => {
    const height = parseInt(e.target.value);
    if (!isNaN(height) && height > 0) {
      setViewportHeight(height);
      setDeviceType('custom');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Mobile Desktop URL Viewer</h1>
      
      {/* URL Input Form */}
      <form onSubmit={handleSubmit} className="w-full mb-6">
        <div className="flex flex-col md:flex-row w-full">
          <input
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="Enter website URL (e.g. example.com)"
            className="flex-grow p-2 border rounded-md mb-2 md:mb-0 md:mr-2"
          />
          <button 
            type="submit"
            className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'View'}
          </button>
        </div>
      </form>
      
      {/* Device Selection */}
      <div className="w-full mb-6">
        <h2 className="text-lg font-semibold mb-2">Select Device</h2>
        <div className="flex flex-wrap gap-2">
          {Object.keys(devicePresets).map((device) => (
            <button
              key={device}
              onClick={() => applyDevicePreset(device)}
              className={`px-3 py-1 text-sm rounded-md ${
                deviceType === device 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {devicePresets[device].name}
            </button>
          ))}
        </div>
        
        {/* Custom Dimensions */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium">Width (px)</label>
            <input
              type="number"
              value={viewportWidth}
              onChange={handleWidthChange}
              className="mt-1 p-1 border rounded-md w-24"
              min="200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Height (px)</label>
            <input
              type="number"
              value={viewportHeight}
              onChange={handleHeightChange}
              className="mt-1 p-1 border rounded-md w-24"
              min="300"
            />
          </div>
        </div>
      </div>
      
      {/* Iframe container */}
      <div className="relative w-full">
        <div className="mb-2 text-sm text-gray-600">
          Viewing at: {viewportWidth} × {viewportHeight}px
        </div>
        
        <div 
          className="mx-auto border-4 border-gray-800 rounded-xl overflow-hidden bg-white"
          style={{
            width: `${viewportWidth}px`,
            height: `${viewportHeight}px`,
            maxWidth: '100%',
            maxHeight: '80vh',
            resize: 'both',
            transition: 'width 0.3s, height 0.3s'
          }}
        >
          {url ? (
            <div className="w-full h-full">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="text-lg">Loading...</div>
                </div>
              ) : (
                <iframe
                  src={url}
                  title="Mobile preview"
                  className="w-full h-full"
                  sandbox="allow-same-origin allow-scripts"
                  loading="lazy"
                />
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-lg text-gray-500">Enter a URL to preview</div>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          Note: Some websites may block being displayed in iframes due to security policies.
        </div>
      </div>
    </div>
  );
};

export default MobileDesktopViewer;