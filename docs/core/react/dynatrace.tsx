// First, add the Dynatrace script to your public/index.html
// Replace {your-environment-id} with your actual Dynatrace environment ID
// Add this in the <head> section:
/*
<script type="text/javascript" src="https://{your-environment-id}.live.dynatrace.com/js/dynatrace.js"></script>
*/

// Create a DynatraceProvider component
import React, { useEffect } from 'react';

const DynatraceProvider = ({ children }) => {
  useEffect(() => {
    // Initialize Dynatrace
    if (window.dtrum) {
      window.dtrum.enable();
      window.dtrum.setCustomerData({
        // Add any custom data you want to track
        app: 'Your React App Name',
        version: '1.0.0'
      });
    }
  }, []);

  return <>{children}</>;
};

// Usage in your App.js or index.js
function App() {
  return (
    <DynatraceProvider>
      {/* Your app components */}
    </DynatraceProvider>
  );
}

// Custom hook for manual tracking
const useDynatrace = () => {
  const logError = (error, componentName) => {
    if (window.dtrum) {
      window.dtrum.reportError({
        message: error.message,
        stack: error.stack,
        type: error.name,
        metadata: {
          component: componentName
        }
      });
    }
  };

  const trackUserAction = (actionName, actionType = 'click') => {
    if (window.dtrum) {
      window.dtrum.enterAction(actionName, actionType);
    }
  };

  const trackCustomEvent = (eventName, values = {}) => {
    if (window.dtrum) {
      window.dtrum.reportCustomEvent(eventName, values);
    }
  };

  return {
    logError,
    trackUserAction,
    trackCustomEvent
  };
};

// Example usage in a component
const ExampleComponent = () => {
  const { trackUserAction, logError, trackCustomEvent } = useDynatrace();

  const handleClick = () => {
    try {
      // Your business logic here
      trackUserAction('Button Clicked');
      trackCustomEvent('user_interaction', {
        action: 'button_click',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logError(error, 'ExampleComponent');
    }
  };

  return (
    <button onClick={handleClick}>
      Track This Click
    </button>
  );
};

// Error Boundary Component with Dynatrace integration
class DynatraceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Report to Dynatrace
    if (window.dtrum) {
      window.dtrum.reportError({
        message: error.message,
        stack: error.stack,
        type: error.name,
        metadata: {
          componentStack: errorInfo.componentStack
        }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export {
  DynatraceProvider,
  useDynatrace,
  DynatraceErrorBoundary,
  ExampleComponent
};
