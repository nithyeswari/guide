# React Basics

## Table of Contents
- [Components and JSX](#components-and-jsx)
- [Virtual DOM](#virtual-dom)
- [Component Lifecycle](#component-lifecycle)
- [State and Props](#state-and-props)
- [Hooks](#hooks)
- [Event Handling](#event-handling)
- [Lists and Keys](#lists-and-keys)
- [Forms](#forms)

## Components and JSX

### What is JSX?
JSX is a syntax extension for JavaScript that allows you to write HTML-like code within your JavaScript files. It makes React component creation more intuitive and readable.

```jsx
// Function Component Example
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}

// Class Component Example
class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

### Component Types
1. Function Components (Recommended)
2. Class Components (Legacy)
3. Pure Components
4. Higher-Order Components (HOCs)

## Virtual DOM

The Virtual DOM is a programming concept where an ideal, or "virtual", representation of a UI is kept in memory and synced with the "real" DOM by a library such as ReactDOM.

### How it works:
1. Virtual DOM creates a copy of the actual DOM
2. When state changes, a new Virtual DOM is created
3. The new Virtual DOM is compared with the previous one (diffing)
4. Only the changed elements are updated in the real DOM

## Component Lifecycle

### Function Components (using Hooks)
```jsx
import React, { useEffect } from 'react';

function MyComponent() {
  useEffect(() => {
    // Component Did Mount
    return () => {
      // Component Will Unmount
    };
  }, []); // Dependencies array

  return <div>Component Content</div>;
}
```

### Class Components (Legacy)
```jsx
class MyComponent extends React.Component {
  componentDidMount() {
    // After component is mounted
  }

  componentDidUpdate(prevProps, prevState) {
    // After component is updated
  }

  componentWillUnmount() {
    // Before component is unmounted
  }
}
```

## State and Props

### Props
Props are read-only properties passed to components:
```jsx
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}

// Usage
<Welcome name="John" />
```

### State
State is mutable data managed within a component:
```jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

## Hooks

### Basic Hooks
1. useState
```jsx
const [state, setState] = useState(initialValue);
```

2. useEffect
```jsx
useEffect(() => {
  // Side effects here
  return () => {
    // Cleanup here
  };
}, [dependencies]);
```

3. useContext
```jsx
const value = useContext(MyContext);
```

### Additional Hooks
- useReducer
- useCallback
- useMemo
- useRef
- useImperativeHandle
- useLayoutEffect

## Event Handling

```jsx
function Button() {
  const handleClick = (e) => {
    e.preventDefault();
    console.log('Button clicked');
  };

  return (
    <button onClick={handleClick}>
      Click me
    </button>
  );
}
```

## Lists and Keys

```jsx
function ItemList() {
  const items = ['Apple', 'Banana', 'Orange'];

  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
```

## Forms

### Controlled Components
```jsx
function Form() {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Best Practices

1. Use function components with hooks instead of class components
2. Keep components small and focused
3. Use proper naming conventions
4. Implement error boundaries
5. Optimize performance with useMemo and useCallback
6. Follow the DRY (Don't Repeat Yourself) principle

## Related Topics
- [Application Structure and Key Features](../core/APPLICATION.md)
- [State Management](../core/STATE_MANAGEMENT.md)
- [Design Patterns](../core/DESIGN_PATTERNS.md)
- [Navigation Patterns](../core/NAVIGATION.md)
- [Performance Optimization](../performance/CODE_OPTIMIZATION.md)

## Additional Resources
- [Official React Documentation](https://react.dev)
- [React GitHub Repository](https://github.com/facebook/react)
- [React Community Resources](../resources/COMMUNITY.md)
