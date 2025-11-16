# GitHub Copilot Custom Instructions for React Performance

## Purpose
These instructions guide GitHub Copilot to suggest performance-optimized React patterns. Place this file in your `.github/copilot-instructions.md` or configure in VS Code settings.

---

## React Component Patterns

### Always Suggest:
- Use `React.memo()` for functional components that receive props
- Wrap callback functions in `useCallback()` when passed to child components
- Use `useMemo()` for expensive calculations or object/array creation
- Extract inline styles to constants or use `useMemo`
- Use stable keys (UUIDs, database IDs) for list items, never array indices
- Implement lazy loading with `React.lazy()` and `Suspense` for route components
- Use virtualization (react-window) for lists with more than 50 items

### Never Suggest:
- Inline object literals in JSX props (e.g., `style={{...}}`)
- Inline arrow functions in JSX event handlers without useCallback
- Using array index as key in dynamic lists
- Wildcard imports from large libraries (e.g., `import * as _ from 'lodash'`)
- Direct state mutations
- Unnecessary re-renders from poor state management

---

## Code Generation Rules

### State Management
```typescript
// ✅ GOOD - Memoized selector
const filteredItems = useMemo(
  () => items.filter(item => item.active),
  [items]
);

// ❌ BAD - Creates new array every render
const filteredItems = items.filter(item => item.active);
```

### Event Handlers
```typescript
// ✅ GOOD - Memoized callback
const handleClick = useCallback((id: string) => {
  setSelectedId(id);
}, []);

// ❌ BAD - New function every render
const handleClick = (id: string) => {
  setSelectedId(id);
};
```

### Component Props
```typescript
// ✅ GOOD - Stable object reference
const buttonStyle = useMemo(() => ({
  backgroundColor: theme.primary,
  padding: theme.spacing
}), [theme.primary, theme.spacing]);

return <Button style={buttonStyle} />;

// ❌ BAD - New object every render
return <Button style={{ backgroundColor: theme.primary }} />;
```

### List Rendering
```typescript
// ✅ GOOD - Stable unique key
{items.map(item => (
  <ListItem key={item.id} data={item} />
))}

// ❌ BAD - Index as key
{items.map((item, index) => (
  <ListItem key={index} data={item} />
))}
```

---

## Import Patterns

### Prefer:
```typescript
// Named imports for tree shaking
import { debounce, throttle } from 'lodash-es';
import { format, parseISO } from 'date-fns';
import { Button, Input } from '@/components/ui';
```

### Avoid:
```typescript
// Wildcard imports prevent tree shaking
import * as _ from 'lodash';
import moment from 'moment'; // Use date-fns instead
import * as Components from '@/components';
```

---

## Hook Patterns

### Data Fetching
```typescript
// ✅ GOOD - With caching and cleanup
const useFetchData = (url: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url, { 
          signal: abortController.signal 
        });
        const result = await response.json();
        setData(result);
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    return () => abortController.abort();
  }, [url]);

  return { data, loading, error };
};
```

### Debounced Input
```typescript
// ✅ GOOD - Debounced search
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};
```

---

## Performance Anti-Patterns to Flag

When generating code, avoid these patterns:

1. **Unnecessary useEffect dependencies**
   - Don't include functions that should be memoized
   - Don't omit dependencies that cause stale closures

2. **State updates in render**
   - Never call setState during render phase
   - Use useEffect for side effects

3. **Prop drilling through many levels**
   - Suggest context or state management for deeply nested props

4. **Large component files**
   - Split components over 200 lines into smaller pieces
   - Extract reusable logic into custom hooks

5. **Missing error boundaries**
   - Wrap async components with error boundaries
   - Provide fallback UI for failed loads

---

## Suggested Alternatives

When asked for:
- **Date manipulation** → Suggest `date-fns` over `moment.js`
- **State management** → Suggest `zustand` or `jotai` over heavy Redux setup
- **Form handling** → Suggest `react-hook-form` for performance
- **Animation** → Suggest `framer-motion` with `layoutId` for optimized animations
- **Charts** → Suggest `recharts` with lazy loading
- **Tables** → Suggest `@tanstack/react-table` with virtualization

---

## Comment Patterns

Add performance hints in generated code:
```typescript
// Performance: Memoized to prevent child re-renders
const MemoizedComponent = React.memo(Component);

// Performance: Stable callback reference for child components
const handleSubmit = useCallback(/* ... */, [/* deps */]);

// Performance: Expensive calculation cached between renders
const processedData = useMemo(() => /* ... */, [/* deps */]);

// Performance: Virtualized list for large datasets
<VirtualizedList items={largeDataset} itemHeight={50} />
```

---

## Testing Suggestions

When generating tests, include performance assertions:
```typescript
// Suggest render count tests
it('should not re-render unnecessarily', () => {
  const renderCount = jest.fn();
  const { rerender } = render(<Component onRender={renderCount} />);
  
  rerender(<Component onRender={renderCount} />);
  
  expect(renderCount).toHaveBeenCalledTimes(1);
});

// Suggest memoization tests
it('should memoize expensive calculations', () => {
  const expensiveCalc = jest.fn();
  const { rerender } = render(<Component calc={expensiveCalc} />);
  
  rerender(<Component calc={expensiveCalc} />);
  
  expect(expensiveCalc).toHaveBeenCalledTimes(1);
});
```

---

## Priority Order for Suggestions

1. **Correctness** - Code must work correctly
2. **Performance** - Optimize for minimal re-renders and bundle size
3. **Readability** - Clear, maintainable code
4. **Type Safety** - Full TypeScript support
5. **Accessibility** - ARIA attributes and keyboard navigation

---

## Financial Services Specific

Given this is for banking/financial applications:
- Prioritize security in all suggestions
- Use immutable data patterns
- Implement proper error handling for financial calculations
- Suggest decimal.js for precise financial calculations
- Include audit logging patterns
- Recommend optimistic UI updates with rollback

---

*These instructions should be reviewed quarterly and updated based on team feedback and evolving best practices.*
