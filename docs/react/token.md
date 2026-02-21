# Secure Token Management in React/Redux Applications

## Overview
This document outlines industry best practices for securely storing and handling authentication tokens in React applications using Redux, particularly when tokens must be included in all API requests through an API gateway like Apigee.

## Challenge
When building SPAs that communicate with protected APIs, you need to:
1. Store authentication tokens securely
2. Prevent token exposure via Redux DevTools or browser inspection
3. Include tokens in all API requests
4. Protect against XSS and other client-side attacks

## Industry Approaches

### 1. Memory-Only Token Storage
**Used by:** Auth0 SPA SDK, AWS Amplify, many enterprise applications

```javascript
// auth/slice.js
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: null,
    isAuthenticated: false
  },
  reducers: {
    setCredentials: (state, action) => {
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    clearCredentials: (state) => {
      state.token = null;
      state.isAuthenticated = false;
    }
  }
});
```

**Security level:** Medium - Token exists only in memory but is visible in Redux DevTools

### 2. Token Obfuscation
**Used by:** Some financial services apps, e-commerce platforms

```javascript
// utils/tokenUtils.js
export const obfuscateToken = (token) => {
  if (!token) return null;
  // Simple transformation that makes casual inspection more difficult
  return btoa(token.split('').reverse().join(''));
};

export const deobfuscateToken = (obfuscatedToken) => {
  if (!obfuscatedToken) return null;
  return atob(obfuscatedToken).split('').reverse().join('');
};

// In reducer
setCredentials: (state, action) => {
  state.token = obfuscateToken(action.payload.token);
  state.isAuthenticated = true;
}

// In selector
export const selectToken = (state) => {
  return state.auth.token ? deobfuscateToken(state.auth.token) : null;
};
```

**Security level:** Medium - Makes casual inspection harder but not impossible

### 3. Closures and Module Pattern
**Used by:** Banking applications, healthcare portals

```javascript
// tokenManager.js
const tokenManager = (() => {
  let token = null;
  
  return {
    setToken: (newToken) => { token = newToken; },
    getToken: () => token,
    clearToken: () => { token = null; }
  };
})();

export default tokenManager;

// Usage in API service
import tokenManager from './tokenManager';

const apiService = {
  makeRequest: async (endpoint) => {
    const response = await fetch(`https://api.example.com${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${tokenManager.getToken()}`
      }
    });
    return response.json();
  }
};
```

**Security level:** Medium-High - Harder to access via console, not exposed in Redux store

### 4. Short-Lived Access Tokens with Refresh Logic
**Used by:** Google, Microsoft, enterprise SaaS applications

```javascript
// tokenService.js
import axios from 'axios';
import tokenManager from './tokenManager';

const api = axios.create({
  baseURL: 'https://api.example.com'
});

// Add request interceptor
api.interceptors.request.use(async (config) => {
  let token = tokenManager.getToken();
  
  // Check if token is expired
  if (token && isTokenExpired(token)) {
    // Get new token using refresh token
    const newToken = await refreshToken();
    token = newToken;
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Helper to check token expiration by decoding JWT
function isTokenExpired(token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.exp < Date.now() / 1000;
}

// Function to refresh token
async function refreshToken() {
  const refreshToken = localStorage.getItem('refreshToken'); // Or securely stored elsewhere
  
  try {
    const response = await axios.post('https://auth.example.com/refresh', { refreshToken });
    const newToken = response.data.accessToken;
    tokenManager.setToken(newToken);
    return newToken;
  } catch (error) {
    // Handle refresh error, usually by redirecting to login
    window.location.href = '/login';
    return null;
  }
}
```

**Security level:** High - Limits exposure window of any single token

### 5. Redux Middleware for Token Management
**Used by:** Enterprise React applications, financial dashboards

```javascript
// middleware/authMiddleware.js
import { REHYDRATE } from 'redux-persist';
import tokenManager from '../utils/tokenManager';

export const authMiddleware = store => next => action => {
  // When store is rehydrated
  if (action.type === REHYDRATE && action.payload && action.payload.auth) {
    // Extract token but don't persist it
    const token = action.payload.auth.token;
    if (token) {
      // Store in closure-based tokenManager
      tokenManager.setToken(token);
      // Remove from the persisted state
      action.payload.auth.token = undefined;
    }
  }
  
  // When login succeeds
  if (action.type === 'auth/setCredentials' && action.payload.token) {
    tokenManager.setToken(action.payload.token);
    // Don't save token in Redux store
    const newAction = {
      ...action,
      payload: { ...action.payload, token: undefined }
    };
    return next(newAction);
  }
  
  // When logout happens
  if (action.type === 'auth/clearCredentials') {
    tokenManager.clearToken();
  }
  
  return next(action);
};
```

**Security level:** High - Prevents token from being stored in Redux while maintaining functionality

### 6. Disable Redux DevTools in Production
**Used by:** Almost all production applications

```javascript
// store.js
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers';
import { authMiddleware } from './middleware/authMiddleware';

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(authMiddleware),
  devTools: process.env.NODE_ENV !== 'production'
});

export default store;
```

**Security level:** Medium - Basic protection that should always be implemented

## Recommended Combined Approach

For applications requiring token-based authentication with an API gateway like Apigee, we recommend implementing multiple layers:

1. **Memory-only token storage using closures** (not in Redux state)
2. **Token obfuscation** for any temporary state storage
3. **Short-lived access tokens** with automatic refresh logic
4. **Disable Redux DevTools** in production
5. **Code obfuscation** in production builds

### Example Implementation

```javascript
// tokenService.js - Core of the secure token handling
const tokenService = (() => {
  let accessToken = null;
  let refreshToken = null;
  let tokenExpiry = null;
  
  return {
    setTokens: (access, refresh, expiry) => {
      accessToken = access;
      refreshToken = refresh;
      tokenExpiry = expiry || (decodeJwt(access)?.exp * 1000);
    },
    getAccessToken: async () => {
      // Check if token is expired or will expire soon (30s buffer)
      if (tokenExpiry && tokenExpiry < Date.now() + 30000) {
        await tokenService.refreshAccessToken();
      }
      return accessToken;
    },
    refreshAccessToken: async () => {
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      try {
        const response = await fetch('https://auth.example.com/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        });
        
        const data = await response.json();
        if (data.accessToken) {
          accessToken = data.accessToken;
          tokenExpiry = decodeJwt(data.accessToken)?.exp * 1000;
          return accessToken;
        }
      } catch (error) {
        // Clear tokens and redirect to login
        tokenService.clearTokens();
        window.location.href = '/login';
      }
    },
    clearTokens: () => {
      accessToken = null;
      refreshToken = null;
      tokenExpiry = null;
    }
  };
})();

// Helper to decode JWT without exposing token
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch (e) {
    return null;
  }
}

export default tokenService;

// API service integration
import tokenService from './tokenService';

const api = axios.create({
  baseURL: 'https://api.example.com'
});

api.interceptors.request.use(async (config) => {
  const token = await tokenService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redux integration - store minimal authentication state
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    user: null
  },
  reducers: {
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      // Note: token is NOT stored in Redux
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      tokenService.clearTokens();
    }
  }
});
```

## Security Considerations

1. **No method is 100% secure on the client-side**: Determined attackers can potentially access any information that exists in the browser.

2. **Defense in depth**: Implement multiple security layers to maximize protection.

3. **Token lifetime**: Use short-lived access tokens (5-15 minutes) to minimize damage if tokens are compromised.

4. **Refresh token rotation**: Implement one-time use refresh tokens that are rotated with each use.

5. **Token invalidation**: Have a server-side mechanism to invalidate all tokens for a user if suspicious activity is detected.

6. **HTTPS only**: Ensure all communication occurs over HTTPS.

7. **Content Security Policy (CSP)**: Implement strict CSP headers to mitigate XSS attacks.

## Conclusion

While no client-side storage can be 100% secure, combining these approaches significantly raises the bar for attackers. For applications with stringent security requirements, consider architectural changes that minimize the need for client-side token storage, such as BFF (Backend For Frontend) patterns or token exchange services.

By implementing these best practices, you can create a robust token management system that works with API gateways like Apigee while maintaining a high level of security.