# React Frontend Implementation Patterns & Strategies
> Comprehensive guide to implementing production-ready React patterns with TypeScript

## Table of Contents

1. [Error Handling Patterns](#error-handling-patterns)
2. [State Management Patterns](#state-management-patterns)
3. [Context & Provider Patterns](#context--provider-patterns)
4. [Component Design Patterns](#component-design-patterns)
5. [Performance Optimization Patterns](#performance-optimization-patterns)
6. [Dynamic UI Patterns](#dynamic-ui-patterns)
7. [Testing Patterns](#testing-patterns)
8. [Micro Frontend Patterns](#micro-frontend-patterns)

---

## Error Handling Patterns

### Comprehensive Error Boundary Pattern

**Problem:** React components can throw errors that crash the entire app. Need graceful error handling with logging.

**Solution:** Multi-level error boundaries with typed errors and centralized logging.

#### When to Use
- Production applications requiring robust error handling
- Applications with third-party components
- Need for error tracking and monitoring
- User-friendly error recovery

#### Implementation Strategy

**1. Define Error Types**

```typescript
// src/types/errorTypes.ts
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: ErrorSeverity,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class APIError extends AppError {
  constructor(
    message: string,
    public statusCode: number,
    severity: ErrorSeverity,
    metadata?: Record<string, any>
  ) {
    super(message, `API_${statusCode}`, severity, metadata);
    this.name = 'APIError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public fields: string[],
    metadata?: Record<string, any>
  ) {
    super(message, 'VALIDATION_ERROR', ErrorSeverity.MEDIUM, metadata);
    this.name = 'ValidationError';
  }
}
```

**2. Centralized Logger**

```typescript
// src/utils/logger.ts
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private static instance: Logger;
  private logQueue: LogEntry[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly FLUSH_INTERVAL = 10000; // 10 seconds

  private constructor() {
    // Flush logs periodically
    setInterval(() => this.flushLogs(), this.FLUSH_INTERVAL);

    // Flush logs before page unload
    window.addEventListener('beforeunload', () => this.flushLogs());
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private async sendLogsToServer(logs: LogEntry[]): Promise<void> {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logs),
      });
    } catch (error) {
      console.error('Failed to send logs:', error);
      // Store in localStorage for retry
      const failedLogs = JSON.parse(localStorage.getItem('failedLogs') || '[]');
      localStorage.setItem('failedLogs', JSON.stringify([...failedLogs, ...logs]));
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length > 0) {
      await this.sendLogsToServer([...this.logQueue]);
      this.logQueue = [];
    }
  }

  private addToQueue(entry: LogEntry): void {
    this.logQueue.push(entry);
    if (this.logQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flushLogs();
    }
  }

  info(message: string, context?: Record<string, any>): void {
    console.info(message, context);
    this.addToQueue({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context
    });
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    console.error(message, error, context);
    this.addToQueue({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error,
      context
    });
  }
}

export const logger = Logger.getInstance();
```

**3. Error Boundary Component**

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';
import { AppError } from '../types/errorTypes';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'page' | 'component';
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, level = 'component' } = this.props;

    logger.error(`${level} Error Boundary caught an error`, error, {
      componentStack: errorInfo.componentStack,
      level
    });

    onError?.(error, errorInfo);

    // Send to error tracking service (e.g., Sentry)
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <div className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error.message}</pre>
          </details>
          <button onClick={this.resetError}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**4. API Error Handling**

```typescript
// src/utils/api.ts
import axios, { AxiosError, AxiosInstance } from 'axios';
import { logger } from './logger';
import { APIError, ErrorSeverity } from '../types/errorTypes';

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Add auth token
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add correlation ID
      config.headers['X-Correlation-ID'] = generateCorrelationId();

      logger.info('API Request', {
        url: config.url,
        method: config.method,
        params: config.params
      });

      return config;
    },
    (error) => {
      logger.error('API Request Error', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => {
      logger.info('API Response Success', {
        url: response.config.url,
        status: response.status
      });
      return response;
    },
    (error: AxiosError) => {
      const severity = determineSeverity(error);

      const apiError = new APIError(
        error.response?.data?.message || error.message,
        error.response?.status || 500,
        severity,
        {
          url: error.config?.url,
          method: error.config?.method,
          response: error.response?.data
        }
      );

      logger.error('API Response Error', apiError);

      // Handle specific error codes
      if (error.response?.status === 401) {
        // Redirect to login
        window.location.href = '/login';
      }

      return Promise.reject(apiError);
    }
  );

  return client;
};

const determineSeverity = (error: AxiosError): ErrorSeverity => {
  const status = error.response?.status;
  if (!status) return ErrorSeverity.CRITICAL;
  if (status >= 500) return ErrorSeverity.HIGH;
  if (status >= 400) return ErrorSeverity.MEDIUM;
  return ErrorSeverity.LOW;
};

const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const api = createApiClient();
```

**5. Usage Example**

```typescript
// src/components/UserProfile.tsx
import { ErrorBoundary } from './ErrorBoundary';
import { api } from '../utils/api';
import { APIError } from '../types/errorTypes';

export const UserProfile: React.FC = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setError(null);
      const response = await api.get('/user/profile');
      setUser(response.data);
    } catch (err) {
      if (err instanceof APIError) {
        switch (err.statusCode) {
          case 404:
            setError('User profile not found');
            break;
          case 403:
            setError('You do not have permission to view this profile');
            break;
          default:
            setError('Failed to load profile');
        }
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <ErrorBoundary
      level="component"
      fallback={(error, reset) => (
        <div className="error-card">
          <h3>Unable to load profile</h3>
          <button onClick={reset}>Retry</button>
        </div>
      )}
    >
      {error && <div className="alert alert-error">{error}</div>}
      {/* Component content */}
    </ErrorBoundary>
  );
};
```

#### Best Practices

✅ **DO:**
- Use multiple error boundary levels (app, page, component)
- Log all errors with context
- Provide user-friendly error messages
- Implement retry mechanisms
- Track errors in production
- Clear sensitive data from error logs

❌ **DON'T:**
- Don't expose technical details to users
- Don't ignore errors silently
- Don't use error boundaries for flow control
- Don't forget to handle promise rejections

---

## State Management Patterns

### Context + Provider Pattern (Journey/Wizard Management)

**Problem:** Need to manage complex multi-step workflows with shared state across components.

**Solution:** Custom context provider with encapsulated business logic.

#### When to Use
- Multi-step forms or wizards
- Application-wide workflows
- Shared state without Redux overhead
- Cross-component communication

#### Implementation Strategy

**1. Define Context Shape**

```typescript
// src/contexts/JourneyContext.tsx
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type JourneyStep = 'list' | 'detail' | 'form' | 'confirmation';
type OperationType = 'read' | 'write';

interface Channel {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

interface JourneyContextValue {
  // State
  currentStep: JourneyStep;
  operationType: OperationType;
  channels: Channel[];
  currentChannel: Channel | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  navigateTo: (step: JourneyStep, channelId?: string) => void;
  setOperation: (type: OperationType) => void;
  addChannel: (channel: Omit<Channel, 'id' | 'createdAt'>) => Promise<Channel>;
  updateChannel: (id: string, updates: Partial<Channel>) => Promise<void>;
  deleteChannel: (id: string) => Promise<void>;
  clearError: () => void;
}

const JourneyContext = createContext<JourneyContextValue | undefined>(undefined);
```

**2. Implement Provider**

```typescript
export const JourneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<JourneyStep>('list');
  const [operationType, setOperationType] = useState<OperationType>('read');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation
  const navigateTo = useCallback((step: JourneyStep, channelId?: string) => {
    setError(null);
    setCurrentStep(step);

    if (channelId) {
      const channel = channels.find(c => c.id === channelId);
      if (channel) {
        setCurrentChannel(channel);
      } else {
        setError('Channel not found');
      }
    } else {
      setCurrentChannel(null);
    }
  }, [channels]);

  // Operations
  const setOperation = useCallback((type: OperationType) => {
    setOperationType(type);
    setError(null);
  }, []);

  // CRUD Operations
  const addChannel = useCallback(async (channelData: Omit<Channel, 'id' | 'createdAt'>) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validation
      if (!channelData.name?.trim()) {
        throw new Error('Channel name is required');
      }

      // API call (example)
      const response = await api.post<Channel>('/channels', channelData);
      const newChannel = response.data;

      setChannels(prev => [...prev, newChannel]);
      return newChannel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add channel';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateChannel = useCallback(async (id: string, updates: Partial<Channel>) => {
    try {
      setIsLoading(true);
      setError(null);

      await api.patch(`/channels/${id}`, updates);

      setChannels(prev =>
        prev.map(channel =>
          channel.id === id
            ? { ...channel, ...updates, updatedAt: new Date().toISOString() }
            : channel
        )
      );

      if (currentChannel?.id === id) {
        setCurrentChannel(prev => ({ ...prev!, ...updates }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update channel';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentChannel]);

  const deleteChannel = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await api.delete(`/channels/${id}`);

      setChannels(prev => prev.filter(channel => channel.id !== id));

      if (currentChannel?.id === id) {
        setCurrentChannel(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete channel';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentChannel]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: JourneyContextValue = {
    currentStep,
    operationType,
    channels,
    currentChannel,
    isLoading,
    error,
    navigateTo,
    setOperation,
    addChannel,
    updateChannel,
    deleteChannel,
    clearError
  };

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
};
```

**3. Custom Hook**

```typescript
export const useJourney = (): JourneyContextValue => {
  const context = useContext(JourneyContext);

  if (!context) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }

  return context;
};
```

**4. Usage in Components**

```typescript
// src/components/ChannelList.tsx
export const ChannelList: React.FC = () => {
  const { channels, navigateTo, setOperation, isLoading, error } = useJourney();

  const handleChannelClick = (channelId: string) => {
    setOperation('read');
    navigateTo('detail', channelId);
  };

  const handleCreateNew = () => {
    setOperation('write');
    navigateTo('form');
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {error && <ErrorMessage message={error} />}
      <button onClick={handleCreateNew}>Create Channel</button>
      <div>
        {channels.map(channel => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onClick={() => handleChannelClick(channel.id)}
          />
        ))}
      </div>
    </div>
  );
};

// src/components/ChannelForm.tsx
export const ChannelForm: React.FC = () => {
  const { currentChannel, addChannel, updateChannel, navigateTo, isLoading, error } = useJourney();
  const [formData, setFormData] = useState({
    name: currentChannel?.name || '',
    description: currentChannel?.description || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (currentChannel) {
        await updateChannel(currentChannel.id, formData);
      } else {
        await addChannel(formData);
      }
      navigateTo('list');
    } catch (err) {
      // Error handled by context
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorMessage message={error} />}
      <input
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading}>
        {currentChannel ? 'Update' : 'Create'}
      </button>
    </form>
  );
};
```

#### Best Practices

✅ **DO:**
- Use `useCallback` for action functions
- Validate data before state updates
- Handle loading and error states
- Provide clear error messages
- Use TypeScript for type safety
- Split large contexts into smaller ones

❌ **DON'T:**
- Don't put everything in one context
- Don't forget error boundaries around providers
- Don't update state directly
- Don't skip validation

---

## Component Design Patterns

### Compound Components Pattern

**Problem:** Need flexible, composable components with shared state.

**Solution:** Parent component shares state with children through context.

```typescript
// src/components/Tabs/Tabs.tsx
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

export const Tabs: React.FC<{ defaultTab: string; children: ReactNode }> = ({
  defaultTab,
  children
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
};

export const TabList: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <div className="tab-list">{children}</div>;
};

export const Tab: React.FC<{ id: string; children: ReactNode }> = ({ id, children }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');

  const { activeTab, setActiveTab } = context;

  return (
    <button
      className={`tab ${activeTab === id ? 'active' : ''}`}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  );
};

export const TabPanel: React.FC<{ id: string; children: ReactNode }> = ({ id, children }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  const { activeTab } = context;

  if (activeTab !== id) return null;

  return <div className="tab-panel">{children}</div>;
};

// Usage
<Tabs defaultTab="profile">
  <TabList>
    <Tab id="profile">Profile</Tab>
    <Tab id="settings">Settings</Tab>
  </TabList>
  <TabPanel id="profile">
    <ProfileContent />
  </TabPanel>
  <TabPanel id="settings">
    <SettingsContent />
  </TabPanel>
</Tabs>
```

### Render Props Pattern

**Problem:** Need to share logic between components with different render outputs.

```typescript
interface MousePosition {
  x: number;
  y: number;
}

interface MouseTrackerProps {
  render: (position: MousePosition) => ReactNode;
}

const MouseTracker: React.FC<MouseTrackerProps> = ({ render }) => {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return <>{render(position)}</>;
};

// Usage
<MouseTracker
  render={({ x, y }) => (
    <div>Mouse position: {x}, {y}</div>
  )}
/>
```

---

## Performance Optimization Patterns

### Code Splitting with Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

// Lazy load components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));

// Loading component
const PageLoader = () => (
  <div className="page-loader">
    <Spinner />
    <p>Loading...</p>
  </div>
);

// Route configuration
export const App = () => {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Suspense>
    </Router>
  );
};
```

### Memoization Pattern

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive computations
const ExpensiveComponent: React.FC<{ data: Data[] }> = memo(({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      computed: expensiveCalculation(item)
    }));
  }, [data]);

  const handleClick = useCallback((id: string) => {
    console.log('Clicked:', id);
  }, []);

  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} data={item} onClick={handleClick} />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data.length === nextProps.data.length;
});
```

### Virtual Scrolling Pattern

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export const VirtualList: React.FC<{ items: Item[] }> = ({ items }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <ItemComponent item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Dynamic UI Patterns

### Schema-Driven UI Pattern

**Problem:** Need to generate UI dynamically based on configuration.

```typescript
interface FieldSchema {
  name: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  label: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface FormSchema {
  title: string;
  fields: FieldSchema[];
  submitLabel: string;
}

const DynamicForm: React.FC<{ schema: FormSchema; onSubmit: (data: any) => void }> = ({
  schema,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const renderField = (field: FieldSchema) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            name={field.name}
            required={field.required}
            value={formData[field.name] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
          />
        );

      case 'select':
        return (
          <select
            name={field.name}
            required={field.required}
            value={formData[field.name] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      // ... other field types
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <h2>{schema.title}</h2>
      {schema.fields.map(field => (
        <div key={field.name} className="form-field">
          <label>{field.label}</label>
          {renderField(field)}
        </div>
      ))}
      <button type="submit">{schema.submitLabel}</button>
    </form>
  );
};

// Usage
const schema: FormSchema = {
  title: 'User Registration',
  fields: [
    { name: 'username', type: 'text', label: 'Username', required: true },
    { name: 'email', type: 'text', label: 'Email', required: true },
    { name: 'role', type: 'select', label: 'Role', options: [
      { value: 'user', label: 'User' },
      { value: 'admin', label: 'Admin' }
    ]}
  ],
  submitLabel: 'Register'
};

<DynamicForm schema={schema} onSubmit={handleSubmit} />
```

---

## Testing Patterns

### Component Testing with React Testing Library

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('renders user information', () => {
    render(<UserProfile userId="123" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const onSubmit = jest.fn();
    render(<UserProfile onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
    });
  });

  it('displays error message on API failure', async () => {
    // Mock API failure
    jest.spyOn(api, 'get').mockRejectedValue(new Error('API Error'));

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
    });
  });
});
```

---

## Summary

This guide covered essential React patterns:

- **Error Handling**: Boundaries, logging, API errors
- **State Management**: Context + Provider pattern
- **Component Design**: Compound components, render props
- **Performance**: Code splitting, memoization, virtual scrolling
- **Dynamic UI**: Schema-driven forms
- **Testing**: RTL patterns

### Next Steps

1. Review [Full Stack Integration](../01_Foundations/02_Full_Stack_Development/index.md)
2. Explore [Advanced React Patterns](../../core/react/)
3. Study [Performance Optimization](../../05_Quality_and_Testing/)

---

**Remember:** Choose patterns based on your specific needs. Not every pattern fits every scenario!
