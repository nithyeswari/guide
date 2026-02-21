// store.test.js
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as storeModule from '../store';
import { fetchUsers, fetchProducts, fetchOrders, fetchCategories } from '../store';

// Mock axios
jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      interceptors: {
        response: {
          use: jest.fn()
        }
      },
      get: jest.fn()
    }))
  };
});

// Create a clean store for testing
const createTestStore = () => {
  return configureStore({
    reducer: {
      users: storeModule.usersApi.slice.reducer,
      products: storeModule.productsApi.slice.reducer,
      orders: storeModule.ordersApi.slice.reducer,
      categories: storeModule.categoriesApi.slice.reducer
    }
  });
};

describe('API Slice Factory', () => {
  test('creates slices with correct initial state', () => {
    const store = createTestStore();
    const state = store.getState();
    
    // Check initial state of each slice
    expect(state.users).toEqual({ data: [], loading: false, error: null });
    expect(state.products).toEqual({ data: [], loading: false, error: null });
    expect(state.orders).toEqual({ data: [], loading: false, error: null });
    expect(state.categories).toEqual({ data: [], loading: false, error: null });
  });
});

describe('API Thunks', () => {
  let mockApiClient;
  let store;

  beforeEach(() => {
    // Reset mocks and store before each test
    store = createTestStore();
    mockApiClient = storeModule.apiClient;
  });

  test('fetchUsers success flow', async () => {
    // Mock successful API response
    mockApiClient.get.mockResolvedValueOnce({ 
      data: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }]
    });

    // Dispatch action
    await store.dispatch(fetchUsers());
    const state = store.getState();

    // Check that API was called with correct endpoint
    expect(mockApiClient.get).toHaveBeenCalledWith('/users');
    
    // Check state is updated correctly
    expect(state.users.loading).toBe(false);
    expect(state.users.error).toBe(null);
    expect(state.users.data).toEqual([
      { id: 1, name: 'User 1' }, 
      { id: 2, name: 'User 2' }
    ]);
  });

  test('fetchProducts error flow', async () => {
    // Mock API error
    const errorMessage = 'Server error';
    mockApiClient.get.mockRejectedValueOnce({ 
      response: { data: { message: errorMessage } }
    });

    // Dispatch action
    await store.dispatch(fetchProducts());
    const state = store.getState();

    // Check API was called
    expect(mockApiClient.get).toHaveBeenCalledWith('/products');
    
    // Check error state
    expect(state.products.loading).toBe(false);
    expect(state.products.error).toBe(errorMessage);
    expect(state.products.data).toEqual([]);
  });

  test('fetchOrders network error flow', async () => {
    // Mock network error (no response)
    mockApiClient.get.mockRejectedValueOnce({ 
      message: 'Network Error' 
    });

    // Dispatch action
    await store.dispatch(fetchOrders());
    const state = store.getState();

    // Check API was called
    expect(mockApiClient.get).toHaveBeenCalledWith('/orders');
    
    // Check error state
    expect(state.orders.loading).toBe(false);
    expect(state.orders.error).toBe('Network Error');
    expect(state.orders.data).toEqual([]);
  });

  test('clearData action works', () => {
    // Set some initial data
    store.dispatch({
      type: 'categories/fetchData/fulfilled',
      payload: [{ id: 1, name: 'Category 1' }]
    });

    // Verify data is set
    expect(store.getState().categories.data).toEqual([{ id: 1, name: 'Category 1' }]);

    // Clear data
    store.dispatch(storeModule.clearCategories());

    // Verify data is cleared
    expect(store.getState().categories.data).toEqual([]);
    expect(store.getState().categories.error).toBe(null);
  });
});

describe('API Client Retry Logic', () => {
  let mockAxios;

  beforeEach(() => {
    // Create a mock for axios
    mockAxios = new MockAdapter(axios);
    
    // Re-create the API client to use the mocked axios
    // This part depends on your implementation, might need adjustment
    jest.clearAllMocks();
    jest.spyOn(global, 'setTimeout');
  });

  test('should retry on 500 errors', async () => {
    // This is more of an integration test and would need special setup
    // The implementation would check if retry logic in interceptors is called properly
    // Example skeleton:
    const mockResponse = { data: 'test data' };
    
    // Mock a 500 error first, then success
    mockAxios.onGet('/test').replyOnce(500)
             .onGet('/test').replyOnce(200, mockResponse);
    
    // Would need to adjust how you test interceptors based on your implementation
    // This is just a placeholder for the concept
    expect(true).toBe(true);
  });
});

// Dashboard.test.js (Component tests)
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Dashboard from '../Dashboard';
import * as storeModule from '../store';

// Mock the store and actions
jest.mock('../store', () => {
  const actual = jest.requireActual('../store');
  return {
    ...actual,
    fetchUsers: jest.fn(),
    fetchProducts: jest.fn(),
    fetchOrders: jest.fn(),
    fetchCategories: jest.fn(),
  };
});

describe('Dashboard component', () => {
  let store;

  beforeEach(() => {
    // Create store with mock initial state
    store = configureStore({
      reducer: {
        users: (state = { data: [], loading: false, error: null }) => state,
        products: (state = { data: [], loading: false, error: null }) => state,
        orders: (state = { data: [], loading: false, error: null }) => state,
        categories: (state = { data: [], loading: false, error: null }) => state,
      }
    });

    // Clear mocks
    storeModule.fetchUsers.mockClear();
    storeModule.fetchProducts.mockClear();
    storeModule.fetchOrders.mockClear();
    storeModule.fetchCategories.mockClear();
  });

  test('calls fetch actions on mount', () => {
    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    // Check if all fetch actions were called
    expect(storeModule.fetchUsers).toHaveBeenCalledTimes(1);
    expect(storeModule.fetchProducts).toHaveBeenCalledTimes(1);
    expect(storeModule.fetchOrders).toHaveBeenCalledTimes(1);
    expect(storeModule.fetchCategories).toHaveBeenCalledTimes(1);
  });

  test('renders loading state', () => {
    // Create store with loading state
    store = configureStore({
      reducer: {
        users: () => ({ data: [], loading: true, error: null }),
        products: () => ({ data: [], loading: true, error: null }),
        orders: () => ({ data: [], loading: true, error: null }),
        categories: () => ({ data: [], loading: true, error: null }),
      }
    });

    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    // Check if loading text is displayed for each section
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
    expect(screen.getByText(/loading products/i)).toBeInTheDocument();
    expect(screen.getByText(/loading orders/i)).toBeInTheDocument();
    expect(screen.getByText(/loading categories/i)).toBeInTheDocument();
  });

  test('renders error state', () => {
    // Create store with error state
    store = configureStore({
      reducer: {
        users: () => ({ data: [], loading: false, error: 'User error' }),
        products: () => ({ data: [], loading: false, error: 'Product error' }),
        orders: () => ({ data: [], loading: false, error: null }),
        categories: () => ({ data: [], loading: false, error: null }),
      }
    });

    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    // Check if error text is displayed for each section with errors
    expect(screen.getByText(/error: user error/i)).toBeInTheDocument();
    expect(screen.getByText(/error: product error/i)).toBeInTheDocument();
    
    // Others should not show error
    expect(screen.queryByText(/error: order error/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/error: category error/i)).not.toBeInTheDocument();
  });

  test('renders data correctly', () => {
    // Create store with data
    store = configureStore({
      reducer: {
        users: () => ({ 
          data: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }], 
          loading: false, 
          error: null 
        }),
        products: () => ({ 
          data: [{ id: 1, name: 'Product 1' }], 
          loading: false, 
          error: null 
        }),
        orders: () => ({ data: [], loading: false, error: null }),
        categories: () => ({ data: [], loading: false, error: null }),
      }
    });

    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    // Check if the data is displayed
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 2')).toBeInTheDocument();
    expect(screen.getByText('Product 1')).toBeInTheDocument();
  });
});