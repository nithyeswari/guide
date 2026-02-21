# React Performance Tuning Guide

## How to Read Performance Issues

### 1. Using Chrome DevTools
- Open Chrome DevTools (F12)
- Go to Performance tab
- Click Record and interact with your app
- Look for:
  - Long tasks (red blocks in timeline)
  - Render blocking time
  - JavaScript execution time
  - Layout shifts

### 2. Reading Lighthouse Reports
1. Run Lighthouse audit (Chrome DevTools > Lighthouse)
2. Analyze each metric:
   - Red (0-49): Critical issues
   - Orange (50-89): Needs improvement
   - Green (90-100): Good performance

### 3. React Profiler Reading
1. Enable React Developer Tools
2. Go to Profiler tab
3. Record interactions
4. Look for:
   - Commit duration > 16ms
   - Components that render too often
   - Render phase taking too long

### 4. Bundle Analysis
1. Run webpack-bundle-analyzer
2. Look for:
   - Large chunks
   - Duplicate dependencies
   - Unused code

## Common Issues and Fixes

### 1. Slow Initial Load
```javascript
// Problem: Large main bundle
// Fix: Implement code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Problem: Render-blocking resources
// Fix: Use resource hints
<link rel="preload" href="critical.js" as="script" />
<link rel="preconnect" href="https://api.example.com" />

// Problem: Large images
// Fix: Implement lazy loading and optimization
<img 
  loading="lazy"
  srcSet="small.jpg 300w, large.jpg 900w"
  sizes="(max-width: 300px) 300px, 900px"
  alt="Description"
/>
```

### 2. Runtime Performance
```javascript
// Problem: Excessive re-renders
// Fix: Use React.memo and proper dependencies
const MyComponent = React.memo(({ data }) => {
  return <div>{data.title}</div>;
}, (prevProps, nextProps) => {
  return prevProps.data.id === nextProps.data.id;
});

// Problem: Heavy computations
// Fix: Use useMemo and Web Workers
const heavyComputation = useMemo(() => {
  return expensiveOperation(data);
}, [data]);

// Problem: Event handler recreated each render
// Fix: Use useCallback
const handleClick = useCallback(() => {
  // handle click
}, [dependency]);
```

### 3. Memory Leaks
```javascript
// Problem: Uncleared intervals
// Fix: Clean up in useEffect
useEffect(() => {
  const interval = setInterval(tick, 1000);
  return () => clearInterval(interval);
}, []);

// Problem: Uncancelled API calls
// Fix: Use AbortController
useEffect(() => {
  const abortController = new AbortController();
  fetch(url, { signal: abortController.signal });
  return () => abortController.abort();
}, [url]);
```

## Core Performance Metrics
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1
- Time to Interactive (TTI): < 3.8s

## Quick Performance Wins

### 1. Component Optimization
```javascript
// Use React.memo for expensive renders
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* Complex UI */}</div>
}, (prevProps, nextProps) => {
  return prevProps.data.id === nextProps.data.id;
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// Use useCallback for function props
const handleClick = useCallback(() => {
  // handle click
}, [dependency]);
```

### 2. Code Splitting
```javascript
// Route-based code splitting
const Dashboard = lazy(() => import('./Dashboard'));

// Component-based code splitting
const HeavyChart = lazy(() => import('./HeavyChart'));
```

### 3. Image Optimization
```javascript
// Use next/image if using Next.js
<Image
  src="/large-image.jpg"
  width={800}
  height={600}
  loading="lazy"
  alt="Description"
/>

// Use proper srcset for responsive images
<img
  srcSet="image-400.jpg 400w, image-800.jpg 800w"
  sizes="(max-width: 400px) 400px, 800px"
  loading="lazy"
  alt="Description"
/>
```

## Performance Monitoring Tools

### 1. Lighthouse CLI
```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse https://your-site.com --view
```

### 2. React DevTools Profiler
- Install React Developer Tools browser extension
- Record rendering performance
- Analyze component mount times
- Identify unnecessary re-renders

### 3. Web Vitals Monitoring
```javascript
import { getCLS, getFID, getLCP } from 'web-vitals';

function sendToAnalytics({ name, delta, id }) {
  // Send metrics to your analytics
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
```

## Essential Reference Materials

### Official Documentation
1. [React Performance Documentation](https://react.dev/reference/react/optimization)
   - Comprehensive guide to React's built-in performance features
   - Code splitting strategies
   - Render optimization techniques

2. [Web Vitals](https://web.dev/vitals/)
   - Google's core web vitals metrics
   - Performance measurement guidelines
   - Optimization strategies

3. [React DevTools Documentation](https://react.dev/reference/react/Profiler)
   - Profiler API usage
   - Performance measurement
   - Component analysis

### Performance Monitoring Tools
1. [Lighthouse](https://developers.google.com/web/tools/lighthouse)
   - Performance scoring
   - Accessibility testing
   - Best practices verification

2. [Chrome Performance Tab](https://developer.chrome.com/docs/devtools/performance)
   - Runtime performance analysis
   - Memory leaks detection
   - Network optimization

3. [Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
   - Bundle size analysis
   - Dependency tracking
   - Code splitting opportunities

### Advanced Performance Topics

1. [React Server Components](https://react.dev/reference/react/components#server-components)
   - Zero-bundle-size components
   - Automatic code splitting
   - Streaming rendering

2. [Concurrent Features](https://react.dev/reference/react/useTransition)
   - Suspense for data fetching
   - Transition API
   - Concurrent rendering

3. [Memory Management](https://web.dev/monitor-total-page-memory/)
   - Memory leak prevention
   - Garbage collection optimization
   - Performance profiling

## Community Resources

### Blogs and Articles
1. [Kent C. Dodds Blog](https://kentcdodds.com/blog/usememo-and-usecallback)
   - Performance optimization patterns
   - React hooks best practices
   - State management strategies

2. [Dan Abramov's Blog](https://overreacted.io/)
   - Deep dives into React internals
   - Performance optimization theory
   - React mental models

### Tools and Libraries
1. Performance Monitoring
   - [Sentry](https://sentry.io/)
   - [LogRocket](https://logrocket.com/)
   - [New Relic](https://newrelic.com/)

2. Development Tools
   - [Why Did You Render](https://github.com/welldone-software/why-did-you-render)
   - [React Loading Skeleton](https://github.com/dvtng/react-loading-skeleton)
   - [React Window](https://github.com/bvaughn/react-window)

## Common Performance Issues and Solutions

### 1. Unnecessary Re-renders
- Use React.memo wisely
- Implement proper prop comparison
- Avoid inline object creation

### 2. Large Bundle Sizes
- Implement code splitting
- Use dynamic imports
- Remove unused dependencies

### 3. Slow Initial Load
- Implement server-side rendering
- Use proper caching strategies
- Optimize critical rendering path

### 4. Memory Leaks
- Clean up event listeners
- Cancel unnecessary API calls
- Properly handle component unmounting