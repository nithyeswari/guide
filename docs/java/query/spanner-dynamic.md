# Spanner Dynamic Query and Data Model System

A comprehensive solution for working with dynamic queries and flexible data models in Google Cloud Spanner with Spring Boot.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Dynamic Query Builder](#dynamic-query-builder)
  - [Core Components](#core-components)
  - [Query Request Structure](#query-request-structure)
  - [Filter Operations](#filter-operations)
  - [Search Options](#search-options)
  - [Sorting Options](#sorting-options)
  - [Pagination Options](#pagination-options)
  - [Response Format](#response-format)
- [Dynamic Data Storage Approaches](#dynamic-data-storage-approaches)
  - [1. JSON Column Approach](#1-json-column-approach)
  - [2. Entity-Attribute-Value (EAV) Model](#2-entity-attribute-value-eav-model)
  - [3. Wide Table Approach](#3-wide-table-approach)
  - [4. Hybrid Approach (Recommended)](#4-hybrid-approach-recommended)
- [Implementation Guide](#implementation-guide)
  - [Spring Boot Configuration](#spring-boot-configuration)
  - [API Controller Examples](#api-controller-examples)
  - [Service Layer Implementation](#service-layer-implementation)
  - [Entity Definitions](#entity-definitions)
- [Advanced Usage](#advanced-usage)
  - [Custom Query Methods](#custom-query-methods)
  - [Handling Complex JSON](#handling-complex-json)
  - [Change Tracking](#change-tracking)
- [Best Practices](#best-practices)
- [Performance Considerations](#performance-considerations)
- [License](#license)

## Overview

This library provides a flexible solution for two common challenges when working with Google Cloud Spanner:

1. **Dynamic Queries**: Creating a powerful, flexible query API that allows clients to specify filtering, searching, sorting, and pagination criteria dynamically.

2. **Evolving Data Models**: Handling flexible data structures where the schema can evolve over time, including the ability to add new fields without requiring constant schema migrations.

## Features

### Dynamic Query Builder

- **Flexible Filtering**: Apply multiple filter conditions dynamically at runtime
- **Advanced Searching**: Support for both single field and multi-field text search
- **Customizable Sorting**: Order by multiple fields with direction and NULL handling control
- **Pagination**: Both page-based and offset-based pagination options
- **Type Safety**: Strongly typed results via entity mapping
- **Security**: Proper parameter binding to prevent SQL injection
- **Spring Integration**: Seamless integration with Spring Data and Spring Boot

### Dynamic Data Models

- **Multiple Storage Options**: Choose between JSON, EAV, Wide-Table, or Hybrid approaches
- **Searchable Fields**: Extract and optimize critical fields for high-performance queries
- **Field Metadata**: Track which fields are searchable or editable
- **Schema Evolution**: Add new fields without database migrations (depending on the approach)

## Installation

Add the dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>spanner-dynamic</artifactId>
    <version>1.0.0</version>
</dependency>
```

Or with Gradle:

```groovy
implementation 'com.example:spanner-dynamic:1.0.0'
```

## Dynamic Query Builder

### Core Components

The query system consists of these main components:

1. **SpannerQueryBuilder**: The core builder class for constructing dynamic queries
2. **SpannerQueryService**: A service for creating and executing queries from request objects
3. **QueryRequest**: A structured request format for defining queries
4. **PagedResult**: A response wrapper with data and pagination metadata

### Query Request Structure

The query API accepts a structured JSON request with the following properties:

```json
{
  "fields": ["id", "name", "email"],
  "filters": {
    "status": "active",
    "age": { "gte": 21 },
    "role": { "in": ["admin", "editor"] }
  },
  "search": {
    "fields": ["name", "email"],
    "term": "searchterm"
  },
  "sort": {
    "created_at": "desc",
    "name": "asc"
  },
  "pagination": {
    "page": 2,
    "pageSize": 10
  }
}
```

### Filter Operations

| Operator | Description | Example |
|----------|-------------|---------|
| Simple value | Equal to | `"status": "active"` |
| `eq` | Equal to | `"age": { "eq": 21 }` |
| `ne` | Not equal to | `"status": { "ne": "inactive" }` |
| `gt` | Greater than | `"age": { "gt": 18 }` |
| `gte` | Greater than or equal | `"age": { "gte": 21 }` |
| `lt` | Less than | `"price": { "lt": 100 }` |
| `lte` | Less than or equal | `"price": { "lte": 99.99 }` |
| `in` | In a list of values | `"status": { "in": ["active", "pending"] }` |
| `between` | Between two values | `"age": { "between": [18, 65] }` |
| `like` | LIKE pattern | `"name": { "like": "%John%" }` |
| `search` | Search with wildcards | `"description": { "search": "cloud", "exact": false }` |
| `isNull` | IS NULL / IS NOT NULL | `"deleted_at": { "isNull": true }` |

### Search Options

**Single Field Search**:
```json
{
  "filters": {
    "name": { "search": "John", "exact": false }
  }
}
```

**Multi-Field Search**:
```json
{
  "search": {
    "fields": ["name", "email", "description"],
    "term": "searchterm",
    "exact": false
  }
}
```

### Sorting Options

**Object Format**:
```json
{
  "sort": {
    "created_at": "desc",
    "name": "asc"
  }
}
```

**Array Format with NULL Handling**:
```json
{
  "sort": [
    { "field": "created_at", "direction": "DESC", "nullsFirst": false },
    { "field": "name", "direction": "ASC" }
  ]
}
```

### Pagination Options

**Page-Based Pagination**:
```json
{
  "pagination": {
    "page": 2,
    "pageSize": 10
  }
}
```

**Offset-Based Pagination**:
```json
{
  "pagination": {
    "offset": 20,
    "limit": 10
  }
}
```

### Response Format

The query execution returns a `PagedResult` object with the data and pagination metadata:

```json
{
  "data": [
    {
      "id": "user123",
      "name": "John Smith",
      "email": "john@example.com",
      "status": "active"
    },
    // More data entries...
  ],
  "pagination": {
    "totalCount": 152,
    "currentPage": 2,
    "pageSize": 10,
    "totalPages": 16,
    "hasMore": true
  }
}
```

## Dynamic Data Storage Approaches

When dealing with dynamic data models, there are several approaches to consider:

### 1. JSON Column Approach

```java
@Table(name = "dynamic_entities")
public class DynamicEntity {
    @PrimaryKey
    @Column(name = "id")
    private String id;
    
    @Column(name = "entity_type")
    private String entityType;
    
    // Core searchable fields
    @Column(name = "created_at")
    private Timestamp createdAt;
    
    @Column(name = "updated_at")
    private Timestamp updatedAt;
    
    // Dynamic payload stored as JSON
    @Column(name = "payload", spannerType = TypeCode.JSON)
    private String payload;
    
    // Extracted searchable fields
    @Column(name = "searchable_field_1")
    private String searchableField1;
    
    @Column(name = "searchable_field_2")
    private String searchableField2;
}
```

**Pros**:
- Highly flexible - can store any JSON structure
- No schema migrations needed for new fields in the payload
- Good for rapid prototyping or when schema evolves frequently

**Cons**:
- Limited query capabilities on the JSON content
- Performance can be slower for complex queries on JSON data
- Cannot create indexes on fields inside the JSON

**Best For**:
- Applications with rapidly evolving schema
- When field structure is not fully known in advance
- When most queries will be on the extracted fields

### 2. Entity-Attribute-Value (EAV) Model

```java
@Table(name = "entities")
public class Entity {
    @PrimaryKey
    @Column(name = "id")
    private String id;
    
    @Column(name = "entity_type")
    private String entityType;
    
    @Column(name = "created_at")
    private Timestamp createdAt;
    
    @Column(name = "updated_at")
    private Timestamp updatedAt;
}

@Table(name = "entity_attributes")
@Interleaved(parentTable = "entities")
public class EntityAttribute {
    @PrimaryKey(keyOrder = 1)
    @Column(name = "entity_id")
    private String entityId;
    
    @PrimaryKey(keyOrder = 2)
    @Column(name = "attribute_name")
    private String attributeName;
    
    @Column(name = "string_value")
    private String stringValue;
    
    @Column(name = "number_value")
    private Double numberValue;
    
    @Column(name = "boolean_value")
    private Boolean booleanValue;
    
    @Column(name = "timestamp_value")
    private Timestamp timestampValue;
    
    @Column(name = "is_searchable")
    private Boolean isSearchable;
    
    @Column(name = "is_editable")
    private Boolean isEditable;
}
```

**Pros**:
- Highly flexible schema
- Can index specific attributes for better query performance
- Can explicitly mark attributes as searchable or editable
- Good for complex querying requirements on dynamic data

**Cons**:
- More complex to implement and maintain
- Requires joining tables for full entity retrieval
- Less efficient for retrieving the entire entity

**Best For**:
- When you need fine-grained control over each attribute
- When attributes have different types and metadata
- When you need to query on specific attributes frequently

### 3. Wide Table Approach

```java
@Table(name = "wide_entities")
public class WideEntity {
    @PrimaryKey
    @Column(name = "id")
    private String id;
    
    // Required fields
    @Column(name = "entity_type")
    private String entityType;
    
    @Column(name = "created_at")
    private Timestamp createdAt;
    
    // Optional fields with nullability
    @Column(name = "field_a")
    private String fieldA;
    
    @Column(name = "field_b")
    private String fieldB;
    
    @Column(name = "field_c")
    private Long fieldC;
    
    // Many more potential fields...
    
    // For truly dynamic fields that don't fit the pattern
    @Column(name = "extra_data", spannerType = TypeCode.JSON)
    private String extraData;
}
```

**Pros**:
- Better query performance for the defined columns
- Can create indexes on specific columns
- Simpler to understand and use than EAV

**Cons**:
- Requires schema migrations for completely new fields
- Can lead to sparse tables with many NULL values
- Limited by Spanner's column count limits

**Best For**:
- When the set of possible fields is known in advance
- When you need good query performance on many fields
- When schema changes are infrequent

### 4. Hybrid Approach (Recommended)

```java
@Table(name = "hybrid_entities")
public class HybridEntity {
    @PrimaryKey
    @Column(name = "id")
    private String id;
    
    // Core fields that are always present
    @Column(name = "entity_type")
    private String entityType;
    
    @Column(name = "created_at")
    private Timestamp createdAt;
    
    @Column(name = "updated_at")
    private Timestamp updatedAt;
    
    // Known important searchable/filterable fields
    @Column(name = "status")
    private String status;
    
    @Column(name = "category")
    private String category;
    
    @Column(name = "priority")
    private Integer priority;
    
    // The complete dynamic payload
    @Column(name = "payload", spannerType = TypeCode.JSON)
    private String payload;
    
    // Optional: metadata about the fields
    @Column(name = "field_metadata", spannerType = TypeCode.JSON)
    private String fieldMetadata;
}
```

**Pros**:
- Balances flexibility and query performance
- Extracts key fields for efficient querying
- Provides a complete view of the entity in the JSON payload
- No schema migrations needed for new fields in the payload

**Cons**:
- Requires field extraction logic in your application
- Potential for data inconsistency between extracted fields and JSON
- Slightly more complex than a pure JSON approach

**Best For**:
- Most production scenarios with dynamic data
- When you know some fields will be frequently queried
- When you need both flexibility and performance

## Implementation Guide

### Spring Boot Configuration

```java
@Configuration
@EnableSpannerRepositories
public class SpannerConfig {
    @Bean
    public SpannerTemplate spannerTemplate(SpannerMappingContext mappingContext, SpannerOperations spannerOperations) {
        return new SpannerTemplate(spannerOperations, mappingContext);
    }
    
    @Bean
    public SpannerQueryService spannerQueryService(SpannerTemplate spannerTemplate, SpannerMappingContext mappingContext) {
        return new SpannerQueryService(spannerTemplate, mappingContext);
    }
    
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return mapper;
    }
}
```

### API Controller Examples

**Dynamic Query Controller**:

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final SpannerQueryService queryService;
    
    @Autowired
    public UserController(SpannerQueryService queryService) {
        this.queryService = queryService;
    }
    
    @PostMapping("/search")
    public ResponseEntity<PagedResult<User>> searchUsers(@RequestBody QueryRequest queryRequest) {
        PagedResult<User> result = queryService.executeQuery(User.class, queryRequest);
        return ResponseEntity.ok(result);
    }
    
    @GetMapping
    public ResponseEntity<PagedResult<User>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String sortDirection,
            @RequestParam(required = false, defaultValue = "1") int page,
            @RequestParam(required = false, defaultValue = "10") int pageSize) {
        
        // Create a query request from parameters
        QueryRequest queryRequest = new QueryRequest();
        
        // Apply filters
        if (status != null) {
            Map<String, Object> filters = new HashMap<>();
            filters.put("status", status);
            queryRequest.setFilters(filters);
        }
        
        // Apply search
        if (search != null && !search.trim().isEmpty()) {
            SearchCriteria searchCriteria = new SearchCriteria();
            searchCriteria.setFields(List.of("name", "email"));
            searchCriteria.setTerm(search);
            queryRequest.setSearch(searchCriteria);
        }
        
        // Apply sorting
        if (sortBy != null && !sortBy.trim().isEmpty()) {
            Map<String, String> sort = new HashMap<>();
            sort.put(sortBy, sortDirection);
            queryRequest.setSort(sort);
        }
        
        // Apply pagination
        PaginationCriteria pagination = new PaginationCriteria();
        pagination.setPage(page);
        pagination.setPageSize(pageSize);
        queryRequest.setPagination(pagination);
        
        // Execute query
        PagedResult<User> result = queryService.executeQuery(User.class, queryRequest);
        return ResponseEntity.ok(result);
    }
}
```

**Dynamic Entity Controller**:

```java
@RestController
@RequestMapping("/api/dynamic")
public class DynamicEntityController {
    private final DynamicEntityService entityService;
    
    @Autowired
    public DynamicEntityController(DynamicEntityService entityService) {
        this.entityService = entityService;
    }
    
    @PostMapping("/{entityType}")
    public ResponseEntity<Map<String, Object>> createEntity(
            @PathVariable String entityType,
            @RequestBody Map<String, Object> data) {
        String id = UUID.randomUUID().toString();
        entityService.saveEntity(id, data, entityType);
        
        Map<String, Object> response = new HashMap<>(data);
        response.put("id", id);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{entityType}/{id}")
    public ResponseEntity<Map<String, Object>> getEntity(
            @PathVariable String entityType,
            @PathVariable String id) {
        Map<String, Object> data = entityService.getEntityData(id);
        if (data == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(data);
    }
    
    @PutMapping("/{entityType}/{id}")
    public ResponseEntity<Map<String, Object>> updateEntity(
            @PathVariable String entityType,
            @PathVariable String id,
            @RequestBody Map<String, Object> data) {
        if (!entityService.exists(id)) {
            return ResponseEntity.notFound().build();
        }
        
        entityService.updateEntity(id, data);
        return ResponseEntity.ok(data);
    }
    
    @PostMapping("/{entityType}/search")
    public ResponseEntity<PagedResult<Map<String, Object>>> searchEntities(
            @PathVariable String entityType,
            @RequestBody QueryRequest queryRequest) {
        
        // Add entity type filter
        if (queryRequest.getFilters() == null) {
            queryRequest.setFilters(new HashMap<>());
        }
        queryRequest.getFilters().put("entity_type", entityType);
        
        PagedResult<Map<String, Object>> result = entityService.searchEntities(queryRequest);
        return ResponseEntity.ok(result);
    }
}
```

### Service Layer Implementation

Here's a service implementation for the hybrid approach:

```java
@Service
public class DynamicEntityService {
    private final SpannerTemplate spannerTemplate;
    private final SpannerQueryService queryService;
    private final ObjectMapper objectMapper;
    
    @Autowired
    public DynamicEntityService(
            SpannerTemplate spannerTemplate,
            SpannerQueryService queryService,
            ObjectMapper objectMapper) {
        this.spannerTemplate = spannerTemplate;
        this.queryService = queryService;
        this.objectMapper = objectMapper;
    }
    
    public void saveEntity(String id, Map<String, Object> dynamicData, String entityType) {
        HybridEntity entity = new HybridEntity();
        entity.setId(id);
        entity.setEntityType(entityType);
        entity.setCreatedAt(Timestamp.from(Instant.now()));
        entity.setUpdatedAt(Timestamp.from(Instant.now()));
        
        // Extract searchable fields
        extractSearchableFields(entity, dynamicData);
        
        // Store complete payload
        try {
            entity.setPayload(objectMapper.writeValueAsString(dynamicData));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error serializing payload", e);
        }
        
        spannerTemplate.save(entity);
    }
    
    public void updateEntity(String id, Map<String, Object> dynamicData) {
        HybridEntity entity = spannerTemplate.findById(HybridEntity.class, Key.of(id));
        if (entity == null) {
            throw new EntityNotFoundException("Entity not found with id: " + id);
        }
        
        entity.setUpdatedAt(Timestamp.from(Instant.now()));
        
        // Extract searchable fields
        extractSearchableFields(entity, dynamicData);
        
        // Store complete payload
        try {
            entity.setPayload(objectMapper.writeValueAsString(dynamicData));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error serializing payload", e);
        }
        
        spannerTemplate.update(entity);
    }
    
    private void extractSearchableFields(HybridEntity entity, Map<String, Object> data) {
        // Extract known searchable fields
        if (data.containsKey("status")) {
            entity.setStatus(String.valueOf(data.get("status")));
        }
        
        if (data.containsKey("category")) {
            entity.setCategory(String.valueOf(data.get("category")));
        }
        
        if (data.containsKey("priority")) {
            Object priority = data.get("priority");
            if (priority instanceof Number) {
                entity.setPriority(((Number) priority).intValue());
            } else if (priority instanceof String) {
                try {
                    entity.setPriority(Integer.parseInt((String) priority));
                } catch (NumberFormatException e) {
                    // Handle invalid priority format
                }
            }
        }
    }
    
    public boolean exists(String id) {
        return spannerTemplate.existsById(HybridEntity.class, Key.of(id));
    }
    
    public HybridEntity findById(String id) {
        return spannerTemplate.findById(HybridEntity.class, Key.of(id));
    }
    
    public Map<String, Object> getEntityData(String id) {
        HybridEntity entity = findById(id);
        if (entity == null) {
            return null;
        }
        
        try {
            Map<String, Object> data = objectMapper.readValue(
                    entity.getPayload(), 
                    new TypeReference<Map<String, Object>>() {});
            
            // Add id and core metadata fields
            data.put("id", entity.getId());
            data.put("created_at", entity.getCreatedAt());
            data.put("updated_at", entity.getUpdatedAt());
            
            return data;
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error deserializing payload", e);
        }
    }
    
    public PagedResult<Map<String, Object>> searchEntities(QueryRequest queryRequest) {
        // Execute query to get entities
        PagedResult<HybridEntity> result = queryService.executeQuery(
                HybridEntity.class, queryRequest);
        
        // Transform to Map results
        List<Map<String, Object>> transformedData = result.getData().stream()
                .map(this::entityToMap)
                .collect(Collectors.toList());
        
        // Create new paged result with transformed data
        PagedResult<Map<String, Object>> mappedResult = new PagedResult<>();
        mappedResult.setData(transformedData);
        mappedResult.setTotalCount(result.getTotalCount());
        mappedResult.setCurrentPage(result.getCurrentPage());
        mappedResult.setPageSize(result.getPageSize());
        mappedResult.setTotalPages(result.getTotalPages());
        mappedResult.setHasMore(result.isHasMore());
        
        return mappedResult;
    }
    
    private Map<String, Object> entityToMap(HybridEntity entity) {
        try {
            Map<String, Object> data = objectMapper.readValue(
                    entity.getPayload(), 
                    new TypeReference<Map<String, Object>>() {});
            
            // Add id and core metadata fields
            data.put("id", entity.getId());
            data.put("created_at", entity.getCreatedAt());
            data.put("updated_at", entity.getUpdatedAt());
            
            return data;
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error deserializing payload", e);
        }
    }
}
```

### Entity Definitions

**Example dynamic entity using the hybrid approach**:

```java
@Table(name = "hybrid_entities")
public class HybridEntity {
    @PrimaryKey
    @Column(name = "id")
    private String id;
    
    @Column(name = "entity_type")
    private String entityType;
    
    @Column(name = "created_at")
    private Timestamp createdAt;
    
    @Column(name = "updated_at")
    private Timestamp updatedAt;
    
    @Column(name = "status")
    private String status;
    
    @Column(name = "category")
    private String category;
    
    @Column(name = "priority")
    private Integer priority;
    
    @Column(name = "payload", spannerType = TypeCode.JSON)
    private String payload;
    
    // Getters and setters
}
```

## Advanced Usage

### Custom Query Methods

Creating custom query methods for complex scenarios:

```java
@Service
public class CustomQueryService {
    private final SpannerTemplate spannerTemplate;
    
    @Autowired
    public CustomQueryService(SpannerTemplate spannerTemplate) {
        this.spannerTemplate = spannerTemplate;
    }
    
    public List<HybridEntity> findEntitiesWithComplexCriteria(
            String category, 
            Integer minPriority, 
            List<String> statuses,
            Timestamp afterDate) {
        
        Statement statement = Statement.newBuilder(
                "SELECT * FROM hybrid_entities " +
                "WHERE category = @category " +
                "AND priority >= @minPriority " +
                "AND status IN UNNEST(@statuses) " +
                "AND created_at > @afterDate " +
                "ORDER BY priority DESC, created_at DESC")
                .bind("category").to(category)
                .bind("minPriority").to(minPriority)
                .bind("statuses").toStringArray(statuses)
                .bind("afterDate").to(afterDate)
                .build();
        
        return spannerTemplate.query(HybridEntity.class, statement);
    }
    
    public Map<String, Long> countEntitiesByCategory() {
        Statement statement = Statement.newBuilder(
                "SELECT category, COUNT(*) as count " +
                "FROM hybrid_entities " +
                "GROUP BY category")
                .build();
        
        List<CategoryCount> results = spannerTemplate.query(CategoryCount.class, statement);
        
        return results.stream()
                .collect(Collectors.toMap(
                        CategoryCount::getCategory,
                        CategoryCount::getCount
                ));
    }
    
    @Table
    public static class CategoryCount {
        @Column(name = "category")
        private String category;
        
        @Column(name = "count")
        private Long count;
        
        // Getters and setters
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public Long getCount() { return count; }
        public void setCount(Long count) { this.count = count; }
    }
}
```

### Handling Complex JSON

Working with nested JSON structures:

```java
@Service
public class NestedJsonService {
    private final SpannerTemplate spannerTemplate;
    private final ObjectMapper objectMapper;
    
    @Autowired
    public NestedJsonService(SpannerTemplate spannerTemplate, ObjectMapper objectMapper) {
        this.spannerTemplate = spannerTemplate;
        this.objectMapper = objectMapper;
    }
    
    public void updateNestedValue(String entityId, String path, Object value) {
        HybridEntity entity = spannerTemplate.findById(HybridEntity.class, Key.of(entityId));
        if (entity == null) {
            throw new EntityNotFoundException("Entity not found");
        }
        
        try {
            // Parse the JSON
            JsonNode rootNode = objectMapper.readTree(entity.getPayload());
            ObjectNode objectNode = (ObjectNode) rootNode;
            
            // Handle nested path updates
            updateNestedNode(objectNode, path, value);
            
            // Convert back to JSON
            entity.setPayload(objectMapper.writeValueAsString(rootNode));
            entity.setUpdatedAt(Timestamp.from(Instant.now()));
            
            // Save the updated entity
            spannerTemplate.update(entity);
            
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error processing JSON payload", e);
        }
    }
    
    private void updateNestedNode(ObjectNode parentNode, String path, Object value) {
        String[] parts = path.split("\\.");
        
        for (int i = 0; i < parts.length - 1; i++) {
            String part = parts[i];
            
            if (!parentNode.has(part) || !parentNode.get(part).isObject()) {
                parentNode.putObject(part);
            }
            
            parentNode = (ObjectNode) parentNode.get(part);
        }
        
        String lastPart = parts[parts.length - 1];
        
        if (value == null) {
            parentNode.putNull(lastPart);
        } else if (value instanceof String) {
            parentNode.put(lastPart, (String) value);
        } else if (value instanceof Integer) {
            parentNode.put(lastPart, (Integer) value);
        } else if (value instanceof Long) {
            parentNode.put(lastPart, (Long) value);
        } else if (value instanceof Double) {
            parentNode.put(lastPart, (Double) value);
        } else if (value instanceof Boolean) {
            parentNode.put(lastPart, (Boolean) value);
        } else {
            try {
                parentNode.set(lastPart, objectMapper.valueToTree(value));
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Unsupported value type", e);
            }
        }
    }
}
```

### Change Tracking

Implementing change tracking for dynamic entities:

```java
@Table(name = "entity_changes")
public class EntityChange {
    @PrimaryKey(keyOrder = 1)
    @Column(name = "entity_id")
    private String entityId;
    
    @PrimaryKey(keyOrder = 2)
    @Column(name = "change_timestamp")
    private Timestamp changeTimestamp;
    
    @Column(name = "user_id")
    private String userId;
    
    @Column(name = "change_type")
    private String changeType;  // CREATE, UPDATE, DELETE
    
    @Column(name = "changed_fields", spannerType = TypeCode.JSON)
    private String changedFields;
    
    @Column(name = "previous_values", spannerType = TypeCode.JSON)
    private String previousValues;
    
    @Column(name = "new_values", spannerType = TypeCode.JSON)
    private String newValues;
    
    // Getters and setters
}

@Service
public class ChangeTrackingService {
    private final SpannerTemplate spannerTemplate;
    private final ObjectMapper objectMapper;
    
    @Autowired
    public ChangeTrackingService(SpannerTemplate spannerTemplate, ObjectMapper objectMapper) {
        this.spannerTemplate = spannerTemplate;
        this.objectMapper = objectMapper;
    }
    
    public void trackChange(
            String entityId, 
            String userId, 
            String changeType, 
            Map<String, Object> previousData, 
            Map<String, Object> newData) {
        
        EntityChange change = new EntityChange();
        change.setEntityId(entityId);
        change.setChangeTimestamp(Timestamp.from(Instant.now()));
        change.setUserId(userId);
        change.setChangeType(changeType);
        
        try {
            // Only track the changed fields
            Map<String, Object> changedFields = new HashMap<>();
            Map<String, Object> previousValues = new HashMap<>();
            Map<String, Object> newValues = new HashMap<>();
            
            if (previousData != null && newData != null) {
                // Find changed fields
                Set<String> allKeys = new HashSet<>();
                allKeys.addAll(previousData.keySet());
                allKeys.addAll(newData.keySet());
                
                for (String key : allKeys) {
                    Object oldValue = previousData.get(key);
                    Object newValue = newData.get(key);
                    
                    if (!Objects.equals(oldValue, newValue)) {
                        changedFields.put(key, true);
                        
                        if (oldValue != null) {
                            previousValues.put(key, oldValue);
                        }
                        
                        if (newValue != null) {
                            newValues.put(key, newValue);
                        }
                    }
                }
            } else if (previousData == null && newData != null) {
                // Create operation
                changedFields = newData.keySet().stream()
                        .collect(Collectors.toMap(key -> key, key -> true));
                newValues = newData;
            } else if (previousData != null && newData == null) {
                // Delete operation
                changedFields = previousData.keySet().stream()
                        .collect(Collectors.toMap(key -> key, key -> true));
                previousValues = previousData;
            }
            
            change.setChangedFields(objectMapper.writeValueAsString(changedFields));
            change.setPreviousValues(objectMapper.writeValueAsString(previousValues));
            change.setNewValues(objectMapper.writeValueAsString(newValues));
            
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error serializing change data", e);
        }
        
        spannerTemplate.insert(change);
    }
    
    public List<EntityChange> getChangeHistory(String entityId) {
        Statement statement = Statement.newBuilder(
                "SELECT * FROM entity_changes " +
                "WHERE entity_id = @entityId " +
                "ORDER BY change_timestamp DESC")
                .bind("entityId").to(entityId)
                .build();
        
        return spannerTemplate.query(EntityChange.class, statement);
    }
    
    public Map<String, Object> getEntityStateAtPoint(String entityId, Timestamp timestamp) {
        // Get all changes up to the specified timestamp
        Statement statement = Statement.newBuilder(
                "SELECT * FROM entity_changes " +
                "WHERE entity_id = @entityId " +
                "AND change_timestamp <= @timestamp " +
                "ORDER BY change_timestamp ASC")
                .bind("entityId").to(entityId)
                .bind("timestamp").to(timestamp)
                .build();
        
        List<EntityChange> changes = spannerTemplate.query(EntityChange.class, statement);
        
        // Apply changes in sequence to reconstruct the state
        Map<String, Object> state = new HashMap<>();
        
        for (EntityChange change : changes) {
            try {
                if (change.getChangeType().equals("DELETE")) {
                    // Entity was deleted at this point
                    return null;
                }
                
                Map<String, Object> newValues = objectMapper.readValue(
                        change.getNewValues(),
                        new TypeReference<Map<String, Object>>() {});
                
                // Apply new values to state
                state.putAll(newValues);
                
                // If this is a partial update, also handle removed fields
                Map<String, Object> previousValues = objectMapper.readValue(
                        change.getPreviousValues(),
                        new TypeReference<Map<String, Object>>() {});
                
                for (String key : previousValues.keySet()) {
                    if (!newValues.containsKey(key)) {
                        // Field was removed in this update
                        state.remove(key);
                    }
                }
                
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error deserializing change data", e);
            }
        }
        
        return state;
    }
}