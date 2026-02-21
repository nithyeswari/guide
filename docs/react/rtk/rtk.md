// store.js - Modified for infinite scroll
import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Create a reusable API client with retry logic
const apiClient = axios.create({
  baseURL: 'https://api.example.com'
});

// Add retry interceptor
apiClient.interceptors.response.use(null, async (error) => {
  const { config, response } = error;
  
  if (!response || (response.status >= 500 && response.status < 600)) {
    if (!config.retryCount || config.retryCount < 3) {
      config.retryCount = (config.retryCount || 0) + 1;
      await new Promise(resolve => setTimeout(resolve, 1000 * config.retryCount));
      return apiClient(config);
    }
  }
  
  return Promise.reject(error);
});

// Factory function to create API slices with infinite scroll support
const createApiSlice = (name, endpoint) => {
  // Create the async thunk for initial load
  const fetchData = createAsyncThunk(
    `${name}/fetch`,
    async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
      try {
        const response = await apiClient.get(`${endpoint}?page=${page}&limit=${limit}`);
        return {
          items: response.data.items || response.data,
          total: response.data.total || response.data.length,
          page,
          hasMore: response.data.hasMore !== undefined 
            ? response.data.hasMore 
            : (response.data.items || response.data).length === limit
        };
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || error.message);
      }
    }
  );

  // Create thunk for fetching more data (next page)
  const fetchMore = createAsyncThunk(
    `${name}/fetchMore`,
    async ({ limit = 10 }, { getState, rejectWithValue }) => {
      const state = getState()[name];
      const nextPage = state.page + 1;
      
      if (!state.hasMore) {
        return { items: [] };
      }
      
      try {
        const response = await apiClient.get(`${endpoint}?page=${nextPage}&limit=${limit}`);
        const newItems = response.data.items || response.data;
        
        return {
          items: newItems,
          total: response.data.total || (state.total + newItems.length),
          page: nextPage,
          hasMore: response.data.hasMore !== undefined 
            ? response.data.hasMore 
            : newItems.length === limit
        };
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || error.message);
      }
    }
  );

  // Create the slice
  const slice = createSlice({
    name,
    initialState: { 
      items: [], 
      loading: false, 
      loadingMore: false,
      error: null,
      page: 0,
      hasMore: true,
      total: 0 
    },
    reducers: {
      clearData: (state) => {
        state.items = [];
        state.error = null;
        state.page = 0;
        state.hasMore = true;
        state.total = 0;
      },
    },
    extraReducers: (builder) => {
      builder
        // Initial fetch
        .addCase(fetchData.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(fetchData.fulfilled, (state, action) => {
          state.loading = false;
          state.items = action.payload.items;
          state.page = action.payload.page;
          state.hasMore = action.payload.hasMore;
          state.total = action.payload.total;
        })
        .addCase(fetchData.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload || 'An error occurred';
        })
        // Fetch more (infinite scroll)
        .addCase(fetchMore.pending, (state) => {
          state.loadingMore = true;
          state.error = null;
        })
        .addCase(fetchMore.fulfilled, (state, action) => {
          state.loadingMore = false;
          state.items = [...state.items, ...action.payload.items];
          state.page = action.payload.page;
          state.hasMore = action.payload.hasMore;
          state.total = action.payload.total;
        })
        .addCase(fetchMore.rejected, (state, action) => {
          state.loadingMore = false;
          state.error = action.payload || 'An error occurred';
        });
    }
  });

  return {
    slice,
    actions: { ...slice.actions, fetchData, fetchMore }
  };
};

// Create slices for each API
const usersApi = createApiSlice('users', '/users');
const productsApi = createApiSlice('products', '/products');
const ordersApi = createApiSlice('orders', '/orders');
const categoriesApi = createApiSlice('categories', '/categories');

// Export actions
export const { fetchData: fetchUsers, fetchMore: fetchMoreUsers, clearData: clearUsers } = usersApi.actions;
export const { fetchData: fetchProducts, fetchMore: fetchMoreProducts, clearData: clearProducts } = productsApi.actions;
export const { fetchData: fetchOrders, fetchMore: fetchMoreOrders, clearData: clearOrders } = ordersApi.actions;
export const { fetchData: fetchCategories, fetchMore: fetchMoreCategories, clearData: clearCategories } = categoriesApi.actions;

// Create store
export const store = configureStore({
  reducer: {
    users: usersApi.slice.reducer,
    products: productsApi.slice.reducer,
    orders: ordersApi.slice.reducer,
    categories: categoriesApi.slice.reducer
  }
});

// UsersList.js - Component with infinite scroll
import React, { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, fetchMoreUsers } from './store';

const UsersList = () => {
  const dispatch = useDispatch();
  const { items, loading, loadingMore, error, hasMore } = useSelector(state => state.users);
  
  // Reference for intersection observer
  const observer = useRef();
  
  // Last element ref callback for infinite scrolling
  const lastUserElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        dispatch(fetchMoreUsers({ limit: 10 }));
      }
    }, { threshold: 0.5 });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, dispatch]);
  
  // Initial data fetch
  useEffect(() => {
    dispatch(fetchUsers({ page: 1, limit: 10 }));
    
    // Cleanup observer on unmount
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [dispatch]);
  
  if (loading && items.length === 0) {
    return <div>Loading users...</div>;
  }
  
  if (error && items.length === 0) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={() => dispatch(fetchUsers({ page: 1, limit: 10 }))}>
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="users-list">
      <h2>Users</h2>
      <ul>
        {items.map((user, index) => (
          <li 
            key={user.id}
            // Add ref to last element for infinite scroll detection
            ref={index === items.length - 1 ? lastUserElementRef : null}
            className="user-item"
          >
            {user.name}
          </li>
        ))}
      </ul>
      
      {loadingMore && <div className="loading-more">Loading more users...</div>}
      
      {!hasMore && items.length > 0 && (
        <div className="end-message">No more users to load</div>
      )}
    </div>
  );
};

export default UsersList;

// InfiniteScrollDashboard.js - Dashboard with all infinite scrolling lists
import React from 'react';
import UsersList from './UsersList';
import ProductsList from './ProductsList';  // Similar implementation as UsersList
import OrdersList from './OrdersList';      // Similar implementation as UsersList
import CategoriesList from './CategoriesList'; // Similar implementation as UsersList

const InfiniteScrollDashboard = () => {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="dashboard-grid">
        <UsersList />
        <ProductsList />
        <OrdersList />
        <CategoriesList />
      </div>
    </div>
  );
};

export default InfiniteScrollDashboard;

// Bonus: Custom Infinite Scroll Hook
// useInfiniteScroll.js - Reusable custom hook
import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';

export const useInfiniteScroll = (
  { items, loading, loadingMore, hasMore }, 
  fetchMoreAction,
  options = { threshold: 0.5, limit: 10 }
) => {
  const dispatch = useDispatch();
  const observer = useRef();
  
  const lastElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        dispatch(fetchMoreAction({ limit: options.limit }));
      }
    }, { threshold: options.threshold });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, dispatch, fetchMoreAction, options.limit, options.threshold]);
  
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);
  
  return { lastElementRef };
};

// Usage with custom hook
// SimplifiedUsersList.js
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, fetchMoreUsers } from './store';
import { useInfiniteScroll } from './useInfiniteScroll';

const SimplifiedUsersList = () => {
  const dispatch = useDispatch();
  const usersState = useSelector(state => state.users);
  const { items, loading, loadingMore, error, hasMore } = usersState;
  
  // Use the custom hook
  const { lastElementRef } = useInfiniteScroll(
    usersState, 
    fetchMoreUsers, 
    { threshold: 0.8, limit: 15 }
  );
  
  useEffect(() => {
    dispatch(fetchUsers({ page: 1, limit: 15 }));
  }, [dispatch]);
  
  if (loading && items.length === 0) {
    return <div>Loading users...</div>;
  }
  
  return (
    <div className="users-list">
      <h2>Users</h2>
      <ul>
        {items.map((user, index) => (
          <li 
            key={user.id}
            ref={index === items.length - 1 ? lastElementRef : null}
            className="user-item"
          >
            {user.name}
          </li>
        ))}
      </ul>
      
      {loadingMore && <div className="loading-more">Loading more...</div>}
    </div>
  );
};

export default SimplifiedUsersList;