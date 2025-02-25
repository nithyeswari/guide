# Spring Boot Header Processing

A lightweight, annotation-based solution for handling HTTP headers in Spring Boot applications with complete Swagger/OpenAPI documentation.

## Features

- **Declarative Header Mapping**: Map HTTP headers to Java objects using simple annotations
- **Selective Processing**: Apply header processing only to specific controllers or endpoints
- **Compile-Time Validation**: Detect configuration errors during compilation
- **Runtime Validation**: Fail fast with clear error messages if headers are misconfigured
- **Swagger Integration**: Automatically document headers in OpenAPI specifications
- **Type Safety**: Strong typing for header values with proper null handling
- **Default Values**: Specify fallback values for missing headers
- **Clean Controller Code**: No manual header extraction or conversion

## Getting Started

### 1. Add Dependencies

```xml
<dependencies>
    <!-- Spring Boot -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- For AOP support -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-aop</artifactId>
    </dependency>
    
    <!-- For Swagger/OpenAPI documentation -->
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.1.0</version>
    </dependency>
</dependencies>
```

### 2. Define Your Header Container

```java
@Headers
public class ApiHeaders {
    @Header(
        value = "X-Client-ID",
        required = true,
        description = "Unique identifier for the client"
    )
    private String clientId;
    
    @Header(
        value = "X-Request-ID",
        description = "Unique request identifier for tracing"
    )
    private String requestId;
    
    // Getters
    public String getClientId() { return clientId; }
    public String getRequestId() { return requestId; }
}
```

### 3. Use in Controllers

Apply to specific endpoints:

```java
@RestController
@RequestMapping("/api")
public class ApiController {
    @GetMapping("/resource")
    @ProcessHeaders[ProcessHeader.java] // Enable header processing for this endpoint
    public ResponseEntity<?> getResource(ApiHeaders headers) {
        // Headers are automatically populated
        String clientId = headers.getClientId();
        // ...
    }
}
```

Or apply to an entire controller:

```java
@RestController
@RequestMapping("/admin")
@ProcessHeaders  // Enable header processing for all endpoints in this controller
public class AdminController {
    @GetMapping("/status")
    public ResponseEntity<?> getStatus(ApiHeaders headers) {
        // Headers are automatically populated in all methods
    }
}
```

## How It Works

1. **Annotation Detection**: The system detects methods/classes with `@ProcessHeaders`
2. **Parameter Scanning**: It finds parameters with types annotated with `@Headers`
3. **Header Resolution**: HTTP headers are extracted from the request and mapped to fields
4. **Validation**: Required headers are validated and default values are applied
5. **Injection**: The populated header object is injected into your controller method
6. **Swagger Documentation**: Headers are automatically added to the OpenAPI specification

## Advanced Usage

### Custom Header Container

You can create custom header containers for specific endpoints:

```java
@Headers
public class CustomHeaders {
    @Header("X-Tenant-ID")
    private String tenantId;
    
    @Header(value = "X-Region", defaultValue = "us-east")
    private String region;
    
    // Getters
}
```

### Inheritance

Header containers can extend each other:

```java
@Headers
public class OperationalHeaders extends ApiHeaders {
    @Header("X-Operation-Type")
    private String operationType;
    
    // Getter
}
```

## Error Handling

- **Compile-Time Errors**: The annotation processor prevents building if `@ProcessHeaders` is used without a header parameter
- **Runtime Validation**: The system fails fast at runtime if headers are misconfigured
- **Missing Required Headers**: Clear error responses are returned for missing required headers

## Swagger UI

After starting your application, access the Swagger UI at:
```
http://localhost:8080/swagger-ui.html
```

Headers will be properly documented with:
- Name
- Required status
- Description
- Default values

## License

This project is licensed under the MIT License - see the LICENSE file for details.