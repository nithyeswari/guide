import React, { useState } from 'react';

const DeviceEmulator = ({ children }) => {
  const [device, setDevice] = useState('desktop');
  const [orientation, setOrientation] = useState('portrait');
  
  const devices = {
    desktop: { width: '1280px', height: '800px' },
    laptop: { width: '1024px', height: '768px' },
    tablet: { width: '768px', height: '1024px' },
    mobile: { width: '375px', height: '667px' },
    mobileSmall: { width: '320px', height: '568px' }
  };
  
  const getDeviceDimensions = () => {
    const { width, height } = devices[device];
    return orientation === 'portrait' 
      ? { width, height } 
      : { width: height, height: width };
  };
  
  const dimensions = getDeviceDimensions();
  
  // Inline styles instead of class names
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f3f4f6',
    minHeight: '100vh'
  };
  
  const controlsStyle = {
    marginBottom: '16px',
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  };
  
  const selectStyle = {
    padding: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px'
  };
  
  const emulatorFrameStyle = {
    overflow: 'hidden',
    border: '4px solid #1f2937',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    backgroundColor: 'white',
    width: dimensions.width,
    height: dimensions.height,
    maxHeight: '80vh',
    transition: 'width 0.3s, height 0.3s'
  };
  
  const contentContainerStyle = {
    width: '100%',
    height: '100%',
    overflow: 'auto'
  };
  
  const dimensionTextStyle = {
    marginTop: '16px',
    textAlign: 'center',
    color: '#4b5563'
  };
  
  return (
    <div style={containerStyle}>
      <div style={controlsStyle}>
        <select 
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          style={selectStyle}
        >
          <option value="desktop">Desktop (1280x800)</option>
          <option value="laptop">Laptop (1024x768)</option>
          <option value="tablet">Tablet (768x1024)</option>
          <option value="mobile">Mobile (375x667)</option>
          <option value="mobileSmall">Small Mobile (320x568)</option>
        </select>
        
        <select 
          value={orientation}
          onChange={(e) => setOrientation(e.target.value)}
          style={selectStyle}
          disabled={device === 'desktop' || device === 'laptop'}
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>
      
      <div style={emulatorFrameStyle}>
        <div style={contentContainerStyle}>
          {children}
        </div>
      </div>
      
      <div style={dimensionTextStyle}>
        Current dimensions: {dimensions.width} × {dimensions.height}
      </div>
    </div>
  );
};

// Example usage showing how to include another component inside the emulator
const DeviceEmulationDemo = () => {
  // This could be your actual component you want to test
  const YourComponent = () => (
    <div style={{padding: '16px'}}>
      <h1 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px'}}>
        Your Component Content
      </h1>
      <p>This is your actual component that you want to test in different device sizes.</p>
      {/* Your actual UI content goes here */}
    </div>
  );

  return (
    <DeviceEmulator>
      <YourComponent />
    </DeviceEmulator>
  );
};

export default DeviceEmulator;