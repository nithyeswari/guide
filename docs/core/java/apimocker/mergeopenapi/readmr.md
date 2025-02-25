# OpenAPI Merger for Spring Boot

This library provides a solution for merging multiple OpenAPI specifications into a single unified API documentation in Spring Boot applications.

## Features

- Merge multiple OpenAPI specifications into a single consolidated specification
- Support for both file-based and programmatically created OpenAPI objects
- Seamless integration with SpringDoc and Swagger UI
- Intelligent merging of paths, components, security schemes, and other OpenAPI elements
- Customizable API grouping for better organization
- Support for both REST API and programmatic usage

## Installation

Add the following dependencies to your `pom.xml`:

```xml
<!-- SpringDoc OpenAPI UI -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>

<!-- OpenAPI Parser -->
<dependency>
    <groupId>io.swagger.parser.v3</groupId>
    <artifactId>swagger-parser</artifactId>
    <version>2.1.15</version>
</dependency>
```

## Usage

### Configuration

First, configure SpringDoc in your `application.properties`:

```properties
# SpringDoc OpenAPI configuration
springdoc.swagger-ui.path=/swagger-ui.html
springdoc.api-docs.path=/api-docs
springdoc.swagger-ui.disable-swagger-default-url=true
springdoc.swagger-ui.use-root-path=true

# Locations for OpenAPI YAML files to load
openapi.spec.locations=classpath:openapi/*.yaml
```

### Option 1: Merging Existing OpenAPI Beans

If you already have multiple OpenAPI beans, you can use the `OpenApiConfig` to merge them:

```java
@Configuration
public class OpenApiConfig {
    @Autowired
    private List<OpenAPI> existingOpenApiSpecs;
    
    @Bean
    @Primary
    public OpenAPI mergedOpenAPI() {
        // Merge logic implemented in the class
        // See the full implementation in the source code
        return mergedSpec;
    }
}
```

### Option 2: Dynamic Registration of OpenAPI Objects

For dynamically created OpenAPI objects:

```java
@Component
public class MyApiComponent {
    @Autowired
    private OpenApiBeanCollector.OpenApiRegistrar registrar;
    
    public void initializeApi() {
        OpenAPI myApi = new OpenAPIV3Parser().read("path/to/spec.yaml");
        registrar.registerOpenApi(myApi);
    }
}
```

### Integration with SpringDoc

Configure SpringDoc to use your merged OpenAPI:

```java
@Configuration
public class SpringDocConfig {
    @Bean
    public GroupedOpenApi allApisGroup(@Qualifier("mergedOpenAPI") OpenAPI mergedOpenAPI) {
        return GroupedOpenApi.builder()
                .group("all-apis")
                .displayName("All APIs")
                .addOpenApiCustomizer(openApi -> {
                    // Replace with merged OpenAPI
                    openApi.setPaths(mergedOpenAPI.getPaths());
                    // Additional customization
                })
                .pathsToMatch("/**")
                .build();
    }
}
```

## Accessing the API Documentation

Once configured, access the Swagger UI at:

```
http://your-server:port/swagger-ui.html
```

## Advanced Usage

### Merging OpenAPI Files from the File System

```java
@Component
public class FileSystemOpenApiLoader {
    @Autowired
    private OpenApiBeanCollector.OpenApiRegistrar registrar;
    
    @Value("${openapi.specs.directory:/path/to/specs}")
    private String specsDirectory;
    
    @PostConstruct
    public void loadSpecs() throws IOException {
        Files.list(Paths.get(specsDirectory))
            .filter(p -> p.toString().endsWith(".yaml"))
            .forEach(path -> {
                OpenAPI api = new OpenAPIV3Parser().read(path.toString());
                registrar.registerOpenApi(api);
            });
    }
}
```

### Creating API Groups

You can create multiple API groups for better organization:

```java
@Bean
public GroupedOpenApi userApisGroup() {
    return GroupedOpenApi.builder()
            .group("user-apis")
            .pathsToMatch("/api/users/**")
            .build();
}

@Bean
public GroupedOpenApi productApisGroup() {
    return GroupedOpenApi.builder()
            .group("product-apis")
            .pathsToMatch("/api/products/**")
            .build();
}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.