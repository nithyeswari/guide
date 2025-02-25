// BackendSyncedCacheService.js

class BackendSyncedCacheService {
  constructor(options = {}) {
    this.storage = options.storage || window.localStorage;
    this.prefix = options.prefix || 'shared_mfe_cache_';
    this.defaultTTL = options.defaultTTL || 3600;
    this.subscribers = new Map();
    this.syncInProgress = false;
    this.backendUrl = options.backendUrl || '/api/cache';
    this.syncInterval = options.syncInterval || 30000; // 30 seconds
    this.retryDelay = options.retryDelay || 5000; // 5 seconds
    this.maxRetries = options.maxRetries || 3;
    
    // Initialize BroadcastChannel for cross-MFE communication
    this.channel = new BroadcastChannel('mfe_cache_channel');
    
    // Listen for updates from other MFEs
    this.channel.onmessage = (event) => {
      const { type, key, value, ttl, timestamp } = event.data;
      this._handleMessage(type, key, value, ttl, timestamp);
    };

    // Start periodic sync with backend
    this._startSync();

    // Listen for online/offline events
    window.addEventListener('online', this._handleOnline.bind(this));
    window.addEventListener('offline', this._handleOffline.bind(this));
  }

  async _handleMessage(type, key, value, ttl, timestamp) {
    switch (type) {
      case 'set':
        await this._setLocal(key, value, ttl, timestamp);
        break;
      case 'remove':
        await this._removeLocal(key);
        break;
      case 'clear':
        await this._clearLocal();
        break;
      case 'sync_request':
        await this._handleSyncRequest();
        break;
    }
    
    this._notifySubscribers(key);
  }

  async _startSync() {
    if (this.syncInterval > 0) {
      this._syncWithBackend();
      setInterval(() => this._syncWithBackend(), this.syncInterval);
    }
  }

  async _syncWithBackend(retryCount = 0) {
    if (this.syncInProgress || !navigator.onLine) return;
    
    this.syncInProgress = true;
    
    try {
      // Get last sync timestamp
      const lastSync = this.storage.getItem(`${this.prefix}lastSync`) || '0';
      
      // Get all changes since last sync
      const response = await fetch(`${this.backendUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastSync: parseInt(lastSync),
          changes: this._getLocalChanges(lastSync)
        })
      });

      if (!response.ok) throw new Error(`Backend sync failed: ${response.statusText}`);

      const { updates, timestamp } = await response.json();
      
      // Apply remote changes
      for (const update of updates) {
        await this._applyRemoteChange(update);
      }
      
      // Update last sync timestamp
      this.storage.setItem(`${this.prefix}lastSync`, timestamp.toString());
      
    } catch (error) {
      console.error('Sync error:', error);
      if (retryCount < this.maxRetries) {
        setTimeout(() => this._syncWithBackend(retryCount + 1), this.retryDelay);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  async _applyRemoteChange(update) {
    const { key, value, ttl, deleted, timestamp } = update;
    
    if (deleted) {
      await this._removeLocal(key);
    } else {
      await this._setLocal(key, value, ttl, timestamp);
    }
    
    // Broadcast to other MFEs
    this.channel.postMessage({
      type: deleted ? 'remove' : 'set',
      key,
      value,
      ttl,
      timestamp
    });
  }

  _getLocalChanges(since) {
    const changes = [];
    const keys = this.keys();
    
    for (const key of keys) {
      const item = JSON.parse(this.storage.getItem(this.prefix + key));
      if (item.timestamp > since) {
        changes.push({
          key,
          value: item.value,
          ttl: item.ttl,
          timestamp: item.timestamp,
          deleted: item.deleted || false
        });
      }
    }
    
    return changes;
  }

  async _setLocal(key, value, ttl = this.defaultTTL, timestamp = Date.now()) {
    const item = {
      value,
      timestamp,
      ttl: ttl * 1000,
      deleted: false
    };
    
    try {
      this.storage.setItem(this.prefix + key, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    const timestamp = Date.now();
    await this._setLocal(key, value, ttl, timestamp);
    
    if (navigator.onLine) {
      try {
        await fetch(`${this.backendUrl}/set`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key, value, ttl, timestamp })
        });
      } catch (error) {
        console.error('Backend set error:', error);
        // Continue with local update even if backend fails
      }
    }
    
    // Broadcast to other MFEs
    this.channel.postMessage({
      type: 'set',
      key,
      value,
      ttl,
      timestamp
    });
    
    this._notifySubscribers(key);
  }

  get(key) {
    try {
      const item = JSON.parse(this.storage.getItem(this.prefix + key));
      
      if (!item || item.deleted) return null;

      const now = Date.now();
      if (now - item.timestamp > item.ttl) {
        this.remove(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async _removeLocal(key) {
    try {
      const item = JSON.parse(this.storage.getItem(this.prefix + key));
      if (item) {
        item.deleted = true;
        item.timestamp = Date.now();
        this.storage.setItem(this.prefix + key, JSON.stringify(item));
      }
      return true;
    } catch (error) {
      console.error('Cache remove error:', error);
      return false;
    }
  }

  async remove(key) {
    const timestamp = Date.now();
    await this._removeLocal(key);
    
    if (navigator.onLine) {
      try {
        await fetch(`${this.backendUrl}/remove`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key, timestamp })
        });
      } catch (error) {
        console.error('Backend remove error:', error);
      }
    }
    
    this.channel.postMessage({
      type: 'remove',
      key,
      timestamp
    });
    
    this._notifySubscribers(key);
  }

  async _clearLocal() {
    try {
      const timestamp = Date.now();
      Object.keys(this.storage).forEach(key => {
        if (key.startsWith(this.prefix)) {
          const item = JSON.parse(this.storage.getItem(key));
          item.deleted = true;
          item.timestamp = timestamp;
          this.storage.setItem(key, JSON.stringify(item));
        }
      });
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  async clear() {
    const timestamp = Date.now();
    await this._clearLocal();
    
    if (navigator.onLine) {
      try {
        await fetch(`${this.backendUrl}/clear`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timestamp })
        });
      } catch (error) {
        console.error('Backend clear error:', error);
      }
    }
    
    this.channel.postMessage({
      type: 'clear',
      timestamp
    });
    
    // Notify all subscribers
    this.subscribers.forEach(callbacks => {
      callbacks.forEach(callback => callback());
    });
  }

  _handleOnline() {
    this._syncWithBackend();
  }

  _handleOffline() {
    // Could implement offline queue here if needed
    console.log('Cache service is offline');
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  _notifySubscribers(key) {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      const value = this.get(key);
      callbacks.forEach(callback => callback(value));
    }
  }

  keys() {
    try {
      return Object.keys(this.storage)
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.slice(this.prefix.length));
    } catch (error) {
      console.error('Cache keys error:', error);
      return [];
    }
  }

  dispose() {
    clearInterval(this.syncInterval);
    this.channel.close();
    this.subscribers.clear();
    window.removeEventListener('online', this._handleOnline);
    window.removeEventListener('offline', this._handleOffline);
  }
}

// Create a singleton instance
export const sharedCache = new BackendSyncedCacheService({
  backendUrl: '/api/cache', // Update this with your backend URL
  syncInterval: 30000, // Sync every 30 seconds
});

// React Hook
import { useState, useEffect } from 'react';

export function useSharedCache(key, initialValue = null, ttl = null) {
  const [value, setValue] = useState(() => {
    const cached = sharedCache.get(key);
    return cached !== null ? cached : initialValue;
  });

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = sharedCache.subscribe(key, (newValue) => {
      setValue(newValue);
    });

    // Set initial value if needed
    if (value !== null && sharedCache.get(key) === null) {
      sharedCache.set(key, value, ttl);
    }

    return () => {
      unsubscribe();
    };
  }, [key, value, ttl]);

  const updateValue = async (newValue) => {
    await sharedCache.set(key, newValue, ttl);
    setValue(newValue);
  };

  return [value, updateValue];
}