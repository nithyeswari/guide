# JavaScript Development Guide

## Spanner Dynamic Query Generator

A flexible and powerful utility for building dynamic SQL queries for Google Cloud Spanner with proper parameter binding.

### Features

- **Dynamic filtering** with support for various comparison operators
- **Advanced search** capabilities across multiple fields
- **Flexible sorting** with support for multiple fields and NULL handling
- **Pagination** with both page-based and offset-based approaches
- **Secure parameter binding** to prevent SQL injection
- **Clean, chainable API** for building queries programmatically
- **Structured request format** for API-based query generation

### Installation

```bash
npm install spanner-dynamic-query
```

### Quick Start

```javascript
const { Spanner } = require('@google-cloud/spanner');
const { createDynamicQuery, executePagedQuery } = require('spanner-dynamic-query');

// ... (rest of the content from js/query.md)
```
