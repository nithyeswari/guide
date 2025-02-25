# Enterprise MFE Architecture with Product Monorepo

## Overview

This project implements a micro-frontend architecture with two main parts:
1. Product Management Monorepo - Core reusable modules
2. Order Management MFE - Shell application with state management

## Repository Structure

```
├── product-monorepo/            # Repository 1: Product Management
│   ├── packages/
│   │   ├── core/
│   │   │   └── src/
│   │   │       └── types/
│   │   └── product/
│   │       ├── src/
│   │       │   ├── models/
│   │       │   ├── services/
│   │       │   └── components/
│   │       └── webpack.config.js
│   └── package.json
│
└── order-mfe/                   # Repository 2: Order Management
    ├── src/
    │   ├── shell/              # Shell Architecture
    │   │   ├── components/
    │   │   └── layouts/
    │   ├── state/              # Global State
    │   │   └── store.ts
    │   ├── pages/              # Route Pages
    │   └── App.tsx
    └── package.json
```

## Quick Start

### 1. Start Product Monorepo
```bash
cd product-monorepo
npm install
npm run dev    # Runs on http://localhost:3001
```

### 2. Start Order MFE
```bash
cd order-mfe
npm install
npm start     # Runs on http://localhost:3000
```

## Product Monorepo

### Core Features
- Reusable product components
- Shared services and utilities
- Type definitions
- Module Federation setup

### Module Federation Configuration
```javascript
// product-monorepo/packages/product/webpack.config.js
{
  plugins: [
    new ModuleFederationPlugin({
      name: 'product_management',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductService': './src/services/ProductService',
        './ProductForm': './src/components/ProductForm',
        './types': './src/types/index'
      }
    })
  ]
}
```

## Order MFE Shell

### Shell Architecture
- Header with navigation
- Sidebar for main menu
- MainLayout wrapper
- Error boundaries
- Loading states

### State Management (Zustand)
```typescript
// order-mfe/src/state/store.ts
const useOrderStore = create((set) => ({
  cart: {
    items: [],
    total: 0
  },
  loading: false,
  error: null,
  
  addToCart: (product, quantity) => set(state => ({
    cart: {
      items: [...state.cart.items, { product, quantity }],
      total: calculateTotal(state.cart.items)
    }
  })),
  
  // Other actions...
}));
```

### Remote Module Integration
```typescript
// order-mfe/src/pages/CreateOrder.tsx
const ProductSelector = React.lazy(() => import('productModule/ProductSelector'));

const CreateOrder = () => {
  const { addToCart } = useOrderStore();
  
  return (
    <Suspense fallback="Loading...">
      <ProductSelector onSelect={addToCart} />
    </Suspense>
  );
};
```

## Development Guidelines

### 1. Product Module Development
```typescript
// Adding new product feature
// product-monorepo/packages/product/src/components/NewFeature.tsx
export const NewFeature = () => {
  // Implementation
};

// Expose in webpack.config.js
{
  exposes: {
    './NewFeature': './src/components/NewFeature'
  }
}
```

### 2. Order MFE Development
```typescript
// Using product feature in Order MFE
const NewFeature = React.lazy(() => import('productModule/NewFeature'));

// Add to routes
<Route path="/new-feature" element={<NewFeature />} />
```

### 3. State Management
```typescript
// Using store in components
const Component = () => {
  const { cart, addToCart } = useOrderStore();
  
  return (
    <div>
      Cart Items: {cart.items.length}
      <button onClick={() => addToCart(product, 1)}>Add</button>
    </div>
  );
};
```

## Deployment

### 1. Product Monorepo Deployment
```bash
# Build modules
cd product-monorepo
npm run build

# Docker deployment
docker build -t product-monorepo .
docker run -p 3001:80 product-monorepo
```

### 2. Order MFE Deployment
```bash
# Build application
cd order-mfe
npm run build

# Docker deployment
docker build -t order-mfe .
docker run -p 3000:80 order-mfe
```

## Configuration

### Product Monorepo
```env
PORT=3001
API_URL=http://api.example.com
```

### Order MFE
```env
PORT=3000
PRODUCT_MODULE_URL=http://localhost:3001
API_URL=http://api.example.com
```

## Best Practices

### 1. Module Federation
- Keep remotes granular
- Version exposed modules
- Handle loading states
- Implement error boundaries

### 2. State Management
- Keep state normalized
- Use selectors for derived data
- Handle async operations cleanly
- Implement proper error handling

### 3. Shell Architecture
- Maintain consistent layouts
- Implement proper navigation
- Handle loading states globally
- Manage errors at appropriate levels

## Error Handling

### 1. Remote Module Errors
```typescript
<ErrorBoundary>
  <Suspense fallback="Loading...">
    <RemoteComponent />
  </Suspense>
</ErrorBoundary>
```

### 2. State Errors
```typescript
try {
  await someOperation();
} catch (error) {
  useOrderStore.getState().setError(error.message);
}
```

# Backend-Synced Shared Cache Service for Micro-frontends

A robust caching solution designed for micro-frontend architectures that provides synchronized caching between different MFEs and a backend cache service.

## Features

- **Cross-MFE Communication**: Real-time updates between different micro-frontends using BroadcastChannel API
- **Backend Synchronization**: Automatic sync with backend cache service
- **Offline Support**: Works offline with automatic resync when back online
- **Conflict Resolution**: Uses timestamp-based conflict resolution
- **TTL Support**: Time-based cache expiration
- **React Integration**: Includes React hooks for easy integration
- **TypeScript Support**: Full type definitions included
- **Error Handling**: Comprehensive error handling and retry mechanisms

## Installation

```bash
npm install mfe-shared-cache
# or
yarn add mfe-shared-cache
```

## Quick Start

### 1. Backend Setup

First, set up your backend cache endpoints. Here's an example using Express:

```javascript
const express = require('express');
const router = express.Router();

router.post('/api/cache/sync', (req, res) => {
  const { lastSync, changes } = req.body;
  // Implement your sync logic
  res.json({
    updates: [], // Your updates
    timestamp: Date.now()
  });
});

router.post('/api/cache/set', (req, res) => {
  const { key, value, ttl, timestamp } = req.body;
  // Implement your set logic
  res.json({ success: true });
});

// Implement other endpoints (remove, clear)
```

### 2. Frontend Implementation

Initialize the cache service:

```javascript
// shared/cacheService.js
import { BackendSyncedCacheService } from 'mfe-shared-cache';

export const sharedCache = new BackendSyncedCacheService({
  backendUrl: 'https://your-api.com/api/cache',
  syncInterval: 30000, // 30 seconds
  retryDelay: 5000,    // 5 seconds
  maxRetries: 3
});
```

### 3. Using in React Components

```javascript
import { useSharedCache } from 'mfe-shared-cache';

function UserProfile() {
  const [userData, setUserData] = useSharedCache('user_data', null, 3600);

  useEffect(() => {
    async function fetchUserData() {
      if (!userData) {
        const response = await fetch('/api/user');
        const data = await response.json();
        await setUserData(data);
      }
    }
    fetchUserData();
  }, [userData]);

  return <div>{userData?.name}</div>;
}
```

## Configuration Options

The `BackendSyncedCacheService` constructor accepts the following options:

```typescript
interface CacheOptions {
  storage?: Storage;              // Default: localStorage
  prefix?: string;               // Default: 'shared_mfe_cache_'
  defaultTTL?: number;           // Default: 3600 (1 hour)
  backendUrl?: string;           // Default: '/api/cache'
  syncInterval?: number;         // Default: 30000 (30 seconds)
  retryDelay?: number;          // Default: 5000 (5 seconds)
  maxRetries?: number;          // Default: 3
}
```

## API Reference

### Cache Service Methods

#### `set(key: string, value: any, ttl?: number): Promise<void>`
Sets a value in the cache with optional TTL.

```javascript
await sharedCache.set('user', { name: 'John' }, 3600);
```

#### `get(key: string): any`
Retrieves a value from the cache.

```javascript
const user = sharedCache.get('user');
```

#### `remove(key: string): Promise<void>`
Removes a value from the cache.

```javascript
await sharedCache.remove('user');
```

#### `clear(): Promise<void>`
Clears all values from the cache.

```javascript
await sharedCache.clear();
```

#### `subscribe(key: string, callback: (value: any) => void): () => void`
Subscribes to changes for a specific key.

```javascript
const unsubscribe = sharedCache.subscribe('user', (value) => {
  console.log('User updated:', value);
});
```

### React Hook

#### `useSharedCache(key: string, initialValue?: any, ttl?: number)`
React hook for using the cache service.

```javascript
const [value, setValue] = useSharedCache('key', initialValue, ttl);
```

## Backend API Requirements

The backend should implement the following endpoints:

### POST /sync
Synchronizes changes between frontend and backend.

Request:
```json
{
  "lastSync": number,
  "changes": [
    {
      "key": string,
      "value": any,
      "ttl": number,
      "timestamp": number,
      "deleted": boolean
    }
  ]
}
```

Response:
```json
{
  "updates": [
    {
      "key": string,
      "value": any,
      "ttl": number,
      "timestamp": number,
      "deleted": boolean
    }
  ],
  "timestamp": number
}
```

### POST /set
Sets a single value.

Request:
```json
{
  "key": string,
  "value": any,
  "ttl": number,
  "timestamp": number
}
```

### POST /remove
Removes a single value.

Request:
```json
{
  "key": string,
  "timestamp": number
}
```

### POST /clear
Clears all values.

Request:
```json
{
  "timestamp": number
}
```

## Error Handling

The service includes built-in error handling and retry mechanisms:

- Automatic retries for failed backend operations
- Offline mode with automatic resync when online
- Error events for monitoring and logging
- Conflict resolution using timestamps

## Best Practices

1. **Initialize Early**: Create the cache service instance during application bootstrap.
2. **Handle Errors**: Subscribe to error events for monitoring.
3. **Clean Up**: Call `dispose()` when no longer needed.
4. **TTL Settings**: Use appropriate TTL values based on data volatility.
5. **Backend Implementation**: Use a distributed cache (like Redis) in production.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

MIT

## Support

For issues and feature requests, please use the GitHub issue tracker.

## Testing

### 1. Product Module Tests
```typescript
// product-monorepo/packages/product/src/__tests__/ProductService.test.ts
describe('ProductService', () => {
  test('creates product', async () => {
    // Test implementation
  });
});
```

### 2. Order MFE Tests
```typescript
// order-mfe/src/__tests__/store.test.ts
describe('OrderStore', () => {
  test('adds to cart', () => {
    // Test implementation
  });
});
```

## Monitoring & Performance

### 1. Module Loading
- Track remote module load times
- Monitor chunk sizes
- Implement retry mechanisms

### 2. State Performance
- Monitor store updates
- Track component re-renders
- Implement performance tracking

## Support & Maintenance

### Documentation
- API Documentation: `/docs/api`
- Component Library: `/docs/components`
- State Management: `/docs/state`

### Support Channels
- GitHub Issues
- Slack: #mfe-support
- Email: support@example.com

## License

MIT © Your Organization