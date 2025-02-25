import React, { useState, useEffect } from 'react';

const MobileDesktopViewer = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(375); // Default iPhone viewport width
  const [viewportHeight, setViewportHeight] = useState(667); // Default iPhone viewport height
  const [deviceType, setDeviceType] = useState('iphone'); // Default device
  const [renderedContent, setRenderedContent] = useState(null);

  // Styles
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '4xl',
      margin: '0 auto',
      padding: '16px'
    },
    heading: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '16px'
    },
    form: {
      width: '100%',
      marginBottom: '24px'
    },
    inputContainer: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%'
    },
    input: {
      flexGrow: 1,
      padding: '8px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      marginBottom: '8px'
    },
    button: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '8px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer'
    },
    buttonHover: {
      backgroundColor: '#2563eb'
    },
    buttonDisabled: {
      opacity: 0.7,
      cursor: 'not-allowed'
    },
    deviceSection: {
      width: '100%',
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'semibold',
      marginBottom: '8px'
    },
    deviceButtonsContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px'
    },
    deviceButton: (isActive) => ({
      padding: '4px 12px',
      fontSize: '14px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: isActive ? '#3b82f6' : '#e5e7eb',
      color: isActive ? 'white' : 'black'
    }),
    dimensionsContainer: {
      marginTop: '16px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px'
    },
    dimensionGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 'medium',
      marginBottom: '4px'
    },
    numberInput: {
      marginTop: '4px',
      padding: '4px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      width: '96px'
    },
    viewportContainer: {
      position: 'relative',
      width: '100%'
    },
    viewportInfo: {
      marginBottom: '8px',
      fontSize: '14px',
      color: '#4b5563'
    },
    viewportFrame: {
      margin: '0 auto',
      border: '4px solid #1f2937',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: 'white',
      maxWidth: '100%',
      maxHeight: '80vh',
      resize: 'both',
      transition: 'width 0.3s, height 0.3s',
      overflow: 'auto'
    },
    placeholderContainer: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    },
    placeholderText: {
      fontSize: '18px',
      color: '#6b7280'
    },
    loadingContainer: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    },
    loadingText: {
      fontSize: '18px'
    },
    noteText: {
      marginTop: '16px',
      fontSize: '14px',
      color: '#6b7280'
    },
    contentContainer: {
      padding: '16px',
      backgroundColor: 'white'
    },
    contentHeading: {
      fontSize: '20px',
      fontWeight: 'bold'
    },
    contentParagraph: {
      marginTop: '8px'
    },
    contentList: {
      listStyleType: 'disc',
      marginLeft: '24px',
      marginTop: '8px'
    },
    contentListItem: {
      margin: '4px 0'
    },
    infoBox: {
      marginTop: '16px',
      padding: '12px',
      backgroundColor: '#f3f4f6',
      borderRadius: '4px'
    },
    alternativeBox: {
      marginTop: '16px',
      padding: '12px',
      backgroundColor: '#e0f2fe',
      borderRadius: '4px'
    }
  };

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
    fetchWebsiteContent(processedUrl);
  };

  // Fetch website content using a proxy or WebView approach
  const fetchWebsiteContent = async (targetUrl) => {
    setIsLoading(true);
    
    try {
      // Option 1: Use a server-side proxy (would need to be implemented)
      // const response = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
      // const data = await response.text();
      // setRenderedContent(data);
      
      // For demo purposes, we'll simulate a response
      setTimeout(() => {
        setRenderedContent(
          <div style={styles.contentContainer}>
            <h2 style={styles.contentHeading}>Content from: {targetUrl}</h2>
            <p style={styles.contentParagraph}>
              In a real implementation, you would need to use one of these approaches:
            </p>
            <ul style={styles.contentList}>
              <li style={styles.contentListItem}>Server-side proxy that fetches and returns the website content</li>
              <li style={styles.contentListItem}>WebView component (React Native or platform-specific)</li>
              <li style={styles.contentListItem}>Embed using an SDK from the target website if available</li>
            </ul>
            <div style={styles.infoBox}>
              <p style={{fontWeight: 'semibold'}}>Implementation details:</p>
              <p style={{marginTop: '4px'}}>For a complete solution without iframes, you would need:</p>
              <ol style={{...styles.contentList, listStyleType: 'decimal'}}>
                <li style={styles.contentListItem}>A server-side proxy to fetch content and handle CORS</li>
                <li style={styles.contentListItem}>CSS sandboxing to prevent style conflicts</li>
                <li style={styles.contentListItem}>Script sandboxing for security</li>
                <li style={styles.contentListItem}>Viewport emulation via CSS and meta tags</li>
              </ol>
            </div>
            
            <div style={styles.alternativeBox}>
              <p style={{fontWeight: 'semibold'}}>Alternative approaches:</p>
              <ul style={styles.contentList}>
                <li style={styles.contentListItem}>In React Native: Use the WebView component</li>
                <li style={styles.contentListItem}>For PWAs: Use the browser's responsive design mode</li>
                <li style={styles.contentListItem}>Mobile device testing: Consider Browserstack or similar services</li>
              </ul>
            </div>
          </div>
        );
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error("Error fetching content:", error);
      setRenderedContent(<div>Error loading content. Please try again.</div>);
      setIsLoading(false);
    }
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

  // Media query for responsive layout
  useEffect(() => {
    const handleResize = () => {
      const isWideScreen = window.innerWidth >= 768;
      
      // Update styles for responsive layout
      setStyles(prev => ({
        ...prev,
        inputContainer: {
          ...prev.inputContainer,
          flexDirection: isWideScreen ? 'row' : 'column'
        },
        input: {
          ...prev.input,
          marginBottom: isWideScreen ? 0 : '8px',
          marginRight: isWideScreen ? '8px' : 0
        }
      }));
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Mobile Desktop URL Viewer</h1>
      
      {/* URL Input Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="Enter website URL (e.g. example.com)"
            style={styles.input}
          />
          <button 
            type="submit"
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {})
            }}
            disabled={isLoading}
            onMouseOver={(e) => {
              if (!isLoading) e.target.style.backgroundColor = styles.buttonHover.backgroundColor;
            }}
            onMouseOut={(e) => {
              if (!isLoading) e.target.style.backgroundColor = styles.button.backgroundColor;
            }}
          >
            {isLoading ? 'Loading...' : 'View'}
          </button>
        </div>
      </form>
      
      {/* Device Selection */}
      <div style={styles.deviceSection}>
        <h2 style={styles.sectionTitle}>Select Device</h2>
        <div style={styles.deviceButtonsContainer}>
          {Object.keys(devicePresets).map((device) => (
            <button
              key={device}
              onClick={() => applyDevicePreset(device)}
              style={styles.deviceButton(deviceType === device)}
              onMouseOver={(e) => {
                if (deviceType !== device) e.target.style.backgroundColor = '#d1d5db';
              }}
              onMouseOut={(e) => {
                if (deviceType !== device) e.target.style.backgroundColor = '#e5e7eb';
              }}
            >
              {devicePresets[device].name}
            </button>
          ))}
        </div>
        
        {/* Custom Dimensions */}
        <div style={styles.dimensionsContainer}>
          <div style={styles.dimensionGroup}>
            <label style={styles.label}>Width (px)</label>
            <input
              type="number"
              value={viewportWidth}
              onChange={handleWidthChange}
              style={styles.numberInput}
              min="200"
            />
          </div>
          <div style={styles.dimensionGroup}>
            <label style={styles.label}>Height (px)</label>
            <input
              type="number"
              value={viewportHeight}
              onChange={handleHeightChange}
              style={styles.numberInput}
              min="300"
            />
          </div>
        </div>
      </div>
      
      {/* Content container */}
      <div style={styles.viewportContainer}>
        <div style={styles.viewportInfo}>
          Viewing at: {viewportWidth} × {viewportHeight}px
        </div>
        
        <div 
          style={{
            ...styles.viewportFrame,
            width: `${viewportWidth}px`,
            height: `${viewportHeight}px`,
          }}
        >
          {url ? (
            <div style={{width: '100%', height: '100%'}}>
              {isLoading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.loadingText}>Loading...</div>
                </div>
              ) : (
                <div style={{width: '100%', height: '100%'}}>
                  {renderedContent}
                </div>
              )}
            </div>
          ) : (
            <div style={styles.placeholderContainer}>
              <div style={styles.placeholderText}>Enter a URL to preview</div>
            </div>
          )}
        </div>
        
        <div style={styles.noteText}>
          <p>Note: This implementation requires a server-side proxy to fetch and render content from external websites.</p>
          <p style={{marginTop: '4px'}}>For React Native applications, consider using the WebView component instead.</p>
        </div>
      </div>
    </div>
  );
};

export default MobileDesktopViewer;