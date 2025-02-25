# React Performance Optimization Guide

## 1. Component Rendering Optimization

### React.memo Implementation
Used by companies like Meta and Airbnb to prevent unnecessary re-renders.

```jsx
// Before optimization
const UserCard = ({ user, onEdit }) => {
  return (
    <div>
      <h2>{user.name}</h2>
      <button onClick={onEdit}>Edit</button>
    </div>
  );
};

// After optimization
const UserCard = React.memo(({ user, onEdit }) => {
  return (
    <div>
      <h2>{user.name}</h2>
      <button onClick={onEdit}>Edit</button>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.user.id === nextProps.user.id;
});
```

Industry Example: Spotify uses React.memo for their track list components in playlists.

### useMemo for Expensive Calculations
Used by companies like Netflix for complex data transformations.

```jsx
// Before optimization
function MovieList({ movies }) {
  const sortedMovies = movies
    .sort((a, b) => b.rating - a.rating)
    .filter(movie => movie.rating > 4);
    
  return (
    <ul>
      {sortedMovies.map(movie => (
        <li key={movie.id}>{movie.title}</li>
      ))}
    </ul>
  );
}

// After optimization
function MovieList({ movies }) {
  const sortedMovies = useMemo(() => {
    return movies
      .sort((a, b) => b.rating - a.rating)
      .filter(movie => movie.rating > 4);
  }, [movies]);
  
  return (
    <ul>
      {sortedMovies.map(movie => (
        <li key={movie.id}>{movie.title}</li>
      ))}
    </ul>
  );
}
```

## 2. Code Splitting and Lazy Loading

### Route-Based Code Splitting
Used by companies like Amazon and Walmart for their e-commerce platforms.

```jsx
// Before optimization
import ShoppingCart from './ShoppingCart';
import ProductList from './ProductList';

// After optimization
const ShoppingCart = React.lazy(() => import('./ShoppingCart'));
const ProductList = React.lazy(() => import('./ProductList'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/cart" element={<ShoppingCart />} />
        <Route path="/products" element={<ProductList />} />
      </Routes>
    </Suspense>
  );
}
```

## 3. Virtual List Implementation
Used by companies like Twitter and Facebook for infinite scrolling lists.

```jsx
import { VirtualList } from 'react-window';

function Timeline({ posts }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <PostCard post={posts[index]} />
    </div>
  );

  return (
    <VirtualList
      height={800}
      itemCount={posts.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </VirtualList>
  );
}
```

## 4. State Management Optimization

### Context Optimization
Used by companies like Uber for their rider and driver apps.

```jsx
// Before optimization
const AppContext = React.createContext();

// After optimization
const UserContext = React.createContext();
const ThemeContext = React.createContext();
const LocationContext = React.createContext();

function App() {
  return (
    <UserContext.Provider value={userData}>
      <ThemeContext.Provider value={themeData}>
        <LocationContext.Provider value={locationData}>
          <Main />
        </LocationContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}
```

## 5. Image Optimization
Used by companies like Pinterest and Instagram.

```jsx
// Using Next.js Image component
import Image from 'next/image';

function ProductImage({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={300}
      height={200}
      loading="lazy"
      placeholder="blur"
      blurDataURL={`data:image/jpeg;base64,${blurHash}`}
    />
  );
}
```

## 6. Bundle Size Optimization

### Tree Shaking
```jsx
// Before optimization
import { map, filter, reduce } from 'lodash';

// After optimization
import map from 'lodash/map';
import filter from 'lodash/filter';
import reduce from 'lodash/reduce';
```

### Dynamic Imports
```jsx
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Loading />,
  ssr: false
});
```

## 7. Caching and Memoization

### API Response Caching
```jsx
function useDataFetching(url) {
  const cache = useRef(new Map());
  const [data, setData] = useState(null);

  useEffect(() => {
    if (cache.current.has(url)) {
      setData(cache.current.get(url));
      return;
    }

    fetch(url)
      .then(res => res.json())
      .then(json => {
        cache.current.set(url, json);
        setData(json);
      });
  }, [url]);

  return data;
}
```

## 8. Event Handler Optimization

```jsx
function ChatComponent() {
  const handleScroll = useCallback(
    throttle(() => {
      // Scroll handling logic
    }, 100),
    []
