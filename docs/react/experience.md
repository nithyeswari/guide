8# Understanding Experience APIs (BFF Pattern)

## Core Benefits

### 1. Optimized Data Transfer
```javascript
// Without Experience API - Multiple API calls required
const DashboardWithoutBFF = () => {
  const [userData, setUserData] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [notifications, setNotifications] = useState(null);

  useEffect(() => {
    // Multiple API calls
    const fetchData = async () => {
      const user = await fetch('/api/user');
      const prefs = await fetch('/api/preferences');
      const notifs = await fetch('/api/notifications');
      
      setUserData(user);
      setPreferences(prefs);
      setNotifications(notifs);
    };
    fetchData();
  }, []);
};

// With Experience API - Single optimized call
const DashboardWithBFF = () => {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    // Single API call returning optimized payload
    const fetchData = async () => {
      const data = await fetch('/api/dashboard');
      setDashboardData(data);
    };
    fetchData();
  }, []);
};
```

### 2. Device-Specific Optimization

```javascript
// Experience API Implementation
class DashboardExperienceAPI {
  async getDashboardData(device) {
    const baseData = await this.fetchBaseData();
    
    switch(device) {
      case 'mobile':
        return this.optimizeForMobile(baseData);
      case 'tablet':
        return this.optimizeForTablet(baseData);
      case 'desktop':
        return this.optimizeForDesktop(baseData);
      default:
        return baseData;
    }
  }

  optimizeForMobile(data) {
    return {
      ...data,
      images: data.images.map(img => this.compressImage(img)),
      layout: 'single-column',
      features: data.features.filter(f => f.supportsMobile)
    };
  }
}
```

### 3. Error Handling and Response Transformation

```javascript
// Experience API Error Handling
class ExperienceAPIHandler {
  async handleRequest(req, res) {
    try {
      // Aggregate multiple backend services
      const [userData, orderData, analyticsData] = await Promise.all([
        userService.getData(),
        orderService.getData(),
        analyticsService.getData()
      ]);

      // Transform response for client
      const transformedData = this.transformResponse({
        user: userData,
        orders: orderData,
        analytics: analyticsData
      });

      return res.json(transformedData);

    } catch (error) {
      // Standardized error handling
      return res.status(500).json({
        error: this.normalizeError(error),
        userMessage: 'Unable to fetch dashboard data',
        correlationId: req.correlationId
      });
    }
  }

  normalizeError(error) {
    // Standardize error format across different services
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      source: error.service || 'unknown',
      timestamp: new Date().toISOString()
    };
  }
}
```

### 4. Version Management and API Evolution

```javascript
// Experience API Version Management
class VersionedExperienceAPI {
  async handleRequest(version, req) {
    switch(version) {
      case 'v2':
        return this.handleV2Request(req);
      case 'v1':
        return this.handleV1Request(req);
      default:
        throw new Error('Unsupported API version');
    }
  }

  async handleV2Request(req) {
    // New optimized implementation
    const data = await this.fetchEnhancedData();
    return this.transformV2Response(data);
  }

  async handleV1Request(req) {
    // Legacy support
    const data = await this.fetchLegacyData();
    return this.transformV1Response(data);
  }
}
```

### 5. Security and Authentication

```javascript
// Experience API Security Layer
class SecureExperienceAPI {
  constructor() {
    this.tokenManager = new TokenManager();
    this.rateLimiter = new RateLimiter();
  }

  async handleRequest(req) {
    // Rate limiting
    if (!this.rateLimiter.allowRequest(req.ip)) {
      throw new RateLimitError();
    }

    // Token transformation
    const clientToken = req.headers.authorization;
    const serviceToken = await this.tokenManager
      .transformToken(clientToken, 'service-a');

    // Secure service call
    const serviceResponse = await fetch(SERVICE_URL, {
      headers: {
        Authorization: `Bearer ${serviceToken}`
      }
    });

    return this.secureResponse(serviceResponse);
  }
}
```

## Implementation Patterns

### 1. GraphQL Experience API

```javascript
const typeDefs = gql`
  type DashboardData {
    user: User
    recentOrders: [Order]
    notifications: [Notification]
    analytics: Analytics
  }

  type Query {
    dashboard(device: String!): DashboardData
  }
`;

const resolvers = {
  Query: {
    dashboard: async (_, { device }, context) => {
      const data = await Promise.all([
        context.dataSources.userAPI.getUser(),
        context.dataSources.orderAPI.getRecentOrders(),
        context.dataSources.notificationAPI.getNotifications(),
        context.dataSources.analyticsAPI.getAnalytics()
      ]);

      return optimizeForDevice(data, device);
    }
  }
};
```

### 2. REST Experience API

```javascript
class RestExperienceAPI {
  async getDashboardData(req, res) {
    const device = req.headers['user-agent'];
    const userType = req.user.type;

    // Parallel data fetching
    const [userData, analyticsData] = await Promise.all([
      this.userService.getData(req.user.id),
      this.analyticsService.getData(req.user.id)
    ]);

    // Custom response transformation
    const response = this.transformResponse({
      userData,
      analyticsData
    }, device, userType);

    return res.json(response);
  }
}
```

## Best Practices

### 1. Response Optimization
- Remove unnecessary fields
- Compress data structures
- Implement field selection
- Cache common responses

### 2. Error Handling
- Standardize error formats
- Implement retry mechanisms
- Provide meaningful error messages
- Include correlation IDs

### 3. Performance
- Implement caching strategies
- Use parallel requests
- Optimize payload size
- Monitor performance metrics

### 4. Security
- Implement rate limiting
- Validate input data
- Handle authentication/authorization
- Secure sensitive data

### 5. Monitoring
- Log API usage
- Track performance metrics
- Monitor error rates
- Implement health checks

# Experience API Components

## 1. Business Rules Configuration

```javascript
// rules/businessRules.js
const businessRules = {
  userAccess: {
    premium: {
      features: ['advanced-analytics', 'export-data', 'bulk-actions'],
      dataLimit: 1000,
      refreshRate: '1m'
    },
    basic: {
      features: ['basic-analytics'],
      dataLimit: 100,
      refreshRate: '5m'
    }
  },
  
  deviceRules: {
    mobile: {
      imageQuality: 'compressed',
      paginationSize: 10,
      enableFeatures: ['quick-view']
    },
    desktop: {
      imageQuality: 'full',
      paginationSize: 50,
      enableFeatures: ['advanced-filters', 'bulk-select']
    }
  },

  validationRules: {
    orderForm: {
      minimumAmount: 10,
      maximumItems: 50,
      requiredFields: ['shipping', 'billing']
    }
  }
};
```

## 2. Layout Configurations

```javascript
// layouts/layoutConfig.js
const layoutConfigurations = {
  dashboard: {
    mobile: {
      layout: 'single-column',
      widgets: [
        { id: 'summary', size: 'full' },
        { id: 'recent-activity', size: 'full' },
        { id: 'quick-actions', size: 'full' }
      ],
      navigation: 'bottom-tabs'
    },
    desktop: {
      layout: 'grid',
      widgets: [
        { id: 'summary', size: '1/3' },
        { id: 'recent-activity', size: '1/3' },
        { id: 'quick-actions', size: '1/3' },
        { id: 'analytics', size: 'full' }
      ],
      navigation: 'sidebar'
    }
  }
};

// Implementation
class LayoutManager {
  getLayout(page, device, userType) {
    const baseLayout = layoutConfigurations[page][device];
    return this.applyUserCustomizations(baseLayout, userType);
  }

  applyUserCustomizations(layout, userType) {
    if (userType === 'premium') {
      return {
        ...layout,
        widgets: [...layout.widgets, { id: 'premium-features', size: 'full' }]
      };
    }
    return layout;
  }
}
```

## 3. Data Transformations

```javascript
// transformations/dataTransformer.js
class DataTransformer {
  transformResponse(data, device, userType) {
    return {
      ...this.applyDeviceSpecificTransforms(data, device),
      ...this.applyUserTypeTransforms(data, userType),
      ...this.applyLayoutRules(data, device)
    };
  }

  applyDeviceSpecificTransforms(data, device) {
    if (device === 'mobile') {
      return {
        ...data,
        images: data.images.map(img => this.compressImage(img)),
        lists: data.lists.map(list => this.truncateList(list, 5))
      };
    }
    return data;
  }

  applyUserTypeTransforms(data, userType) {
    if (userType === 'basic') {
      return {
        ...data,
        features: data.features.filter(f => !f.premiumOnly)
      };
    }
    return data;
  }
}
```

## 4. Experience API Implementation

```javascript
// ExperienceAPI.js
class ExperienceAPI {
  constructor() {
    this.rules = new BusinessRules();
    this.layouts = new LayoutManager();
    this.transformer = new DataTransformer();
  }

  async getDashboardData(req) {
    const { device, userType } = req;

    // 1. Apply Business Rules
    const applicableRules = this.rules.getRules(userType, device);

    // 2. Get Layout Configuration
    const layout = this.layouts.getLayout('dashboard', device, userType);

    // 3. Fetch Data Based on Rules
    const data = await this.fetchDataWithRules(applicableRules);

    // 4. Transform Data
    const transformedData = this.transformer.transformResponse(data, device, userType);

    // 5. Combine with Layout
    return {
      layout,
      data: transformedData,
      rules: applicableRules
    };
  }

  async fetchDataWithRules(rules) {
    const { dataLimit, refreshRate, features } = rules;

    return Promise.all([
      this.fetchUserData(dataLimit),
      this.fetchFeatures(features),
      this.fetchMetrics(refreshRate)
    ]);
  }
}
```

## 5. Implementation Example

```javascript
// Usage Example
app.get('/api/dashboard', async (req, res) => {
  const experienceAPI = new ExperienceAPI();
  
  try {
    const result = await experienceAPI.getDashboardData({
      device: req.headers['user-agent'],
      userType: req.user.type
    });

    res.json({
      layout: result.layout,
      data: result.data,
      rules: result.rules,
      metadata: {
        version: '1.0',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to process dashboard data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
```

## 6. Validation and Rules Enforcement

```javascript
// validation/validator.js
class RuleValidator {
  validateRequest(request, rules) {
    const violations = [];

    // Check data limits
    if (request.dataSize > rules.dataLimit) {
      violations.push({
        rule: 'dataLimit',
        message: `Data size exceeds limit of ${rules.dataLimit}`
      });
    }

    // Check feature access
    const unauthorizedFeatures = request.features
      .filter(f => !rules.features.includes(f));
    
    if (unauthorizedFeatures.length > 0) {
      violations.push({
        rule: 'featureAccess',
        message: `Unauthorized access to features: ${unauthorizedFeatures.join(', ')}`
      });
    }

    return violations;
  }
}
```

## Best Practices

1. **Rule Management**
   - Keep rules configurable
   - Version control rules
   - Allow for rule overrides
   - Monitor rule effectiveness

2. **Layout Management**
   - Cache layout configurations
   - Support dynamic layouts
   - Enable A/B testing
   - Track layout performance

3. **Data Transformation**
   - Use immutable transformations
   - Cache transformed data
   - Log transformation errors
   - Monitor transformation performance