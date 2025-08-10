# Dynamic Querying in Google Cloud Spanner

This document describes how to implement dynamic queries in Google Cloud Spanner with Spring Boot.

## Spanner Dynamic Query and Data Model System

(Content from spannerdynamic.md)

A comprehensive solution for working with dynamic queries and flexible data models in Google Cloud Spanner with Spring Boot.

### Dynamic Query Builder

- **Flexible Filtering**: Apply multiple filter conditions dynamically at runtime
- **Advanced Searching**: Support for both single field and multi-field text search
- **Customizable Sorting**: Order by multiple fields with direction and NULL handling control
- **Pagination**: Both page-based and offset-based pagination options

### Dynamic Data Models

- **Multiple Storage Options**: Choose between JSON, EAV, Wide-Table, or Hybrid approaches
- **Searchable Fields**: Extract and optimize critical fields for high-performance queries

## Implementation

### `SearchQuery.java`

```java
package com.example.spanner.query;

// ... imports

public class SpannerQueryBuilder<T> {

    // ... query builder implementation
}
```

### `UserController.java`

```java
package com.example.spanner.controller;

// ... imports

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final SpannerQueryService queryService;

    // ... controller methods
}
```
