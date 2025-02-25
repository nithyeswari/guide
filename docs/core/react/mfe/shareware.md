# State Sharing in Micro Frontends with Webpack Module Federation

This document provides a comprehensive guide to implementing state sharing between shell (container) applications and remote micro frontends using Webpack Module Federation.

## Table of Contents

- [State Management Approaches](#state-management-approaches)
- [Module Federation Setup](#module-federation-setup)
- [Simple State Store](#simple-state-store)
- [Event-Based Communication](#event-based-communication)
- [Redux Implementation](#redux-implementation)
- [Cross-Repository Implementation](#cross-repository-implementation)
- [Additional State Sharing Methods](#additional-state-sharing-methods)
- [Best Practices](#best-practices)

## State Management Approaches

When building micro frontends with Webpack Module Federation, you can choose from several approaches for sharing state:

1. **Centralized Store**: Keep core state in the shell, expose it to remotes
2. **Event-Based Communication**: Use an event bus or custom events for loosely coupled communication
3. **Redux with Dynamic Reducers**: Maintain a single Redux store that remote apps can extend
4. **Shared Package**: Create a dedicated package for state management logic
5. **Global/Window Object**: Use global objects for simple applications (not recommended for production)
6. **URL/Storage-Based**: Leverage localStorage, sessionStorage, or URL parameters

## Module Federation Setup

### Shell (Container) Configuration

```javascript
// webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  // other webpack configs...
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      filename: 'remoteEntry.js',
      remotes: {
        app1: 'app1@http://localhost:3001/remoteEntry.js',
        app2: 'app2@http://localhost:3002/remoteEntry.js'
      },
      exposes: {
        './store': './src/state/store.js',
        './eventBus': './src/utils/eventBus.js'
      },
      shared: ['react', 'react-dom', '@reduxjs/toolkit', 'react-redux']
    })
  ]
};
```

### Remote Application Configuration

```javascript
// webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  // other webpack configs...
  plugins: [
    new ModuleFederationPlugin({
      name: 'app1',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App',
        './Feature': './src/components/Feature'
      },
      shared: ['react', 'react-dom', '@reduxjs/toolkit', 'react-redux']
    })
  ]
};
```

## Simple State Store

### Implementing a Simple Store in Shell

```javascript
// shell/src/state/store.js
export const store = {
  state: {
    user: null,
    theme: 'light',
    notifications: []
  },
  listeners: new Set(),
  
  getState() {
    return this.state;
  },
  
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  },
  
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }
};

export default store;
```

### Consuming from Remote Apps

```javascript
// In remote app
import { useEffect, useState } from 'react';

const RemoteComponent = () => {
  const [store, setStore] = useState(null);
  const [state, setState] = useState({});
  
  useEffect(() => {
    // Dynamically import the shell's store
    import('shell/store').then((module) => {
      const shellStore = module.default;
      setStore(shellStore);
      
      // Initialize with current state
      setState(shellStore.getState());
      
      // Subscribe to changes
      const unsubscribe = shellStore.subscribe((newState) => {
        setState(newState);
      });
      
      return unsubscribe;
    });
  }, []);
  
  const updateTheme = () => {
    if (store) {
      store.setState({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      });
    }
  };
  
  return (
    <div>
      <h2>Remote App</h2>
      <p>Current theme: {state.theme}</p>
      <button onClick={updateTheme}>Toggle Theme</button>
    </div>
  );
};
```

## Event-Based Communication

### Event Bus Implementation

```javascript
// shell/src/utils/eventBus.js
export const eventBus = {
  events: {},
  
  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
    return () => this.off(event, callback);
  },
  
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  },
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
};
```

### Using in Shell and Remote Apps

```javascript
// In shell app
import { eventBus } from './utils/eventBus';

// Listen for events from remotes
eventBus.on('cart:updated', (cartData) => {
  console.log('Cart updated:', cartData);
  updateHeaderCartIcon(cartData.count);
});

// Emit events for remotes
function userLoggedIn(userData) {
  eventBus.emit('user:login', userData);
}
```

```javascript
// In remote app
import { useEffect } from 'react';

const CartFeature = () => {
  useEffect(() => {
    let eventBus;
    
    import('shell/eventBus').then(({ eventBus: eb }) => {
      eventBus = eb;
      
      // Listen for user events
      const userLoginHandler = (userData) => {
        console.log('User logged in:', userData);
        // Update component state
      };
      
      eventBus.on('user:login', userLoginHandler);
      
      return () => {
        eventBus.off('user:login', userLoginHandler);
      };
    });
  }, []);
  
  const addToCart = (product) => {
    import('shell/eventBus').then(({ eventBus }) => {
      // Inform shell and other remotes about cart changes
      eventBus.emit('cart:updated', { 
        count: 5,
        items: [/* cart items */]
      });
    });
  };
  
  return (
    <div>
      <button onClick={() => addToCart({ id: 1, name: 'Product' })}>
        Add to Cart
      </button>
    </div>
  );
};
```

## Redux Implementation

### Setting Up Redux in Shell

```javascript
// shell/src/store/index.js
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import shellReducers from './shellReducers';

// Create a dynamic root reducer
const createRootReducer = (asyncReducers = {}) => {
  return combineReducers({
    ...shellReducers,
    ...asyncReducers
  });
};

// Configure store with injection capability
const store = configureStore({
  reducer: createRootReducer(),
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false
    })
});

// Add ability to inject reducers
store.asyncReducers = {};
store.injectReducer = (key, asyncReducer) => {
  store.asyncReducers[key] = asyncReducer;
  store.replaceReducer(createRootReducer(store.asyncReducers));
  return store;
};

export default store;
```

### Shell Slices and Actions

```javascript
// shell/src/store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false
  },
  reducers: {
    login: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    }
  }
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
```

### Providing Redux Utilities to Remotes

```javascript
// shell/src/store/reduxExports.js
import store from './index';
import { useSelector, useDispatch } from 'react-redux';
import { login, logout } from './slices/authSlice';
import { setTheme } from './slices/uiSlice';

// Export store and helpers
export { 
  store,
  useSelector,
  useDispatch
};

// Export action creators remotes can use
export const actions = {
  auth: { login, logout },
  ui: { setTheme }
};

// Helper for remotes
export const registerReducer = (key, reducer) => {
  return store.injectReducer(key, reducer);
};
```

### Remote App Integration

```javascript
// remote/src/bootstrap.js
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import App from './App';
import remoteReducer from './store/reducer';

const mount = async (el) => {
  // Dynamically load shell's store
  const { store, registerReducer } = await import('shell/redux');
  
  // Register this remote's reducer
  registerReducer('remoteFeature', remoteReducer);
  
  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    el
  );
};

// Mount immediately in development or if in isolation
if (process.env.NODE_ENV === 'development') {
  const devRoot = document.querySelector('#remote-dev-root');
  if (devRoot) {
    mount(devRoot);
  }
}

export { mount };
```

### Accessing Store in Remote Components

```javascript
// remote/src/components/FeatureComponent.js
import React from 'react';
import { remoteActions } from '../store/reducer';

const FeatureComponent = () => {
  // Import from shell
  const { useSelector, useDispatch, actions } = await import('shell/redux');
  const dispatch = useDispatch();
  
  // Access shell state
  const user = useSelector(state => state.auth.user);
  const theme = useSelector(state => state.ui.theme);
  
  // Access remote state
  const items = useSelector(state => state.remoteFeature.items);
  
  const handleLogin = () => {
    dispatch(actions.auth.login({ id: 1, name: 'John' }));
  };
  
  const handleAddItem = () => {
    dispatch(remoteActions.addItem({ id: Date.now(), name: 'New Item' }));
  };
  
  return (
    <div className={theme}>
      {user ? (
        <p>Welcome, {user.name}</p>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
      
      <button onClick={handleAddItem}>Add Item</button>
      
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
};
```

## Cross-Repository Implementation

When shell and remote applications are in separate repositories, you need specialized approaches to handle state sharing and dynamic loading:

### 1. Create a Shared State Package

```
shared-state-package/
├── package.json
├── src/
│   ├── index.js
│   ├── store/
│   │   ├── slices/
│   │   ├── selectors.js
│   │   └── types.js
│   └── utils/
```

```javascript
// shared-state-package/src/index.js
export * from './store/slices/authSlice';
export * from './store/slices/commonSlice';
export * from './store/types';
export * from './utils/storeUtils';
```

```javascript
// shared-state-package/src/utils/storeUtils.js
import { configureStore, combineReducers } from '@reduxjs/toolkit';

export const createInjectableStore = (initialReducers) => {
  const store = configureStore({
    reducer: combineReducers(initialReducers)
  });
  
  store.asyncReducers = {};
  store.injectReducer = (key, asyncReducer) => {
    store.asyncReducers[key] = asyncReducer;
    store.replaceReducer(combineReducers({
      ...initialReducers,
      ...store.asyncReducers
    }));
    return store;
  };
  
  return store;
};
```

### 2. Shell Application Configuration

```javascript
// shell-app/src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import { 
  authReducer, 
  commonReducer, 
  createInjectableStore 
} from 'shared-state-package';

const coreReducers = {
  auth: authReducer,
  common: commonReducer,
  shell: shellReducer // Shell-specific state
};

const store = createInjectableStore(coreReducers);
export default store;
```

### 3. Remote Application Setup

```javascript
// remote-app/src/bootstrap.js
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import App from './App';
import remoteReducer from './store/reducer';

// Mount function that starts up the app
const mount = async (el) => {
  let store;
  
  // In production, use shell's store
  if (process.env.NODE_ENV === 'production') {
    const { default: shellStore } = await import('shell/store');
    shellStore.injectReducer('remoteName', remoteReducer);
    store = shellStore;
  } else {
    // In development, use a local store
    const { default: devStore } = await import('./devStore');
    store = devStore;
  }
  
  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    el
  );
};
```

```javascript
// remote-app/src/devStore.js
import { 
  createInjectableStore, 
  authReducer, 
  commonReducer 
} from 'shared-state-package';
import remoteReducer from './store/reducer';

// Development store with mock data
const devStore = createInjectableStore({
  auth: authReducer,
  common: commonReducer,
  remoteName: remoteReducer
});

// Add mock data
devStore.dispatch({
  type: 'auth/login',
  payload: { id: 'dev-user', name: 'Developer' }
});

export default devStore;
```

### 4. Cross-Repository Loading via JS URLs

When your shell and remote applications are in completely separate repositories with independent deployment pipelines, you'll need to configure the shell to load remotes via dynamic URLs:

#### Shell Configuration for Remote Loading

```javascript
// shell-app/webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  // other webpack config...
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      filename: 'remoteEntry.js',
      remotes: {
        // Empty remotes - will be populated at runtime
      },
      exposes: {
        './store': './src/store/index.js'
      },
      shared: {
        'shared-state-package': { singleton: true, requiredVersion: '^1.0.0' },
        react: { singleton: true },
        'react-dom': { singleton: true },
        '@reduxjs/toolkit': { singleton: true },
        'react-redux': { singleton: true }
      }
    })
  ]
};
```

#### Dynamic Remote Loading in Shell

```javascript
// shell-app/src/utils/remoteLoader.js
const remoteUrls = {
  // These URLs could come from environment variables or a config service
  app1: process.env.REMOTE_APP1_URL || 'http://localhost:3001/remoteEntry.js',
  app2: process.env.REMOTE_APP2_URL || 'http://localhost:3002/remoteEntry.js',
  app3: process.env.REMOTE_APP3_URL || 'http://localhost:3003/remoteEntry.js'
};

// Dynamically load remote entry files
export const loadRemote = (remoteName, moduleName) => {
  return new Promise((resolve, reject) => {
    // Check if the remote is already loaded
    if (window[remoteName]) {
      resolve(window[remoteName].get(moduleName));
      return;
    }

    const remoteUrl = remoteUrls[remoteName];
    if (!remoteUrl) {
      reject(new Error(`Remote ${remoteName} not found in configuration`));
      return;
    }

    // Load the remote entry script
    const script = document.createElement('script');
    script.src = remoteUrl;
    script.onload = () => {
      // Initialize the remote
      const proxy = {
        get: (request) => window[remoteName].get(request),
        init: (arg) => {
          try {
            return window[remoteName].init(arg);
          } catch (e) {
            console.error(`Remote ${remoteName} initialization error:`, e);
            reject(e);
          }
        }
      };
      
      // Initialize the container
      proxy.init(__webpack_share_scopes__.default);
      
      resolve(proxy.get(moduleName));
    };
    
    script.onerror = (error) => {
      console.error(`Error loading remote ${remoteName}:`, error);
      reject(error);
    };
    
    document.head.appendChild(script);
  });
};
```

#### Using Dynamic Remotes in Shell Application

```javascript
// shell-app/src/components/RemoteWrapper.js
import React, { useEffect, useState } from 'react';
import { loadRemote } from '../utils/remoteLoader';
import { Provider } from 'react-redux';
import store from '../store';

const RemoteWrapper = ({ remoteName, moduleName, ...props }) => {
  const [RemoteComponent, setRemoteComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    
    loadRemote(remoteName, `./${moduleName}`)
      .then(component => {
        setRemoteComponent(() => component.default || component);
        setLoading(false);
      })
      .catch(err => {
        console.error(`Failed to load ${remoteName}/${moduleName}:`, err);
        setError(err);
        setLoading(false);
      });
  }, [remoteName, moduleName]);

  if (loading) {
    return <div>Loading {remoteName} application...</div>;
  }

  if (error) {
    return <div>Error loading {remoteName} application.</div>;
  }

  if (!RemoteComponent) {
    return <div>{remoteName} application not available.</div>;
  }

  // Provide the shell's store to the remote component
  return (
    <Provider store={store}>
      <RemoteComponent {...props} />
    </Provider>
  );
};

export default RemoteWrapper;
```

#### Shell App Container Component

```javascript
// shell-app/src/App.js
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import RemoteWrapper from './components/RemoteWrapper';
import Header from './components/Header';
import Home from './pages/Home';

const App = () => {
  return (
    <div>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/app1/*" 
            element={
              <Suspense fallback={<div>Loading App1...</div>}>
                <RemoteWrapper remoteName="app1" moduleName="App" />
              </Suspense>
            } 
          />
          <Route 
            path="/app2/*" 
            element={
              <Suspense fallback={<div>Loading App2...</div>}>
                <RemoteWrapper remoteName="app2" moduleName="App" />
              </Suspense>
            } 
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
```

### 5. Environment Configuration for Different Deployments

To handle different deployment environments:

```javascript
// shell-app/.env.development
REMOTE_APP1_URL=http://localhost:3001/remoteEntry.js
REMOTE_APP2_URL=http://localhost:3002/remoteEntry.js

// shell-app/.env.production
REMOTE_APP1_URL=https://app1.production.example.com/remoteEntry.js
REMOTE_APP2_URL=https://app2.production.example.com/remoteEntry.js

// shell-app/.env.staging
REMOTE_APP1_URL=https://app1.staging.example.com/remoteEntry.js
REMOTE_APP2_URL=https://app2.staging.example.com/remoteEntry.js
```

### 6. Remote Repository Configuration

In the remote app repository, ensure the webpack configuration produces a compatible remote entry file:

```javascript
// remote-app/webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;
const path = require('path');
const deps = require('./package.json').dependencies;

module.exports = {
  entry: './src/index',
  mode: 'development',
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 3001,
    // Enable CORS for cross-origin loading
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  },
  output: {
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.jsx', '.js', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'app1',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App',
        './Feature': './src/components/Feature',
      },
      shared: {
        'shared-state-package': { singleton: true, requiredVersion: '^1.0.0' },
        react: { singleton: true, requiredVersion: deps.react },
        'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
        '@reduxjs/toolkit': { singleton: true, requiredVersion: deps['@reduxjs/toolkit'] },
        'react-redux': { singleton: true, requiredVersion: deps['react-redux'] },
      },
    }),
  ],
};
```

### 7. CI/CD Pipeline Considerations

For production deployment across repositories:

```yaml
# shell-app/.github/workflows/deploy.yml
name: Deploy Shell Application

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          # Point to production remote URLs
          REMOTE_APP1_URL: https://app1.production.example.com/remoteEntry.js
          REMOTE_APP2_URL: https://app2.production.example.com/remoteEntry.js
      
      - name: Deploy
        uses: some-deployment-action@v1
        with:
          # Deployment configuration
          folder: "dist"
          # Other deployment parameters
```

### 8. Versioning and Compatibility

To ensure compatibility between remotely loaded applications:

```javascript
// In shell app load remote function
export const loadRemoteWithVersionCheck = async (remoteName, moduleName) => {
  try {
    // Load the remote entry
    const component = await loadRemote(remoteName, moduleName);
    
    // Check if the remote has a version export
    if (component.version) {
      const remoteVersion = component.version;
      const compatibleVersions = ['1.0.0', '1.1.0', '1.2.0']; // Compatible versions
      
      if (!compatibleVersions.includes(remoteVersion)) {
        console.warn(`Remote ${remoteName} version ${remoteVersion} may not be compatible with shell`);
        // Could trigger a notification to the user
      }
    }
    
    return component;
  } catch (error) {
    console.error(`Failed to load remote ${remoteName}:`, error);
    throw error;
  }
};
```

## Additional State Sharing Methods

### URL/Query Parameters

```javascript
// For all apps
export const urlState = {
  getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },
  
  setParam(name, value) {
    const params = new URLSearchParams(window.location.search);
    params.set(name, value);
    window.history.replaceState(
      {}, '', `${window.location.pathname}?${params}`
    );
  }
};
```

### LocalStorage/SessionStorage

```javascript
export const persistentStore = {
  getState() {
    const state = localStorage.getItem('app-state');
    return state ? JSON.parse(state) : {};
  },
  
  setState(newState) {
    const currentState = this.getState();
    localStorage.setItem('app-state', 
      JSON.stringify({...currentState, ...newState})
    );
    
    // Notify other instances
    window.dispatchEvent(new CustomEvent('storage-updated'));
  }
};
```

### Using RxJS for Reactive State

```javascript
// shared state with RxJS
import { BehaviorSubject } from 'rxjs';

const initialState = {
  user: null,
  theme: 'light'
};

export const state$ = new BehaviorSubject(initialState);

export const stateService = {
  getState: () => state$.getValue(),
  setState: (partialState) => {
    state$.next({...state$.getValue(), ...partialState});
  },
  subscribe: (callback) => {
    const subscription = state$.subscribe(callback);
    return () => subscription.unsubscribe();
  }
};
```

## Best Practices

1. **Define Clear Boundaries**: Determine which state belongs to shell vs. remotes

2. **Version Your Shared State**: Use semantic versioning for shared state interfaces

3. **Error Handling**: Implement proper error handling for async state loading

4. **Performance**: Be mindful of state updates that could trigger cascading renders

5. **Development Experience**: 
   - Ensure remotes can run in standalone mode
   - Create mocks for shell state during development

6. **State Composition**:
   - Shell: Global app state (auth, theme, notifications)
   - Remotes: Feature-specific state only

7. **Security Considerations**:
   - Don't expose sensitive data in shared state
   - Validate state updates from remotes

8. **Testing**:
   - Test remotes with different shell state scenarios
   - Mock Module Federation imports in unit tests

9. **Documentation**:
   - Document the state API contract between shell and remotes
   - Create examples for common state interactions

10. **Deployment Strategy**:
    - Coordinate deployments when shared state contracts change
    - Consider using versioned endpoints for Module Federation