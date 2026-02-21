Here's a more concise implementation for handling 4 APIs with error handling and retry functionality:

```javascript
// store.js
import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Create a reusable API client with retry logic
const apiClient = axios.create({
  baseURL: 'https://api.example.com'
});

// Add retry interceptor
apiClient.interceptors.response.use(null, async (error) => {
  const { config, response } = error;
  
  // Only retry on network errors or 5xx server errors
  if (!response || (response.status >= 500 && response.status < 600)) {
    // Check if we've already tried 3 times
    if (!config.retryCount || config.retryCount < 3) {
      // Increment the retry count
      config.retryCount = (config.retryCount || 0) + 1;
      
      // Wait for 1s * retry count before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * config.retryCount));
      
      // Retry the request
      return apiClient(config);
    }
  }
  
  return Promise.reject(error);
});

// Factory function to create API slices
const createApiSlice = (name, endpoint) => {
  // Create the async thunk
  const fetchData = createAsyncThunk(
    `${name}/fetch`,
    async (_, { rejectWithValue }) => {
      try {
        const response = await apiClient.get(endpoint);
        return response.data;
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || error.message);
      }
    }
  );

  // Create the slice
  const slice = createSlice({
    name,
    initialState: { data: [], loading: false, error: null },
    reducers: {
      clearData: (state) => {
        state.data = [];
        state.error = null;
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchData.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(fetchData.fulfilled, (state, action) => {
          state.loading = false;
          state.data = action.payload;
        })
        .addCase(fetchData.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload || 'An error occurred';
        });
    }
  });

  return {
    slice,
    actions: { ...slice.actions, fetchData }
  };
};

// Create slices for each API
const usersApi = createApiSlice('users', '/users');
const productsApi = createApiSlice('products', '/products');
const ordersApi = createApiSlice('orders', '/orders');
const categoriesApi = createApiSlice('categories', '/categories');

// Export actions
export const { fetchData: fetchUsers, clearData: clearUsers } = usersApi.actions;
export const { fetchData: fetchProducts, clearData: clearProducts } = productsApi.actions;
export const { fetchData: fetchOrders, clearData: clearOrders } = ordersApi.actions;
export const { fetchData: fetchCategories, clearData: clearCategories } = categoriesApi.actions;

// Create store
export const store = configureStore({
  reducer: {
    users: usersApi.slice.reducer,
    products: productsApi.slice.reducer,
    orders: ordersApi.slice.reducer,
    categories: categoriesApi.slice.reducer
  }
});
```

Then in your component:

```javascript
// Dashboard.js
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, fetchProducts, fetchOrders, fetchCategories } from './store';

function Dashboard() {
  const dispatch = useDispatch();
  const { users, products, orders, categories } = useSelector(state => state);
  
  useEffect(() => {
    // Load all data
    dispatch(fetchUsers());
    dispatch(fetchProducts());
    dispatch(fetchOrders());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Reusable component to display data with loading/error states
  const DataSection = ({ title, state, renderItem }) => (
    <section>
      <h2>{title}</h2>
      {state.loading ? (
        <p>Loading {title.toLowerCase()}...</p>
      ) : state.error ? (
        <div>
          <p>Error: {state.error}</p>
          <button onClick={() => dispatch(fetchData())}>Retry</button>
        </div>
      ) : (
        <ul>
          {state.data.map(item => (
            <li key={item.id}>{renderItem(item)}</li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div>
      <h1>Dashboard</h1>
      
      <DataSection 
        title="Users" 
        state={users} 
        renderItem={user => user.name} 
      />
      
      <DataSection 
        title="Products" 
        state={products} 
        renderItem={product => product.name} 
      />
      
      <DataSection 
        title="Orders" 
        state={orders} 
        renderItem={order => `#${order.id} - ${order.total}`} 
      />
      
      <DataSection 
        title="Categories" 
        state={categories} 
        renderItem={category => category.name} 
      />
    </div>
  );
}

export default Dashboard;
```

This implementation:

1. Uses a factory function to create all four API slices, eliminating repetitive code
2. Adds retry logic through axios interceptors (retries up to 3 times with backoff)
3. Includes proper error handling with user-friendly messages
4. Provides a reusable component for displaying data with loading/error states
5. Adds a clear action for each slice to reset the data if needed

The code is much more concise while adding more functionality. The axios interceptor handles the retry logic automatically, and the factory function ensures consistent state management across all API endpoints.