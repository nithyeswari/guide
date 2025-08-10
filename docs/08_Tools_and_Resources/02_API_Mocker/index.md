# API Mocker

This document describes an API mocker built with Spring Boot.

## Overview

(Content from apimocker.md and moker.md)

An OpenAPI Mock Server is a Spring Boot application that dynamically generates mock endpoints from any OpenAPI specification. This tool allows you to quickly create a functioning mock API server based on your API design, enabling frontend development and testing before the real API is implemented.

### Features

- **Universal OpenAPI Support**: Works with any valid OpenAPI 3.0 specification in JSON or YAML format
- **Dynamic Endpoint Generation**: Automatically creates all routes defined in your API spec
- **Intelligent Mock Data**: Generates realistic mock data based on schema definitions
- **Content Negotiation**: Supports various content types as defined in your API spec
- **Multiple API Support**: Load and switch between multiple API specifications
- **Path Templates**: Handles path parameters and request matching
- **Customizable Responses**: Configure the mock data generation behavior

## Source Code

### `pom.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.4</version>
        <relativePath/>
    </parent>
    
    <groupId>com.example</groupId>
    <artifactId>openapi-mock-server</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>openapi-mock-server</name>
    <description>Spring Boot application that generates mock endpoints from OpenAPI specs</description>
    
    <properties>
        <java.version>17</java.version>
        <swagger-parser.version>2.1.21</swagger-parser.version>
        <jackson.version>2.16.1</jackson.version>
        <javafaker.version>1.0.2</javafaker.version>
    </properties>
    
    <dependencies>
        <!-- Spring Boot -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <!-- OpenAPI Parser -->
        <dependency>
            <groupId>io.swagger.parser.v3</groupId>
            <artifactId>swagger-parser</artifactId>
            <version>${swagger-parser.version}</version>
        </dependency>
        
        <!-- JavaFaker for generating mock data -->
        <dependency>
            <groupId>com.github.javafaker</groupId>
            <artifactId>javafaker</artifactId>
            <version>${javafaker.version}</version>
        </dependency>
    </dependencies>
</project>
```

### `apisepc.yaml`

```yaml
openapi: 3.0.0
info:
  title: Swagger Petstore
  description: >-
    This is a sample server Petstore server.
  version: 1.0.0
servers:
  - url: /api/v1
paths:
  /pets:
    get:
      summary: Find all pets
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
components:
  schemas:
    Pet:
      type: object
      properties:
        id:
          type: integer
          format: int64
        name:
          type: string
```

### `AppInitializer.java`

```java
package com.example.openapiserver.config;

// ... imports

@Component
public class AppInitializer implements CommandLineRunner {

    private final OpenApiService openApiService;
    private final OpenApiConfig openApiConfig;

    @Override
    public void run(String... args) throws Exception {
        // ...
    }
}
```

### `DynamicController.java`

```java
package com.example.openapiserver.controller;

// ... imports

@RestController
public class DynamicController {

    // ...
}
```

### `IndexController.java`

```java
package com.example.openapiserver.controller;

// ... imports

@Controller
public class IndexController {

    // ...
}
```

### `MockDataGenerator.java`

```java
package com.example.openapiserver.service;

// ... imports

@Service
public class MockDataGenerator {

    // ...
}
```

### `OpenApiService.java`

```java
package com.example.openapiserver.service;

// ... imports

@Service
public class OpenApiService {

    // ...
}
```

## Merging OpenAPI Specifications

(Content from readmr.md)

This library provides a solution for merging multiple OpenAPI specifications into a single unified API documentation in Spring Boot applications.

### `application.properties`

```properties
# SpringDoc OpenAPI configuration
springdoc.swagger-ui.path=/swagger-ui.html
springdoc.api-docs.path=/api-docs
springdoc.swagger-ui.disable-swagger-default-url=true
springdoc.swagger-ui.use-root-path=true
springdoc.swagger-ui.display-request-duration=true
springdoc.show-actuator=false

# Locations for OpenAPI YAML files to load
openapi.spec.locations=classpath:openapi/*.yaml
```

### `DynamicOpenApiLoader.java`

```java
package com.example.openapi;

// ... imports

@Component
public class DynamicOpenApiLoader {

    // ...
}
```

### `OpenApiBeanCollector.java`

```java
package com.example.openapi;

// ... imports

@Configuration
public class OpenApiBeanCollector {

    // ...
}
```

### `OpenApiConfig.java`

```java
package com.example.openapi;

// ... imports

@Configuration
public class OpenApiConfig {

    // ...
}
```

### `SpringDocConfig.java`

```java
package com.example.openapi;

// ... imports

@Configuration
public class SpringDocConfig {

    // ...
}
```