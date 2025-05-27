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