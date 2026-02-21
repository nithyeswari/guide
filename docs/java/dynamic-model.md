# Java Object Mapping Guide

## Table of Contents
- [Overview](#overview)
- [Approaches](#approaches)
  - [1. MapStruct](#1-mapstruct)
  - [2. Spring Expression Language (SpEL)](#2-spring-expression-language-spel)
  - [3. JSON Configuration](#3-json-configuration)
  - [4. Fluent API](#4-fluent-api)
  - [5. Dynamic Reflection](#5-dynamic-reflection)
- [Performance Comparison](#performance-comparison)
- [Implementation Examples](#implementation-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

This guide covers different approaches to implement object mapping in Java applications, with a focus on flexibility, maintainability, and performance.

### Dependencies

```xml
<dependencies>
    <!-- MapStruct -->
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct</artifactId>
        <version>1.5.5.Final</version>
    </dependency>
    
    <!-- Spring Framework -->
    <dependency>
        <groupId>org.springframework</groupId>
        <artifactId>spring-context</artifactId>
        <version>6.0.13</version>
    </dependency>
    
    <!-- Jackson for JSON -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.15.3</version>
    </dependency>
</dependencies>
```

## Approaches

### 1. MapStruct

Best for: Type-safe, compile-time mapping with high performance

```java
@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(source = "firstName", target = "fullName")
    @Mapping(target = "fullName", expression = "java(source.getFirstName() + ' ' + source.getLastName())")
    UserDTO toDTO(User source);
}
```

#### Advantages
- Compile-time validation
- High performance
- Type safety
- Clear error messages

#### Disadvantages
- Less runtime flexibility
- Requires compile-time processing
- Static mappings

### 2. Spring Expression Language (SpEL)

Best for: Dynamic, runtime-evaluated mappings

```java
@FieldMapping(expression = "#source.firstName + ' ' + #source.lastName")
private String fullName;

@Component
public class SpELMapper {
    private final ExpressionParser parser = new SpelExpressionParser();
    
    public <T> T map(Object source, Class<T> targetClass) {
        // Implementation in codebase
    }
}
```

#### Advantages
- Runtime flexibility
- Expression-based mapping
- Dynamic evaluation
- Integration with Spring

#### Disadvantages
- Runtime overhead
- No compile-time validation
- More complex debugging

### 3. JSON Configuration

Best for: Externalized mapping configuration

```json
{
  "mappings": [
    {
      "sourceField": "firstName",
      "targetField": "fullName",
      "transformationType": "CONCAT",
      "additionalFields": ["lastName"]
    }
  ]
}
```

```java
@Service
public class JsonConfigMapper {
    private final MappingConfig config;
    
    public <T> T map(Object source, Class<T> targetClass) {
        // Implementation in codebase
    }
}
```

#### Advantages
- External configuration
- Runtime changes
- Business-readable
- Environment-specific mappings

#### Disadvantages
- No type safety
- Runtime parsing overhead
- More complex error handling

### 4. Fluent API

Best for: Programmatic mapping configuration with good readability

```java
FluentMapper mapper = new FluentMapper()
    .mapping("firstName", "fullName")
        .withTransformer(name -> name.toUpperCase())
        .withValidator(Objects::nonNull)
    .mapping("email", "contactEmail")
        .withValidator(this::isValidEmail);
```

#### Advantages
- Readable configuration
- Type-safe
- IDE support
- Easy to modify

#### Disadvantages
- More verbose
- Runtime configuration
- Memory overhead

### 5. Dynamic Reflection

Best for: Ultimate flexibility with performance tradeoffs

```java
public class ReflectionMapper {
    private final Map<Class<?>, Map<String, Method>> methodCache;
    
    public <T> T map(Object source, Class<T> targetClass) {
        // Implementation in codebase
    }
}
```

#### Advantages
- Maximum flexibility
- Runtime adaptation
- No configuration needed
- Works with any object

#### Disadvantages
- Performance overhead
- No type safety
- Complex error handling

## Performance Comparison

| Approach | Startup Time | Execution Time | Memory Usage |
|----------|--------------|----------------|--------------|
| MapStruct | Slow | Fastest | Low |
| SpEL | Fast | Medium | Medium |
| JSON Config | Medium | Slow | Medium |
| Fluent API | Fast | Fast | Medium |
| Reflection | Fast | Slowest | High |

## Implementation Examples

### Basic Mapping

```java
// MapStruct
@Mapper
public interface BasicMapper {
    UserDTO toDTO(User user);
}

// SpEL
@Component
public class UserMapper {
    @FieldMapping(source = "firstName")
    private String name;
}

// Fluent
FluentMapper.mapping("firstName", "name")
           .map(user, UserDTO.class);
```

### Complex Transformations

```java
// MapStruct with Custom Method
@Mapper
public interface ComplexMapper {
    default String formatName(String first, String last) {
        return String.format("%s %s", first, last);
    }
}

// SpEL with Expression
@FieldMapping(expression = "T(com.example.Utils).formatName(#source.first, #source.last)")
private String fullName;

// Fluent with Lambda
FluentMapper.mapping("name", "fullName")
           .withTransformer(name -> formatName((String)name))
```

## Best Practices

1. Choose the Right Approach
   - Use MapStruct for stable, performance-critical mappings
   - Use SpEL for dynamic, runtime-evaluated mappings
   - Use JSON Config for externalized business rules
   - Use Fluent API for readable, programmatic configuration
   - Use Reflection as last resort for maximum flexibility

2. Performance Optimization
   - Cache reflection methods
   - Precompile SpEL expressions
   - Use bulk operations for collections
   - Implement lazy loading where appropriate

3. Error Handling
   - Implement comprehensive validation
   - Use custom exceptions
   - Provide clear error messages
   - Log mapping failures

4. Testing
   - Unit test each mapping
   - Test edge cases
   - Verify null handling
   - Test performance under load

## Troubleshooting

Common Issues and Solutions:

1. Performance Issues
   ```java
   // Bad
   mapper.map(object); // Called in loop
   
   // Good
   Mapper mapper = createMapper(); // Cache mapper
   objects.forEach(mapper::map);
   ```

2. Memory Leaks
   ```java
   // Bad
   new MapperFactory().createMapper(); // Created for each mapping
   
   // Good
   @Singleton
   class MapperFactory { ... }
   ```

3. Null Handling
   ```java
   // Bad
   return source.getValue();
   
   // Good
   return Optional.ofNullable(source)
                 .map(Source::getValue)
                 .orElse(null);
   ```

## References

1. Official Documentation
   - [MapStruct Documentation](https://mapstruct.org/)
   - [Spring Expression Language](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#expressions)
   - [Jackson Documentation](https://github.com/FasterXML/jackson-docs)

2. Code Examples
   - [GitHub Repository](https://github.com/yourusername/mapping-examples)
   - [Implementation Classes](#implementation-examples)

3. Performance Benchmarks
   - [Mapping Benchmark Results](#performance-comparison)
   - [JMH Benchmarks](https://github.com/yourusername/mapping-benchmarks)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.