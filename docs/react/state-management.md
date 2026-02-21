
# React State Management Guide

## 1. Local State Management

### useState Hook
```jsx
const [state, setState] = useState(initialValue);
```
Best for:
- Simple component-level state
- Form inputs
- UI toggles
- Small data objects

### useReducer Hook
```jsx
const [state, dispatch] = useReducer(reducer, initialState);
```
Best for:
- Complex state logic
- Multiple related state values
- State transitions with specific business logic
- When next state depends on previous state

## 2. Global State Management

### Context API
Best for:
- Theme management
- User authentication state
- Language preferences
- Shared data between components
- Medium-sized applications

```jsx
// Creating context
const AppContext = createContext();

// Provider
const AppProvider = ({ children }) => {
  const [state, setState] = useState(initialState);
  return (
    <AppContext.Provider value={{ state, setState }}>
      {children}
    </AppContext.Provider>
  );
};

// Using context
const Component = () => {
  const { state, setState } = useContext(AppContext);
};
```

### Redux Toolkit
Best for:
- Large applications
- Complex state interactions
- When you need strong dev tools
- Team projects requiring strict patterns

```jsx
// Store setup
const store = configureStore({
  reducer: {
    users: usersReducer,
    posts: postsReducer,
  },
});

// Slice example
const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    addUser: (state, action) => {
      state.users.push(action.payload);
    },
  },
});
```

### Zustand
Best for:
- Medium-sized applications
- When you want Redux-like state with less boilerplate
- Modern React projects

```jsx
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

## 3. Server State Management

### React Query
Best for:
- API data caching
- Server state synchronization
- Real-time data updates
- Automatic background refetching

```jsx
const { data, isLoading } = useQuery('todos', fetchTodos);
```

### SWR
Best for:
- Data fetching
- Caching
- Real-time data
- When you need a lighter alternative to React Query

```jsx
const { data, error } = useSWR('/api/data', fetcher);
```

## 4. Form State Management

### React Hook Form
Best for:
- Complex forms
- Form validation
- Performance-critical forms
- When you need good form state management

```jsx
const { register, handleSubmit } = useForm();
```

## 5. State Management Patterns

### 1. State Colocation
Keep state as close as possible to where it's used:
```jsx
// Good
const ParentComponent = () => {
  return (
    <>
      <ChildA />
      <ChildB />
    </>
  );
};

const ChildA = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
```

### 2. State Lifting
Lift state up when multiple components need it:
```jsx
const Parent = () => {
  const [shared, setShared] = useState(null);
  return (
    <>
      <ChildA shared={shared} setShared={setShared} />
      <ChildB shared={shared} />
    </>
  );
};
```

### 3. Compound Components Pattern
For complex component state sharing:
```jsx
const Tabs = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
};
```

## 6. Best Practices

### 1. State Organization
- Separate local and global state
- Use appropriate tools for different types of state
- Keep state minimal and normalized

### 2. Performance Optimization
```jsx
// Use memo for expensive calculations
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);

// Use callback for function props
const memoizedCallback = useCallback(
  () => {
    doSomething(a, b);
  },
  [a, b],
);
```

### 3. State Updates
```jsx
// Functional updates for state that depends on previous state
setState(prevState => prevState + 1);

// Batch multiple updates
function handleClick() {
  setBatch(() => {
    setCount(c => c + 1);
    setFlag(f => !f);
  });
}
```

## 7. When to Use What

### Local State (useState/useReducer)
- UI state
- Form state
- Component-specific data
- Temporary data

### Context API
- Theme data
- User preferences
- Authentication state
- Localization data

### Redux/Zustand
- Complex application state
- Shared state between many components
- State that changes frequently
- When you need strong dev tools

### React Query/SWR
- Server data caching
- API state management
- Real-time data
- Polling and background updates

## 8. Common Pitfalls to Avoid

1. Over-centralizing State
```jsx
// Bad
const GlobalStore = {
  userData: {},
  uiState: {},
  formData: {},
  // Everything in global state
};

// Good
// Keep UI state local
const Component = () => {
  const [isOpen, setIsOpen] = useState(false);
  // Use global state only for truly shared data
  const { userData } = useGlobalStore();
};
```

2. Prop Drilling
```jsx
// Bad
const A = ({ user }) => <B user={user} />;
const B = ({ user }) => <C user={user} />;
const C = ({ user }) => <D user={user} />;

// Good
const UserContext = createContext();
const A = () => (
  <UserContext.Provider value={user}>
    <B />
  </UserContext.Provider>
);
```

3. Unnecessary Re-renders
```jsx
// Bad
const Parent = () => {
  const [count, setCount] = useState(0);
  const increment = () => setCount(count + 1);
  return <Child increment={increment} />;
};

// Good
const Parent = () => {
  const [count, setCount] = useState(0);
  const increment = useCallback(() => setCount(c => c + 1), []);
  return <Child increment={increment} />;
};
```

## 9. Performance Tips

1. State Splitting
```jsx
// Bad
const [state, setState] = useState({
  users: [],
  posts: [],
  comments: []
});

// Good
const [users, setUsers] = useState([]);
const [posts, setPosts] = useState([]);
const [comments, setComments] = useState([]);
```

2. Selective Re-rendering
```jsx
const MemoizedChild = memo(ChildComponent);

const Parent = () => {
  const [count, setCount] = useState(0);
  const handleClick = useCallback(() => {
    // handle click
  }, []);

  return <MemoizedChild onClick={handleClick} />;
};
```

3. Lazy Initial State
```jsx
// Bad
const [state, setState] = useState(expensiveOperation());

// Good
const [state, setState] = useState(() => expensiveOperation());
```
