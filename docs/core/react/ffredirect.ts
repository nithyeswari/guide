# Complete Guide: Loading React TypeScript Redirect Handler in JSP

## Project Structure
```
your-react-app/
├── src/
│   ├── components/          # Your main React components
│   ├── redirect-handler.ts  # Your redirect logic
│   └── index.tsx           # Main React app entry
├── public/
│   └── js/                 # Output directory for redirect handler
├── webpack.config.js       # Main React app webpack config
├── webpack.redirect.config.js  # Separate config for redirect handler
└── package.json
```

## 1. TypeScript Redirect Handler

**src/redirect-handler.ts:**
```typescript
interface ContextData {
  contextPath: string;
  userId: string;
  userRole: string;
}

class RedirectHandler {
  private contextData: ContextData;

  constructor(contextData: ContextData) {
    this.contextData = contextData;
  }

  determineRedirectUrl(): string {
    const { contextPath, userRole } = this.contextData;
    
    switch (userRole) {
      case 'admin':
        return `${contextPath}/admin/dashboard`;
      case 'user':
        return `${contextPath}/user/home`;
      case 'guest':
        return `${contextPath}/welcome`;
      default:
        return `${contextPath}/login`;
    }
  }

  redirect(): void {
    const url = this.determineRedirectUrl();
    console.log(`Redirecting to: ${url}`);
    window.location.href = url;
  }
}

// Export to window object for JSP access
declare global {
  interface Window {
    RedirectHandler: typeof RedirectHandler;
    handleRedirect: (contextData: ContextData) => void;
  }
}

// Expose to global scope
window.RedirectHandler = RedirectHandler;

// Convenience function for direct usage
window.handleRedirect = function(contextData: ContextData) {
  const handler = new RedirectHandler(contextData);
  handler.redirect();
};

export default RedirectHandler;
```

## 2. Webpack Configuration for Redirect Handler

**webpack.redirect.config.js:**
```javascript
const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  
  entry: './src/redirect-handler.ts',
  
  output: {
    path: path.resolve(__dirname, 'public/js'),
    filename: 'redirect-handler.js',
    clean: true,
    library: {
      name: 'RedirectHandler',
      type: 'window'
    }
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 3001,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    },
    devMiddleware: {
      publicPath: '/js/',
    }
  },
  
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
  },
  
  devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false,
};
```

## 3. Package.json Scripts

**package.json:**
```json
{
  "scripts": {
    "start": "webpack serve --config webpack.config.js",
    "build": "webpack --config webpack.config.js",
    
    "redirect:dev": "webpack serve --config webpack.redirect.config.js",
    "redirect:build": "webpack --config webpack.redirect.config.js",
    "redirect:watch": "webpack --watch --config webpack.redirect.config.js",
    
    "dev:all": "concurrently \"npm run start\" \"npm run redirect:dev\"",
    "build:all": "npm run build && npm run redirect:build"
  },
  "devDependencies": {
    "concurrently": "^7.6.0",
    "ts-loader": "^9.4.2",
    "typescript": "^4.9.5",
    "webpack": "^5.75.0",
    "webpack-cli": "^5.0.1",
    "webpack-dev-server": "^4.7.4"
  }
}
```

## 4. JSP Implementation

**your-page.jsp:**
```jsp
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html>
<head>
    <title>Redirect Handler</title>
</head>
<body>
    <script>
        // Environment detection
        function getRedirectScriptUrl() {
            const isDev = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
            
            if (isDev) {
                // Development - Webpack dev server
                return 'http://localhost:3001/js/redirect-handler.js';
            } else {
                // Production - nginx server
                return 'http://your-nginx-server.com/js/redirect-handler.js';
            }
        }
        
        function loadRedirectScript() {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = getRedirectScriptUrl();
                script.async = true;
                
                script.onload = () => {
                    console.log('Redirect script loaded from:', script.src);
                    resolve();
                };
                
                script.onerror = () => {
                    console.error('Failed to load redirect script from:', script.src);
                    reject(new Error('Script load failed'));
                };
                
                document.head.appendChild(script);
            });
        }
        
        // Load and execute
        loadRedirectScript()
            .then(() => {
                // Prepare context data from JSP
                const contextData = {
                    contextPath: '<%= request.getContextPath() %>',
                    userId: '<%= request.getAttribute("userId") != null ? request.getAttribute("userId") : "anonymous" %>',
                    userRole: '<%= request.getAttribute("userRole") != null ? request.getAttribute("userRole") : "guest" %>'
                };
                
                // Use the loaded redirect handler
                if (typeof window.handleRedirect === 'function') {
                    window.handleRedirect(contextData);
                } else if (typeof window.RedirectHandler === 'function') {
                    const handler = new window.RedirectHandler(contextData);
                    handler.redirect();
                } else {
                    console.error('Redirect handler not found');
                    throw new Error('Redirect handler not available');
                }
            })
            .catch(error => {
                console.error('Error with redirect:', error);
                // Fallback redirect
                window.location.href = '<%= request.getContextPath() %>/login';
            });
    </script>
</body>
</html>
```

## 5. nginx Configuration for Production

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name your-nginx-server.com;
    
    # Main React app
    location / {
        root /var/www/react-app;
        try_files $uri $uri/ /index.html;
    }
    
    # Redirect handler with CORS
    location /js/redirect-handler.js {
        root /var/www/react-app/public;
        add_header Access-Control-Allow-Origin "http://your-jsp-domain.com";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

## 6. Development Workflow

**Setup:**
```bash
# Install dependencies
npm install

# Start development
npm run dev:all
```

**Development URLs:**
- Main React app: http://localhost:3000
- Redirect handler: http://localhost:3001/js/redirect-handler.js
- JSP can load from: http://localhost:3001/js/redirect-handler.js

**Production Build:**
```bash
# Build both applications
npm run build:all

# Deploy files:
# - Main React app → nginx document root
# - public/js/redirect-handler.js → nginx /js/ directory
```

## 7. Key Benefits

1. **Predictable URLs**: Always `redirect-handler.js` regardless of environment
2. **Independent Development**: Modify redirect logic without rebuilding main app
3. **TypeScript Support**: Full compilation and type checking
4. **Hot Reload**: Automatic reload during development
5. **Separate Concerns**: Isolated redirect logic
6. **Easy Debugging**: Source maps in development
7. **Production Optimization**: Independent minification and optimization

## 8. Usage Example

**Advanced redirect logic in redirect-handler.ts:**
```typescript
// Add more complex logic
determineRedirectUrl(): string {
  const { contextPath, userRole, userId } = this.contextData;
  
  // Check for special conditions
  if (userId === 'admin' && userRole === 'user') {
    return `${contextPath}/admin/impersonate`;
  }
  
  // Role-based routing
  const roleRoutes = {
    'admin': '/admin/dashboard',
    'manager': '/manager/overview',
    'user': '/user/home',
    'guest': '/welcome'
  };
  
  return `${contextPath}${roleRoutes[userRole] || '/login'}`;
}
```

This consolidated approach gives you a complete, production-ready solution for loading TypeScript-based redirect logic from your React app into JSP pages, with full development and production support.