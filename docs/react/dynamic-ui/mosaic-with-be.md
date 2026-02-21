# MosaicUI Framework

<div align="center">

![MosaicUI Logo](https://via.placeholder.com/300x100?text=MosaicUI)

**A comprehensive micro-frontend framework with JSON-driven UI and Spring Boot integration**

[![npm version](https://img.shields.io/npm/v/mosaicui.svg?style=flat)](https://www.npmjs.com/package/mosaicui)
[![Maven Central](https://img.shields.io/maven-central/v/com.mosaicui/mosaicui-spring-boot-starter.svg)](https://search.maven.org/artifact/com.mosaicui/mosaicui-spring-boot-starter)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

</div>

## Overview

MosaicUI is a complete framework for building modular web applications using micro-frontend architecture and JSON-driven UI rendering. It consists of:

1. **Frontend Library**: A JavaScript library for rendering UIs from JSON layouts and managing micro-frontends
2. **Backend Integration**: Spring Boot starter for server-side layout generation, validation, and API endpoints
3. **Tooling**: Webpack plugin for module federation and automatic component registration

This unified approach allows frontend and backend teams to collaborate effectively on a shared UI architecture.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [Frontend Installation](#frontend-installation)
  - [Backend Installation](#backend-installation)
- [Frontend Usage](#frontend-usage)
  - [Component Registration](#component-registration)
  - [Layout Definition](#layout-definition)
  - [Layout Rendering](#layout-rendering)
  - [Webpack Configuration](#webpack-configuration)
- [Backend Integration](#backend-integration)
  - [Annotation-Based Component Definitions](#annotation-based-component-definitions)
  - [Layout Generation](#layout-generation)
  - [Layout Validation](#layout-validation)
  - [API Endpoints](#api-endpoints)
- [Advanced Usage](#advanced-usage)
  - [Server-Driven UI](#server-driven-ui)
  - [A/B Testing](#ab-testing)
  - [Role-Based Layouts](#role-based-layouts)
  - [Dynamic Layouts](#dynamic-layouts)
- [Architecture Patterns](#architecture-patterns)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Contributing](#contributing)
- [License](#license)

## Features

### Frontend Features

- 🧩 **Micro-frontend architecture** - Build applications as independent, composable modules
- 🔄 **JSON-driven rendering** - Define UIs with simple JSON layouts
- 🔌 **Pluggable component system** - Register and use components dynamically
- 🌐 **Server-driven UI** - Update layouts from the backend without deploying frontend code
- 🎭 **Framework agnostic** - Works with React, Vue, and Angular
- 🔧 **Webpack Module Federation** - Built-in integration with module federation

### Backend Features

- 🔍 **Layout validation** - Validate layouts against component requirements
- 📝 **Annotation-based components** - Define UI components with Java annotations
- 🔒 **Role-based layouts** - Control layout access based on user roles
- 🎯 **Path-mapped layouts** - Generate layouts based on URL patterns
- 📊 **A/B testing** - Implement server-side A/B testing for layouts
- 🔄 **Dynamic layouts** - Generate layouts from database data

## Installation

### Frontend Installation

```bash
# Install the main package
npm install mosaicui

# Install peer dependencies if needed
npm install react react-dom webpack
```

### Backend Installation

```xml
<!-- Add to your pom.xml -->
<dependency>
    <groupId>com.mosaicui</groupId>
    <artifactId>mosaicui-spring-boot-starter</artifactId>
    <version>1.0.0</version>
</dependency>
```

Or with Gradle:

```groovy
// Add to your build.gradle
implementation 'com.mosaicui:mosaicui-spring-boot-starter:1.0.0'
```

## Frontend Usage

### Component Registration

```jsx
// src/components/index.js
import { registerComponents } from 'mosaicui';
import Header from './Header';
import Sidebar from './Sidebar';
import ProductCard from './ProductCard';
import Footer from './Footer';

// Register your components
registerComponents({
  Header,
  Sidebar,
  ProductCard,
  Footer
});
```

### Layout Definition

```json
// src/layouts/homepage.json
{
  "component": "Layout",
  "children": [
    {
      "component": "Header",
      "props": {
        "title": "Welcome to Our Store",
        "userName": "$context.user.name"
      }
    },
    {
      "component": "Content",
      "children": [
        {
          "component": "ProductList",
          "props": {
            "products": "$context.products",
            "layout": "grid"
          }
        }
      ]
    },
    {
      "component": "Footer",
      "props": {
        "showSocialLinks": true
      }
    }
  ]
}
```

### Layout Rendering

```jsx
// src/App.jsx
import React from 'react';
import { DynamicRenderer } from 'mosaicui';
import homepageLayout from './layouts/homepage.json';
import './components'; // Register components

function App() {
  const context = {
    user: {
      name: 'John',
      role: 'customer'
    },
    products: [
      { id: 1, name: 'Product A', price: 19.99 },
      { id: 2, name: 'Product B', price: 29.99 }
    ]
  };

  return (
    <DynamicRenderer 
      layout={homepageLayout} 
      context={context} 
    />
  );
}

export default App;
```

### Webpack Configuration

```js
// webpack.config.js
const { MosaicUIPlugin } = require('mosaicui');

module.exports = {
  // ... other webpack config
  plugins: [
    new MosaicUIPlugin({
      appName: 'host',
      exposes: {
        './Header': './src/components/Header',
        './Footer': './src/components/Footer',
      },
      remotes: {
        shop: 'shop@https://shop.example.com/remoteEntry.js',
        checkout: 'checkout@https://checkout.example.com/remoteEntry.js'
      },
      // Auto-register layouts from a directory
      layouts: './src/layouts',
      // Auto-discover and register components
      autoRegisterComponents: true,
      componentsDir: './src/components'
    })
  ]
};
```

## Backend Integration

### Annotation-Based Component Definitions

Define your UI components using annotations:

```java
@UIComponent(name = "Header")
public class HeaderComponent {
    
    @PropDefinition(required = true)
    private String title;
    
    @PropDefinition
    private String subtitle;
    
    @PropDefinition(allowedValues = {"light", "dark"})
    private String theme;
}

@UIComponent(name = "ProductCard")
public class ProductCardComponent {
    
    @PropDefinition(required = true, type = Integer.class)
    private Integer productId;
    
    @PropDefinition(required = true)
    private String name;
    
    @PropDefinition(type = Double.class)
    private Double price;
    
    @PropDefinition
    private String imageUrl;
    
    @PropDefinition(defaultValue = "false", type = Boolean.class)
    private Boolean featured;
}
```

### Layout Generation

Create layouts using annotated methods:

```java
@UILayout(name = "product-catalog")
@Component
public class ProductCatalogLayout {
    
    private final ProductService productService;
    private final ObjectMapper objectMapper;
    
    public ProductCatalogLayout(ProductService productService, ObjectMapper objectMapper) {
        this.productService = productService;
        this.objectMapper = objectMapper;
    }
    
    @LayoutMapping(path = "/catalog/{categoryId}")
    public JsonNode getCatalogLayout(@PathVariable String categoryId, 
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        
        Page<Product> products = productService.findByCategory(categoryId, PageRequest.of(page, size));
        
        ObjectNode layout = objectMapper.createObjectNode();
        layout.put("component", "Layout");
        
        // Create children array
        ArrayNode children = objectMapper.createArrayNode();
        
        // Add header
        ObjectNode header = objectMapper.createObjectNode();
        header.put("component", "Header");
        ObjectNode headerProps = objectMapper.createObjectNode();
        headerProps.put("title", "Products in " + categoryId);
        header.set("props", headerProps);
        children.add(header);
        
        // Add product grid
        ObjectNode productGrid = objectMapper.createObjectNode();
        productGrid.put("component", "ProductGrid");
        ObjectNode gridProps = objectMapper.createObjectNode();
        
        // Add products array
        ArrayNode productsArray = objectMapper.createArrayNode();
        for (Product product : products.getContent()) {
            ObjectNode productNode = objectMapper.createObjectNode();
            productNode.put("id", product.getId());
            productNode.put("name", product.getName());
            productNode.put("price", product.getPrice());
            productNode.put("imageUrl", product.getImageUrl());
            productsArray.add(productNode);
        }
        
        gridProps.set("products", productsArray);
        gridProps.put("currentPage", page);
        gridProps.put("totalPages", products.getTotalPages());
        productGrid.set("props", gridProps);
        
        children.add(productGrid);
        layout.set("children", children);
        
        return layout;
    }
    
    @LayoutMapping(path = "/product/{productId}", roles = {"ADMIN", "USER"})
    public JsonNode getProductDetailLayout(@PathVariable Long productId) {
        Product product = productService.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            
        // Create layout JSON for product detail page
        ObjectNode layout = objectMapper.createObjectNode();
        // ... layout construction logic ...
        
        return layout;
    }
}
```

### Layout Validation

Layouts are automatically validated against component definitions:

```java
@Service
public class AnnotationLayoutValidator {
    
    private final UIComponentScanner componentScanner;
    
    public AnnotationLayoutValidator(UIComponentScanner componentScanner) {
        this.componentScanner = componentScanner;
    }
    
    public ValidationResult validateLayout(JsonNode layout) {
        ValidationResult result = new ValidationResult();
        validateNode(layout, result);
        return result;
    }
    
    // Validation logic implementation
    // ...
}
```

### API Endpoints

The backend automatically exposes REST endpoints for your layouts:

```
GET /api/layouts/catalog/electronics  -> Returns the catalog layout for electronics
GET /api/layouts/product/123          -> Returns the product detail layout for product 123
```

## Advanced Usage

### Server-Driven UI

Fetch layouts from the server:

```jsx
import { useEffect, useState } from 'react';
import { DynamicRenderer } from 'mosaicui';

function useServerLayout(path, options = {}) {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchLayout() {
      try {
        setLoading(true);
        
        const url = `/api/layouts${path}`;
        
        const response = await fetch(url, {
          headers: {
            'X-User-Role': options.userRole || ''
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error fetching layout: ${response.statusText}`);
        }
        
        const data = await response.json();
        setLayout(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLayout();
  }, [path, options.userRole]);
  
  return { layout, loading, error };
}

// Usage
function ProductPage({ productId, user }) {
  const { layout, loading, error } = useServerLayout(`/product/${productId}`, {
    userRole: user?.role
  });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <DynamicRenderer
      layout={layout}
      context={{
        user,
        onAddToCart: (productId) => handleAddToCart(productId)
      }}
    />
  );
}
```

### A/B Testing

Implement server-side A/B testing for layouts:

```java
@Service
public class ABTestingService {
    
    private final Random random = new Random();
    private final LayoutService layoutService;
    
    public ABTestingService(LayoutService layoutService) {
        this.layoutService = layoutService;
    }
    
    public JsonNode getTestedLayout(String layoutName, String userId) {
        // Determine which variant to serve based on user ID
        String variant;
        if (userId != null) {
            // Deterministic selection based on user ID
            int hashCode = userId.hashCode();
            variant = (hashCode % 2 == 0) ? "variantA" : "variantB";
        } else {
            // Random selection for anonymous users
            variant = random.nextBoolean() ? "variantA" : "variantB";
        }
        
        // Log the assignment for analytics
        log.info("Assigned {} to user {}", variant, userId);
        
        // Get the selected layout variant
        return layoutService.getLayout(layoutName, variant);
    }
}
```

### Role-Based Layouts

Control access to layouts based on user roles:

```java
@LayoutMapping(path = "/admin-dashboard", roles = {"ADMIN"})
public JsonNode getAdminDashboard() {
    // This layout will only be accessible to users with ADMIN role
    return createAdminDashboardLayout();
}
```

### Dynamic Layouts

Generate layouts dynamically based on database data:

```java
@LayoutMapping(path = "/user-profile/{userId}")
public JsonNode getUserProfileLayout(@PathVariable String userId) {
    User user = userService.findById(userId);
    UserPreferences preferences = preferencesService.getForUser(userId);
    
    ObjectNode layout = objectMapper.createObjectNode();
    layout.put("component", "Layout");
    
    ArrayNode children = objectMapper.createArrayNode();
    
    // Add user info section
    ObjectNode userInfo = objectMapper.createObjectNode();
    userInfo.put("component", "UserInfo");
    ObjectNode userProps = objectMapper.createObjectNode();
    userProps.put("name", user.getName());
    userProps.put("email", user.getEmail());
    userProps.put("avatarUrl", user.getAvatarUrl());
    userInfo.set("props", userProps);
    children.add(userInfo);
    
    // Add sections based on user preferences
    if (preferences.isShowActivityFeed()) {
        ObjectNode activityFeed = objectMapper.createObjectNode();
        activityFeed.put("component", "ActivityFeed");
        ObjectNode feedProps = objectMapper.createObjectNode();
        feedProps.put("userId", userId);
        feedProps.put("limit", preferences.getActivityFeedLimit());
        activityFeed.set("props", feedProps);
        children.add(activityFeed);
    }
    
    // ... add more sections based on preferences
    
    layout.set("children", children);
    return layout;
}
```

## Architecture Patterns

MosaicUI supports several micro-frontend patterns:

### Hub-and-Spoke

Applications serve as both central hubs and specialized components.

### Federated Marketplace

Components are published to a central registry for discovery.

### Nested Composition

Micro-frontends can contain other micro-frontends in a hierarchical structure.

### Event-Driven Communication

Applications communicate through events rather than direct imports.

### Server-Driven UI

Backend services control UI layout and behavior.

## API Reference

### Frontend API

#### `DynamicRenderer`

Renders components based on a JSON layout definition.

```jsx
import { DynamicRenderer } from 'mosaicui';

// Basic usage
<DynamicRenderer layout={myLayout} context={myContext} />
```

#### `ComponentRegistry`

Manages component registration and retrieval.

```jsx
import { ComponentRegistry, registerComponents } from 'mosaicui';

// Create a custom registry
const customRegistry = new ComponentRegistry();
customRegistry.register('MyComponent', MyComponent);

// Global registration
registerComponents({
  Header,
  Footer,
  ProductCard
});
```

#### `MosaicUIPlugin`

Webpack plugin for module federation and automatic component/layout registration.

```js
const { MosaicUIPlugin } = require('mosaicui');

// Full configuration
new MosaicUIPlugin({
  appName: 'catalog-app',
  exposes: {
    './ProductCard': './src/components/ProductCard'
  },
  remotes: {
    checkout: 'checkout@https://checkout.example.com/remoteEntry.js'
  },
  layouts: './src/layouts',
  autoRegisterComponents: true,
  componentsDir: './src/components',
  shared: ['lodash', 'styled-components'],
  devTools: true
})
```

### Backend API

#### `@UIComponent`

Annotation for defining UI components.

```java
@UIComponent(name = "Header")
public class HeaderComponent {
    // ...
}
```

#### `@PropDefinition`

Annotation for defining component props.

```java
@PropDefinition(required = true, type = String.class)
private String title;
```

#### `@UILayout`

Annotation for defining layout containers.

```java
@UILayout(name = "product-catalog")
@Component
public class ProductCatalogLayout {
    // ...
}
```

#### `@LayoutMapping`

Annotation for mapping URL paths to layout methods.

```java
@LayoutMapping(path = "/catalog/{categoryId}", roles = {"USER", "ADMIN"})
public JsonNode getCatalogLayout(@PathVariable String categoryId) {
    // ...
}
```

## Best Practices

### Component Design

- Design components to be self-contained and reusable
- Use consistent prop naming conventions
- Keep components pure and predictable
- Avoid component-specific global state
- Use clear component naming that reflects purpose

### Layout Management

- Version layouts for backward compatibility
- Validate layouts against component requirements
- Maintain layout fragments for reusable patterns
- Store layouts in a central registry for discovery
- Design layouts with responsive behavior in mind

### Integration Patterns

- Use path-based mapping for server layouts
- Implement proper error boundaries in the frontend
- Cache layouts where appropriate
- Implement proper authentication/authorization checks
- Use feature flags for controlled rollouts

### Performance

- Apply code splitting to lazy load components
- Use memoization for expensive computations
- Keep context objects small and focused
- Implement proper error boundaries
- Measure and monitor component rendering time

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT © MosaicUI