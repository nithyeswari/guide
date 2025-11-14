# Full-Stack Development Guide
> Building Modern Applications with Java Backend and React Frontend

## Overview

Full-stack development combines frontend and backend skills to build complete web applications. This guide focuses on the **Java + React** stack, which is widely used in enterprise applications and startups alike.

**What You'll Learn:**
- How to structure full-stack applications
- Integration patterns between React and Java backends
- End-to-end security and authentication
- Deployment and DevOps practices
- Industry patterns from Netflix, Uber, Meta, and more

## Table of Contents

1. [Full Stack Architecture Patterns](#full-stack-architecture-patterns)
2. [Frontend-Backend Integration](#frontend-backend-integration)
3. [Authentication & Authorization](#authentication--authorization)
4. [State Management Across Tiers](#state-management-across-tiers)
5. [API Design & Communication](#api-design--communication)
6. [Security Best Practices](#security-best-practices)
7. [Deployment & DevOps](#deployment--devops)
8. [Industry Patterns](#industry-patterns)
9. [Resources & Tools](#resources--tools)

---

## Full Stack Architecture Patterns

### 1. Layered Architecture
The traditional approach with clear separation of concerns:

```
┌─────────────────────────────────────┐
│   Presentation Layer (React)        │  ← User Interface
├─────────────────────────────────────┤
│   API Gateway (Spring Cloud Gateway)│  ← Routing, Auth
├─────────────────────────────────────┤
│   Business Logic (Spring Boot)      │  ← Services, DTOs
├─────────────────────────────────────┤
│   Data Access Layer (JPA/Hibernate) │  ← Repositories
├─────────────────────────────────────┤
│   Database (PostgreSQL/MongoDB)     │  ← Data Storage
└─────────────────────────────────────┘
```

**When to Use:**
- Traditional web applications
- Monolithic applications
- Small to medium-sized teams
- Predictable requirements

**Resources:**
- [Microsoft Layered Architecture](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

### 2. Microservices Architecture
Distributed services with independent deployments:

```
React Frontend (Single Page App)
         ↓
   API Gateway (Spring Cloud Gateway)
         ↓
    ┌────┴────┬────────┬────────┐
    ↓         ↓        ↓        ↓
  User     Product  Order   Payment
Service   Service  Service  Service
(Spring   (Spring  (Spring  (Spring
 Boot)     Boot)    Boot)    Boot)
```

**When to Use:**
- Large-scale applications
- Multiple teams working independently
- Need for independent scaling
- Polyglot persistence requirements

**Key Patterns:**
- Service Discovery (Eureka, Consul)
- API Gateway (Spring Cloud Gateway, Kong)
- Circuit Breaker (Resilience4j)
- Event-Driven Communication (Kafka, RabbitMQ)

**Resources:**
- [Microservices.io Patterns](https://microservices.io/patterns/index.html)
- [Martin Fowler's Microservices](https://martinfowler.com/articles/microservices.html)
- Detailed guide: [../../core/fs/Microservices.md](../../core/fs/Microservices.md)

### 3. Backend for Frontend (BFF) Pattern
Dedicated backends for different frontend experiences:

```
Mobile App  ──→  Mobile BFF   ─┐
                (Node.js)      │
                               ├──→  Core Services
Web App     ──→  Web BFF       │    (Spring Boot)
                (Spring Boot)  │
                               │
Admin Panel ──→  Admin BFF   ──┘
                (Spring Boot)
```

**When to Use:**
- Multiple client types (web, mobile, desktop)
- Different data requirements per client
- Need for optimized APIs per platform

**Benefits:**
- Optimized data fetching
- Reduced over-fetching
- Client-specific logic encapsulation

---

## Frontend-Backend Integration

### Communication Patterns

#### 1. RESTful API Integration

**Backend (Spring Boot):**
```java
@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    @GetMapping
    public ResponseEntity<List<UserDTO>> getUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PostMapping
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody UserDTO user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                           .body(userService.createUser(user));
    }
}
```

**Frontend (React with Axios):**
```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

export const userService = {
  getAllUsers: async () => {
    const response = await axios.get(`${API_BASE_URL}/users`);
    return response.data;
  },

  createUser: async (user: User) => {
    const response = await axios.post(`${API_BASE_URL}/users`, user);
    return response.data;
  }
};
```

**Frontend (React with React Query):**
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

function Users() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getAllUsers
  });

  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  // Component logic...
}
```

#### 2. GraphQL Integration

**Backend (Spring Boot with GraphQL):**
```java
@Controller
public class UserGraphQLController {

    @QueryMapping
    public List<User> users() {
        return userService.getAllUsers();
    }

    @MutationMapping
    public User createUser(@Argument UserInput input) {
        return userService.createUser(input);
    }
}
```

**Frontend (React with Apollo Client):**
```typescript
import { useQuery, useMutation, gql } from '@apollo/client';

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      name
      email
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($input: UserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`;

function Users() {
  const { data, loading } = useQuery(GET_USERS);
  const [createUser] = useMutation(CREATE_USER);

  // Component logic...
}
```

---

## Authentication & Authorization

### JWT-Based Authentication Flow

**1. Backend Configuration (Spring Security):**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .cors()
            .and()
            .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .authorizeHttpRequests()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            .and()
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

**2. Frontend Authentication Service:**
```typescript
// authService.ts
export const authService = {
  login: async (credentials: LoginCredentials) => {
    const response = await axios.post('/api/auth/login', credentials);
    const { token, user } = response.data;

    // Store token
    localStorage.setItem('token', token);

    // Set default header for future requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    return user;
  },

  logout: () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  },

  getCurrentUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await axios.get('/api/auth/me');
    return response.data;
  }
};
```

**3. Protected Route Component:**
```typescript
// ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

export const ProtectedRoute = ({ children, requiredRole }: Props) => {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  if (!user) return <Navigate to="/login" />;

  if (requiredRole && !user.roles.includes(requiredRole)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};
```

**Resources:**
- Full authentication guide: [../../core/java/Security.md](../../core/java/Security.md)
- End-to-end security: [../../core/fs/e2esecurity.md](../../core/fs/e2esecurity.md)

---

## State Management Across Tiers

### Redux Toolkit with RTK Query

**1. API Slice Definition:**
```typescript
// features/api/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Product'],
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    createUser: builder.mutation<User, Partial<User>>({
      query: (user) => ({
        url: '/users',
        method: 'POST',
        body: user,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const { useGetUsersQuery, useCreateUserMutation } = apiSlice;
```

**2. Using in Components:**
```typescript
function UserList() {
  const { data: users, isLoading, error } = useGetUsersQuery();
  const [createUser] = useCreateUserMutation();

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {users?.map(user => <UserCard key={user.id} user={user} />)}
      <button onClick={() => createUser({ name: 'New User' })}>
        Add User
      </button>
    </div>
  );
}
```

---

## API Design & Communication

### Best Practices

**1. API Versioning:**
```java
// Option 1: URL Versioning
@RequestMapping("/api/v1/users")

// Option 2: Header Versioning
@RequestMapping(value = "/api/users", headers = "API-Version=1")

// Option 3: Media Type Versioning
@RequestMapping(value = "/api/users",
                produces = "application/vnd.company.app-v1+json")
```

**2. Error Handling:**

**Backend:**
```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage(),
            LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException ex) {
        // Handle validation errors
    }
}
```

**Frontend:**
```typescript
// Axios interceptor
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Show unauthorized message
      toast.error('You are not authorized to perform this action');
    } else if (error.response?.status >= 500) {
      // Show server error
      toast.error('Server error. Please try again later');
    }
    return Promise.reject(error);
  }
);
```

**3. Request/Response DTOs:**
```java
// Separate DTOs for request and response
public record CreateUserRequest(
    @NotBlank String username,
    @Email String email,
    @Size(min = 8) String password
) {}

public record UserResponse(
    Long id,
    String username,
    String email,
    LocalDateTime createdAt
    // Never include password in response
) {}
```

---

## Security Best Practices

### OWASP Top 10 Protection

**1. SQL Injection Prevention:**
```java
// ✅ Good: Use JPA/Hibernate with parameterized queries
@Query("SELECT u FROM User u WHERE u.email = :email")
Optional<User> findByEmail(@Param("email") String email);

// ❌ Bad: String concatenation
// entityManager.createQuery("SELECT u FROM User u WHERE u.email = '" + email + "'");
```

**2. XSS Prevention:**

**Backend:**
```java
// Sanitize HTML input
import org.owasp.html.PolicyFactory;

@Component
public class HtmlSanitizer {
    private final PolicyFactory policy = Sanitizers.FORMATTING;

    public String sanitize(String input) {
        return policy.sanitize(input);
    }
}
```

**Frontend:**
```typescript
// React automatically escapes content, but be careful with:
// ❌ Dangerous:
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ✅ Safe:
<div>{userInput}</div>

// For rich text, use DOMPurify:
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(richText)}} />
```

**3. CSRF Protection:**
```java
@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        http.csrf()
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse());
        return http.build();
    }
}
```

**4. CORS Configuration:**
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

**Full Security Guide:** [../../06_Security/](../../06_Security/)

---

## Deployment & DevOps

### Docker Containerization

**Backend Dockerfile:**
```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Frontend Dockerfile:**
```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/myapp
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### CI/CD with GitHub Actions

```yaml
name: Full Stack CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up JDK 21
        uses: actions/setup-java@v3
        with:
          java-version: '21'
          distribution: 'temurin'
      - name: Build with Maven
        run: mvn clean install
      - name: Run tests
        run: mvn test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
```

---

## Industry Patterns

### Netflix Architecture
- **Frontend**: React with server-side rendering
- **API Gateway**: Zuul (migrating to Spring Cloud Gateway)
- **Services**: Java microservices with Spring Boot
- **Communication**: REST + gRPC
- **Data**: Cassandra, Elasticsearch

**Resources:**
- [Netflix Tech Blog](https://netflixtechblog.com/)
- [Netflix OSS](https://netflix.github.io/)
- Detailed pattern: [../../core/fs/Fullstack_Patterns.md](../../core/fs/Fullstack_Patterns.md)

### Uber Architecture
- **Mobile**: React Native
- **Backend**: Go, Java, Node.js (polyglot)
- **Pattern**: Domain-Driven Design
- **Data**: PostgreSQL, MySQL, Redis

**Resources:**
- [Uber Engineering Blog](https://eng.uber.com/)

### Meta (Facebook) Architecture
- **Frontend**: React (they created it!)
- **API Layer**: GraphQL (they created it!)
- **Backend**: PHP, C++, Python, Java
- **Data**: MySQL, Memcached, TAO

**Resources:**
- [Meta Engineering](https://engineering.fb.com/)

---

## Resources & Tools

### Development Tools
- **IDE**: IntelliJ IDEA, VS Code
- **API Testing**: Postman, Insomnia
- **Database**: DBeaver, pgAdmin
- **Container**: Docker Desktop, Podman

### Monitoring & Debugging
- **Logging**: ELK Stack, Splunk
- **Metrics**: Prometheus + Grafana
- **Tracing**: Jaeger, Zipkin
- **APM**: New Relic, Datadog

### Learning Resources
- [Full Stack Resources](../../core/fs/FULL_STACK.md)
- [Engineering Blogs](../../core/fs/blog.md)
- [Industry Leaders' Repos](../../core/fs/INDUSTRY_LEADERS.md)
- [Open Source Projects](../../core/fs/OPEN_SOURCE.md)
- [Tech Lead Guide](../../core/fs/lead_engineer.md)

---

## Next Steps

1. **Learn the Fundamentals:**
   - [Java Development Guide](../00_Programming_Languages/00_Java/index.md)
   - [React Development Guide](../../02_Frontend_Development/00_React/index.md)

2. **Build Projects:**
   - Todo App: React + Spring Boot + PostgreSQL
   - Blog Platform: React + Spring Boot + MongoDB
   - E-commerce: Microservices architecture

3. **Explore Advanced Topics:**
   - [Microservices Architecture](../../04_Software_Architecture/)
   - [Security Best Practices](../../06_Security/)
   - [Cloud Native Development](../../core/fs/cloud.md)

4. **Join Communities:**
   - Spring Boot Community
   - React Community (Reactiflux)
   - r/java, r/reactjs, r/webdev

---

**Remember:** The best way to learn full-stack development is by building real projects. Start small, iterate, and gradually increase complexity!
