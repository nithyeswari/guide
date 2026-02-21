8# Micro Frontend Dynamic Loading Solution

This solution enables dynamic loading of remote Micro Frontend (MFE) bundles with automatic cache busting and version management. It allows remote applications to update independently without requiring host application rebuilds.

## Key Features

- Dynamic remote bundle loading
- Automatic cache busting using content hashes
- Version tracking through manifest files
- No host rebuilds required for remote updates
- Built-in error handling and retry mechanisms
- Real-time version checking and update notifications

## Architecture

### Components

1. **Manifest Generator**
   - Webpack plugin that generates manifest.json during remote app builds
   - Tracks bundle names, hashes, and versions
   - Provides a single source of truth for remote entry points

2. **Dynamic Remote Loader**
   - Runtime loader in the host application
   - Fetches manifest and loads appropriate remote bundles
   - Handles version checking and updates

3. **Version Checker**
   - Monitors remote updates in real-time
   - Provides update notifications or auto-reload functionality
   - Supports multiple remotes with individual configurations
   - Includes retry mechanism and error handling
   - Customizable update handlers

## Setup Instructions

### 1. Remote Application

#### Install Dependencies
```bash
npm install webpack webpack-cli @module-federation/runtime
```

#### Configure Webpack
```javascript
// webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const ManifestGeneratorPlugin = require('./plugins/ManifestGeneratorPlugin');

module.exports = {
  output: {
    filename: '[name].[contenthash].js',
    publicPath: 'auto'
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'remote_app',
      filename: 'remoteEntry.[contenthash].js',
      exposes: {
        './RemoteComponent': './src/RemoteComponent'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    }),
    new ManifestGeneratorPlugin()
  ]
};
```

### 2. Host Application

#### Install Dependencies
```bash
npm install webpack webpack-cli @module-federation/runtime
```

#### Configure Dynamic Remote Loading
```javascript
// webpack.config.js
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        remote_app: `promise new Promise(resolve => {
          loadRemoteEntry('remote_app')
            .then(manifest => resolve(window.remote_app));
        })`
      }
    })
  ]
};
```

## Version Checker Implementation

### Basic Setup

```javascript
class RemoteVersionChecker {
  constructor(options = {}) {
    this.versions = new Map();
    this.checkInterval = options.checkInterval || 60000;
    this.onVersionChange = options.onVersionChange || this.defaultVersionHandler;
    this.checkTimers = new Map();
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 5000;
  }

  startChecking(remoteName, remoteUrl) {
    this.checkVersion(remoteName, remoteUrl);
    const timerId = setInterval(() => {
      this.checkVersion(remoteName, remoteUrl);
    }, this.checkInterval);
    this.checkTimers.set(remoteName, timerId);
  }

  stopChecking(remoteName) {
    const timerId = this.checkTimers.get(remoteName);
    if (timerId) {
      clearInterval(timerId);
      this.checkTimers.delete(remoteName);
    }
  }
}
```

### Version Checking Logic

```javascript
async checkVersion(remoteName, remoteUrl, attempt = 1) {
  try {
    const response = await fetch(`${remoteUrl}/manifest.json`, {
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const manifest = await response.json();
    const currentVersion = this.versions.get(remoteName);
    
    if (currentVersion && currentVersion !== manifest.version) {
      this.handleVersionChange(remoteName, manifest.version, currentVersion);
    }
    
    this.versions.set(remoteName, manifest.version);
    
  } catch (error) {
    if (attempt < this.retryAttempts) {
      setTimeout(() => {
        this.checkVersion(remoteName, remoteUrl, attempt + 1);
      }, this.retryDelay);
    }
  }
}
```

### Usage Examples

1. **Basic Usage**
```javascript
const checker = new RemoteVersionChecker();
checker.startChecking('remote_app', 'http://remote-app.example.com');
```

2. **Custom Configuration**
```javascript
const checker = new RemoteVersionChecker({
  checkInterval: 30000,
  retryAttempts: 5,
  retryDelay: 3000,
  onVersionChange: (remoteName, newVersion, oldVersion) => {
    notifyUser(`New version available for ${remoteName}`);
  }
});
```

3. **Event Listeners**
```javascript
window.addEventListener('remoteVersionChange', (event) => {
  const { remoteName, newVersion, oldVersion } = event.detail;
  showUpdateBanner({
    message: `New version available (${newVersion})`,
    action: () => window.location.reload()
  });
});
```

4. **Multiple Remotes**
```javascript
const remotes = {
  'remote_app1': 'http://remote1.example.com',
  'remote_app2': 'http://remote2.example.com'
};

const checker = new RemoteVersionChecker();

Object.entries(remotes).forEach(([name, url]) => {
  checker.startChecking(name, url);
});
```

## Deployment Considerations

1. **Cache Headers**
   - Set short cache time or no-cache for manifest.json
   - Use long cache times for content-hashed bundles
   ```nginx
   # Nginx configuration example
   location /manifest.json {
     add_header Cache-Control "no-cache";
   }
   location /static {
     expires 1y;
   }
   ```

2. **Error Handling**
   - Implement retry mechanisms for manifest fetching
   - Provide fallback UI for loading failures
   - Monitor remote loading performance
   - Set up alerting for repeated version check failures

3. **Version Management**
   - Implement gradual rollout strategies
   - Consider using feature flags for new versions
   - Plan for backward compatibility
   - Maintain version history for rollback capabilities

## Best Practices

1. **Version Checking**
   - Choose appropriate check intervals based on update frequency
   - Implement exponential backoff for retry attempts
   - Consider user experience when handling updates
   - Provide clear update notifications to users

2. **Shared Dependencies**
   - Use singleton mode for critical shared dependencies
   - Keep shared dependency versions in sync
   - Monitor bundle sizes
   - Implement dependency version validation

3. **Performance**
   - Implement lazy loading for remote components
   - Use code splitting effectively
   - Monitor and optimize bundle sizes
   - Cache manifest responses appropriately

4. **Monitoring**
   - Track remote loading success rates
   - Monitor version mismatches
   - Set up alerts for loading failures
   - Log version check results and update events

## Troubleshooting

### Common Issues

1. **Remote Loading Failures**
   - Check network connectivity
   - Verify manifest.json accessibility
   - Check for CORS issues
   - Validate manifest format and content

2. **Version Mismatches**
   - Verify shared dependency versions
   - Check manifest generation
   - Review version checking implementation
   - Validate version comparison logic

3. **Caching Issues**
   - Verify cache headers
   - Check browser cache settings
   - Review CDN configuration
   - Test manifest update propagation

4. **Version Checker Issues**
   - Check interval timing configuration
   - Verify retry mechanism functionality
   - Validate event handling
   - Monitor memory usage for multiple checkers

## API Reference

### ManifestGeneratorPlugin

```javascript
new ManifestGeneratorPlugin({
  filename: 'manifest.json',  // Optional, defaults to manifest.json
  version: process.env.VERSION  // Optional, defaults to package.json version
})
```

### RemoteVersionChecker

```javascript
const checker = new RemoteVersionChecker({
  checkInterval: 60000,  // Optional, defaults to 60 seconds
  retryAttempts: 3,     // Optional, defaults to 3
  retryDelay: 5000,     // Optional, defaults to 5 seconds
  onVersionChange: (remoteName, newVersion, oldVersion) => {}  // Optional callback
})

// Available methods
checker.startChecking(remoteName, remoteUrl)
checker.stopChecking(remoteName)
checker.checkVersion(remoteName, remoteUrl, attempt)
```

### Events

```javascript
// Version change event
{
  type: 'remoteVersionChange',
  detail: {
    remoteName: string,
    newVersion: string,
    oldVersion: string
  }
}

```
