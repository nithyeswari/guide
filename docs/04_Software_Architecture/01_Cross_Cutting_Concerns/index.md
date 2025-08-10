# Cross-Cutting Concerns

This document describes how to handle cross-cutting concerns in a microservices architecture.

## Custom Annotations for Cross-Cutting Concerns (Java)

Here are some examples of custom annotations that can be used to handle cross-cutting concerns in a declarative way in Java.

### `example.java`

```java
/**
 * @SecureEndpoint - Unified annotation for secure API endpoints
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Operation(summary = "${description}")
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "Success"),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "403", description = "Forbidden"),
    @ApiResponse(responseCode = "429", description = "Rate limit exceeded")
})
@PreAuthorize("hasAnyRole(#root.this.this.rolesArray)")
@RateLimiter(name = "api")
@Timed(value = "http.server.requests", extraTags = {"secured", "true"})
public @interface SecureEndpoint {
    String description();
    String[] roles() default {"ROLE_USER"};
}

/**
 * @CriticalOperation - Unified annotation for critical business operations
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@CircuitBreaker(name = "critical", fallbackMethod = "criticalOperationFallback")
@Retry(name = "critical", fallbackMethod = "criticalOperationRetryFallback")
@Timeout(name = "critical")
@Bulkhead(name = "critical", type = Bulkhead.Type.THREADPOOL)
@Timed(value = "critical.operation", histogram = true)
@Counted(value = "critical.operation.count")
public @interface CriticalOperation {
    String description() default "";
    String owner() default "core-team";
    boolean logParameters() default false;
}

// ... and so on for other annotations
```

## List of Cross-Cutting Concerns

This table provides a list of common cross-cutting concerns, the annotations used to handle them, their purpose, configuration, and benefits.

| Layer | Concern | Annotation | Purpose | Configuration | Benefits |
|---|---|---|---|---|---|
| Unified API | SecureEndpoint | @SecureEndpoint | Combines security + rate limiting + monitoring | Custom meta-annotation | Single annotation for all public endpoints |
| ... | ... | ... | ... | ... | ... |

(Content from list.csv)

## React Cross-Cutting Concerns

### Exception Handling

This example shows how to implement a robust error handling and logging strategy in a React application.

#### `Exception.tsx`

```tsx
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

// ... (rest of the content from Exception.tsx)
```

### Journey Provider

This example shows how to use a React Context to manage the state of a user journey, including the current step, operation type, loading state, and error state.

#### `JourneyProvider.tsx`

```tsx
// src/context/JourneyContext.js
import { createContext, useContext, useState } from 'react';

const JourneyContext = createContext();

export const JourneyProvider = ({ children }) => {
  // ... (rest of the content from JourneyProvider.tsx)
};

export const useJourney = () => {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }
  return context;
};
```