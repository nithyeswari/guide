# Comprehensive API Development Guide

This guide provides a comprehensive overview of API development best practices, from design to deployment and monitoring.

## Table of Contents
- [API Maturity Grades](#api-maturity-grades)
- [API Design and Best Practices](#api-design-and-best-practices)
- [Dynamic Payload Handling](#dynamic-payload-handling)
- [OpenAPI Documentation](#openapi-documentation)
- [Security](#security)
- [Performance and Scalability](#performance-and-scalability)
- [Monitoring](#monitoring)
- [Error Handling](#error-handling)
- [Comprehensive Code Example](#comprehensive-code-example)
- [External Resources](#external-resources)

## API Maturity Grades

### Grade 1 (Foundation)
Basic implementation focusing on core functionality.

#### Features
- CRUD operations
- Basic authentication
- Simple error handling
- OpenAPI documentation
- Basic request/response validation

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.3.0</version>
    </dependency>
</dependencies>
```

### Grade 2 (Intermediate)
Enhanced security and performance features.

#### Additional Features
- OAuth 2.0/API key authentication
- Advanced error handling
- Pagination
- Caching
- Rate limiting
- Field filtering
- Input validation
- Security headers

### Grade 3 (Advanced)
Sophisticated features for enterprise applications.

#### Additional Features
- HATEOAS
- Advanced caching
- Circuit breakers
- Detailed logging
- Advanced monitoring
- Bulk operations
- PATCH support
- Advanced versioning

### Grade 4 (Enterprise)
Advanced enterprise features.

#### Additional Features
- Event-driven capabilities
- Webhooks
- Advanced analytics
- SLA management
- Geographic routing
- Multi-region deployment
- Advanced monitoring

### Grade 5 (World-Class)
State-of-the-art features.

#### Additional Features
- AI/ML capabilities
- Predictive scaling
- Real-time analytics
- Advanced fraud detection
- Zero-downtime deployment
- Self-healing
- Advanced compliance

## API Design and Best Practices

### RESTful Patterns
1. Resource Naming
   - Use nouns for resources
   - Plural for collections
   - Consistent casing (kebab-case preferred)
   - Version in URL or header
2. HTTP Methods
   - GET: Read resources
   - POST: Create resources
   - PUT: Full update
   - PATCH: Partial update
   - DELETE: Remove resources
3. Status Codes
   - 200: Success
   - 201: Created
   - 204: No Content
   - 400: Bad Request
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not Found
   - 409: Conflict
   - 429: Too Many Requests
   - 500: Internal Server Error

### Advanced Patterns

1. CQRS (Command Query Responsibility Segregation)
```java
@GetMapping("/users")          // Query
public List<UserDTO> getUsers() { ... }

@PostMapping("/users/command") // Command
public void createUser(@RequestBody CreateUserCommand command) { ... }
```

2. Event Sourcing
```java
@PostMapping("/events")
public void recordEvent(@RequestBody DomainEvent event) {
    eventStore.save(event);
    eventBus.publish(event);
}
```

3. API Gateway Pattern
```java
@Configuration
public class GatewayConfig {
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("user_service", r -> r.path("/users/**")
                .uri("lb://user-service"))
            .build();
    }
}
```

### HATEOAS Response Example
```json
{
  "id": "123",
  "name": "Example Resource",
  "_links": {
    "self": {
      "href": "/api/v1/resources/123"
    },
    "related": {
      "href": "/api/v1/resources/123/related"
    }
  }
}
```

### Versioning Pattern
```
https://api.example.com/v1/resources
https://api.example.com/v2/resources
```

## Dynamic Payload Handling

### Approaches

1. Using `Map<String, Object>`
```java
@PostMapping("/dynamic")
public ResponseEntity<Map<String, Object>> processDynamic(
    @RequestBody Map<String, Object> payload
) {
    return ResponseEntity.ok(payload);
}
```

2. Using `JsonNode`
```java
@PostMapping("/json-node")
public ResponseEntity<JsonNode> processJsonNode(
    @RequestBody JsonNode payload
) {
    return ResponseEntity.ok(payload);
}
```

3. Flexible DTO
```java
public class FlexibleDTO {
    private String id;
    private Map<String, Object> additionalProperties = new HashMap<>();
    
    @JsonAnySetter
    public void setAdditionalProperty(String name, Object value) {
        additionalProperties.put(name, value);
    }
}
```

### Best Practices for Dynamic Payloads

1. Validation
   - Implement required field validation
   - Type checking for known fields
   - Size limits for payload
   - Depth limits for nested objects
2. Security
   - Input sanitization
   - JSON injection prevention
   - Size restrictions
   - Content type validation
3. Performance
   - Lazy parsing for large payloads
   - Streaming for arrays
   - Pagination for large datasets
   - Caching strategies

### Dynamic Payload Code Example

```java
// 1. Using Map<String, Object> for completely dynamic structure
@RestController
@RequestMapping("/api/v1/dynamic")
@Tag(name = "Dynamic Payload API")
public class DynamicController {

    @Operation(
        summary = "Process dynamic payload",
        description = "Accepts any JSON structure"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Successfully processed",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(
                    implementation = Object.class,
                    description = "Any JSON structure"
                )
            )
        )
    })
    @PostMapping("/map-approach")
    public ResponseEntity<Map<String, Object>> processDynamicPayload(
        @RequestBody Map<String, Object> payload
    ) {
        // Process the dynamic payload
        return ResponseEntity.ok(payload);
    }

    // 2. Using JsonNode for more control over JSON structure
    @Operation(
        summary = "Process with JsonNode",
        description = "Accepts any JSON with validation capabilities"
    )
    @PostMapping("/json-node")
    public ResponseEntity<JsonNode> processWithJsonNode(
        @RequestBody JsonNode payload
    ) {
        // Validate specific fields if needed
        if (payload.has("requiredField")) {
            // Process required field
        }
        return ResponseEntity.ok(payload);
    }

    // 3. Using Object class (least restrictive)
    @Operation(
        summary = "Process any object",
        description = "Accepts absolutely any valid JSON"
    )
    @PostMapping("/any")
    public ResponseEntity<Object> processAnyPayload(
        @RequestBody Object payload
    ) {
        return ResponseEntity.ok(payload);
    }
}

// 4. Using a flexible DTO with additional properties
@Schema(description = "Flexible payload with some required fields")
public class FlexiblePayloadDTO {
    
    @Schema(description = "Required ID field", example = "123")
    @NotNull
    private String id;
    
    @Schema(description = "Required type field", example = "USER")
    @NotNull
    private String type;
    
    // Additional dynamic properties
    @Schema(description = "Any additional fields")
    private Map<String, Object> additionalProperties = new HashMap<>();
    
    @JsonAnySetter
    public void setAdditionalProperty(String name, Object value) {
        additionalProperties.put(name, value);
    }
    
    @JsonAnyGetter
    public Map<String, Object> getAdditionalProperties() {
        return additionalProperties;
    }
}

// 5. Using ObjectMapper for custom deserialization
@RestController
@RequestMapping("/api/v1/custom")
public class CustomDeserializationController {

    private final ObjectMapper objectMapper;

    public CustomDeserializationController(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostMapping("/custom")
    public ResponseEntity<JsonNode> processCustomPayload(
        @RequestBody String payload
    ) throws JsonProcessingException {
        // Custom deserialization logic
        JsonNode jsonNode = objectMapper.readTree(payload);
        
        // Validate structure if needed
        validateStructure(jsonNode);
        
        return ResponseEntity.ok(jsonNode);
    }

    private void validateStructure(JsonNode node) {
        // Add custom validation logic
    }
}

// 6. Using OpenAPI annotations for documentation
@Schema(
    description = "Dynamic Payload Schema",
    example = '''
        {
          "id": "123",
          "type": "USER",
          "customField1": "value1",
          "customField2": 42,
          "nestedObject": {
            "field1": "value",
            "field2": ["array", "of", "values"]
          }
        }
        '''
)
public class DynamicPayloadExample {
    // This class is used only for OpenAPI documentation
}

// 7. Service layer implementation
@Service
@Slf4j
public class DynamicPayloadService {

    public Map<String, Object> processPayload(Map<String, Object> payload) {
        // Validate required fields if any
        validateRequiredFields(payload);
        
        // Process dynamic fields
        processDynamicFields(payload);
        
        return payload;
    }

    private void validateRequiredFields(Map<String, Object> payload) {
        Set<String> requiredFields = Set.of("id", "type");
        Set<String> missingFields = requiredFields.stream()
            .filter(field -> !payload.containsKey(field))
            .collect(Collectors.toSet());

        if (!missingFields.isEmpty()) {
            throw new ValidationException("Missing required fields: " + missingFields);
        }
    }

    private void processDynamicFields(Map<String, Object> payload) {
        // Process each field based on its type
        payload.forEach((key, value) -> {
            if (value instanceof Map) {
                // Process nested object
                processNestedObject(key, (Map<String, Object>) value);
            } else if (value instanceof List) {
                // Process array
                processArray(key, (List<?>) value);
            }
        });
    }

    private void processNestedObject(String key, Map<String, Object> nestedObject) {
        // Add processing logic for nested objects
        log.debug("Processing nested object for key: {}", key);
    }

    private void processArray(String key, List<?> array) {
        // Add processing logic for arrays
        log.debug("Processing array for key: {}", key);
    }
}
```

## OpenAPI Documentation

### Basic Configuration
```java
@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                    .title("API Title")
                    .version("1.0")
                    .description("API Description"));
    }
}
```

### Documenting Dynamic Payloads
```java
@Schema(
    description = "Dynamic Payload Schema",
    example = '''
        {
          "id": "123",
          "type": "USER",
          "customField1": "value1",
          "customField2": 42
        }
        '''
)
```

## Security

### Authentication Patterns

#### OAuth 2.0 Implementation
```json
{
  "auth": {
    "type": "oauth2",
    "flow": "client_credentials",
    "tokenUrl": "https://api.example.com/oauth/token",
    "scopes": {
      "read": "Read access",
      "write": "Write access"
    }
  }
}
```
Reference: https://cloud.google.com/apigee/docs/api-platform/security/oauth/oauth-home

#### API Key Authentication
```xml
<APIProxy name="secure-api">
    <VerifyAPIKey>
        <APIKey ref="request.header.x-api-key"/>
    </VerifyAPIKey>
</APIProxy>
```
Reference: https://cloud.google.com/apigee/docs/api-platform/security/api-keys

### JWT Validation
```xml
<VerifyJWT name="VJ-1">
    <Algorithm>RS256</Algorithm>
    <PublicKey>
        <Value ref="jwt.public.key"/>
    </PublicKey>
</VerifyJWT>
```
Reference: https://cloud.google.com/apigee/docs/api-platform/reference/policies/verify-jwt-policy

### Data Redaction

#### Advanced Configuration Options

##### Multiple Source Types
```yaml
policies:
  - name: Redact-Multiple-Sources
    type: Redact
    configuration:
      source: both # Applies to both request and response
      content:
        - element: JSONPayload
          paths:
            - path: $.*.password
              replaceWith: "********"
```

##### Variable Redaction
```yaml
policies:
  - name: Redact-Variables
    type: Redact
    configuration:
      source: request
      variables:
        - name: request.header.Authorization
          replaceWith: "[REDACTED]"
        - name: request.queryparam.apiKey
          replaceWith: "**********"
```

##### Conditional Redaction
```yaml
policies:
  - name: Conditional-Redact
    type: Redact
    configuration:
      source: response
      condition: response.status.code = 200
      content:
        - element: JSONPayload
          paths:
            - path: $.data.secureInfo
              replaceWith: "[REDACTED]"
```

#### Performance Considerations

1. **Regex Complexity**: Complex patterns can impact performance
2. **Processing Order**: Position in policy chain affects overall latency
3. **Payload Size**: Large payloads take longer to scan and redact
4. **Selective Application**: Apply only to flows that contain sensitive data

#### Environment-Specific Configuration

```yaml
environments:
  - name: prod
    policies:
      - name: Redact-Sensitive-Data
        configuration:
          enabled: true
  - name: dev
    policies:
      - name: Redact-Sensitive-Data
        configuration:
          enabled: false # Disable in development for debugging
```

#### Compliance Documentation

When implementing redaction policies, document:
- Types of data being redacted
- Justification for redaction (compliance requirements)
- Validation procedures
- Audit process for verifying proper implementation

#### Testing Recommendations

1. Create test cases with sample sensitive data
2. Verify redaction occurs correctly for all patterns
3. Test edge cases (partial matches, boundary conditions)
4. Benchmark performance impact
5. Include in CI/CD automated test suite

#### Integration with Other Security Measures

Combine Redact policy with:
- OAuth 2.0 authentication
- API key validation
- Threat protection policies
- Content validation
- Access control policies

This comprehensive approach ensures sensitive data is protected throughout the API lifecycle, from request authentication to response delivery.

### Security Configuration
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .oauth2ResourceServer()
            .jwt()
            .and()
            .authorizeRequests()
            .anyRequest().authenticated()
            .and()
            .build();
    }
}
```

## Performance and Scalability

### Rate Limiting Patterns

#### Spike Arrest
```xml
<SpikeArrest name="SA-1">
    <Rate>30ps</Rate>
</SpikeArrest>
```

#### Quota Management
```xml
<Quota name="Q-1">
    <Interval>1</Interval>
    <TimeUnit>hour</TimeUnit>
    <Allow count="1000"/>
</Quota>
```
Reference: https://cloud.google.com/apigee/docs/api-platform/develop/quota-management

### Caching Implementation

#### Response Cache
```xml
<ResponseCache name="RC-1">
    <CacheKey>
        <Prefix>prefix_</Prefix>
        <KeyFragment ref="request.uri"/>
    </CacheKey>
    <ExpirySettings>
        <TimeoutInSec>300</TimeoutInSec>
    </ExpirySettings>
</ResponseCache>
```
Reference: https://cloud.google.com/apigee/docs/api-platform/reference/policies/response-cache-policy

## Monitoring

### Carbon Monitoring

#### Carbon Monitoring Service
```java
// Carbon Monitoring Service
@Service
@Slf4j
public class CarbonMetricsService {
    
    private final MeterRegistry meterRegistry;
    private final Environment environment;

    public CarbonMetricsService(MeterRegistry meterRegistry, Environment environment) {
        this.meterRegistry = meterRegistry;
        this.environment = environment;
    }

    // 1. Request Carbon Footprint
    public void recordRequestFootprint(String endpoint, double carbonGrams) {
        Counter.builder("api.carbon.footprint")
            .tag("endpoint", endpoint)
            .tag("environment", environment.getActiveProfiles()[0])
            .description("Carbon footprint in grams CO2e")
            .baseUnit("grams")
            .register(meterRegistry)
            .increment(carbonGrams);
    }

    // 2. CPU Usage Monitoring
    public void recordCpuUsage(double usage) {
        Gauge.builder("api.cpu.usage", usage, Number::doubleValue)
            .tag("environment", environment.getActiveProfiles()[0])
            .description("CPU usage percentage")
            .register(meterRegistry);
    }

    // 3. Memory Usage
    public void recordMemoryUsage(double usedMemoryMB) {
        Gauge.builder("api.memory.usage", usedMemoryMB, Number::doubleValue)
            .tag("environment", environment.getActiveProfiles()[0])
            .description("Memory usage in MB")
            .baseUnit("megabytes")
            .register(meterRegistry);
    }

    // 4. Network Traffic
    public void recordNetworkTraffic(String direction, long bytes) {
}
```

#### Monitoring Dashboard Configuration
```yaml
management:
  endpoints:
    web:
      exposure:
        include: prometheus,metrics
  metrics:
    tags:
      application: ${spring.application.name}
    export:
      prometheus:
        enabled: true
```

### Analytics Policy
```xml
<StatisticsCollector name="SC-1">
    <Statistics>
        <Statistic name="total_response_time" ref="total_response_time"/>
        <Statistic name="target_response_time" ref="target_response_time"/>
    </Statistics>
</StatisticsCollector>
```
Reference: https://cloud.google.com/apigee/docs/api-platform/analytics/analytics-reference

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found",
    "target": "/api/v1/users/123",
    "details": [
      {
        "code": "INVALID_ID",
        "message": "User ID does not exist"
      }
    ],
    "innererror": {
      "trace-id": "ABC-123-XYZ",
      "timestamp": "2025-02-05T12:00:00Z"
    }
  }
}
```

### Error Handling Policy
```xml
<RaiseFault name="RF-1">
    <FaultResponse>
        <Set>
            <StatusCode>404</StatusCode>
            <ReasonPhrase>Not Found</ReasonPhrase>
            <Payload contentType="application/json">
                {
                    "error": {
                        "code": "404",
                        "message": "{context.error.message}"
                    }
                }
            </Payload>
        </Set>
    </FaultResponse>
</RaiseFault>
```
Reference: https://cloud.google.com/apigee/docs/api-platform/reference/policies/raise-fault-policy

## Comprehensive Code Example

```java
// 1. Configuration and Setup
// Application Properties (application.yml)
spring:
  application:
    name: comprehensive-api
  jackson:
    default-property-inclusion: non_null
    serialization:
      write-dates-as-timestamps: false
  cache:
    type: redis
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://your-auth-server.com

// 2. OpenAPI Configuration
@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Comprehensive API")
                        .version("1.0")
                        .description("Complete API with all maturity grades")
                        .license(new License().name("Apache 2.0"))
                        .contact(new Contact()
                                .name("API Team")
                                .email("api@example.com")))
                .externalDocs(new ExternalDocumentation()
                        .description("API Documentation")
                        .url("https://api-docs.example.com"))
                .servers(Arrays.asList(
                        new Server().url("https://api.example.com/v1").description("Production"),
                        new Server().url("https://staging-api.example.com/v1").description("Staging")))
                .security(Arrays.asList(
                        new SecurityRequirement().addList("bearerAuth")))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }
}

// 3. Model/DTO Classes with All Possible Annotations
@Schema(description = "User Data Transfer Object")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDTO {
    
    @Schema(description = "Unique identifier", example = "123")
    @JsonProperty("id")
    private Long id;

    @Schema(description = "User's full name", example = "John Doe")
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @Schema(description = "User's email address", example = "john@example.com")
    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    private String email;

    @Schema(description = "User's age", example = "25")
    @Min(value = 18, message = "Age must be at least 18")
    @Max(value = 150, message = "Age must be less than 150")
    private Integer age;

    @Schema(description = "User's roles", example = "["ADMIN", "USER"]")
    @JsonProperty("roles")
    private Set<String> roles;

    @Schema(description = "Creation timestamp")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSZ")
    private Instant createdAt;

    // Getters, setters, etc.
}

// 4. Controller with All Possible Annotations
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Management", description = "APIs for managing users")
@Validated
@SecurityRequirement(name = "bearerAuth")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
public class UserController {

    private final UserService userService;
    private final CarbonMetricsService carbonMetricsService;

    // Grade 1: Basic CRUD Operations
    @Operation(
        summary = "Get user by ID",
        description = "Retrieves a user using their unique identifier"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "User found successfully",
            content = @Content(schema = @Schema(implementation = UserDTO.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "User not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))
        )
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<UserDTO> getUser(
        @Parameter(description = "User ID", required = true, example = "123")
        @PathVariable Long id
    ) {
        log.info("Retrieving user with id: {}", id);
        UserDTO user = userService.getUser(id);
        carbonMetricsService.recordRequestFootprint("GET_USER", 0.1);
        return ResponseEntity.ok(user);
    }

    // Grade 2: Pagination, Filtering, Sorting
    @Operation(summary = "Get all users with pagination and filtering")
    @GetMapping
    public ResponseEntity<Page<UserDTO>> getUsers(
        @Parameter(description = "Page number (0-based)")
        @RequestParam(defaultValue = "0") int page,
        
        @Parameter(description = "Page size")
        @RequestParam(defaultValue = "20") int size,
        
        @Parameter(description = "Sort field")
        @RequestParam(defaultValue = "id") String sort,
        
        @Parameter(description = "Filter by name")
        @RequestParam(required = false) String nameFilter,
        
        @Parameter(description = "Fields to include in response")
        @RequestParam(required = false) Set<String> fields
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(sort));
        return ResponseEntity.ok(userService.getUsers(pageable, nameFilter, fields));
    }

    // Grade 3: Bulk Operations with HATEOAS
    @Operation(summary = "Create multiple users")
    @PostMapping("/bulk")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<CollectionModel<EntityModel<UserDTO>>> createUsers(
        @RequestBody @Valid List<UserDTO> users
    ) {
        List<UserDTO> createdUsers = userService.createUsers(users);
        List<EntityModel<UserDTO>> userResources = createdUsers.stream()
            .map(user -> EntityModel.of(user,
                linkTo(methodOn(UserController.class).getUser(user.getId())).withSelfRel(),
                linkTo(methodOn(UserController.class).updateUser(user.getId(), null)).withRel("update"),
                linkTo(methodOn(UserController.class).deleteUser(user.getId())).withRel("delete")))
            .collect(Collectors.toList());
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(CollectionModel.of(userResources,
                linkTo(methodOn(UserController.class).getUsers(0, 20, "id", null, null)).withRel("all-users")));
    }

    // Grade 4: Advanced Features
    @Operation(summary = "Partial update user")
    @PatchMapping("/{id}")
    public ResponseEntity<UserDTO> patchUser(
        @PathVariable Long id,
        @RequestBody JsonPatch patch
    ) {
        return ResponseEntity.ok(userService.patchUser(id, patch));
    }

    @Operation(summary = "Subscribe to user events")
    @PostMapping("/{id}/subscribe")
    public ResponseEntity<SseEmitter> subscribeToUserEvents(
        @PathVariable Long id
    ) {
        return ResponseEntity.ok(userService.subscribeToUserEvents(id));
    }

    // Grade 5: AI/ML Features
    @Operation(summary = "Get user recommendations")
    @GetMapping("/{id}/recommendations")
    public ResponseEntity<List<UserDTO>> getUserRecommendations(
        @PathVariable Long id,
        @Parameter(description = "Recommendation algorithm")
        @RequestParam(defaultValue = "collaborative") String algorithm,
        @Parameter(description = "Number of recommendations")
        @RequestParam(defaultValue = "5") int limit
    ) {
        return ResponseEntity.ok(userService.getUserRecommendations(id, algorithm, limit));
    }
}

// 5. Exception Handling
@ControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage(),
            request.getDescription(false),
            LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            ValidationException ex, WebRequest request) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            ex.getMessage(),
            request.getDescription(false),
            LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }
}

// 6. Carbon Monitoring Aspect
@Aspect
@Component
@Slf4j
public class CarbonMonitoringAspect {

    private final CarbonMetricsService carbonMetricsService;

    @Around("@annotation(carbonFootprint)")
    public Object measureCarbonFootprint(ProceedingJoinPoint joinPoint, 
            CarbonFootprint carbonFootprint) throws Throwable {
        long startTime = System.currentTimeMillis();
        Object result = joinPoint.proceed();
        long executionTime = System.currentTimeMillis() - startTime;
        
        // Calculate carbon footprint based on execution time and complexity
        double carbonGrams = calculateCarbonFootprint(executionTime, 
            carbonFootprint.complexity());
        
        carbonMetricsService.recordRequestFootprint(
            joinPoint.getSignature().getName(), 
            carbonGrams
        );
        
        return result;
    }

    private double calculateCarbonFootprint(long executionTime, 
            RequestComplexity complexity) {
        // Implementation of carbon footprint calculation
        return 0.0;
    }
}

// 7. Custom Annotations
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface CarbonFootprint {
    RequestComplexity complexity() default RequestComplexity.MEDIUM;
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    int value() default 100;
    TimeUnit timeUnit() default TimeUnit.HOUR;
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Cacheable {
    String value();
    int ttl() default 3600;
}

// 8. Metrics Configuration
@Configuration
public class MetricsConfig {
    
    @Bean
    public MeterRegistry meterRegistry() {
        CompositeMeterRegistry registry = new CompositeMeterRegistry();
        registry.config()
            .commonTags("application", "${spring.application.name}")
            .meterFilter(MeterFilter.deny(id -> {
                String uri = id.getTag("uri");
                return uri != null && uri.startsWith("/actuator");
            }));
        
        return registry;
    }
}

// 9. Security Configuration
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .authorizeRequests()
                .antMatchers("/api/v1/public/**").permitAll()
                .antMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            .and()
            .oauth2ResourceServer()
                .jwt()
                .jwtAuthenticationConverter(jwtAuthenticationConverter());
        
        return http.build();
    }
}

// 10. Rate Limiting Configuration
@Configuration
public class RateLimitConfig {

    @Bean
    public RateLimiter rateLimiter() {
        return RateLimiter.create(100.0); // 100 requests per second
    }
}
```

## External Resources

### API Design
- [REST API Design Best Practices](https://github.com/microsoft/api-guidelines)
- [Google API Design Guide](https://cloud..com/apis/design)
- [API Patterns and Design](https://www.patterns.dev/posts#design-patterns)
- [Martin Fowler's Blog - API Patterns](https://martinfowler.com/tags/api%20design.html)

### Spring Boot & OpenAPI
- [Spring Boot Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [SpringDoc OpenAPI Documentation](https://springdoc.org/)
- [Spring Security Documentation](https://docs.spring.io/spring-security/reference/index.html)
- [Spring Cloud Documentation](https://spring.io/projects/spring-cloud)

### Performance & Scalability
- [API Performance Best Practices](https://cloud.google.com/apis/design/design_best_practices)
- [Spring Boot Performance Guide](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.spring-application.startup-tracking)
- [Scaling RESTful APIs](https://www.nginx.com/blog/building-microservices-using-an-api-gateway/)

### Security
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OAuth 2.0 Documentation](https://oauth.net/2/)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)

### Dynamic Payload Patterns
- [JSON Schema](https://json-schema.org/)
- [Jackson Documentation](https://github.com/FasterXML/jackson-docs)
- [Dynamic REST APIs](https://www.baeldung.com/spring-rest-json-patch)

### Carbon Monitoring
- [Green Software Foundation](https://greensoftware.foundation/)
- [Cloud Carbon Footprint](https://www.cloudcarbonfootprint.org/)
- [Sustainable Web Development](https://sustainablewebdesign.org/)

### Tools
- [Postman](https://www.postman.com/) - API Testing
- [JMeter](https://jmeter.apache.org/) - Performance Testing
- [SonarQube](https://www.sonarqube.org/) - Code Quality
- [Prometheus](https://prometheus.io/) - Monitoring
- [Grafana](https://grafana.com/) - Visualization

### Books
1. "Building Microservices" by Sam Newman
2. "REST API Design Rulebook" by Mark Masse
3. "API Security in Action" by Neil Madden
4. "Designing Data-Intensive Applications" by Martin Kleppmann
5. "Cloud Native Patterns" by Cornelia Davis
