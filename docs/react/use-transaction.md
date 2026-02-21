# React useTransition Guide

## Table of Contents
- [Introduction](#introduction)
- [Basic Usage](#basic-usage)
- [Key Benefits](#key-benefits)
- [Common Use Cases](#common-use-cases)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Introduction

`useTransition` is a React hook that helps manage state updates by marking them as non-urgent. It returns an array with two elements:
- `isPending`: Boolean indicating if a transition is in progress
- `startTransition`: Function to wrap non-urgent state updates

```javascript
const [isPending, startTransition] = useTransition();
```

## Basic Usage

### Simple Implementation
```javascript
import { useTransition, useState } from 'react';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e) => {
    // Urgent update - Updates immediately
    setQuery(e.target.value);

    // Non-urgent update - Can be interrupted
    startTransition(() => {
      setResults(searchData(e.target.value));
    });
  };

  return (
    <div>
      <input value={query} onChange={handleSearch} />
      {isPending ? <LoadingIndicator /> : <ResultsList results={results} />}
    </div>
  );
}
```

## Key Benefits

1. **Improved User Experience**
   - Maintains UI responsiveness
   - Provides visual feedback during updates
   - Prevents UI freezing

2. **Performance Optimization**
   - Prioritizes critical updates
   - Allows interruption of non-urgent updates
   - Better resource utilization

3. **Concurrent Rendering Support**
   - Works with React's concurrent features
   - Better handling of CPU-intensive tasks
   - Smoother transitions

## Common Use Cases

### 1. Search & Filter Operations
```javascript
function FilterableList({ items }) {
  const [filter, setFilter] = useState('');
  const [filteredItems, setFilteredItems] = useState(items);
  const [isPending, startTransition] = useTransition();

  const handleFilter = (e) => {
    const value = e.target.value;
    setFilter(value);  // Immediate update

    startTransition(() => {
      setFilteredItems(
        items.filter(item => 
          item.name.toLowerCase().includes(value.toLowerCase())
        )
      );
    });
  };

  return (
    <div>
      <input value={filter} onChange={handleFilter} />
      {isPending && <LoadingIndicator />}
      <ItemsList items={filteredItems} />
    </div>
  );
}
```

### 2. Pagination
```javascript
function PaginatedContent() {
  const [page, setPage] = useState(1);
  const [content, setContent] = useState([]);
  const [isPending, startTransition] = useTransition();

  const loadNextPage = () => {
    setPage(p => p + 1);  // Immediate update

    startTransition(() => {
      const newContent = fetchPageContent(page + 1);
      setContent(prev => [...prev, ...newContent]);
    });
  };

  return (
    <div>
      <ContentList content={content} />
      <button onClick={loadNextPage} disabled={isPending}>
        {isPending ? 'Loading...' : 'Load More'}
      </button>
    </div>
  );
}
```

### 3. Tab Switching
```javascript
function TabPanel() {
  const [activeTab, setActiveTab] = useState('tab1');
  const [tabContent, setTabContent] = useState(null);
  const [isPending, startTransition] = useTransition();

  const switchTab = (tabId) => {
    setActiveTab(tabId);  // Immediate update

    startTransition(() => {
      const content = loadTabContent(tabId);  // Heavy operation
      setTabContent(content);
    });
  };

  return (
    <div>
      <TabList activeTab={activeTab} onTabChange={switchTab} />
      <div>
        {isPending ? <TabSkeleton /> : <TabContent content={tabContent} />}
      </div>
    </div>
  );
}
```

### 4. Form with Live Preview
```javascript
function LivePreviewForm() {
  const [formData, setFormData] = useState({});
  const [preview, setPreview] = useState(null);
  const [isPending, startTransition] = useTransition();

  const updatePreview = (data) => {
    setFormData(data);  // Immediate update

    startTransition(() => {
      const generatedPreview = generatePreview(data);  // Complex operation
      setPreview(generatedPreview);
    });
  };

  return (
    <div className="split-screen">
      <FormInputs onChange={updatePreview} data={formData} />
      <div className="preview">
        {isPending ? <PreviewSkeleton /> : <Preview data={preview} />}
      </div>
    </div>
  );
}
```

## Best Practices

1. **When to Use useTransition**
   - Heavy computational tasks
   - Large list rendering
   - Complex UI updates
   - Data processing operations

2. **When NOT to Use useTransition**
   - Simple state updates
   - Direct user input reflection
   - Critical UI responses
   - Error states

3. **Performance Tips**
   ```javascript
   // DO: Separate urgent and non-urgent updates
   const handleChange = (e) => {
     setValue(e.target.value);  // Urgent
     startTransition(() => {
       setProcessedValue(heavyProcess(e.target.value));  // Non-urgent
     });
   };

   // DON'T: Put urgent updates in transition
   const handleChange = (e) => {
     startTransition(() => {
       setValue(e.target.value);  // Wrong! This should be immediate
     });
   };
   ```

## Troubleshooting

### Common Issues and Solutions

1. **Transition Never Completes**
   ```javascript
   // Problem
   const [isPending, startTransition] = useTransition();
   startTransition(() => {
     setData(infiniteLoop());  // Transition hangs
   });

   // Solution
   const [isPending, startTransition] = useTransition();
   startTransition(() => {
     setData(processWithTimeout(data, 5000));
   });
   ```

2. **State Updates Not Reflecting**
   ```javascript
   // Problem
   startTransition(() => {
     setValue(v => v + 1);
     setOtherValue(value);  // Uses old value
   });

   // Solution
   startTransition(() => {
     setValue(v => v + 1);
     setOtherValue(v => v + 1);  // Use functional update
   });
   ```

3. **Performance Still Poor**
   ```javascript
   // Problem
   startTransition(() => {
     setItems(hugeArray.map(complexOperation));  // Still blocking
   });

   // Solution
   startTransition(() => {
     const chunks = chunkArray(hugeArray, 100);
     chunks.forEach((chunk, i) => {
       setTimeout(() => {
         setItems(prev => [...prev, ...chunk.map(complexOperation)]);
       }, i * 16);
     });
   });
   ```

## Integration with Other Features

### 1. With Suspense
```javascript
function DataComponent() {
  const [isPending, startTransition] = useTransition();
  
  return (
    <Suspense fallback={<Loader />}>
      {isPending ? <PendingState /> : <DataView />}
    </Suspense>
  );
}
```

### 2. With Error Boundaries
```javascript
function SafeTransition() {
  const [isPending, startTransition] = useTransition();
  
  return (
    <ErrorBoundary fallback={<ErrorMessage />}>
      <TransitionContent isPending={isPending} />
    </ErrorBoundary>
  );
}
```

## Advanced Examples

### 1. Infinite Scroll with Virtual List
```javascript
import { useTransition, useState, useEffect, useRef } from 'react';
import { FixedSizeList } from 'react-window';

function InfiniteScrollList() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef(null);
  const observerRef = useRef(null);

  // Virtual list row renderer
  const Row = ({ index, style }) => (
    <div style={style} className="p-4 border-b">
      {isPending && index === items.length - 1 ? (
        <LoadingIndicator />
      ) : (
        <ItemContent item={items[index]} />
      )}
    </div>
  );

  // Intersection observer for infinite scroll
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "20px",
      threshold: 1.0
    };

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isPending) {
        loadMoreItems();
      }
    }, options);

    return () => observerRef.current?.disconnect();
  }, []);

  const loadMoreItems = () => {
    startTransition(() => {
      fetchItems(page).then(newItems => {
        setItems(prev => [...prev, ...newItems]);
        setPage(p => p + 1);
      });
    });
  };

  return (
    <FixedSizeList
      ref={listRef}
      height={400}
      width="100%"
      itemCount={items.length}
      itemSize={50}
    >
      {Row}
    </FixedSizeList>
  );
}

### 2. Smooth Auto-Scroll Chat
```javascript
function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const chatEndRef = useRef(null);

  const smoothScrollToBottom = () => {
    startTransition(() => {
      chatEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    });
  };

  useEffect(() => {
    smoothScrollToBottom();
  }, [messages]);

  const sendMessage = (text) => {
    setNewMessage('');  // Immediate update
    
    startTransition(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text,
        type: 'sent'
      }]);
    });
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={chatEndRef} />
      </div>
      <MessageInput 
        value={newMessage}
        onChange={setNewMessage}
        onSend={sendMessage}
        disabled={isPending}
      />
    </div>
  );
}

### 3. Dynamic Image Gallery with Transitions
```javascript
function ImageGallery() {
  const [images, setImages] = useState([]);
  const [selectedSize, setSelectedSize] = useState('medium');
  const [isPending, startTransition] = useTransition();

  const handleResize = (size) => {
    setSelectedSize(size);  // Immediate update

    startTransition(() => {
      setImages(prevImages => 
        prevImages.map(img => ({
          ...img,
          dimensions: calculateNewDimensions(img, size),
          quality: size === 'large' ? 'high' : 'normal'
        }))
      );
    });
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <SizeSelector 
        value={selectedSize} 
        onChange={handleResize} 
      />
      {images.map(img => (
        <div key={img.id} 
          style={{ 
            opacity: isPending ? 0.7 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          <img 
            src={img.url} 
            width={img.dimensions.width}
            height={img.dimensions.height}
            loading="lazy"
            alt={img.description}
          />
        </div>
      ))}
    </div>
  );
}

### 4. Advanced Form with Dynamic Validation
```javascript
function DynamicForm() {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isPending, startTransition] = useTransition();
  const [isValid, setIsValid] = useState(false);

  const validateField = (name, value) => {
    setFormData(prev => ({...prev, [name]: value}));  // Immediate update

    startTransition(() => {
      // Complex validation logic
      const fieldErrors = performValidation(name, value, formData);
      setErrors(prev => ({...prev, ...fieldErrors}));
      
      // Check overall form validity
      const newFormData = {...formData, [name]: value};
      const isFormValid = Object.keys(newFormData)
        .every(key => !performValidation(key, newFormData[key], newFormData));
      setIsValid(isFormValid);
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormFields 
        data={formData} 
        errors={errors}
        onChange={validateField}
      />
      <SubmitButton 
        disabled={!isValid || isPending}
        isPending={isPending}
      />
    </form>
  );
}

### 5. Data Grid with Complex Sorting and Filtering
```javascript
function AdvancedDataGrid() {
  const [data, setData] = useState([]);
  const [sortConfig, setSortConfig] = useState(null);
  const [filters, setFilters] = useState({});
  const [isPending, startTransition] = useTransition();

  const applyChanges = (newSortConfig, newFilters) => {
    // Immediate updates for UI elements
    setSortConfig(newSortConfig);
    setFilters(newFilters);

    startTransition(() => {
      let processedData = [...data];

      // Apply filters
      Object.entries(newFilters).forEach(([key, value]) => {
        processedData = processedData.filter(item => 
          applyFilter(item[key], value)
        );
      });

      // Apply sorting
      if (newSortConfig) {
        processedData.sort((a, b) => 
          compareValues(a, b, newSortConfig)
        );
      }

      setData(processedData);
    });
  };

  return (
    <div>
      <GridControls 
        sortConfig={sortConfig}
        filters={filters}
        onConfigChange={applyChanges}
        disabled={isPending}
      />
      {isPending ? (
        <GridSkeleton />
      ) : (
        <GridView data={data} />
      )}
    </div>
  );
}

## Testing

```javascript
// Jest example
test('handles transition state correctly', async () => {
  const { result } = renderHook(() => useTransition());
  const [isPending, startTransition] = result.current;
  
  act(() => {
    startTransition(() => {
      // Test state updates
    });
  });
  
  expect(result.current[0]).toBe(true);  // isPending
  await waitFor(() => {
    expect(result.current[0]).toBe(false);
  });
});
```