# Schema-Driven UI Framework with Dynamic Navigation

## Introduction

This schema-driven UI framework enables the creation of dynamic, configurable user interfaces with sophisticated navigation capabilities. By defining your application structure, components, and navigation flows in a declarative schema, you can build flexible, maintainable applications that adapt to user roles, preferences, and runtime conditions.

## Core Features

- **Declarative UI Definition**: Define your entire application in a schema
- **Dynamic Component Rendering**: Render components based on runtime conditions
- **Comprehensive Navigation**: Support for various navigation patterns
- **Role-Based Access Control**: Control visibility and access based on user roles
- **Cross-Platform Compatibility**: Works with JavaScript and Java backends
- **API Integration**: Built-in patterns for API calls and data handling

## Schema Structure

The schema structure defines all aspects of your application:

```javascript
const appSchema = {
  // Dynamic configuration
  dynamicConfig: {
    featureFlags: { /* feature toggles */ },
    environments: { /* environment-specific settings */ }
  },
  
  // Routes definition
  routes: [
    {
      path: "/dashboard",
      label: "Dashboard",
      component: { /* component definition */ },
      accessRoles: ["admin", "user"]
    }
    // Other routes...
  ],
  
  // Modal definitions
  modals: [
    {
      id: "createUser",
      title: "Create User",
      component: "CreateUserForm"
    }
    // Other modals...
  ],
  
  // Component definitions
  components: {
    Dashboard: {
      layout: "MainLayout",
      sections: [
        // Section definitions...
      ]
    }
    // Other components...
  }
}
```

## Navigation Types

The framework supports multiple navigation patterns:

### 1. Route Navigation

Standard URL-based navigation with nested routes:

```javascript
{
  path: "/users",
  label: "Users",
  icon: "UsersIcon",
  component: "UsersPage",
  accessRoles: ["admin"],
  childRoutes: [
    {
      path: "/users/:id",
      label: "User Details",
      component: "UserDetailsPage"
    }
  ]
}
```

### 2. Tab Navigation

In-page tabs for content organization:

```javascript
{
  path: "/settings",
  tabs: [
    {
      id: "general",
      label: "General",
      component: "GeneralSettingsTab",
      default: true
    },
    {
      id: "security",
      label: "Security",
      component: "SecuritySettingsTab"
    }
  ]
}
```

### 3. Wizard Navigation

Step-by-step flows with linear progression:

```javascript
{
  path: "/onboarding",
  wizard: {
    steps: [
      {
        id: "welcome",
        label: "Welcome",
        component: "WelcomeStep",
        nextStep: "profile"
      },
      {
        id: "profile",
        label: "Profile Setup",
        component: "ProfileStep",
        prevStep: "welcome",
        nextStep: "complete"
      }
      // More steps...
    ]
  }
}
```

### 4. Modal Navigation

Dialog-based navigation for focused tasks:

```javascript
{
  id: "createUser",
  title: "Create User",
  component: "CreateUserForm",
  size: "medium"
}
```

### 5. Breadcrumb Navigation

Automatic breadcrumb generation:

```javascript
{
  path: "/users/:id",
  breadcrumb: "User Details",
  paramBreadcrumb: {
    param: "id",
    resolver: "getUserName"
  }
}
```

## Dynamic Rendering

The framework includes a powerful dynamic rendering system:

```javascript
// Dynamic component selection
component: {
  type: "dynamicComponent",
  basedOn: "Dashboard"
}

// Dynamic property
title: {
  type: "template",
  template: "Welcome, {user.name}"
}

// Conditional display
showWhen: [
  { field: "productType", operator: "equals", value: "physical" }
]
```

## API Integration

Built-in API integration patterns:

```javascript
// Button with API call
{
  type: "ApiButton",
  props: {
    actionKey: "processPayment",
    label: "Pay Now",
    params: ["orderId", "paymentData"],
    successNavigation: {
      conditions: [
        {
          when: [{ path: "status", operator: "equals", value: "succeeded" }],
          path: "/orders/{orderId}/confirmation"
        }
      ],
      path: "/orders/{orderId}/status" // Default
    },
    failureNavigation: {
      path: "/payment/error"
    }
  }
}

// Form with API submission
{
  type: "ApiForm",
  props: {
    actionKey: "createUser",
    successMessage: "User created successfully",
    onSuccess: {
      type: "function",
      name: "modal.close"
    }
  }
}
```

## Cross-Platform Compatibility

Guidelines for JavaScript and Java compatibility:

1. Use standard JSON syntax both platforms can parse
2. Avoid JavaScript-specific syntax (functions, regex, undefined)
3. Use declarative conditions instead of functions
4. Define endpoints as patterns instead of function references
5. Use standard template markers like `{user.name}`

Example of compatible schema:

```json
{
  "fields": [
    {
      "type": "text",
      "name": "productName",
      "label": "Product Name",
      "required": true
    },
    {
      "type": "number",
      "name": "weight",
      "label": "Weight (kg)",
      "showWhen": [
        { "field": "productType", "operator": "equals", "value": "physical" }
      ]
    }
  ],
  "api": {
    "endpoints": {
      "load": "/api/products/{id}",
      "validate": "/api/products/validate",
      "submit": "/api/products"
    }
  }
}
```

## Component Architecture

The framework consists of these key components:

1. **Schema Definition**: Central schema that defines all UI aspects
2. **Dynamic Renderer**: Renders components based on schema and conditions
3. **Navigation Manager**: Handles all navigation types
4. **Action Provider**: Manages API calls and actions
5. **Component Registry**: Maps component names to implementations

## Implementation Details

### Core Components Implementation

#### 1. Schema Router

```javascript
// SchemaRouter.js - Router that processes schema-based routes
import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppContext } from './contexts/AppContext';
import { DynamicRenderer } from './DynamicRenderer';
import { appSchema } from './schema';
import { NavigationResolver } from './NavigationResolver';

export const SchemaRouter = () => {
  const context = useContext(AppContext);
  const resolver = new NavigationResolver(context);
  
  // Function to render a route
  const renderRoute = (route) => {
    // Check permissions
    if (route.accessRoles && !route.accessRoles.includes(context.user?.role)) {
      return <Navigate to="/unauthorized" />;
    }
    
    // Resolve dynamic component
    let componentToRender = route.component;
    if (typeof route.component === 'object' && route.component.type === 'dynamicComponent') {
      componentToRender = resolver.resolveDynamicComponent(route.component.basedOn);
    }
    
    // Create component config for dynamic renderer
    const componentConfig = {
      component: componentToRender,
      layout: route.layout || 'Default',
      props: {
        route,
        tabs: route.tabs,
        sections: route.sections
      }
    };
    
    return <DynamicRenderer componentConfig={componentConfig} contextData={context} />;
  };
  
  // Generate routes from schema
  const generateRoutes = (routes) => {
    return routes.map(route => (
      <React.Fragment key={route.path}>
        <Route
          path={route.path}
          exact={route.exact}
          element={renderRoute(route)}
        />
        {route.childRoutes && generateRoutes(route.childRoutes)}
      </React.Fragment>
    ));
  };
  
  return (
    <Routes>
      {generateRoutes(appSchema.routes)}
      <Route path="/unauthorized" element={<div>Unauthorized</div>} />
      <Route path="*" element={<div>Not Found</div>} />
    </Routes>
  );
};
```

#### 2. Dynamic Renderer

```javascript
// DynamicRenderer.js - Renders components based on schema
import React, { Suspense, lazy, useContext } from 'react';
import { ComponentContext } from './contexts/ComponentContext';

// Fallback loading component
const LoadingComponent = () => <div className="loading">Loading...</div>;

export const DynamicRenderer = ({ componentConfig, contextData = {} }) => {
  const { ComponentRegistry, LayoutRegistry } = useContext(ComponentContext);
  
  // Handle string component references
  if (typeof componentConfig === 'string') {
    const Component = ComponentRegistry[componentConfig];
    if (!Component) return <div>Component {componentConfig} not found</div>;
    
    return (
      <Suspense fallback={<LoadingComponent />}>
        <Component />
      </Suspense>
    );
  }
  
  // Handle component config objects
  if (componentConfig && typeof componentConfig === 'object') {
    const Component = ComponentRegistry[componentConfig.component];
    if (!Component) return <div>Component {componentConfig.component} not found</div>;
    
    // Get the layout if specified
    const Layout = componentConfig.layout ? 
      LayoutRegistry[componentConfig.layout] : 
      React.Fragment;
    
    // Process props, resolving any dynamic values
    const resolvedProps = resolveProps(componentConfig.props || {}, contextData);
    
    return (
      <Suspense fallback={<LoadingComponent />}>
        <Layout>
          <Component {...resolvedProps}>
            {componentConfig.children && componentConfig.children.map((child, index) => (
              <DynamicRenderer 
                key={`child-${index}`}
                componentConfig={child}
                contextData={contextData}
              />
            ))}
          </Component>
        </Layout>
      </Suspense>
    );
  }
  
  return null;
};

// Helper to resolve dynamic props
function resolveProps(props, context) {
  const result = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'object' && value !== null && value.type === 'dynamic') {
      // Dynamic prop, resolve from context
      result[key] = getValueByPath(context, value.path);
    } else if (typeof value === 'object' && value !== null && value.type === 'template') {
      // Template string with variables
      result[key] = interpolateTemplate(value.template, context);
    } else if (typeof value === 'object' && value !== null && value.type === 'function') {
      // Function reference
      result[key] = (...args) => {
        const func = getValueByPath(context, value.name);
        if (typeof func === 'function') {
          return func(...(value.params || []), ...args);
        }
      };
    } else if (typeof value === 'object' && value !== null) {
      // Recursively resolve nested props
      result[key] = resolveProps(value, context);
    } else {
      // Static prop
      result[key] = value;
    }
  }
  
  return result;
}

// Helper to get value by dot-notation path
function getValueByPath(obj, path) {
  if (!path) return undefined;
  const parts = path.split('.');
  let value = obj;
  
  for (const part of parts) {
    if (value === undefined || value === null) return undefined;
    value = value[part];
  }
  
  return value;
}

// Helper to process template strings
function interpolateTemplate(template, context) {
  if (typeof template !== 'string') return template;
  
  return template.replace(/{([^}]+)}/g, (match, path) => {
    const value = getValueByPath(context, path.trim());
    return value !== undefined ? value : '';
  });
}
```

#### 3. NavigationManager

```javascript
// NavigationManager.js - Handles navigation context and actions
import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { AppContext } from './contexts/AppContext';
import { appSchema } from './schema';

export const NavigationContext = React.createContext({});

export const NavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const appContext = useContext(AppContext);
  
  // Navigation state
  const [activeTab, setActiveTab] = useState(null);
  const [activeModals, setActiveModals] = useState([]);
  const [activeSidePanel, setActiveSidePanel] = useState(null);
  const [wizardState, setWizardState] = useState({ currentStep: null, data: {} });
  
  // Find the current route
  const findCurrentRoute = (routes, pathname = location.pathname) => {
    for (const route of routes) {
      // Simple path matching (in practice, use more sophisticated matching)
      if (route.path === pathname) {
        return route;
      }
      if (route.childRoutes) {
        const childRoute = findCurrentRoute(route.childRoutes, pathname);
        if (childRoute) return childRoute;
      }
    }
    return null;
  };
  
  const currentRoute = findCurrentRoute(appSchema.routes);
  
  // Tab navigation
  const navigateToTab = (tabId) => {
    setActiveTab(tabId);
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('tab', tabId);
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
  };
  
  // Modal management
  const openModal = (modalId, props = {}) => {
    setActiveModals(prev => [...prev, { id: modalId, props }]);
  };
  
  const closeModal = (modalId) => {
    setActiveModals(prev => prev.filter(modal => modal.id !== modalId));
  };
  
  // Side panel management
  const openSidePanel = (panelId, props = {}) => {
    setActiveSidePanel({ id: panelId, props });
  };
  
  const closeSidePanel = () => {
    setActiveSidePanel(null);
  };
  
  // Wizard navigation
  const startWizard = (wizardId, initialData = {}) => {
    const wizard = appSchema.routes.find(r => r.path === `/${wizardId}`)?.wizard;
    if (!wizard) return;
    
    const firstStep = wizard.steps[0];
    setWizardState({
      currentStep: firstStep.id,
      data: initialData
    });
    
    navigate(`/${wizardId}?step=${firstStep.id}`);
  };
  
  const navigateWizard = (direction) => {
    if (!currentRoute?.wizard) return;
    
    const currentStepObj = currentRoute.wizard.steps.find(
      step => step.id === wizardState.currentStep
    );
    
    const nextStepId = direction === 'next' ? 
      currentStepObj.nextStep : currentStepObj.prevStep;
      
    if (nextStepId) {
      setWizardState(prev => ({ ...prev, currentStep: nextStepId }));
      
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('step', nextStepId);
      navigate(`${location.pathname}?${searchParams.toString()}`);
    }
  };
  
  // Custom navigation based on API responses
  const navigateByApiResponse = (response, navigationConfig) => {
    if (!navigationConfig) return;
    
    // Process conditions if any
    if (navigationConfig.conditions) {
      for (const condition of navigationConfig.conditions) {
        const matches = evaluateConditions(condition.when, response);
        if (matches) {
          // Process template path
          const processedPath = processTemplatePath(condition.path, response);
          navigate(processedPath, { state: condition.state || response });
          return;
        }
      }
    }
    
    // Default path if no conditions or no matches
    if (navigationConfig.path) {
      const processedPath = processTemplatePath(navigationConfig.path, response);
      navigate(processedPath, { state: navigationConfig.state || response });
    }
  };
  
  // Helper to process template paths
  const processTemplatePath = (path, data) => {
    return path.replace(/{([^}]+)}/g, (match, key) => {
      const value = getValueByPath(data, key);
      return value !== undefined ? value : '';
    });
  };
  
  // Helper to evaluate conditions
  const evaluateConditions = (conditions, data) => {
    if (!conditions || !Array.isArray(conditions)) return true;
    
    return conditions.every(condition => {
      const actualValue = getValueByPath(data, condition.path);
      
      switch (condition.operator) {
        case 'equals': return actualValue === condition.value;
        case 'notEquals': return actualValue !== condition.value;
        // Other operators...
        default: return false;
      }
    });
  };
  
  // Helper to get value by path
  const getValueByPath = (obj, path) => {
    if (!path) return undefined;
    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }
    
    return value;
  };
  
  // Create navigation context value
  const navigationContextValue = {
    currentRoute,
    activeTab,
    activeModals,
    activeSidePanel,
    wizardState,
    
    // Navigation methods
    navigateToTab,
    openModal,
    closeModal,
    openSidePanel,
    closeSidePanel,
    startWizard,
    navigateWizard,
    navigateByApiResponse
  };
  
  return (
    <NavigationContext.Provider value={navigationContextValue}>
      {children}
    </NavigationContext.Provider>
  );
};
```

#### 4. API Button Component

```javascript
// ApiButton.js - Button component with API integration
import React, { useContext } from 'react';
import { NavigationContext } from '../contexts/NavigationContext';
import { ActionContext } from '../contexts/ActionContext';

export const ApiButton = ({
  actionKey,       // Action to perform
  params = [],     // Parameters for the action
  label,           // Button text
  loadingText = "Loading...",
  
  // Navigation options
  successNavigation,
  failureNavigation,
  
  // Callbacks
  onSuccess,
  onError,
  
  // Button styling
  variant = 'primary',
  className,
  disabled,
  ...buttonProps
}) => {
  const { navigateByApiResponse } = useContext(NavigationContext);
  const { actions, loading, errors } = useContext(ActionContext);
  
  // Get loading state
  const isLoading = loading[actionKey];
  const error = errors[actionKey];
  
  // Get the action function
  const actionFn = actionKey.split('.').reduce((obj, key) => obj?.[key], actions);
  
  if (!actionFn) {
    console.error(`Action "${actionKey}" not found`);
    return null;
  }
  
  const handleClick = async () => {
    try {
      const response = await actionFn(...params);
      
      // Handle success callback
      if (onSuccess) {
        onSuccess(response);
      }
      
      // Handle navigation
      if (successNavigation) {
        navigateByApiResponse(response, successNavigation);
      }
      
    } catch (error) {
      // Handle error callback
      if (onError) {
        onError(error);
      }
      
      // Handle error navigation
      if (failureNavigation) {
        navigateByApiResponse(error, failureNavigation);
      }
    }
  };
  
  return (
    <>
      <button
        className={`btn btn-${variant} ${className || ''}`}
        onClick={handleClick}
        disabled={disabled || isLoading}
        {...buttonProps}
      >
        {isLoading ? loadingText : label}
      </button>
      {error && <div className="error-message">{error}</div>}
    </>
  );
};
```

### Full Application Setup

```javascript
// App.js - Main application setup
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { ActionProvider } from './contexts/ActionContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { ComponentProvider } from './contexts/ComponentContext';
import { SchemaRouter } from './SchemaRouter';
import { ModalContainer } from './components/ModalContainer';
import { SidePanelContainer } from './components/SidePanelContainer';
import { Navigation } from './components/Navigation';

const App = () => {
  return (
    <BrowserRouter>
      <AppProvider>
        <ActionProvider>
          <ComponentProvider>
            <NavigationProvider>
              <div className="app-container">
                <Navigation />
                <main className="content">
                  <SchemaRouter />
                </main>
                <ModalContainer />
                <SidePanelContainer />
              </div>
            </NavigationProvider>
          </ComponentProvider>
        </ActionProvider>
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;
```

## Best Practices

1. **Schema Organization**: Keep schema modular with separate files for routes, components, etc.
2. **Validation**: Validate schema structure with JSON Schema
3. **Performance**: Use lazy loading and code splitting for large applications
4. **Testing**: Test schema processors with consistent inputs
5. **Documentation**: Document schema structure and expected values
6. **Versioning**: Include version information in your schema for evolution

### Code Organization

Organize your code following this structure for better maintainability:

```
src/
├── schema/                  # Schema definitions
│   ├── index.js             # Main schema export
│   ├── routes.js            # Route definitions
│   ├── components.js        # Component definitions 
│   ├── modals.js            # Modal definitions
│   └── navigation.js        # Navigation configuration
│
├── components/              # React components
│   ├── common/              # Shared components
│   ├── layouts/             # Layout components
│   ├── pages/               # Page components
│   ├── forms/               # Form components
│   └── navigation/          # Navigation components
│
├── contexts/                # React contexts
│   ├── AppContext.js        # Application state
│   ├── ActionContext.js     # API actions
│   ├── NavigationContext.js # Navigation state
│   └── ComponentContext.js  # Component registry
│
├── services/                # Services
│   ├── apiService.js        # API client
│   ├── authService.js       # Authentication
│   └── schemaService.js     # Schema processing
│
├── utils/                   # Utilities
│   ├── schemaUtils.js       # Schema helpers
│   ├── navigationUtils.js   # Navigation helpers
│   └── apiUtils.js          # API helpers
│
└── core/                    # Core framework
    ├── DynamicRenderer.js   # Dynamic rendering
    ├── SchemaRouter.js      # Schema-based routing
    ├── NavigationManager.js # Navigation management
    └── ComponentRegistry.js # Component registration
```

## Advanced Usage

### Feature Flagging

```javascript
{
  path: "/beta-feature",
  showInNav: {
    type: "dynamic",
    path: "featureFlags.enableBetaFeature"
  }
}
```

#### Implementation

```javascript
// FeatureFlagProvider.js
import React, { createContext, useState, useEffect } from 'react';

export const FeatureFlagContext = createContext({});

export const FeatureFlagProvider = ({ children }) => {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchFlags = async () => {
      try {
        // Fetch flags from API or local storage
        const response = await fetch('/api/feature-flags');
        const data = await response.json();
        setFlags(data);
      } catch (error) {
        console.error('Failed to fetch feature flags:', error);
        // Use defaults
        setFlags({
          enableBetaFeature: false,
          enableNewUI: false
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchFlags();
  }, []);
  
  // Method to update a flag
  const setFlag = (name, value) => {
    setFlags(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  return (
    <FeatureFlagContext.Provider value={{ flags, setFlag, loading }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};
```

### A/B Testing

```javascript
{
  component: {
    type: "dynamicComponent",
    resolver: "getExperimentVariant"
  }
}
```

#### Implementation

```javascript
// ExperimentService.js
class ExperimentService {
  constructor() {
    this.experiments = {};
    this.userVariants = {};
  }
  
  // Initialize experiments
  init(experiments) {
    this.experiments = experiments;
    
    // Assign user to variants
    Object.keys(experiments).forEach(expId => {
      const experiment = experiments[expId];
      const variants = experiment.variants;
      
      // Simple random assignment
      const randomIndex = Math.floor(Math.random() * variants.length);
      this.userVariants[expId] = variants[randomIndex].id;
    });
  }
  
  // Get variant for user
  getVariant(experimentId) {
    return this.userVariants[experimentId] || null;
  }
  
  // Get component for experiment
  getExperimentComponent(experimentId, defaultComponent) {
    const variantId = this.getVariant(experimentId);
    if (!variantId) return defaultComponent;
    
    const experiment = this.experiments[experimentId];
    if (!experiment) return defaultComponent;
    
    const variant = experiment.variants.find(v => v.id === variantId);
    return variant?.component || defaultComponent;
  }
}

export const experimentService = new ExperimentService();

// Initialize with experiments
experimentService.init({
  'homepage-design': {
    name: 'Homepage Design Test',
    variants: [
      { id: 'control', component: 'StandardHomepage' },
      { id: 'variant-a', component: 'NewHomepage' }
    ]
  }
});
```

### Multi-Tenant Configuration

```javascript
{
  sections: {
    type: "dynamic",
    resolver: "getTenantSections"
  }
}
```

#### Implementation

```javascript
// TenantContext.js
import React, { createContext, useState, useEffect } from 'react';

export const TenantContext = createContext({});

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTenant = async () => {
      try {
        // Get tenant ID from subdomain or other source
        const tenantId = window.location.hostname.split('.')[0];
        
        // Fetch tenant configuration
        const response = await fetch(`/api/tenants/${tenantId}`);
        const data = await response.json();
        
        setTenant(data);
      } catch (error) {
        console.error('Failed to fetch tenant:', error);
        setTenant(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTenant();
  }, []);
  
  // Tenant-specific section resolver
  const getTenantSections = (sectionType) => {
    if (!tenant) return [];
    
    // Get base sections for this type
    const baseSections = tenant.sections[sectionType] || [];
    
    // Apply tenant customizations
    return baseSections.map(section => ({
      ...section,
      // Apply tenant theme
      theme: tenant.theme,
      // Apply tenant branding
      branding: tenant.branding
    }));
  };
  
  return (
    <TenantContext.Provider value={{ 
      tenant, 
      loading,
      getTenantSections
    }}>
      {children}
    </TenantContext.Provider>
  );
};
```

### Real-time Configuration Updates

Implement real-time updates to schema configuration:

```javascript
// ConfigService.js
import { Subject } from 'rxjs';

class ConfigService {
  constructor() {
    this.config = {};
    this.configUpdates = new Subject();
  }
  
  async initialize() {
    // Load initial config
    const response = await fetch('/api/config');
    this.config = await response.json();
    
    // Set up WebSocket for real-time updates
    this.setupRealtimeUpdates();
    
    return this.config;
  }
  
  setupRealtimeUpdates() {
    const ws = new WebSocket('wss://api.example.com/config-updates');
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      // Update config
      this.config = {
        ...this.config,
        ...update
      };
      
      // Notify subscribers
      this.configUpdates.next(this.config);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Reconnect logic
      setTimeout(() => this.setupRealtimeUpdates(), 5000);
    };
  }
  
  // Subscribe to config updates
  onConfigUpdate(callback) {
    return this.configUpdates.subscribe(callback);
  }
}

export const configService = new ConfigService();
```

## Conclusion

This schema-driven UI framework provides a powerful, flexible approach to building complex applications with sophisticated navigation. By separating your application structure from implementation details, you can create more maintainable, adaptable applications that evolve with your business needs.