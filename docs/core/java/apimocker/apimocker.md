# OpenAPI Mock Server

A Spring Boot application that dynamically generates mock endpoints from any OpenAPI specification. This tool allows you to quickly create a functioning mock API server based on your API design, enabling frontend development and testing before the real API is implemented.

## Features

- **Universal OpenAPI Support**: Works with any valid OpenAPI 3.0 specification in JSON or YAML format
- **Dynamic Endpoint Generation**: Automatically creates all routes defined in your API spec
- **Intelligent Mock Data**: Generates realistic mock data based on schema definitions
- **Content Negotiation**: Supports various content types as defined in your API spec
- **Multiple API Support**: Load and switch between multiple API specifications
- **Path Templates**: Handles path parameters and request matching
- **Customizable Responses**: Configure the mock data generation behavior

## Table of Contents

- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Detailed Usage](#detailed-usage)
- [Configuration](#configuration)
- [Adding Your Own API Specs](#adding-your-own-api-specs)
- [Customizing Mock Data](#customizing-mock-data)
- [API Documentation](#api-documentation)
- [Example Requests](#example-requests)
- [Troubleshooting](#troubleshooting)

## Requirements

- Java 17 or higher
- Maven 3.6.0 or higher
- Spring Boot 3.2.4

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/openapi-mock-server.git
cd openapi-mock-server
```

### 2. Build the project

```bash
mvn clean install
```

### 3. Run the application

```bash
mvn spring-boot:run
```

The server will start on http://localhost:8080 with a sample Petstore API loaded by default.

### 4. Test the API

```bash
# List all available endpoints
curl http://localhost:8080/api/specs

# Get all pets from the sample API
curl http://localhost:8080/pets
```

## Project Structure

```
openapi-mock-server/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── example/
│   │   │           └── openapiserver/
│   │   │               ├── OpenApiMockServerApplication.java
│   │   │               ├── config/
│   │   │               │   ├── AppConfig.java
│   │   │               │   ├── AppInitializer.java
│   │   │               │   ├── MockDataConfig.java
│   │   │               │   └── OpenApiConfig.java
│   │   │               ├── controller/
│   │   │               │   ├── DynamicController.java
│   │   │               │   └── IndexController.java
│   │   │               └── service/
│   │   │                   ├── MockDataGenerator.java
│   │   │                   └── OpenApiService.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── sample-specs/
│   │           └── petstore.yaml
│   └── test/
│       └── java/
│           └── com/
│               └── example/
│                   └── openapiserver/
│                       └── OpenApiMockServerApplicationTests.java
└── pom.xml
```

## Detailed Usage

### Loading OpenAPI Specifications

The server automatically loads all OpenAPI specifications from the `specs` directory when it starts. By default, a sample Petstore API specification is provided.

### Accessing Endpoints

The server creates endpoints matching the paths defined in your OpenAPI specification. For example, if your spec defines a `/users` endpoint, you can access it at `http://localhost:8080/users`.

### Working with Multiple API Specifications

If you have multiple API specifications loaded, you can select which one to use by adding a `spec` parameter to your requests:

```bash
# Use the petstore.yaml spec
curl http://localhost:8080/pets?spec=petstore.yaml

# Use a different spec
curl http://localhost:8080/users?spec=users-api.yaml
```

### Viewing Available Specifications and Endpoints

The server provides management endpoints to help you navigate your APIs:

```bash
# List all loaded API specifications
curl http://localhost:8080/api/specs

# List all endpoints for a specific API
curl http://localhost:8080/api/specs/petstore.yaml/endpoints
```

## Configuration

The application can be configured via the `application.properties` file:

```properties
# Server configuration
server.port=8080

# OpenAPI specification settings
openapi.specs.location=classpath:specs/
openapi.default-spec=petstore.yaml

# Mock data generation settings
mock.data.date-format=yyyy-MM-dd
mock.data.default-list-size=3
mock.data.default-string-length=10
mock.data.use-examples=true
```

### Configuration Properties

| Property | Description | Default |
|----------|-------------|---------|
| `server.port` | Port the server runs on | 8080 |
| `openapi.specs.location` | Directory to load specs from | classpath:specs/ |
| `openapi.default-spec` | Default spec to use when not specified | petstore.yaml |
| `mock.data.date-format` | Format for date strings | yyyy-MM-dd |
| `mock.data.default-list-size` | Default number of items in array responses | 3 |
| `mock.data.default-string-length` | Default length for generated strings | 10 |
| `mock.data.use-examples` | Use examples from the spec when available | true |

## Adding Your Own API Specs

To use your own API specifications:

1. Place your OpenAPI 3.0 specification files (YAML or JSON) in the `specs` directory
2. Restart the application or wait for it to detect the new file
3. Access your API endpoints as defined in the specification

The default location for specifications is `specs/` relative to the application's working directory. You can customize this location in the `application.properties` file.

## Customizing Mock Data

The mock data generator is designed to create realistic data based on the schema definitions in your API spec. It follows these rules:

1. If examples are provided in the schema and `mock.data.use-examples` is true, it will use the examples.
2. For string fields with format constraints (email, date, uuid, etc.), it generates appropriate values.
3. For numeric fields, it respects minimum and maximum constraints.
4. For enums, it randomly selects from the available values.
5. For arrays, it generates the number of items specified by `mock.data.default-list-size`.

You can customize the generator behavior by modifying the `mock.data` properties.

## API Documentation

### Management API

The server provides a simple management API to help navigate the loaded specifications:

#### GET /api/specs

Lists all loaded OpenAPI specifications with basic information.

**Response Example:**

```json
{
  "defaultSpec": true,
  "specs": {
    "petstore.yaml": {
      "title": "Swagger Petstore",
      "version": "1.0.0",
      "pathCount": 5
    },
    "users-api.yaml": {
      "title": "Users API",
      "version": "2.1.0",
      "pathCount": 3
    }
  }
}
```

#### GET /api/specs/{specName}/endpoints

Lists all endpoints available in a specific OpenAPI specification.

**Response Example:**

```json
{
  "spec": "petstore.yaml",
  "title": "Swagger Petstore",
  "endpoints": [
    {
      "path": "/pets",
      "methods": ["GET", "POST"],
      "description": "Pet operations"
    },
    {
      "path": "/pets/{petId}",
      "methods": ["GET", "PUT", "DELETE"],
      "description": "Operations for a specific pet"
    },
    {
      "path": "/stores/order",
      "methods": ["POST"],
      "description": null
    },
    {
      "path": "/stores/order/{orderId}",
      "methods": ["GET", "DELETE"],
      "description": null
    }
  ]
}
```

## Example Requests

Here are some examples to help you get started:

### Get all pets

```bash
curl http://localhost:8080/pets
```

### Get a specific pet

```bash
curl http://localhost:8080/pets/123
```

### Create a new pet

```bash
curl -X POST http://localhost:8080/pets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fluffy",
    "category": {
      "name": "Cats"
    },
    "photoUrls": ["http://example.com/fluffy.jpg"],
    "status": "available"
  }'
```

### Place an order

```bash
curl -X POST http://localhost:8080/stores/order \
  -H "Content-Type: application/json" \
  -d '{
    "petId": 123,
    "quantity": 1,
    "status": "placed"
  }'
```

## Troubleshooting

### Common Issues

#### Server won't start

**Problem**: The server fails to start with configuration errors.

**Solution**: Check that your `application.properties` file is correctly configured and that the `specs` directory exists.

#### Specification not loaded

**Problem**: Your OpenAPI specification isn't showing up in the list of specs.

**Solution**: 
- Ensure your file has a `.yaml`, `.yml`, or `.json` extension
- Verify it's a valid OpenAPI 3.0 specification
- Check the logs for parsing errors

#### Mock data not as expected

**Problem**: The generated mock data doesn't match your schema.

**Solution**:
- Add examples to your OpenAPI specification for more control over the mock data
- Adjust the mock data configuration in `application.properties`
- Make sure your schema constraints (e.g., minimum, maximum) are correctly defined

#### Path parameters not working

**Problem**: Endpoints with path parameters return 404 errors.

**Solution**:
- Ensure your URL matches the path template in the spec
- Check that you're using the correct parameter values

## Advanced Usage

### Custom Response Headers

The server will attempt to respect the content types and response codes defined in your OpenAPI specification. You can define multiple response types and the server will choose an appropriate one.

### Schema Composition

The server supports the OpenAPI composition keywords:
- `allOf` - Combines multiple schemas
- `oneOf` - Selects one schema from a list
- `anyOf` - Similar to oneOf for mocking purposes

### Request Validation

While primarily designed for mocking, the server does basic validation of request parameters against the schema.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Swagger Parser](https://github.com/swagger-api/swagger-parser) - For parsing OpenAPI specifications
- [JavaFaker](https://github.com/DiUS/java-faker) - For generating realistic mock data
- [Spring Boot](https://spring.io/projects/spring-boot) - For the web framework