# Spanner Dynamic Query Generator

A flexible and powerful utility for building dynamic SQL queries for Google Cloud Spanner with proper parameter binding.

## Features

- **Dynamic filtering** with support for various comparison operators
- **Advanced search** capabilities across multiple fields
- **Flexible sorting** with support for multiple fields and NULL handling
- **Pagination** with both page-based and offset-based approaches
- **Secure parameter binding** to prevent SQL injection
- **Clean, chainable API** for building queries programmatically
- **Structured request format** for API-based query generation

## Installation

```bash
npm install spanner-dynamic-query
```

## Quick Start

```javascript
const { Spanner } = require('@google-cloud/spanner');
const { createDynamicQuery, executePagedQuery } = require('spanner-dynamic-query');

// Set up Spanner connection
const spanner = new Spanner();
const instance = spanner.instance('my-instance');
const database = instance.database('my-database');

// Method 1: Simple query using request object
async function getUsers() {
  const requestObj = {
    fields: ['id', 'name', 'email'],
    filters: {
      status: 'active',
      age: { gte: 21 }
    },
    sort: { created_at: 'desc' },
    pagination: { page: 1, pageSize: 10 }
  };

  const result = await executePagedQuery('users', requestObj, database);
  return result;
}

// Method 2: Using the builder pattern
const { SpannerQueryBuilder } = require('spanner-dynamic-query');

async function searchUsers(searchTerm) {
  const builder = new SpannerQueryBuilder('users')
    .select(['id', 'name', 'email'])
    .where('status', '=', 'active')
    .multiFieldSearch(['name', 'email'], searchTerm)
    .orderBy('created_at', 'DESC')
    .limit(10);
  
  const query = builder.build();
  
  const [rows] = await database.run({
    sql: query.sql,
    params: query.params
  });
  
  return rows;
}
```

## API Reference

### SpannerQueryBuilder

A chainable class for building Spanner SQL queries.

```javascript
const builder = new SpannerQueryBuilder('tableName');
```

#### Basic Methods

| Method | Description | Example |
|--------|-------------|---------|
| `select(fields)` | Specify fields to return | `builder.select(['id', 'name'])` |
| `where(field, operator, value)` | Add a WHERE condition | `builder.where('age', '>=', 21)` |
| `whereIn(field, values)` | Add a WHERE IN condition | `builder.whereIn('status', ['active', 'pending'])` |
| `whereBetween(field, start, end)` | Add a BETWEEN condition | `builder.whereBetween('age', 18, 65)` |
| `whereNull(field)` | Add an IS NULL condition | `builder.whereNull('deleted_at')` |
| `whereNotNull(field)` | Add an IS NOT NULL condition | `builder.whereNotNull('email')` |

#### Search Methods

| Method | Description | Example |
|--------|-------------|---------|
| `fullTextSearch(field, searchText, exactMatch)` | Search in a single field | `builder.fullTextSearch('title', 'cloud', false)` |
| `multiFieldSearch(fields, searchText)` | Search across multiple fields | `builder.multiFieldSearch(['title', 'body'], 'cloud')` |

#### Sorting Methods

| Method | Description | Example |
|--------|-------------|---------|
| `orderBy(field, direction)` | Add an ORDER BY clause | `builder.orderBy('created_at', 'DESC')` |
| `orderByMultiple(sortFields)` | Add multiple ORDER BY clauses | `builder.orderByMultiple({created_at: 'DESC', name: 'ASC'})` |
| `nulls(nullsFirst)` | Control NULL position in sorting | `builder.orderBy('updated_at', 'DESC').nulls(false)` |

#### Pagination Methods

| Method | Description | Example |
|--------|-------------|---------|
| `limit(limit)` | Add a LIMIT clause | `builder.limit(10)` |
| `offset(offset)` | Add an OFFSET clause | `builder.offset(20)` |
| `paginate(page, pageSize)` | Add pagination | `builder.paginate(2, 10)` |

#### Execution Methods

| Method | Description | Example |
|--------|-------------|---------|
| `buildQuery()` | Get the SQL query string | `const sql = builder.buildQuery()` |
| `getParameters()` | Get the parameters object | `const params = builder.getParameters()` |
| `build()` | Get the full query object | `const query = builder.build()` |

### Utility Functions

#### createDynamicQuery(tableName, requestObj)

Generates a Spanner query from a structured request object.

```javascript
const query = createDynamicQuery('users', {
  fields: ['id', 'name'],
  filters: { status: 'active' }
});

// Returns: { sql: "SELECT id, name FROM users WHERE status = @p0", params: { p0: 'active' } }
```

#### countMatchingRecords(tableName, requestObj, spannerDatabase)

Counts total matching records for a given query.

```javascript
const count = await countMatchingRecords('users', requestObj, database);
```

#### executePagedQuery(tableName, requestObj, spannerDatabase)

Executes a query with complete pagination metadata.

```javascript
const result = await executePagedQuery('users', requestObj, database);

// Returns:
// {
//   data: [...],  // Rows from the database
//   pagination: {
//     totalCount: 100,
//     currentPage: 2,
//     pageSize: 10,
//     totalPages: 10,
//     hasMore: true
//   }
// }
```

## Request Object Format

The request object provides a standardized way to define query parameters:

```javascript
{
  // Fields to select (optional, defaults to *)
  fields: ['id', 'name', 'email'],
  
  // Filters (optional)
  filters: {
    // Simple equality
    status: 'active',
    
    // Complex conditions
    age: { gte: 21 },
    role: { in: ['admin', 'editor'] },
    last_login: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    name: { like: '%John%' },
    description: { search: 'keyword', exact: false },
    deleted_at: { isNull: true }
  },
  
  // Multi-field search (optional)
  search: {
    fields: ['name', 'email', 'description'],
    term: 'searchterm'
  },
  
  // Sorting (optional)
  sort: [
    { field: 'created_at', direction: 'DESC', nullsFirst: false },
    { field: 'name', direction: 'ASC' }
  ],
  // OR object format
  sort: {
    created_at: 'desc',
    name: 'asc'
  },
  
  // Pagination (optional)
  pagination: {
    // Page-based pagination
    page: 2,
    pageSize: 10
    // OR offset-based pagination
    // offset: 10,
    // limit: 10
  }
}
```

### Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| Simple value | Equal to | `status: 'active'` |
| `eq` | Equal to | `age: { eq: 21 }` |
| `ne` | Not equal to | `status: { ne: 'inactive' }` |
| `gt` | Greater than | `age: { gt: 18 }` |
| `gte` | Greater than or equal | `age: { gte: 21 }` |
| `lt` | Less than | `price: { lt: 100 }` |
| `lte` | Less than or equal | `price: { lte: 99.99 }` |
| `in` | In a list of values | `status: { in: ['active', 'pending'] }` |
| `between` | Between two values | `age: { between: [18, 65] }` |
| `like` | LIKE pattern | `name: { like: '%John%' }` |
| `search` | Search with wildcards | `description: { search: 'cloud', exact: false }` |
| `isNull` | IS NULL / IS NOT NULL | `deleted_at: { isNull: true }` |

## Examples

### Basic Query

```javascript
const query = createDynamicQuery('users', {
  fields: ['id', 'name', 'email'],
  filters: {
    status: 'active'
  }
});

const [rows] = await database.run({
  sql: query.sql,
  params: query.params
});
```

### Advanced Filtering

```javascript
const query = createDynamicQuery('products', {
  filters: {
    category: { in: ['electronics', 'computers'] },
    price: { between: [100, 1000] },
    name: { like: '%laptop%' },
    discontinued: { isNull: true }
  }
});
```

### Search Functionality

```javascript
const query = createDynamicQuery('documents', {
  search: {
    fields: ['title', 'content', 'tags'],
    term: 'cloud computing'
  }
});
```

### Complex Sorting

```javascript
const query = createDynamicQuery('orders', {
  sort: [
    { field: 'priority', direction: 'DESC' },
    { field: 'created_at', direction: 'DESC', nullsFirst: false }
  ]
});
```

### Pagination

```javascript
const result = await executePagedQuery('users', {
  filters: { status: 'active' },
  pagination: { page: 2, pageSize: 10 }
}, database);

console.log(`Showing ${result.data.length} of ${result.pagination.totalCount} results`);
console.log(`Page ${result.pagination.currentPage} of ${result.pagination.totalPages}`);
```

## Best Practices

1. **Always use parameter binding** (done automatically by this library)
2. **Limit result sets** to prevent performance issues
3. **Use indexes** for fields commonly used in filters, sorting, and searches
4. **Control query complexity** for large tables
5. **Consider performance impact** of complex searches and sorting operations

## License

MIT