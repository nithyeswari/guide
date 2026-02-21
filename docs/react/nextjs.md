# Next.js Server-Side Rendering: Complete Implementation Guide

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Server Implementation](#server-implementation)
- [SSR Process](#ssr-process)
- [Design Patterns](#design-patterns)
- [Performance Optimization](#performance-optimization)
- [Deployment Strategies](#deployment-strategies)
- [Best Practices](#best-practices)

## Architecture Overview

### Server Types

1. Development Server
```javascript
// next dev
const devServer = new NextDevServer({
  dir,
  conf: {
    ...nextConfig,
    development: true
  }
})
```

2. Production Server
```javascript
// next start
const prodServer = new NextServer({
  dir,
  conf: nextConfig,
  customServer: false
})
```

3. Edge Runtime
```javascript
export const runtime = 'edge'
export const preferredRegion = 'iad1'

export default function Page() {
  // Runs on edge network
  // Limited Node.js APIs available
}
```

### Core Components

```javascript
// Page Component
export default function Page({ data }) {
  return <Component data={data} />
}

// Server-side Data Fetching
export async function getServerSideProps(context) {
  return {
    props: {
      data: await fetchData()
    }
  }
}

// Server Component
async function ServerComponent() {
  const data = await db.query()
  return <ClientComponent data={data} />
}
```

## Server Implementation

### Basic Server Setup

```javascript
// Custom Server
const app = next({ dev })
const handle = app.getRequestHandler()

const server = http.createServer((req, res) => {
  handle(req, res)
})

// Middleware Configuration
export function middleware(request: NextRequest) {
  // URL rewriting
  if (request.nextUrl.pathname === '/about') {
    return NextResponse.rewrite(new URL('/about-2', request.url))
  }
  
  // Authentication
  if (!isAuthenticated(request)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

### Rendering Pipeline

```javascript
// Internal rendering process
async function renderToHTML(req, res, pathname, query) {
  const renderOpts = {
    supportsDynamicHTML: true,
    runtimeConfig: serverRuntimeConfig,
    disableOptimizedLoading: false,
    optimizeCss: true,
    optimizeImages: true,
    optimizeFonts: true,
  }

  const stream = renderToPipeableStream(
    <App {...renderOpts} />,
    {
      onShellReady() {
        // Send initial HTML shell
        res.setHeader('Content-Type', 'text/html')
        stream.pipe(res)
      },
      onAllReady() {
        // Complete streaming
      }
    }
  )
}
```

## Design Patterns

### Factory Pattern for Components

```javascript
class ComponentFactory {
  createComponent(type, props) {
    switch(type) {
      case 'server':
        return new ServerComponent(props)
      case 'client':
        return new ClientComponent(props)
      default:
        throw new Error('Unknown component type')
    }
  }
}
```

### Observer Pattern for State Management

```javascript
class StateObserver {
  constructor() {
    this.observers = new Set()
  }

  subscribe(observer) {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  notify(state) {
    this.observers.forEach(observer => observer(state))
  }
}
```

### Proxy Pattern for Caching

```javascript
const cacheProxy = new Proxy(Component, {
  get: function(target, property) {
    if (cache.has(property)) {
      return cache.get(property)
    }
    const value = target[property]
    cache.set(property, value)
    return value
  }
})
```

## Performance Optimization

### Caching Strategies

```javascript
// Route Segment Config
export const dynamic = 'force-dynamic'
export const revalidate = 3600
export const fetchCache = 'force-cache'

// Data Fetching
async function getData() {
  const res = await fetch('https://api.example.com', {
    next: { 
      revalidate: 3600,
      tags: ['collection']
    }
  })
  return res.json()
}
```

### Code Splitting

```javascript
// Dynamic Imports
const DynamicComponent = dynamic(() => import('./components/Heavy'), {
  loading: () => <Loading />,
  ssr: true
})

// Route Segments
export default async function Layout({ children }) {
  return (
    <Suspense fallback={<Loading />}>
      {children}
    </Suspense>
  )
}
```

## Deployment Strategies

### Vercel Deployment

```javascript
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "next.config.js",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### Edge Functions

```javascript
export const config = {
  runtime: 'edge',
  regions: ['iad1', 'sfo1', 'hnd1']
}

export default function handler(req) {
  return new Response(JSON.stringify({ 
    data: 'Edge Function Response' 
  }))
}
```

## Best Practices

### Error Handling

```javascript
// Error Boundary
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}

// API Error Handling
export default async function handler(req, res) {
  try {
    const data = await getData()
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    })
  }
}
```

### State Management

```javascript
// Server Actions
async function submitForm(formData: FormData) {
  'use server'
  
  try {
    await processForm(formData)
    revalidatePath('/')
  } catch (error) {
    return { error: error.message }
  }
}

// Client Components
'use client'

export default function Form() {
  const [state, formAction] = useFormState(submitForm, {})
  
  return (
    <form action={formAction}>
      <input name="data" />
      {state.error && <p>{state.error}</p>}
    </form>
  )
}
```

### Performance Monitoring

```javascript
// Custom Metrics
export function reportWebVitals(metric) {
  switch (metric.name) {
    case 'FCP':
      console.log('First Contentful Paint:', metric.value)
      break
    case 'LCP':
      console.log('Largest Contentful Paint:', metric.value)
      break
    case 'CLS':
      console.log('Cumulative Layout Shift:', metric.value)
      break
    case 'FID':
      console.log('First Input Delay:', metric.value)
      break
    case 'TTFB':
      console.log('Time to First Byte:', metric.value)
      break
  }
}
```

## Security Considerations

### Authentication

```javascript
// Middleware Authentication
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Custom authentication logic
  },
  {
    callbacks: {
      authorized: ({ token }) => token?.role === "admin",
    },
  }
)

// Protected API Routes
export default async function handler(req, res) {
  const session = await getSession({ req })
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  // Protected route logic
}
```

### Data Validation

```javascript
// Input Validation
async function validateFormData(formData) {
  const schema = {
    name: (value) => typeof value === 'string' && value.length > 0,
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  }

  const errors = {}
  for (const [key, validator] of Object.entries(schema)) {
    if (!validator(formData.get(key))) {
      errors[key] = `Invalid ${key}`
    }
  }

  return errors
}
```

## Migration Strategies

### From Express to Next.js

```javascript
// Express Route
app.get('/api/data', async (req, res) => {
  const data = await getData()
  res.json(data)
})

// Next.js API Route
// pages/api/data.js
export default async function handler(req, res) {
  const data = await getData()
  res.status(200).json(data)
}

// Express Middleware
app.use(auth)

// Next.js Middleware
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

## Maintenance and Monitoring

### Logging

```javascript
// Custom Logger
const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    }))
  },
  error: (message, error, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: error.message,
      stack: error.stack,
      ...meta
    }))
  }
}

// Usage in API Routes
export default async function handler(req, res) {
  try {
    logger.info('API request received', { 
      path: req.url,
      method: req.method 
    })
    
    const data = await getData()
    res.status(200).json(data)
  } catch (error) {
    logger.error('API request failed', error, { 
      path: req.url,
      method: req.method 
    })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
```

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [React Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Vercel Documentation](https://vercel.com/docs)