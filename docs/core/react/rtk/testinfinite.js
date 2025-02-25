// store.test.js
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as storeModule from '../store';
import { 
  fetchUsers, fetchMoreUsers, 
  fetchProducts, fetchMoreProducts 
} from '../store';

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

describe('Infinite Scroll API Slices', () => {
  test('creates slices with correct initial state for infinite scroll', () => {
    const store = createTestStore();
    const state = store.getState();
    
    // Check initial state includes pagination fields
    expect(state.users).toEqual({ 
      items: [], 
      loading: false, 
      loadingMore: false,
      error: null,
      page: 0,
      hasMore: true,
      total: 0 
    });
  });
});

describe('Infinite Scroll API Thunks', () => {
  let mockApiClient;
  let store;

  beforeEach(() => {
    // Reset mocks and store before each test
    store = createTestStore();
    mockApiClient = storeModule.apiClient;
  });

  test('fetchUsers success with pagination info', async () => {
    // Mock successful API response with pagination
    mockApiClient.get.mockResolvedValueOnce({ 
      data: {
        items: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }],
        total: 10,
        hasMore: true
      }
    });

    // Dispatch action
    await store.dispatch(fetchUsers({ page: 1, limit: 2 }));
    const state = store.getState();

    // Check API was called with pagination params
    expect(mockApiClient.get).toHaveBeenCalledWith('/users?page=1&limit=2');
    
    // Check state is updated correctly with pagination info
    expect(state.users.loading).toBe(false);
    expect(state.users.error).toBe(null);
    expect(state.users.items).toEqual([
      { id: 1, name: 'User 1' }, 
      { id: 2, name: 'User 2' }
    ]);
    expect(state.users.page).toBe(1);
    expect(state.users.hasMore).toBe(true);
    expect(state.users.total).toBe(10);
  });

  test('fetchUsers success with implicit pagination', async () => {
    // Mock API response without explicit pagination metadata
    mockApiClient.get.mockResolvedValueOnce({ 
      data: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }]
    });

    // Dispatch action
    await store.dispatch(fetchUsers({ page: 1, limit: 2 }));
    const state = store.getState();

    // Check that implicit pagination was calculated
    expect(state.users.hasMore).toBe(true); // Inferred since returned count equals limit
    expect(state.users.total).toBe(2);
  });

  test('fetchMoreUsers appends data correctly', async () => {
    // Setup initial state
    store.dispatch({
      type: 'users/fetchData/fulfilled',
      payload: {
        items: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }],
        page: 1,
        hasMore: true,
        total: 10
      }
    });

    // Mock next page response
    mockApiClient.get.mockResolvedValueOnce({ 
      data: {
        items: [{ id: 3, name: 'User 3' }, { id: 4, name: 'User 4' }],
        total: 10,
        hasMore: true
      }
    });

    // Dispatch fetchMore action
    await store.dispatch(fetchMoreUsers({ limit: 2 }));
    const state = store.getState();

    // Check API called with next page
    expect(mockApiClient.get).toHaveBeenCalledWith('/users?page=2&limit=2');
    
    // Check data was appended, not replaced
    expect(state.users.items).toEqual([
      { id: 1, name: 'User 1' }, 
      { id: 2, name: 'User 2' },
      { id: 3, name: 'User 3' }, 
      { id: 4, name: 'User 4' }
    ]);
    expect(state.users.page).toBe(2);
    expect(state.users.loadingMore).toBe(false);
  });

  test('fetchMoreUsers handles last page correctly', async () => {
    // Setup initial state
    store.dispatch({
      type: 'users/fetchData/fulfilled',
      payload: {
        items: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }],
        page: 1,
        hasMore: true,
        total: 3
      }
    });

    // Mock next page response with fewer items than limit
    mockApiClient.get.mockResolvedValueOnce({ 
      data: {
        items: [{ id: 3, name: 'User 3' }],
        total: 3,
        hasMore: false
      }
    });

    // Dispatch fetchMore action
    await store.dispatch(fetchMoreUsers({ limit: 2 }));
    const state = store.getState();

    // Check hasMore flag is correctly set to false
    expect(state.users.items.length).toBe(3);
    expect(state.users.hasMore).toBe(false);
  });

  test('fetchMoreUsers does not fetch if hasMore is false', async () => {
    // Setup initial state with hasMore: false
    store.dispatch({
      type: 'users/fetchData/fulfilled',
      payload: {
        items: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }],
        page: 1,
        hasMore: false,
        total: 2
      }
    });

    // Dispatch fetchMore action
    await store.dispatch(fetchMoreUsers({ limit: 2 }));

    // API should not be called
    expect(mockApiClient.get).not.toHaveBeenCalled();
  });

  test('fetchMoreUsers handles error', async () => {
    // Setup initial state
    store.dispatch({
      type: 'users/fetchData/fulfilled',
      payload: {
        items: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }],
        page: 1,
        hasMore: true,
        total: 10
      }
    });

    // Mock API error
    const errorMessage = 'Network error';
    mockApiClient.get.mockRejectedValueOnce({ 
      message: errorMessage 
    });

    // Dispatch fetchMore action
    await store.dispatch(fetchMoreUsers({ limit: 2 }));
    const state = store.getState();

    // Check error state
    expect(state.users.loadingMore).toBe(false);
    expect(state.users.error).toBe(errorMessage);
    
    // Original items should still be there
    expect(state.users.items).toEqual([
      { id: 1, name: 'User 1' }, 
      { id: 2, name: 'User 2' }
    ]);
  });

  test('clearData resets pagination state', () => {
    // Setup some initial data
    store.dispatch({
      type: 'users/fetchData/fulfilled',
      payload: {
        items: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }],
        page: 3,
        hasMore: false,
        total: 2
      }
    });

    // Verify data is set
    expect(store.getState().users.items.length).toBe(2);
    expect(store.getState().users.page).toBe(3);

    // Clear data
    store.dispatch(storeModule.clearUsers());

    // Verify all pagination state is reset
    const state = store.getState().users;
    expect(state.items).toEqual([]);
    expect(state.error).toBe(null);
    expect(state.page).toBe(0);
    expect(state.hasMore).toBe(true);
    expect(state.total).toBe(0);
  });
});

// UsersList.test.js - Component tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import UsersList from '../UsersList';
import * as storeModule from '../store';

// Mock the store and actions
jest.mock('../store', () => {
  const actual = jest.requireActual('../store');
  return {
    ...actual,
    fetchUsers: jest.fn(),
    fetchMoreUsers: jest.fn(),
  };
});

// Mock Intersection Observer
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

describe('UsersList component with infinite scroll', () => {
  let store;

  beforeEach(() => {
    // Create store with mock initial state
    store = configureStore({
      reducer: {
        users: (state = { 
          items: [], 
          loading: false, 
          loadingMore: false,
          error: null,
          page: 0,
          hasMore: true,
          total: 0 
        }) => state,
      }
    });

    // Clear mocks
    storeModule.fetchUsers.mockClear();
    storeModule.fetchMoreUsers.mockClear();
  });

  test('calls fetchUsers on mount', () => {
    render(
      <Provider store={store}>
        <UsersList />
      </Provider>
    );

    // Check if fetchUsers was called with correct params
    expect(storeModule.fetchUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  test('renders loading state on initial load', () => {
    // Create store with loading state
    store = configureStore({
      reducer: {
        users: () => ({ 
          items: [], 
          loading: true, 
          loadingMore: false,
          error: null,
          page: 0,
          hasMore: true,
          total: 0 
        }),
      }
    });

    render(
      <Provider store={store}>
        <UsersList />
      </Provider>
    );

    // Check if loading text is displayed
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  });

  test('renders error state', () => {
    // Create store with error state
    store = configureStore({
      reducer: {
        users: () => ({ 
          items: [], 
          loading: false, 
          loadingMore: false,
          error: 'Failed to load users',
          page: 0,
          hasMore: true,
          total: 0 
        }),
      }
    });

    render(
      <Provider store={store}>
        <UsersList />
      </Provider>
    );

    // Check if error message is displayed with retry button
    expect(screen.getByText(/error: failed to load users/i)).toBeInTheDocument();
    expect(screen.getByText(/retry/i)).toBeInTheDocument();
  });

  test('renders list of users', () => {
    // Create store with data
    store = configureStore({
      reducer: {
        users: () => ({ 
          items: [
            { id: 1, name: 'User 1' },
            { id: 2, name: 'User 2' },
            { id: 3, name: 'User 3' }
          ], 
          loading: false, 
          loadingMore: false,
          error: null,
          page: 1,
          hasMore: true,
          total: 10 
        }),
      }
    });

    render(
      <Provider store={store}>
        <UsersList />
      </Provider>
    );

    // Check if users are displayed
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 2')).toBeInTheDocument();
    expect(screen.getByText('User 3')).toBeInTheDocument();
  });

  test('renders loading more indicator', () => {
    // Create store with loadingMore state
    store = configureStore({
      reducer: {
        users: () => ({ 
          items: [
            { id: 1, name: 'User 1' },
            { id: 2, name: 'User 2' }
          ], 
          loading: false, 
          loadingMore: true,
          error: null,
          page: 1,
          hasMore: true,
          total: 10 
        }),
      }
    });

    render(
      <Provider store={store}>
        <UsersList />
      </Provider>
    );

    // Check if loading more indicator is displayed
    expect(screen.getByText(/loading more users/i)).toBeInTheDocument();
  });

  test('renders end message when no more data', () => {
    // Create store with hasMore: false
    store = configureStore({
      reducer: {
        users: () => ({ 
          items: [
            { id: 1, name: 'User 1' },
            { id: 2, name: 'User 2' }
          ], 
          loading: false, 
          loadingMore: false,
          error: null,
          page: 1,
          hasMore: false,
          total: 2 
        }),
      }
    });

    render(
      <Provider store={store}>
        <UsersList />
      </Provider>
    );

    // Check if end message is displayed
    expect(screen.getByText(/no more users to load/i)).toBeInTheDocument();
  });

  test('clicking retry button calls fetchUsers', () => {
    // Create store with error state
    store = configureStore({
      reducer: {
        users: () => ({ 
          items: [], 
          loading: false, 
          loadingMore: false,
          error: 'Failed to load users',
          page: 0,
          hasMore: true,
          total: 0 
        }),
      }
    });

    render(
      <Provider store={store}>
        <UsersList />
      </Provider>
    );

    // Click retry button
    fireEvent.click(screen.getByText(/retry/i));

    // Check if fetchUsers was called
    expect(storeModule.fetchUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  test('intersection observer triggers fetchMoreUsers', () => {
    // Create store with data
    store = configureStore({
      reducer: {
        users: () => ({ 
          items: [
            { id: 1, name: 'User 1' },
            { id: 2, name: 'User 2' }
          ], 
          loading: false, 
          loadingMore: false,
          error: null,
          page: 1,
          hasMore: true,
          total: 10 
        }),
      }
    });

    render(
      <Provider store={store}>
        <UsersList />
      </Provider>
    );

    // Get the mock callback registered with IntersectionObserver
    const [observerCallback] = mockIntersectionObserver.mock.calls[0];
    
    // Simulate intersection (item coming into view)
    observerCallback([{ isIntersecting: true }]);

    // Check if fetchMoreUsers was called
    expect(storeModule.fetchMoreUsers).toHaveBeenCalledWith({ limit: 10 });
  });
});

// useInfiniteScroll.test.js - Custom hook tests
import { renderHook } from '@testing-library/react-hooks';
import { useDispatch } from 'react-redux';
import { useInfiniteScroll } from '../useInfiniteScroll';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

// Mock Intersection Observer
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
const mockIntersectionObserver = jest.fn(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
}));
window.IntersectionObserver = mockIntersectionObserver;

describe('useInfiniteScroll hook', () => {
  const mockDispatch = jest.fn();
  const mockFetchMore = { type: 'mock/fetchMore' };
  
  beforeEach(() => {
    useDispatch.mockReturnValue(mockDispatch);
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    mockDispatch.mockClear();
  });

  test('returns lastElementRef', () => {
    const { result } = renderHook(() => 
      useInfiniteScroll(
        { items: [], loading: false, loadingMore: false, hasMore: true },
        mockFetchMore
      )
    );

    expect(result.current).toHaveProperty('lastElementRef');
    expect(typeof result.current.lastElementRef).toBe('function');
  });

  test('observes last element when ref is assigned', () => {
    const { result } = renderHook(() => 
      useInfiniteScroll(
        { items: [], loading: false, loadingMore: false, hasMore: true },
        mockFetchMore
      )
    );

    // Simulate assigning ref to a DOM element
    const mockElement = {};
    result.current.lastElementRef(mockElement);

    // Check if IntersectionObserver observed the element
    expect(mockObserve).toHaveBeenCalledWith(mockElement);
  });

  test('does not observe when loading', () => {
    const { result } = renderHook(() => 
      useInfiniteScroll(
        { items: [], loading: true, loadingMore: false, hasMore: true },
        mockFetchMore
      )
    );

    // Simulate assigning ref to a DOM element
    const mockElement = {};
    result.current.lastElementRef(mockElement);

    // Should not observe while loading
    expect(mockObserve).not.toHaveBeenCalled();
  });

  test('does not observe when loadingMore', () => {
    const { result } = renderHook(() => 
      useInfiniteScroll(
        { items: [], loading: false, loadingMore: true, hasMore: true },
        mockFetchMore
      )
    );

    // Simulate assigning ref to a DOM element
    const mockElement = {};
    result.current.lastElementRef(mockElement);

    // Should not observe while loadingMore
    expect(mockObserve).not.toHaveBeenCalled();
  });

  test('disconnects previous observer when ref changes', () => {
    const { result } = renderHook(() => 
      useInfiniteScroll(
        { items: [], loading: false, loadingMore: false, hasMore: true },
        mockFetchMore
      )
    );

    // Simulate assigning ref to first element
    const mockElement1 = {};
    result.current.lastElementRef(mockElement1);
    
    // Simulate assigning ref to another element
    const mockElement2 = {};
    result.current.lastElementRef(mockElement2);

    // Should disconnect before observing new element
    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockObserve).toHaveBeenCalledWith(mockElement2);
  });

  test('dispatches fetchMore when element intersects', () => {
    const { result } = renderHook(() => 
      useInfiniteScroll(
        { items: [], loading: false, loadingMore: false, hasMore: true },
        mockFetchMore
      )
    );

    // Simulate assigning ref
    const mockElement = {};
    result.current.lastElementRef(mockElement);

    // Get the callback that was passed to IntersectionObserver
    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];
    
    // Simulate element coming into view
    intersectionCallback([{ isIntersecting: true }]);

    // Should dispatch fetchMore action
    expect(mockDispatch).toHaveBeenCalledWith(mockFetchMore);
  });

  test('does not dispatch fetchMore when hasMore is false', () => {
    const { result } = renderHook(() => 
      useInfiniteScroll(
        { items: [], loading: false, loadingMore: false, hasMore: false },
        mockFetchMore
      )
    );

    // Simulate assigning ref
    const mockElement = {};
    result.current.lastElementRef(mockElement);

    // Get the callback that was passed to IntersectionObserver
    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];
    
    // Simulate element coming into view
    intersectionCallback([{ isIntersecting: true }]);

    // Should not dispatch fetchMore since hasMore is false
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('applies custom threshold from options', () => {
    renderHook(() => 
      useInfiniteScroll(
        { items: [], loading: false, loadingMore: false, hasMore: true },
        mockFetchMore,
        { threshold: 0.75 }
      )
    );

    // Check if IntersectionObserver was created with custom threshold
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function), 
      { threshold: 0.75 }
    );
  });

  test('passes custom limit to fetchMore action', () => {
    const { result } = renderHook(() => 
      useInfiniteScroll(
        { items: [], loading: false, loadingMore: false, hasMore: true },
        mockFetchMore,
        { limit: 20 }
      )
    );

    // Simulate element intersection
    const mockElement = {};
    result.current.lastElementRef(mockElement);
    
    const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];
    intersectionCallback([{ isIntersecting: true }]);

    // Should dispatch with custom limit
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20 })
    );
  });
});