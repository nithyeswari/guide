// src/utils/errorTypes.ts
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

// src/utils/logger.ts
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logQueue: LogEntry[] = [];
  private readonly MAX_QUEUE_SIZE = 100;

  private constructor() {
    window.addEventListener('unload', () => this.flushLogs());
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      error: entry.error ? {
        message: entry.error.message,
        stack: entry.error.stack,
        name: entry.error.name
      } : undefined
    });
  }

  private async sendLogsToServer(logs: LogEntry[]): Promise<void> {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logs),
      });
    } catch (error) {
      console.error('Failed to send logs to server:', error);
      // Store failed logs in localStorage for retry
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
    this.addToQueue({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context
    });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.addToQueue({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context
    });
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.addToQueue({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error,
      context
    });
  }

  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      this.addToQueue({
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        context
      });
    }
  }
}

export const logger = Logger.getInstance();

// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-500 rounded">
          <h2 className="text-red-800 text-lg font-semibold">Something went wrong</h2>
          <p className="text-red-600">Please try refreshing the page</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// src/utils/api.ts
import axios, { AxiosError, AxiosResponse } from 'axios';
import { logger } from './logger';
import { APIError, ErrorSeverity } from './errorTypes';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    // Add request logging
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

api.interceptors.response.use(
  (response: AxiosResponse) => {
    logger.info('API Response', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error: AxiosError) => {
    const severity = error.response?.status 
      ? error.response.status >= 500 
        ? ErrorSeverity.HIGH 
        : ErrorSeverity.MEDIUM
      : ErrorSeverity.CRITICAL;

    const apiError = new APIError(
      error.message,
      error.response?.status || 500,
      severity,
      {
        url: error.config?.url,
        method: error.config?.method,
        response: error.response?.data
      }
    );

    logger.error('API Response Error', apiError);
    return Promise.reject(apiError);
  }
);

export default api;

// Example usage in a component
import { ErrorBoundary } from './components/ErrorBoundary';
import { logger } from './utils/logger';
import api from './utils/api';

const UserProfile = () => {
  const [userData, setUserData] = useState(null);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/api/user/profile');
      setUserData(response.data);
    } catch (error) {
      if (error instanceof APIError) {
        // Handle specific API errors
        switch (error.statusCode) {
          case 401:
            logger.warn('User unauthorized', { userId: userData?.id });
            // Handle unauthorized
            break;
          case 404:
            logger.warn('User profile not found', { userId: userData?.id });
            // Handle not found
            break;
          default:
            logger.error('Failed to fetch user profile', error);
            // Handle other errors
        }
      } else {
        logger.error('Unexpected error in UserProfile component', error);
      }
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="p-4">
          <h2>Unable to load user profile</h2>
          <button onClick={fetchUserData}>Retry</button>
        </div>
      }
    >
      {/* Component content */}
    </ErrorBoundary>
  );
};

// Integration with Redux
import { Middleware } from 'redux';
import { logger } from './utils/logger';

export const errorMiddleware: Middleware = (store) => (next) => (action) => {
  try {
    return next(action);
  } catch (error) {
    logger.error('Redux Error', error, {
      action: action.type,
      payload: action.payload
    });
    throw error;
  }
};

// Store configuration
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(errorMiddleware)
});
