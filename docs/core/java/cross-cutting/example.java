/**
 * @SecureEndpoint - Unified annotation for secure API endpoints
 * 
 * Combines:
 * - Security (authentication & authorization)
 * - Rate limiting
 * - API documentation
 * - Metrics collection
 * - Request tracing
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
// API Documentation
@Operation(summary = "${description}")
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "Success"),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "403", description = "Forbidden"),
    @ApiResponse(responseCode = "429", description = "Rate limit exceeded")
})
// Security
@PreAuthorize("hasAnyRole(#root.this.this.rolesArray)")
// Rate limiting
@RateLimiter(name = "api")
// Metrics
@Timed(value = "http.server.requests", extraTags = {"secured", "true"})
public @interface SecureEndpoint {
    String description();
    String[] roles() default {"ROLE_USER"};
    
    // Helper method to convert roles to array for SpEL expression
    default String[] rolesArray() {
        return roles();
    }
}

/**
 * Usage example for @SecureEndpoint
 */
@RestController
@RequestMapping("/api/accounts")
public class AccountController {
    
    @SecureEndpoint(
        description = "Get account details",
        roles = {"ROLE_ADMIN", "ROLE_ACCOUNT_MANAGER"}
    )
    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getAccount(@PathVariable String id) {
        // Implementation
    }
}

/**
 * @CriticalOperation - Unified annotation for critical business operations
 * 
 * Combines:
 * - Circuit breaker
 * - Retry mechanism
 * - Timeout handling
 * - Bulkhead pattern
 * - Metrics collection
 * - Comprehensive logging
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
// Resilience patterns
@CircuitBreaker(name = "critical", fallbackMethod = "criticalOperationFallback")
@Retry(name = "critical", fallbackMethod = "criticalOperationRetryFallback")
@Timeout(name = "critical")
@Bulkhead(name = "critical", type = Bulkhead.Type.THREADPOOL)
// Metrics
@Timed(value = "critical.operation", histogram = true)
@Counted(value = "critical.operation.count")
public @interface CriticalOperation {
    String description() default "";
    String owner() default "core-team";
    boolean logParameters() default false;
}

/**
 * Usage example for @CriticalOperation
 */
@Service
public class PaymentService {
    
    @CriticalOperation(
        description = "Process payment",
        owner = "payment-team",
        logParameters = false
    )
    public PaymentResult processPayment(PaymentRequest request) {
        // Implementation
    }
    
    public PaymentResult criticalOperationFallback(PaymentRequest request, Exception e) {
        // Circuit breaker fallback implementation
    }
}

/**
 * @CachedResourceAccess - Unified annotation for optimized resource access
 * 
 * Combines:
 * - Caching with appropriate TTL
 * - Cache synchronization
 * - Circuit breaker for resource failure
 * - Timeout handling
 * - Metrics for cache hits/misses
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
// Caching
@Cacheable(cacheNames = "#{#root.target.class.simpleName + '.' + #root.methodName}", 
           key = "T(java.util.Objects).hash(#root.args)",
           unless = "#result == null")
// Resilience
@CircuitBreaker(name = "resource")
@Timeout(name = "resource")
// Metrics
@Timed(value = "resource.access.time")
public @interface CachedResourceAccess {
    long ttlSeconds() default 300; // 5 minutes
    boolean eternal() default false;
    String region() default "default";
}

/**
 * Usage example for @CachedResourceAccess
 */
@Repository
public class ProductRepository {
    
    @CachedResourceAccess(
        ttlSeconds = 3600, // 1 hour
        region = "product"
    )
    public Product findById(String productId) {
        // Database access implementation
    }
}

/**
 * @ReadOperation - Unified annotation for read operations
 * 
 * Combines:
 * - Read-only transaction
 * - Caching
 * - Timeout handling
 * - Metrics
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
// Transaction
@Transactional(readOnly = true)
// Caching
@Cacheable(cacheNames = "readOps", 
           key = "T(java.util.Objects).hash(#root.methodName, #root.args)",
           unless = "#result == null")
// Resilience
@Timeout(value = 5000)
// Metrics
@Timed(value = "read.operation.time")
public @interface ReadOperation {
    String description() default "";
}

/**
 * @WriteOperation - Unified annotation for write operations
 * 
 * Combines:
 * - Write transaction with isolation level
 * - Retry for transient failures
 * - Validation
 * - Event publication
 * - Metrics
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
// Transaction
@Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
// Resilience
@Retry(maxAttempts = 3, 
       backoff = @Backoff(delay = 500, multiplier = 2, maxDelay = 4000),
       retryFor = {DataAccessException.class, TransientDataAccessException.class})
// Validation trigger
@Validated
// Metrics
@Timed(value = "write.operation.time")
public @interface WriteOperation {
    String description() default "";
    boolean publishEvent() default true;
    Class<? extends ApplicationEvent> eventType() default GenericDataChangeEvent.class;
}

/**
 * Usage example combining multiple annotations
 */
@Service
@Transactional
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final ApplicationEventPublisher eventPublisher;
    
    @Autowired
    public OrderService(OrderRepository orderRepository,
                       PaymentService paymentService,
                       ApplicationEventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
        this.eventPublisher = eventPublisher;
    }
    
    @ReadOperation(description = "Get order by ID")
    public OrderDTO getOrderById(String orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("Order not found"));
        return OrderMapper.toDTO(order);
    }
    
    @WriteOperation(
        description = "Create new order",
        publishEvent = true,
        eventType = OrderCreatedEvent.class
    )
    public OrderDTO createOrder(OrderDTO orderDTO) {
        // Business logic
        Order order = OrderMapper.toEntity(orderDTO);
        
        // Process payment
        PaymentResult result = paymentService.processPayment(orderDTO.getPaymentDetails());
        order.setPaymentId(result.getTransactionId());
        
        // Save order
        Order savedOrder = orderRepository.save(order);
        
        // Publish event (handled by aspect based on annotation)
        if (isEventPublishingEnabled()) {
            eventPublisher.publishEvent(new OrderCreatedEvent(savedOrder));
        }
        
        return OrderMapper.toDTO(savedOrder);
    }
    
    private boolean isEventPublishingEnabled() {
        return true; // This would be configurable
    }
}