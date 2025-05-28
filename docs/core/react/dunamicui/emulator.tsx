import React, { useState, createContext, useContext } from 'react';

// Create Design System Context
const DesignSystemContext = createContext();

// Design System Provider
const DesignSystemProvider = ({ children, theme = 'light' }) => {
  const [currentTheme, setCurrentTheme] = useState(theme);
  
  // Define design tokens
  const lightTokens = {
    colors: {
      primary: '#0066cc',
      secondary: '#6c757d',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#212529',
      textSecondary: '#6c757d',
      border: '#dee2e6',
      error: '#dc3545',
      success: '#28a745',
      warning: '#ffc107'
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      fontSize: {
        base: '16px',  // Base font size
        small: '0.875rem',
        large: '1.25rem',
        xl: '1.5rem',
        xxl: '2rem'
      },
      fontWeight: {
        regular: 400,
        medium: 500,
        bold: 700
      },
      lineHeight: {
        tight: 1.2,
        normal: 1.5,
        loose: 1.8
      }
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem'
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '1rem',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 3px rgba(0,0,0,0.12)',
      md: '0 4px 6px rgba(0,0,0,0.1)',
      lg: '0 10px 15px -3px rgba(0,0,0,0.1)'
    }
  };
  
  // Create dark tokens based on light tokens
  const darkTokens = {
    colors: {
      primary: '#4d9fff',
      secondary: '#a1a8ae',
      background: '#121212',
      surface: '#1e1e1e',
      text: '#e9ecef',
      textSecondary: '#adb5bd',
      border: '#343a40',
      error: '#f56565',
      success: '#48bb78',
      warning: '#f6ad55'
    },
    // Copy the other token categories from light theme
    typography: { ...lightTokens.typography },
    spacing: { ...lightTokens.spacing },
    borderRadius: { ...lightTokens.borderRadius },
    shadows: { ...lightTokens.shadows }
  };
  
  // Combine into the tokens object
  const tokens = {
    light: lightTokens,
    dark: darkTokens
  };
  
  // Get the current theme tokens
  const currentTokens = tokens[currentTheme];
  
  // Create a value object to be provided to consumers
  const value = {
    theme: currentTheme,
    setTheme: setCurrentTheme,
    tokens: currentTokens
  };
  
  return (
    <DesignSystemContext.Provider value={value}>
      {children}
    </DesignSystemContext.Provider>
  );
};

// Custom hook to use the design system
const useDesignSystem = () => {
  const context = useContext(DesignSystemContext);
  if (context === undefined) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return context;
};

// Button component using design system tokens
const Button = ({ children, variant = 'primary', size = 'medium', ...props }) => {
  const { tokens } = useDesignSystem();
  
  // Define styles based on variant
  const variantStyles = {
    primary: {
      backgroundColor: tokens.colors.primary,
      color: '#ffffff',
      border: 'none'
    },
    secondary: {
      backgroundColor: tokens.colors.secondary,
      color: '#ffffff',
      border: 'none'
    },
    outline: {
      backgroundColor: 'transparent',
      color: tokens.colors.primary,
      border: `1px solid ${tokens.colors.primary}`
    },
    text: {
      backgroundColor: 'transparent',
      color: tokens.colors.primary,
      border: 'none'
    }
  };
  
  // Define styles based on size
  const sizeStyles = {
    small: {
      padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
      fontSize: tokens.typography.fontSize.small
    },
    medium: {
      padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
      fontSize: tokens.typography.fontSize.base
    },
    large: {
      padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
      fontSize: tokens.typography.fontSize.large
    }
  };
  
  // Combine all styles
  const buttonStyle = {
    fontFamily: tokens.typography.fontFamily,
    fontWeight: tokens.typography.fontWeight.medium,
    borderRadius: tokens.borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ...variantStyles[variant],
    ...sizeStyles[size]
  };
  
  return (
    <button style={buttonStyle} {...props}>
      {children}
    </button>
  );
};

// Text component using design system tokens
const Text = ({ children, variant = 'body', color = 'text', ...props }) => {
  const { tokens } = useDesignSystem();
  
  // Define styles based on variant
  const variantStyles = {
    h1: {
      fontSize: tokens.typography.fontSize.xxl,
      fontWeight: tokens.typography.fontWeight.bold,
      lineHeight: tokens.typography.lineHeight.tight,
      margin: `${tokens.spacing.lg} 0 ${tokens.spacing.md}`
    },
    h2: {
      fontSize: tokens.typography.fontSize.xl,
      fontWeight: tokens.typography.fontWeight.bold,
      lineHeight: tokens.typography.lineHeight.tight,
      margin: `${tokens.spacing.md} 0 ${tokens.spacing.sm}`
    },
    h3: {
      fontSize: tokens.typography.fontSize.large,
      fontWeight: tokens.typography.fontWeight.medium,
      lineHeight: tokens.typography.lineHeight.tight,
      margin: `${tokens.spacing.sm} 0 ${tokens.spacing.xs}`
    },
    body: {
      fontSize: tokens.typography.fontSize.base,
      fontWeight: tokens.typography.fontWeight.regular,
      lineHeight: tokens.typography.lineHeight.normal,
      margin: `${tokens.spacing.xs} 0`
    },
    small: {
      fontSize: tokens.typography.fontSize.small,
      fontWeight: tokens.typography.fontWeight.regular,
      lineHeight: tokens.typography.lineHeight.normal,
      margin: `${tokens.spacing.xs} 0`
    }
  };
  
  // Combine all styles
  const textStyle = {
    fontFamily: tokens.typography.fontFamily,
    color: tokens.colors[color],
    ...variantStyles[variant]
  };
  
  return (
    <div style={textStyle} {...props}>
      {children}
    </div>
  );
};

// Card component using design system tokens
const Card = ({ children, padding = 'md', ...props }) => {
  const { tokens } = useDesignSystem();
  
  const cardStyle = {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.borderRadius.md,
    boxShadow: tokens.shadows.md,
    padding: tokens.spacing[padding],
    border: `1px solid ${tokens.colors.border}`
  };
  
  return (
    <div style={cardStyle} {...props}>
      {children}
    </div>
  );
};

// Device Emulator (from previous implementation)
const DeviceEmulator = ({ children, scaleFonts = true }) => {
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
  
  // Use fixed font sizes based on device type
  let fontSize;
  if (device.includes('mobile')) {
    fontSize = '14px'; // Smaller text on mobile
  } else if (device === 'tablet') {
    fontSize = '16px'; // Medium text on tablet
  } else {
    fontSize = '18px'; // Larger text on desktop/laptop
  }
  
  const contentContainerStyle = {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    fontSize: scaleFonts ? fontSize : 'inherit',
    // Add text scaling properties
    textSizeAdjust: scaleFonts ? '100%' : 'none',
    // Force proper text rendering
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale'
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

// Demo of the Design System with Device Emulator
const DesignSystemDemo = () => {
  const [theme, setTheme] = useState('light');
  
  // Create a sample application using design system components
  const SampleApp = () => {
    const { tokens, theme, setTheme } = useDesignSystem();
    
    const containerStyle = {
      padding: tokens.spacing.lg,
      backgroundColor: tokens.colors.background,
      color: tokens.colors.text,
      minHeight: '100vh'
    };
    
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.lg }}>
          <Text variant="h2">My App</Text>
          <Button 
            variant="outline" 
            size="small"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode
          </Button>
        </div>
        
        <Card>
          <Text variant="h3">Welcome to the Design System</Text>
          <Text variant="body">
            This is a demonstration of how components adapt to different screen sizes while
            maintaining consistent design language.
          </Text>
          <div style={{ 
            display: 'flex', 
            gap: tokens.spacing.md,
            flexDirection: 'column',
            marginTop: tokens.spacing.lg
          }}>
            <Button>Primary Action</Button>
            <Button variant="secondary">Secondary Action</Button>
            <Button variant="outline">Tertiary Action</Button>
          </div>
        </Card>
        
        <div style={{ marginTop: tokens.spacing.lg }}>
          <Text variant="h3">Typography</Text>
          <div style={{ marginTop: tokens.spacing.md }}>
            <Text variant="h1">Heading 1</Text>
            <Text variant="h2">Heading 2</Text>
            <Text variant="h3">Heading 3</Text>
            <Text variant="body">
              Body text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
              Vivamus lacinia odio vitae vestibulum.
            </Text>
            <Text variant="small" color="textSecondary">
              Small text for captions or auxiliary information.
            </Text>
          </div>
        </div>
        
        <div style={{ 
          marginTop: tokens.spacing.xl,
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: tokens.spacing.md
        }}>
          {['Primary', 'Secondary', 'Success'].map((type, index) => (
            <Card key={index}>
              <Text variant="h3">{type} Card</Text>
              <Text variant="body">Card content that adapts to the design system.</Text>
              <div style={{ marginTop: tokens.spacing.md }}>
                <Button variant={type.toLowerCase()}>Action</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Switch to {theme === 'light' ? 'Dark' : 'Light'} Theme
        </button>
      </div>
      
      <DeviceEmulator scaleFonts={true}>
        <DesignSystemProvider theme={theme}>
          <SampleApp />
        </DesignSystemProvider>
      </DeviceEmulator>
    </div>
  );
};

export default DesignSystemDemo;
