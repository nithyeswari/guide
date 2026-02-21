# Zustand vs MobX: Implementation Guide

## Key Differences

### Zustand
- Minimal and lightweight
- Simple API based on hooks
- No wrapping Provider needed
- Unopinionated and flexible
- Built for React
- Immutable state updates

### MobX
- Full-featured reactive programming library
- Can be used with any JS framework
- Requires decorators or observable wrappers
- More opinionated with strict patterns
- Mutable state with automatic tracking
- More complex learning curve

## Zustand Implementation

### 1. Basic Store
```typescript
// stores/useStore.ts
import create from 'zustand';

interface StoreState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 })
}));

export default useStore;
```

### 2. Complex Store with TypeScript
```typescript
// stores/useUserStore.ts
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        users: [],
        currentUser: null,
        isLoading: false,
        error: null,

        fetchUsers: async () => {
          try {
            set({ isLoading: true });
            const response = await fetch('/api/users');
            const users = await response.json();
            set({ users, isLoading: false });
          } catch (error) {
            set({ error: error.message, isLoading: false });
          }
        },

        addUser: (user) => {
          set((state) => ({
            users: [...state.users, user]
          }));
        },

        updateUser: (id, updates) => {
          set((state) => ({
            users: state.users.map((user) =>
              user.id === id ? { ...user, ...updates } : user
            )
          }));
        },

        deleteUser: (id) => {
          set((state) => ({
            users: state.users.filter((user) => user.id !== id)
          }));
        }
      }),
      {
        name: 'user-storage'
      }
    )
  )
);

export default useUserStore;
```

### 3. Using Zustand Store in Components
```typescript
// components/UserList.tsx
import useUserStore from '../stores/useUserStore';

const UserList = () => {
  const { users, isLoading, fetchUsers } = useUserStore();

  useEffect(() => {
    fetchUsers();
  }, []);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};

// components/UserCard.tsx
const UserCard = ({ user }) => {
  const updateUser = useUserStore(state => state.updateUser);
  const deleteUser = useUserStore(state => state.deleteUser);

  return (
    <div>
      <h3>{user.name}</h3>
      <button onClick={() => updateUser(user.id, { name: 'Updated' })}>
        Update
      </button>
      <button onClick={() => deleteUser(user.id)}>Delete</button>
    </div>
  );
};
```

## MobX Implementation

### 1. Basic Store
```typescript
// stores/CounterStore.ts
import { makeAutoObservable } from 'mobx';

class CounterStore {
  count = 0;

  constructor() {
    makeAutoObservable(this);
  }

  increment() {
    this.count++;
  }

  decrement() {
    this.count--;
  }

  reset() {
    this.count = 0;
  }
}

export const counterStore = new CounterStore();
```

### 2. Complex Store with TypeScript
```typescript
// stores/UserStore.ts
import { makeAutoObservable, runInAction } from 'mobx';

interface User {
  id: string;
  name: string;
  email: string;
}

class UserStore {
  users: User[] = [];
  currentUser: User | null = null;
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchUsers() {
    try {
      this.isLoading = true;
      const response = await fetch('/api/users');
      const users = await response.json();
      
      runInAction(() => {
        this.users = users;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
    }
  }

  addUser(user: User) {
    this.users.push(user);
  }

  updateUser(id: string, updates: Partial<User>) {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], ...updates };
    }
  }

  deleteUser(id: string) {
    this.users = this.users.filter(user => user.id !== id);
  }

  get totalUsers() {
    return this.users.length;
  }
}

export const userStore = new UserStore();
```

### 3. MobX with React Components
```typescript
// components/UserList.tsx
import { observer } from 'mobx-react-lite';
import { userStore } from '../stores/UserStore';

const UserList = observer(() => {
  useEffect(() => {
    userStore.fetchUsers();
  }, []);

  if (userStore.isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Total Users: {userStore.totalUsers}</h2>
      {userStore.users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
});

// components/UserCard.tsx
const UserCard = observer(({ user }) => {
  return (
    <div>
      <h3>{user.name}</h3>
      <button onClick={() => userStore.updateUser(user.id, { name: 'Updated' })}>
        Update
      </button>
      <button onClick={() => userStore.deleteUser(user.id)}>Delete</button>
    </div>
  );
});
```

### 4. Root Store Pattern with MobX
```typescript
// stores/RootStore.ts
import { UserStore } from './UserStore';
import { CounterStore } from './CounterStore';

class RootStore {
  userStore: UserStore;
  counterStore: CounterStore;

  constructor() {
    this.userStore = new UserStore(this);
    this.counterStore = new CounterStore(this);
  }
}

// Create context
import { createContext, useContext } from 'react';

const StoreContext = createContext<RootStore | null>(null);

// Provider component
export const StoreProvider = ({ children }) => {
  const store = new RootStore();
  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
};

// Hook to use the store
export const useStore = () => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return store;
};
```

## Key Usage Differences

### Zustand Advantages
1. Simpler learning curve
2. No decorators or complex setup
3. Built-in TypeScript support
4. Easy integration with React
5. Small bundle size
6. No need for providers
7. Built-in devtools support

### MobX Advantages
1. More powerful for complex state
2. Better performance for large applications
3. Framework agnostic
4. Computed values and reactions
5. Automatic dependency tracking
6. More mature ecosystem
7. Better for OOP patterns

## When to Use Each

### Use Zustand When:
- Building small to medium React applications
- Need a simple state management solution
- Want minimal boilerplate
- Working with React hooks extensively
- Need quick setup and easy learning curve

### Use MobX When:
- Building large, complex applications
- Need powerful computed values and reactions
- Working with OOP patterns
- Need framework agnosticism
- Have complex state dependencies
- Need fine-grained reactivity

## Performance Considerations

### Zustand Performance Tips
```typescript
// Selective subscription
const count = useStore(state => state.count);
const increment = useStore(state => state.increment);

// Shallow comparison
const { users } = useStore(
  state => ({ users: state.users }),
  shallow
);
```

### MobX Performance Tips
```typescript
// Use computed values
class UserStore {
  @computed get activeUsers() {
    return this.users.filter(user => user.isActive);
  }
}

// Reaction for side effects
reaction(
  () => store.users.length,
  length => console.log('Users length changed:', length)
);
```
