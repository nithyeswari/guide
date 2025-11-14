# React Development Guide
> Modern React development with TypeScript, Hooks, and best practices

## Quick Navigation

- [Implementation Patterns](../00_React_Frontend_Patterns.md) - **Start here for practical patterns**
- [Core Concepts](#core-concepts)
- [Advanced Topics](#advanced-topics)
- [Performance](#performance)
- [Testing](#testing)
- [Resources](#resources)

---

## Overview

React is a declarative, component-based JavaScript library for building user interfaces. This guide covers modern React development (React 18+) with TypeScript, focusing on practical patterns and enterprise best practices.

**What You'll Learn:**
- Modern React patterns (Hooks, Suspense, Server Components)
- State management strategies (Context, Redux Toolkit, React Query)
- Performance optimization techniques
- Testing strategies
- Production-ready patterns

---

## Core Concepts

### 1. Components & JSX

**Functional Components (Modern Approach)**

```typescript
// TypeScript functional component with props
interface UserCardProps {
  name: string;
  email: string;
  avatar?: string;
}

export const UserCard: React.FC<UserCardProps> = ({ name, email, avatar }) => {
  return (
    <div className="user-card">
      {avatar && <img src={avatar} alt={name} />}
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  );
};
```

### 2. Hooks (React 18+)

**Essential Hooks:**

```typescript
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// State management
const [count, setCount] = useState(0);

// Side effects
useEffect(() => {
  document.title = `Count: ${count}`;
}, [count]);

// Memoized callbacks
const handleClick = useCallback(() => {
  setCount(c => c + 1);
}, []);

// Memoized values
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Refs
const inputRef = useRef<HTMLInputElement>(null);
```

### 3. State Management

**Local State:**
```typescript
const [user, setUser] = useState<User | null>(null);
```

**Context API:**
```typescript
const UserContext = createContext<User | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
```

**See:** [State Management Patterns](../00_React_Frontend_Patterns.md#state-management-patterns)

---

## Advanced Topics

### Error Handling

**Error Boundaries:**

React Error Boundaries catch JavaScript errors in component trees, log errors, and display fallback UIs.

```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <MyComponent />
</ErrorBoundary>
```

**📚 Full Implementation:** [Error Handling Patterns](../00_React_Frontend_Patterns.md#error-handling-patterns)

### Context & Providers

**Journey/Wizard Pattern:**

Manage complex multi-step workflows with shared state.

```typescript
<JourneyProvider>
  <ChannelList />
  <ChannelForm />
  <ChannelDetail />
</JourneyProvider>
```

**📚 Full Implementation:** [Context & Provider Patterns](../00_React_Frontend_Patterns.md#context--provider-patterns)

### Component Composition

**Compound Components:**

```typescript
<Tabs defaultTab="profile">
  <TabList>
    <Tab id="profile">Profile</Tab>
    <Tab id="settings">Settings</Tab>
  </TabList>
  <TabPanel id="profile"><ProfileContent /></TabPanel>
  <TabPanel id="settings"><SettingsContent /></TabPanel>
</Tabs>
```

**📚 Full Implementation:** [Component Design Patterns](../00_React_Frontend_Patterns.md#component-design-patterns)

### Dynamic UI

**Schema-Driven Forms:**

Generate forms dynamically from JSON schemas.

```typescript
const schema = {
  title: 'User Registration',
  fields: [
    { name: 'username', type: 'text', label: 'Username', required: true },
    { name: 'email', type: 'text', label: 'Email', required: true },
    { name: 'role', type: 'select', label: 'Role', options: [...] }
  ]
};

<DynamicForm schema={schema} onSubmit={handleSubmit} />
```

**📚 Full Implementation:** [Dynamic UI Patterns](../00_React_Frontend_Patterns.md#dynamic-ui-patterns)

---

## Performance

### Code Splitting

```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

### Memoization

```typescript
// Memoize component
const MemoizedComponent = memo(ExpensiveComponent);

// Memoize values
const memoizedValue = useMemo(() => computeExpensive(a, b), [a, b]);

// Memoize callbacks
const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);
```

### Virtual Scrolling

For large lists (1000+ items), use virtualization:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50
});
```

**📚 Full Implementation:** [Performance Optimization Patterns](../00_React_Frontend_Patterns.md#performance-optimization-patterns)

---

## Testing

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('handles button click', async () => {
  render(<Counter />);

  const button = screen.getByRole('button', { name: 'Increment' });
  await userEvent.click(button);

  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### Integration Testing

```typescript
test('complete user flow', async () => {
  render(<App />);

  // Navigate
  await userEvent.click(screen.getByText('Login'));

  // Fill form
  await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'password123');

  // Submit
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

  // Assert
  await waitFor(() => {
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
  });
});
```

**📚 Full Implementation:** [Testing Patterns](../00_React_Frontend_Patterns.md#testing-patterns)

---

## React Ecosystem

### State Management Libraries

**Redux Toolkit (Recommended)**

```typescript
import { createSlice, configureStore } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, loading: false },
  reducers: {
    setUser: (state, action) => {
      state.data = action.payload;
    }
  }
});

export const store = configureStore({
  reducer: {
    user: userSlice.reducer
  }
});
```

**React Query (Server State)**

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId)
});

const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
  }
});
```

### UI Libraries

- **Material-UI (MUI)**: Comprehensive component library
- **Chakra UI**: Accessible, composable components
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Copy-paste component library

### Routing

**React Router v6**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';

<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/users/:id" element={<UserProfile />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>
```

### Form Libraries

- **React Hook Form**: Performance-focused forms
- **Formik**: Complete form solution
- **Zod**: TypeScript-first schema validation

---

## Best Practices Checklist

### ✅ Component Design
- [ ] Use functional components with hooks
- [ ] Keep components small and focused (< 200 lines)
- [ ] Extract reusable logic into custom hooks
- [ ] Use TypeScript for type safety
- [ ] Follow naming conventions (PascalCase for components)

### ✅ State Management
- [ ] Lift state only when necessary
- [ ] Use Context for shared UI state
- [ ] Use Redux for complex global state
- [ ] Use React Query for server state
- [ ] Avoid prop drilling (max 2-3 levels)

### ✅ Performance
- [ ] Implement code splitting for routes
- [ ] Use React.memo for expensive components
- [ ] Memoize callbacks and values appropriately
- [ ] Use virtual scrolling for long lists
- [ ] Optimize images (lazy loading, WebP)

### ✅ Error Handling
- [ ] Wrap components in Error Boundaries
- [ ] Handle async errors in try-catch
- [ ] Provide user-friendly error messages
- [ ] Log errors to monitoring service

### ✅ Testing
- [ ] Write tests for critical paths
- [ ] Test user interactions, not implementation
- [ ] Mock external dependencies
- [ ] Achieve >80% code coverage
- [ ] Run tests in CI/CD pipeline

### ✅ Accessibility
- [ ] Use semantic HTML
- [ ] Add ARIA labels where needed
- [ ] Ensure keyboard navigation works
- [ ] Test with screen readers
- [ ] Maintain color contrast ratios

---

## Common Patterns

### Data Fetching Pattern

```typescript
const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await api.get(`/users/${userId}`);
        if (!cancelled) {
          setUser(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { user, loading, error };
};
```

### Form Handling Pattern

```typescript
const useForm = <T extends Record<string, any>>(initialValues: T) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const handleChange = (name: keyof T) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setValues(prev => ({ ...prev, [name]: e.target.value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (validationRules: ValidationRules<T>): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};

    for (const [field, rules] of Object.entries(validationRules)) {
      const value = values[field as keyof T];
      const error = rules(value);
      if (error) {
        newErrors[field as keyof T] = error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
  };

  return { values, errors, handleChange, validate, reset };
};
```

---

## Learning Resources

### Official Documentation
- [React Documentation](https://react.dev/) - Official React docs
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### Books
- "Learning React" by Alex Banks & Eve Porcello
- "React Design Patterns" by Carlos Santana
- "Fullstack React" by Anthony Accomazzo

### Online Courses
- [Epic React](https://epicreact.dev/) by Kent C. Dodds
- [React - The Complete Guide](https://www.udemy.com/course/react-the-complete-guide/)
- [Testing JavaScript](https://testingjavascript.com/) by Kent C. Dodds

### Community
- [React Discord](https://discord.gg/react)
- [Reactiflux](https://www.reactiflux.com/)
- [r/reactjs](https://www.reddit.com/r/reactjs/)

---

## Next Steps

1. **Master the Basics**: [React Official Tutorial](https://react.dev/learn)
2. **Learn Patterns**: [Implementation Patterns Guide](../00_React_Frontend_Patterns.md)
3. **Full Stack Integration**: [Full Stack Development](../../01_Foundations/02_Full_Stack_Development/index.md)
4. **Advanced Topics**: Explore micro frontends, SSR, and React Server Components

---

## Related Guides

- [Java Backend Patterns](../../03_Backend_Development/00_Java_Backend_Patterns.md)
- [Full Stack Patterns](../../01_Foundations/02_Full_Stack_Development/index.md)
- [Testing Strategies](../../05_Quality_and_Testing/)
- [Performance Optimization](../00_React_Frontend_Patterns.md#performance-optimization-patterns)

---

**Remember:** React is just JavaScript! Focus on JavaScript fundamentals, and React patterns will make more sense.