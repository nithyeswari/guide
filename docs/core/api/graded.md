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

    @Schema(description = "User's roles", example = "[\"ADMIN\", \"USER\"]")
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

// Example Usage:
// 1. Basic endpoint with carbon monitoring
@GetMapping("/users/{id}")
@CarbonFootprint(complexity = RequestComplexity.LOW)
@Operation(summary = "Get user by ID")
public ResponseEntity<UserDTO> getUser(@PathVariable Long id) {
    return ResponseEntity.ok(userService.getUser(id));
}

// 2. Advanced endpoint with multiple features
@PostMapping("/users/bulk")
@RateLimit(value = 10, timeUnit = TimeUnit.MINUTE)
@CarbonFootprint(complexity = RequestComplexity.HIGH)
@Cacheable(value = "bulkUsers", ttl = 3600)
@Operation(summary = "Create multiple users")
public ResponseEntity<List<UserDTO>> createUsers(
    @Valid @RequestBody List<UserDTO> users
) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(userService.createUsers(users));
}