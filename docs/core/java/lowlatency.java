// Part 1: JVM and Application Startup Examples

// 1. Using JDK 21
// Add to pom.xml
<properties>
    <java.version>21</java.version>
</properties>

// 2. Enable AOT compilation
// Add to pom.xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <configuration>
                <aot>
                    <enabled>true</enabled>
                </aot>
            </configuration>
        </plugin>
    </plugins>
</build>

// 3. GraalVM native compilation
// Add to pom.xml
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
    <configuration>
        <imageName>myapp</imageName>
        <mainClass>com.example.MyApplication</mainClass>
    </configuration>
</plugin>

// 4. Custom lazy initialization
@Configuration
public class LazyConfig {
    @Bean
    @Lazy
    public ExpensiveService expensiveService() {
        return new ExpensiveService();
    }
}

// 5. Heap size configuration
// Add to JVM arguments
-Xms2g -Xmx2g

// 6. String deduplication
// Add to JVM arguments
-XX:+UseStringDeduplication

// 7. Tiered compilation
// Add to JVM arguments
-XX:+TieredCompilation
-XX:TieredStopAtLevel=1

// 8. Class Data Sharing
// Generate CDS archive
java -Xshare:dump -XX:SharedArchiveFile=app-cds.jsa

// Use CDS archive
-XX:SharedArchiveFile=app-cds.jsa
-Xshare:on

// 9. Optimized JAR structure
// Use layers in Spring Boot
@SpringBootApplication
public class OptimizedApplication {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(OptimizedApplication.class);
        app.setLayeredArtifactCoordinator(new LayeredJars());
        app.run(args);
    }
}

// 10. Java Modules
// module-info.java
module com.example.application {
    requires spring.boot;
    requires spring.web;
    exports com.example.api;
}

// Memory Management Examples

// 11. ZGC Configuration
// Add to JVM arguments
-XX:+UseZGC
-XX:ConcGCThreads=2
-XX:ZCollectionInterval=5

// 12. Generation sizes
// Add to JVM arguments
-XX:NewRatio=2
-XX:SurvivorRatio=8

// 13. Off-heap memory
@Configuration
public class OffHeapConfig {
    @Bean
    public ByteBuffer directBuffer() {
        return ByteBuffer.allocateDirect(1024 * 1024);
    }
}

// 14. Direct ByteBuffers
public class DirectBufferExample {
    private final ByteBuffer buffer = ByteBuffer.allocateDirect(1024);
    
    public void writeData(byte[] data) {
        buffer.put(data);
        buffer.flip();
        // Use for I/O operations
    }
}

// 15. Memory pools
public class ObjectPool<T> {
    private final Queue<T> pool;
    private final Supplier<T> factory;
    
    public ObjectPool(Supplier<T> factory, int size) {
        this.factory = factory;
        this.pool = new ConcurrentLinkedQueue<>();
        for (int i = 0; i < size; i++) {
            pool.offer(factory.get());
        }
    }
    
    public T borrow() {
        T obj = pool.poll();
        return obj != null ? obj : factory.get();
    }
    
    public void release(T obj) {
        pool.offer(obj);
    }
}

// 16. Metaspace configuration
// Add to JVM arguments
-XX:MetaspaceSize=256m
-XX:MaxMetaspaceSize=256m

// 17. Weak references for cache
public class WeakCache<K, V> {
    private final Map<K, WeakReference<V>> cache = new ConcurrentHashMap<>();
    
    public void put(K key, V value) {
        cache.put(key, new WeakReference<>(value));
    }
    
    public V get(K key) {
        WeakReference<V> ref = cache.get(key);
        return ref != null ? ref.get() : null;
    }
}

// 18. Memory leak detection
@Component
public class MemoryLeakDetector {
    private final MeterRegistry registry;
    
    public MemoryLeakDetector(MeterRegistry registry) {
        this.registry = registry;
        monitorMemory();
    }
    
    private void monitorMemory() {
        Gauge.builder("jvm.memory.used", Runtime.getRuntime(), Runtime::totalMemory)
            .tag("type", "total")
            .register(registry);
    }
}

// 19. Compact strings
// Add to JVM arguments
-XX:+UseCompactStrings

// 20. Thread stack sizes
// Add to JVM arguments
-Xss256k


  // Threading and Async Operations Examples

// 21. Virtual Threads
@Configuration
public class VirtualThreadConfig {
    @Bean
    public Executor taskExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}

// 22. WebFlux Implementation
@RestController
public class ReactiveController {
    @GetMapping("/data")
    public Flux<Data> getData() {
        return Flux.fromIterable(dataService.findAll())
                  .subscribeOn(Schedulers.boundedElastic());
    }
}

// 23. Thread Pool Configuration
@Configuration
public class ThreadPoolConfig {
    @Bean
    public ThreadPoolTaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        return executor;
    }
}

// 24. CompletableFuture Usage
@Service
public class AsyncService {
    @Async
    public CompletableFuture<Result> processAsync(Data data) {
        return CompletableFuture.supplyAsync(() -> {
            // Processing logic
            return new Result();
        });
    }
}

// 25. Thread Naming
public class CustomThreadFactory implements ThreadFactory {
    private final AtomicInteger counter = new AtomicInteger();
    private final String prefix;
    
    public CustomThreadFactory(String prefix) {
        this.prefix = prefix;
    }
    
    @Override
    public Thread newThread(Runnable r) {
        Thread thread = new Thread(r);
        thread.setName(prefix + "-" + counter.incrementAndGet());
        return thread;
    }
}

// 26. ThreadLocal Usage
public class RequestContext {
    private static final ThreadLocal<UserContext> userContext = new ThreadLocal<>();
    
    public static void setContext(UserContext context) {
        userContext.set(context);
    }
    
    public static UserContext getContext() {
        return userContext.get();
    }
    
    public static void clear() {
        userContext.remove();
    }
}

// 27. Executor Service Configuration
@Configuration
public class ExecutorConfig {
    @Bean
    public ExecutorService executorService() {
        return new ThreadPoolExecutor(
            10, // core pool size
            20, // max pool size
            60L, // keep alive time
            TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(100),
            new CustomThreadFactory("worker"),
            new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }
}

// 28. Work Stealing Pool
@Configuration
public class WorkStealingConfig {
    @Bean
    public ExecutorService workStealingPool() {
        return Executors.newWorkStealingPool(
            Runtime.getRuntime().availableProcessors()
        );
    }
}

// 29. Reactive Pattern
@Service
public class ReactiveService {
    public Mono<Result> processReactive(Input input) {
        return Mono.just(input)
                  .map(this::transform)
                  .flatMap(this::validate)
                  .subscribeOn(Schedulers.boundedElastic());
    }
}

// 30. Async Timeout
@Configuration
public class TimeoutConfig {
    @Bean
    public WebClient webClient() {
        return WebClient.builder()
                       .filter(ExchangeFilterFunctions.timeout(Duration.ofSeconds(5)))
                       .build();
    }
}

// Database Optimization Examples

// 31. HikariCP Configuration
@Configuration
public class DatabaseConfig {
    @Bean
    public HikariDataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(5);
        config.setIdleTimeout(300000);
        config.setConnectionTimeout(20000);
        return new HikariDataSource(config);
    }
}

// 32. Connection Pool Sizing
@Configuration
public class PoolSizeConfig {
    @Bean
    public HikariDataSource dataSource() {
        HikariConfig config = new HikariConfig();
        int cpuCores = Runtime.getRuntime().availableProcessors();
        config.setMaximumPoolSize(cpuCores * 2);
        return new HikariDataSource(config);
    }
}

// 33. Prepared Statements
@Repository
public class OptimizedRepository {
    private final JdbcTemplate jdbcTemplate;
    
    private final String INSERT_QUERY = "INSERT INTO users (name, email) VALUES (?, ?)";
    
    public void insertUser(User user) {
        jdbcTemplate.update(INSERT_QUERY, user.getName(), user.getEmail());
    }
}

// 34. Batch Processing
@Repository
public class BatchRepository {
    private final JdbcTemplate jdbcTemplate;
    
    public void batchInsert(List<User> users) {
        jdbcTemplate.batchUpdate(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    User user = users.get(i);
                    ps.setString(1, user.getName());
                    ps.setString(2, user.getEmail());
                }
                
                @Override
                public int getBatchSize() {
                    return users.size();
                }
            }
        );
    }
}

// 35. Fetch Size Configuration
@Repository
public class StreamingRepository {
    private final JdbcTemplate jdbcTemplate;
    
    public Stream<User> streamUsers() {
        return jdbcTemplate.queryForStream(
            "SELECT * FROM users",
            (rs, rowNum) -> new User(rs.getString("name"), rs.getString("email"))
        );
    }
}

// 36. Statement Caching
// application.properties
spring.datasource.hikari.data-source-properties.cachePrepStmts=true
spring.datasource.hikari.data-source-properties.prepStmtCacheSize=250
spring.datasource.hikari.data-source-properties.prepStmtCacheSqlLimit=2048

// 37. Query Optimization
@Repository
public class OptimizedQueryRepository {
    @Query(value = "SELECT u FROM User u " +
                   "LEFT JOIN FETCH u.roles " +
                   "WHERE u.active = true",
           hint = QueryHints.HINT_FETCH_SIZE)
    List<User> findActiveUsersWithRoles();
}

// 38. Isolation Levels
@Transactional(isolation = Isolation.READ_COMMITTED)
public class TransactionService {
    public void processData() {
        // Processing with READ_COMMITTED isolation
    }
}

// 39. Read-Only Transactions
@Transactional(readOnly = true)
public List<User> getAllUsers() {
    return userRepository.findAll();
}

// 40. Database-Specific Optimization
// PostgreSQL specific configuration
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation=true
spring.jpa.properties.hibernate.temp.use_jdbc_metadata_defaults=false


  // Caching Examples

// 41. Multi-level Cache
@Configuration
public class MultiLevelCacheConfig {
    @Bean
    public CacheManager cacheManager() {
        CompositeCacheManager compositeCacheManager = new CompositeCacheManager();
        
        // First level: Caffeine (local memory)
        CaffeineCacheManager caffeineCacheManager = new CaffeineCacheManager();
        caffeineCacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(Duration.ofMinutes(5)));
        
        // Second level: Redis (distributed)
        RedisCacheManager redisCacheManager = RedisCacheManager.builder(redisConnectionFactory)
            .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10)))
            .build();
            
        compositeCacheManager.setCacheManagers(Arrays.asList(
            caffeineCacheManager, 
            redisCacheManager
        ));
        
        return compositeCacheManager;
    }
}

// 42. Caffeine Cache
@Configuration
public class CaffeineConfig {
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(Duration.ofMinutes(5))
            .recordStats());
        return cacheManager;
    }
}

// 43. Redis Cache
@Configuration
public class RedisConfig {
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
        
        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(config)
            .build();
    }
}

// 44. Cache Warming
@Component
public class CacheWarmer implements ApplicationListener<ContextRefreshedEvent> {
    private final ProductService productService;
    
    @Override
    public void onApplicationEvent(ContextRefreshedEvent event) {
        productService.warmCache();
    }
}

// 45. Cache Aside Pattern
@Service
public class CacheAsideService {
    private final Cache cache;
    private final DataRepository repository;
    
    public Data getData(String key) {
        // Try cache first
        Data data = cache.get(key);
        if (data != null) {
            return data;
        }
        
        // Cache miss - get from repository
        data = repository.findByKey(key);
        if (data != null) {
            cache.put(key, data);
        }
        return data;
    }
}

// 46. TTL Configuration
@CacheConfig(cacheNames = "products")
@Service
public class ProductService {
    @Cacheable(key = "#id", sync = true)
    @CacheEvict(key = "#id", allEntries = false, beforeInvocation = true)
    public Product getProduct(Long id) {
        return repository.findById(id);
    }
}

// 47. Cache Eviction
@Service
public class EvictionService {
    @CacheEvict(value = "products", allEntries = true)
    @Scheduled(fixedRate = 3600000) // 1 hour
    public void evictCache() {
        // Cache eviction logic
    }
}

// 48. Cache Compression
@Configuration
public class CompressedCacheConfig {
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                    .fromSerializer(new GenericJackson2JsonRedisSerializer()))
                .computePrefixWith(cacheName -> "compressed::" + cacheName)
                .entryTtl(Duration.ofHours(1)))
            .build();
    }
}

// 49. Cache Statistics
@Configuration
public class CacheStatsConfig {
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(10_000)
            .recordStats());
        return cacheManager;
    }
    
    @Bean
    public CacheStatistics cacheStatistics(CacheManager cacheManager) {
        return new CacheStatistics(cacheManager);
    }
}

// 50. Conditional Caching
@Service
public class ConditionalCacheService {
    @Cacheable(value = "products", 
               condition = "#price > 1000",
               unless = "#result == null")
    public Product getExpensiveProduct(String id, double price) {
        return repository.findById(id);
    }
}

// Network and HTTP Examples

// 51. HTTP/2 Configuration
server:
  http2:
    enabled: true
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: password
    key-store-type: PKCS12

// 52. Keep-alive Configuration
@Configuration
public class KeepAliveConfig {
    @Bean
    public WebClient webClient() {
        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(HttpClient.create()
                .option(ChannelOption.SO_KEEPALIVE, true)
                .option(EpollChannelOption.TCP_KEEPIDLE, 300)
                .option(EpollChannelOption.TCP_KEEPINTVL, 60)
                .option(EpollChannelOption.TCP_KEEPCNT, 8)))
            .build();
    }
}

// 53. Connection Pooling
@Configuration
public class ConnectionPoolConfig {
    @Bean
    public ConnectionPool connectionPool() {
        return ConnectionPool.builder(options -> options
            .maxConnections(500)
            .pendingAcquireMaxCount(1000)
            .maxIdleTime(Duration.ofMinutes(15))
            .metrics(true))
            .build();
    }
}

// 54. Buffer Sizes
@Configuration
public class BufferConfig {
    @Bean
    public NettyWebServerFactoryCustomizer nettyWebServerFactoryCustomizer() {
        return new NettyWebServerFactoryCustomizer((factory) ->
            factory.addServerCustomizers(server -> server
                .option(ChannelOption.SO_RCVBUF, 128 * 1024)
                .option(ChannelOption.SO_SNDBUF, 128 * 1024)
                .childOption(ChannelOption.SO_RCVBUF, 128 * 1024)
                .childOption(ChannelOption.SO_SNDBUF, 128 * 1024)));
    }
}

// 55. Compression
server:
  compression:
    enabled: true
    min-response-size: 1024
    mime-types: text/html,text/xml,text/plain,text/css,application/javascript,application/json

// 56. Timeout Configuration
@Configuration
public class TimeoutConfig {
    @Bean
    public WebClient webClient() {
        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(HttpClient.create()
                .responseTimeout(Duration.ofSeconds(5))
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)))
            .build();
    }
}

// 57. WebClient Usage
@Service
public class WebClientService {
    private final WebClient webClient;
    
    public Mono<Response> makeRequest(Request request) {
        return webClient.post()
            .uri("/api/endpoint")
            .body(Mono.just(request), Request.class)
            .retrieve()
            .bodyToMono(Response.class)
            .timeout(Duration.ofSeconds(5))
            .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)));
    }
}

// 58. Circuit Breaker
@Configuration
public class CircuitBreakerConfig {
    @Bean
    public CircuitBreaker circuitBreaker() {
        return CircuitBreaker.of("backendService", io.github.resilience4j.circuitbreaker.CircuitBreakerConfig.custom()
            .failureRateThreshold(50)
            .waitDurationInOpenState(Duration.ofMillis(1000))
            .slidingWindowSize(2)
            .build());
    }
}

// 59. Retry Policy
@Configuration
public class RetryConfig {
    @Bean
    public Retry retry() {
        return Retry.of("backendService", RetryConfig.custom()
            .maxAttempts(3)
            .waitDuration(Duration.ofMillis(100))
            .retryExceptions(Exception.class)
            .build());
    }
}

// 60. Content Types
@RestController
public class OptimizedController {
    @GetMapping(value = "/data", 
                produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Data> getData() {
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(data);
    }
}

// Monitoring and Metrics Examples

// 61. Custom Metrics
@Component
public class CustomMetrics {
    private final MeterRegistry registry;
    
    public void recordCustomMetric(String name, double value) {
        registry.gauge(name, value);
    }
    
    public void incrementCounter(String name) {
        registry.counter(name).increment();
    }
    
    public void recordTime(String name, long timeInMs) {
        registry.timer(name).record(timeInMs, TimeUnit.MILLISECONDS);
    }
}

// 62. Micrometer Configuration
@Configuration
public class MicrometerConfig {
    @Bean
    public MeterRegistry meterRegistry() {
        CompositeMeterRegistry registry = new CompositeMeterRegistry();
        registry.add(new SimpleMeterRegistry());
        registry.add(new JmxMeterRegistry(
            JmxConfig.DEFAULT,
            Clock.SYSTEM
        ));
        return registry;
    }
}

// 63. Sampling Configuration
@Configuration
public class SamplingConfig {
    @Bean
    public Sampler defaultSampler() {
        return new RateLimitingSampler(10);  // 10 traces per second
    }
}

// 64. Health Checks
@Component
public class CustomHealthIndicator implements HealthIndicator {
    @Override
    public Health health() {
        try {
            // Check critical components
            checkDatabase();
            checkCache();
            checkExternalServices();
            
            return Health.up()
                .withDetail("database", "UP")
                .withDetail("cache", "UP")
                .withDetail("externalServices", "UP")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withException(e)
                .build();
        }
    }
}

// 65. Distributed Tracing
@Configuration
public class TracingConfig {
    @Bean
    public Tracer tracer() {
        return Tracing.newBuilder()
            .localServiceName("my-service")
            .spanReporter(spanReporter())
            .build()
            .tracer();
    }
    
    @Bean
    public Reporter<Span> spanReporter() {
        return AsyncReporter.builder(sender())
            .build();
    }
}

// 66. Logging Configuration
@Configuration
public class LoggingConfig {
    @Bean
    public LoggingEventCompositeJsonEncoder encoder() {
        LoggingEventCompositeJsonEncoder encoder = new LoggingEventCompositeJsonEncoder();
        encoder.setProviders(Arrays.asList(
            new LoggingEventJsonProviders(),
            new StackTraceJsonProvider(),
            new ThreadJsonProvider()
        ));
        return encoder;
    }
}

// 67. Performance Logging
@Aspect
@Component
public class PerformanceLoggingAspect {
    private final MeterRegistry registry;
    
    @Around("@annotation(LogPerformance)")
    public Object logPerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = joinPoint.proceed();
        long duration = System.currentTimeMillis() - start;
        
        registry.timer("method.execution.time")
            .tag("class", joinPoint.getTarget().getClass().getSimpleName())
            .tag("method", joinPoint.getSignature().getName())
            .record(duration, TimeUnit.MILLISECONDS);
            
        return result;
    }
}

// 68. Async Logging
@Configuration
public class AsyncLoggingConfig {
    @Bean
    public AsyncAppender asyncAppender() {
        AsyncAppender appender = new AsyncAppender();
        appender.addAppender(consoleAppender());
        appender.setQueueSize(500);
        appender.setDiscardingThreshold(0);
        return appender;
    }
}

// 69. JMX Monitoring
@Configuration
@EnableMBeanExport
public class JmxConfig {
    @Bean
    public MBeanExporter mBeanExporter() {
        MBeanExporter exporter = new MBeanExporter();
        Map<String, Object> beans = new HashMap<>();
        beans.put("bean:name=customMetrics", new CustomMetricsMBean());
        exporter.setBeans(beans);
        return exporter;
    }
}

// 70. Custom Actuator Endpoints
@Component
@Endpoint(id = "custom")
public class CustomEndpoint {
    @ReadOperation
    public Map<String, Object> getMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("heap.used", Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory());
        metrics.put("heap.max", Runtime.getRuntime().maxMemory());
        return metrics;
    }
}

// Application Configuration Examples

 // Monitoring and Metrics Examples

// 61. Custom Metrics
@Component
public class CustomMetrics {
    private final MeterRegistry registry;
    
    public void recordCustomMetric(String name, double value) {
        registry.gauge(name, value);
    }
    
    public void incrementCounter(String name) {
        registry.counter(name).increment();
    }
    
    public void recordTime(String name, long timeInMs) {
        registry.timer(name).record(timeInMs, TimeUnit.MILLISECONDS);
    }
}

// 62. Micrometer Configuration
@Configuration
public class MicrometerConfig {
    @Bean
    public MeterRegistry meterRegistry() {
        CompositeMeterRegistry registry = new CompositeMeterRegistry();
        registry.add(new SimpleMeterRegistry());
        registry.add(new JmxMeterRegistry(
            JmxConfig.DEFAULT,
            Clock.SYSTEM
        ));
        return registry;
    }
}

// 63. Sampling Configuration
@Configuration
public class SamplingConfig {
    @Bean
    public Sampler defaultSampler() {
        return new RateLimitingSampler(10);  // 10 traces per second
    }
}

// 64. Health Checks
@Component
public class CustomHealthIndicator implements HealthIndicator {
    @Override
    public Health health() {
        try {
            // Check critical components
            checkDatabase();
            checkCache();
            checkExternalServices();
            
            return Health.up()
                .withDetail("database", "UP")
                .withDetail("cache", "UP")
                .withDetail("externalServices", "UP")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withException(e)
                .build();
        }
    }
}

// 65. Distributed Tracing
@Configuration
public class TracingConfig {
    @Bean
    public Tracer tracer() {
        return Tracing.newBuilder()
            .localServiceName("my-service")
            .spanReporter(spanReporter())
            .build()
            .tracer();
    }
    
    @Bean
    public Reporter<Span> spanReporter() {
        return AsyncReporter.builder(sender())
            .build();
    }
}

// 66. Logging Configuration
@Configuration
public class LoggingConfig {
    @Bean
    public LoggingEventCompositeJsonEncoder encoder() {
        LoggingEventCompositeJsonEncoder encoder = new LoggingEventCompositeJsonEncoder();
        encoder.setProviders(Arrays.asList(
            new LoggingEventJsonProviders(),
            new StackTraceJsonProvider(),
            new ThreadJsonProvider()
        ));
        return encoder;
    }
}

// 67. Performance Logging
@Aspect
@Component
public class PerformanceLoggingAspect {
    private final MeterRegistry registry;
    
    @Around("@annotation(LogPerformance)")
    public Object logPerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = joinPoint.proceed();
        long duration = System.currentTimeMillis() - start;
        
        registry.timer("method.execution.time")
            .tag("class", joinPoint.getTarget().getClass().getSimpleName())
            .tag("method", joinPoint.getSignature().getName())
            .record(duration, TimeUnit.MILLISECONDS);
            
        return result;
    }
}

// 68. Async Logging
@Configuration
public class AsyncLoggingConfig {
    @Bean
    public AsyncAppender asyncAppender() {
        AsyncAppender appender = new AsyncAppender();
        appender.addAppender(consoleAppender());
        appender.setQueueSize(500);
        appender.setDiscardingThreshold(0);
        return appender;
    }
}

// 69. JMX Monitoring
@Configuration
@EnableMBeanExport
public class JmxConfig {
    @Bean
    public MBeanExporter mBeanExporter() {
        MBeanExporter exporter = new MBeanExporter();
        Map<String, Object> beans = new HashMap<>();
        beans.put("bean:name=customMetrics", new CustomMetricsMBean());
        exporter.setBeans(beans);
        return exporter;
    }
}

// 70. Custom Actuator Endpoints
@Component
@Endpoint(id = "custom")
public class CustomEndpoint {
    @ReadOperation
    public Map<String, Object> getMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("heap.used", Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory());
        metrics.put("heap.max", Runtime.getRuntime().maxMemory());
        return metrics;
    }
}

// Application Configuration Examples

// 71. Spring Profiles
@Configuration
@Profile("production")
public class ProductionConfig {
    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setMaximumPoolSize(50);
        config.setMinimumIdle(10);
        return new HikariDataSource(config);
    }
}

@Configuration
@Profile("development")
public class DevelopmentConfig {
    @Bean
    public DataSource dataSource() {
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .build();
    }
}

// 72. Property Sources
@Configuration
@PropertySource("classpath:application-${spring.profiles.active}.properties")
public class PropertyConfig {
    @Value("${app.max.connections:10}")
    private int maxConnections;
    
    @Bean
    @ConfigurationProperties(prefix = "app.database")
    public DatabaseProperties databaseProperties() {
        return new DatabaseProperties();
    }
}

// 73. Environment-specific Optimizations
@Configuration
public class EnvironmentOptimizations {
    @Bean
    @ConditionalOnProperty(name = "app.environment", havingValue = "production")
    public CacheManager productionCacheManager() {
        return new RedisCacheManager.Builder(redisConnectionFactory)
            .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1)))
            .build();
    }
    
    @Bean
    @ConditionalOnProperty(name = "app.environment", havingValue = "development")
    public CacheManager developmentCacheManager() {
        return new ConcurrentMapCacheManager();
    }
}

// 74. Conditional Beans
@Configuration
public class ConditionalConfig {
    @Bean
    @ConditionalOnMissingBean
    public DefaultService defaultService() {
        return new DefaultService();
    }
    
    @Bean
    @ConditionalOnProperty(name = "feature.enabled", havingValue = "true")
    public FeatureService featureService() {
        return new FeatureService();
    }
}

// 75. Startup Logging
@Configuration
public class StartupLogging implements ApplicationListener<ApplicationReadyEvent> {
    private final Logger logger = LoggerFactory.getLogger(StartupLogging.class);
    
    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        ConfigurableApplicationContext context = event.getApplicationContext();
        logger.info("Application started in {} ms", 
            context.getStartupDate() - System.currentTimeMillis());
    }
}

// 76. Bean Scoping
@Configuration
public class ScopeConfig {
    @Bean
    @Scope("prototype")
    public ExpensiveResource expensiveResource() {
        return new ExpensiveResource();
    }
    
    @Bean
    @Scope("singleton")
    public SharedResource sharedResource() {
        return new SharedResource();
    }
}

// 77. Auto-configuration
@Configuration
@ConditionalOnClass(RedisTemplate.class)
@EnableAutoConfiguration
public class CustomAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        return template;
    }
}

// 78. Error Handling
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ErrorResponse> handleDataAccess(DataAccessException e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("Database error", e.getMessage()));
    }
    
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException e) {
        return ResponseEntity.badRequest()
            .body(new ErrorResponse("Validation failed", e.getMessage()));
    }
}

// 79. Validation Strategies
@Configuration
public class ValidationConfig {
    @Bean
    public Validator validator() {
        return Validation.buildDefaultValidatorFactory().getValidator();
    }
    
    @Bean
    public MethodValidationPostProcessor methodValidationPostProcessor() {
        MethodValidationPostProcessor processor = new MethodValidationPostProcessor();
        processor.setValidator(validator());
        return processor;
    }
}

// 80. Serialization Configuration
@Configuration
public class SerializationConfig {
    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
            .registerModule(new JavaTimeModule());
    }
}

// Security Optimization Examples

// 81. Security Filter Configuration
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .anyRequest().authenticated())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .build();
    }
}

// 82. JWT Token Optimization
@Service
public class JwtService {
    private final SecretKey key = Keys.secretKeyFor(SignatureAlgorithm.HS256);
    
    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
            .setSubject(userDetails.getUsername())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // 24 hours
            .signWith(key)
            .compact();
    }
    
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}

// 83. Authentication Caching
@Configuration
public class AuthCacheConfig {
    @Bean
    public CacheManager authCacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("authCache");
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(30)));
        return cacheManager;
    }
}

// 84. Security Headers
@Configuration
public class SecurityHeadersConfig {
    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilter() {
        FilterRegistrationBean<SecurityHeadersFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new SecurityHeadersFilter());
        registration.addUrlPatterns("/*");
        return registration;
    }
}

public class SecurityHeadersFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) 
            throws IOException, ServletException {
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        httpResponse.setHeader("X-Frame-Options", "DENY");
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");
        chain.doFilter(request, response);
    }
}

// 85. Encryption Optimization
@Configuration
public class EncryptionConfig {
    @Bean
    public AESUtil aesUtil() {
        return new AESUtil("AES/GCM/NoPadding");
    }
}

public class AESUtil {
    private final String algorithm;
    
    public AESUtil(String algorithm) {
        this.algorithm = algorithm;
    }
    
    public String encrypt(String data, SecretKey key) throws Exception {
        Cipher cipher = Cipher.getInstance(algorithm);
        cipher.init(Cipher.ENCRYPT_MODE, key);
        byte[] encrypted = cipher.doFinal(data.getBytes());
        return Base64.getEncoder().encodeToString(encrypted);
    }
}

// 86. Rate Limiting
@Component
public class RateLimitingFilter implements Filter {
    private final Map<String, RateLimiter> limiters = new ConcurrentHashMap<>();
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) 
            throws IOException, ServletException {
        String clientId = getClientId(request);
        RateLimiter limiter = limiters.computeIfAbsent(clientId, 
            k -> RateLimiter.create(10.0)); // 10 requests per second
        
        if (limiter.tryAcquire()) {
            chain.doFilter(request, response);
        } else {
            ((HttpServletResponse) response).setStatus(429); // Too Many Requests
        }
    }
}

// 87. CORS Configuration
@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("https://*.example.com"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

// 88. Security Filter Ordering
@Configuration
public class FilterOrderConfig {
    @Bean
    @Order(1)
    public FilterRegistrationBean<RateLimitingFilter> rateLimitingFilter() {
        FilterRegistrationBean<RateLimitingFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new RateLimitingFilter());
        return registration;
    }
    
    @Bean
    @Order(2)
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilter() {
        FilterRegistrationBean<SecurityHeadersFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new SecurityHeadersFilter());
        return registration;
    }
}

// 89. Session Management
@Configuration
public class SessionConfig {
    @Bean
    public HttpSessionIdResolver httpSessionIdResolver() {
        return HeaderHttpSessionIdResolver.xAuthToken();
    }
    
    @Bean
    public SessionRepository<MapSession> sessionRepository() {
        return new MapSessionRepository(new ConcurrentHashMap<>());
    }
}

// 90. SSL/TLS Configuration
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: password
    key-store-type: PKCS12
    key-alias: tomcat
    protocol: TLS
    enabled-protocols: TLSv1.2,TLSv1.3
    ciphers: TLS_AES_256_GCM_SHA384,TLS_AES_128_GCM_SHA256

// Application Architecture Examples

// 91. Microservices Configuration
@SpringBootApplication
@EnableEurekaClient
@EnableCircuitBreaker
public class MicroserviceApplication {
    public static void main(String[] args) {
        SpringApplication.run(MicroserviceApplication.class, args);
    }
}

// 92. Service Discovery
@Configuration
@EnableEurekaClient
public class ServiceDiscoveryConfig {
    @Bean
    @LoadBalanced
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}

// 93. Event-driven Architecture
@Component
public class EventPublisher {
    private final ApplicationEventPublisher publisher;
    
    public void publishOrderEvent(Order order) {
        publisher.publishEvent(new OrderCreatedEvent(order));
    }
}

@EventListener
@Component
public class OrderEventHandler {
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Process order creation
    }
}

// 94. CQRS Implementation
@Service
public class OrderCommandService {
    public void createOrder(CreateOrderCommand command) {
        // Command handling logic
    }
}

@Service
public class OrderQueryService {
    public List<OrderView> getOrders(OrderQuery query) {
        // Query handling logic
        return new ArrayList<>();
    }
}

// 95. Messaging Patterns
@Configuration
@EnableRabbit
public class MessagingConfig {
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(new Jackson2JsonMessageConverter());
        return template;
    }
}

// 96. Error Handling Architecture
@Component
public class GlobalErrorHandler {
    @EventListener
    public void handleError(ErrorEvent event) {
        // Centralized error handling
    }
}

// 97. Serialization Formats
@Configuration
public class SerializationFormats {
    @Bean
    public MessageConverter protobufMessageConverter() {
        return new ProtobufHttpMessageConverter();
    }
    
    @Bean
    public MessageConverter avroMessageConverter() {
        return new AvroHttpMessageConverter();
    }
}

// 98. Load Balancing
@Configuration
public class LoadBalancingConfig {
    @Bean
    public IRule ribbonRule() {
        return new WeightedResponseTimeRule();
    }
}

// 99. Circuit Breaker Pattern
@Service
public class ResilientService {
    @HystrixCommand(fallbackMethod = "fallbackMethod")
    public String callExternalService() {
        // External service call
        return "Success";
    }
    
    public String fallbackMethod() {
        return "Fallback response";
    }
}

// 100. Design Patterns
@Component
public class StrategyPatternExample {
    private final Map<String, ProcessingStrategy> strategies;
    
    public void process(String type, Data data) {
        ProcessingStrategy strategy = strategies.get(type);
        if (strategy != null) {
            strategy.process(data);
        }
    }
}

// Carbon Footprint Optimization Examples

// Energy Monitoring and Measurement

// 1. CPU Usage Monitoring
@Component
public class EnergyMonitor {
    private final OperatingSystemMXBean osBean;
    private final MeterRegistry registry;
    
    public EnergyMonitor(MeterRegistry registry) {
        this.registry = registry;
        this.osBean = ManagementFactory.getOperatingSystemMXBean();
        startMonitoring();
    }
    
    private void startMonitoring() {
        Gauge.builder("system.cpu.usage")
            .register(registry, osBean, bean -> {
                if (bean instanceof com.sun.management.OperatingSystemMXBean) {
                    return ((com.sun.management.OperatingSystemMXBean) bean).getProcessCpuLoad();
                }
                return 0.0;
            });
            
        // Monitor memory usage for energy correlation
        Gauge.builder("jvm.memory.used")
            .register(registry, Runtime.getRuntime(), 
                runtime -> runtime.totalMemory() - runtime.freeMemory());
    }
}

// 2. Power Consumption Calculator
@Service
public class PowerCalculator {
    private static final double CPU_POWER_WATTS = 65.0; // Typical server CPU
    private static final double MEMORY_POWER_PER_GB = 3.0; // Watts per GB
    
    public double calculatePowerConsumption() {
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        
        double cpuUsage = getCpuUsage(osBean);
        double memoryUsageGB = memoryBean.getHeapMemoryUsage().getUsed() / (1024.0 * 1024.0 * 1024.0);
        
        double cpuPower = CPU_POWER_WATTS * cpuUsage;
        double memoryPower = MEMORY_POWER_PER_GB * memoryUsageGB;
        
        return cpuPower + memoryPower;
    }
    
    private double getCpuUsage(OperatingSystemMXBean osBean) {
        if (osBean instanceof com.sun.management.OperatingSystemMXBean) {
            return ((com.sun.management.OperatingSystemMXBean) osBean).getProcessCpuLoad();
        }
        return 0.0;
    }
}

// 3. Carbon Emission Calculator
@Service
public class CarbonCalculator {
    // Carbon intensity varies by region (gCO2/kWh)
    private static final Map<String, Double> CARBON_INTENSITY_BY_REGION = Map.of(
        "US-WEST", 285.0,    // California (renewable heavy)
        "US-EAST", 520.0,    // Virginia (coal heavy)
        "EU-WEST", 295.0,    // Ireland (renewable focused)
        "ASIA-PACIFIC", 680.0 // Singapore (gas/coal)
    );
    
    public double calculateCarbonFootprint(double powerWatts, int durationMinutes, String region) {
        double powerKwh = (powerWatts / 1000.0) * (durationMinutes / 60.0);
        double carbonIntensity = CARBON_INTENSITY_BY_REGION.getOrDefault(region, 500.0);
        return powerKwh * carbonIntensity; // gCO2
    }
}

// Application-Level Optimizations

// 4. Efficient Data Structures
@Configuration
public class EfficientDataStructures {
    @Bean
    public CacheManager lowMemoryCache() {
        return new CaffeineCacheManager() {{
            setCaffeine(Caffeine.newBuilder()
                .maximumSize(1000) // Smaller cache size
                .expireAfterWrite(Duration.ofMinutes(2)) // Shorter TTL
                .weakKeys() // Allow GC of keys
                .weakValues()); // Allow GC of values
        }};
    }
}

// 5. Lazy Loading Configuration
@Configuration
public class LazyConfiguration {
    @Bean
    @Lazy
    public HeavyService heavyService() {
        return new HeavyService();
    }
    
    @Bean
    @ConditionalOnProperty(name = "features.heavy.enabled", havingValue = "true")
    public OptionalHeavyService optionalHeavyService() {
        return new OptionalHeavyService();
    }
}

// 6. Resource Pool Optimization
@Configuration
public class ResourcePoolConfig {
    @Bean
    public ThreadPoolTaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // Smaller thread pool to reduce CPU overhead
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(25);
        executor.setThreadNamePrefix("eco-");
        executor.setAllowCoreThreadTimeOut(true); // Allow core threads to timeout
        executor.setKeepAliveSeconds(60); // Threads die after 1 minute
        return executor;
    }
}

// 7. Database Connection Optimization
@Configuration
public class EcoFriendlyDataSource {
    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        // Smaller connection pool
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(1);
        // Aggressive connection timeout
        config.setIdleTimeout(180000); // 3 minutes
        config.setMaxLifetime(300000);  // 5 minutes
        // Connection validation to avoid dead connections
        config.setConnectionTestQuery("SELECT 1");
        return new HikariDataSource(config);
    }
}

// 8. JVM Memory Optimization
// JVM arguments for lower memory footprint:
/*
-Xms512m -Xmx512m          # Fixed heap size
-XX:+UseG1GC               # G1 for better memory efficiency
-XX:MaxGCPauseMillis=100   # Low pause times
-XX:+UseStringDeduplication # Reduce string memory usage
-XX:+UseCompressedOops     # Compress object pointers
-XX:+UseCompressedClassPointers # Compress class pointers
*/

// 9. Network Optimization
@Configuration
public class EfficientNetworking {
    @Bean
    public WebClient ecoWebClient() {
        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(HttpClient.create()
                // Smaller connection pool
                .connectionProvider(ConnectionProvider.builder("eco")
                    .maxConnections(10)
                    .maxIdleTime(Duration.ofSeconds(30))
                    .build())
                // Enable compression
                .compress(true)
                // Shorter timeouts to avoid hanging connections
                .responseTimeout(Duration.ofSeconds(5))))
            .build();
    }
}

// 10. Async Processing for Efficiency
@Service
public class EfficientAsyncService {
    @Async
    @Scheduled(fixedDelay = 300000) // 5 minutes
    public void cleanupResources() {
        // Periodic cleanup to free resources
        System.gc(); // Suggest garbage collection
        clearCaches();
        closeIdleConnections();
    }
    
    private void clearCaches() {
        // Clear application caches periodically
    }
    
    private void closeIdleConnections() {
        // Close idle database/HTTP connections
    }
}

// Server and Infrastructure Optimizations

// 11. Conditional Features
@Configuration
public class ConditionalFeatures {
    @Bean
    @ConditionalOnProperty(name = "metrics.enabled", havingValue = "false", matchIfMissing = false)
    public MetricsRegistry noOpMetrics() {
        return new NoOpMetricsRegistry(); // Disable metrics in production
    }
    
    @Bean
    @ConditionalOnProperty(name = "actuator.enabled", havingValue = "false")
    public ActuatorEndpoint disabledActuator() {
        return new DisabledActuatorEndpoint();
    }
}

// 12. Energy-Aware Scheduling
@Component
public class EnergyAwareScheduler {
    private final PowerCalculator powerCalculator;
    
    @Scheduled(cron = "0 0 2 * * ?") // Run at 2 AM when energy is cheaper
    public void heavyBatchProcessing() {
        double currentPower = powerCalculator.calculatePowerConsumption();
        
        // Only run if power consumption is below threshold
        if (currentPower < 50.0) { // 50 watts threshold
            performHeavyProcessing();
        } else {
            scheduleForLater();
        }
    }
    
    private void performHeavyProcessing() {
        // Heavy computational tasks
    }
    
    private void scheduleForLater() {
        // Reschedule for later when power is lower
    }
}

// 13. Reactive Streams for Efficiency
@Service
public class ReactiveDataProcessor {
    public Flux<ProcessedData> processDataStream(Flux<RawData> input) {
        return input
            .buffer(100) // Process in batches
            .flatMap(this::processBatch, 2) // Limit concurrency
            .onBackpressureBuffer(1000) // Prevent memory overflow
            .subscribeOn(Schedulers.newBoundedElastic(2, 100, "eco-processor"));
    }
    
    private Flux<ProcessedData> processBatch(List<RawData> batch) {
        return Flux.fromIterable(batch)
            .map(this::processItem);
    }
}

// 14. Carbon-Aware Caching
@Service
public class CarbonAwareCaching {
    private final CarbonCalculator carbonCalculator;
    private final CacheManager cacheManager;
    
    public void adaptCacheStrategy() {
        double currentCarbon = carbonCalculator.calculateCarbonFootprint(
            getCurrentPowerUsage(), 60, getCurrentRegion());
        
        if (currentCarbon > 1000) { // High carbon threshold
            // Reduce cache size and TTL
            configureLowCarbonCache();
        } else {
            // Normal cache configuration
            configureNormalCache();
        }
    }
    
    private void configureLowCarbonCache() {
        // Smaller cache with shorter TTL
    }
    
    private void configureNormalCache() {
        // Standard cache configuration
    }
}

// 15. Green Deployment Strategies
@Configuration
@ConditionalOnProperty(name = "deployment.green", havingValue = "true")
public class GreenDeploymentConfig {
    @Bean
    public ServerProperties serverProperties() {
        ServerProperties properties = new ServerProperties();
        // Use fewer threads
        properties.getTomcat().setMaxThreads(50);
        properties.getTomcat().setMinSpareThreads(5);
        // Enable compression
        properties.getCompression().setEnabled(true);
        return properties;
    }
}

// Monitoring and Reporting

// 16. Carbon Metrics Collection
@Component
public class CarbonMetrics {
    private final MeterRegistry registry;
    private final CarbonCalculator calculator;
    
    public CarbonMetrics(MeterRegistry registry, CarbonCalculator calculator) {
        this.registry = registry;
        this.calculator = calculator;
        initializeMetrics();
    }
    
    private void initializeMetrics() {
        Gauge.builder("carbon.footprint.grams")
            .register(registry, this, metrics -> 
                calculator.calculateCarbonFootprint(50.0, 60, "US-WEST"));
                
        Counter.builder("energy.operations.count")
            .register(registry);
    }
}

// 17. Sustainability Dashboard
@RestController
public class SustainabilityController {
    private final PowerCalculator powerCalculator;
    private final CarbonCalculator carbonCalculator;
    
    @GetMapping("/sustainability/metrics")
    public SustainabilityMetrics getMetrics() {
        double power = powerCalculator.calculatePowerConsumption();
        double carbon = carbonCalculator.calculateCarbonFootprint(power, 60, "US-WEST");
        
        return SustainabilityMetrics.builder()
            .powerConsumptionWatts(power)
            .carbonFootprintGrams(carbon)
            .efficiencyScore(calculateEfficiencyScore(power, carbon))
            .build();
    }
    
    private double calculateEfficiencyScore(double power, double carbon) {
        // Lower is better - combine power and carbon impact
        return 100.0 - (power + carbon / 10.0);
    }
}

// 18. Automated Green Scaling
@Component
public class GreenAutoScaler {
    @EventListener
    public void handleHighCarbonEvent(HighCarbonEvent event) {
        // Scale down non-essential services
        scaleDownServices();
        // Reduce cache sizes
        reduceCacheSizes();
        // Defer non-critical tasks
        deferTasks();
    }
    
    private void scaleDownServices() {
        // Implementation for scaling down
    }
    
    private void reduceCacheSizes() {
        // Implementation for cache reduction
    }
    
    private void deferTasks() {
        // Implementation for task deferral
    }
}

// Data Transfer and Storage Optimization

// 19. Efficient Serialization
@Configuration
public class EfficientSerialization {
    @Bean
    @Primary
    public ObjectMapper carbonEfficientMapper() {
        return new ObjectMapper()
            .configure(JsonGenerator.Feature.AUTO_CLOSE_TARGET, true)
            .configure(JsonParser.Feature.AUTO_CLOSE_SOURCE, true)
            // Smaller JSON output
            .configure(SerializationFeature.INDENT_OUTPUT, false)
            .configure(SerializationFeature.WRITE_NULL_MAP_VALUES, false)
            .configure(SerializationFeature.WRITE_EMPTY_JSON_ARRAYS, false);
    }
}

// 20. Data Compression
@Configuration
public class CompressionConfig {
    @Bean
    public FilterRegistrationBean<CompressionFilter> compressionFilter() {
        FilterRegistrationBean<CompressionFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new CompressionFilter());
        registration.addUrlPatterns("/*");
        return registration;
    }
}

public class CompressionFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) 
            throws IOException, ServletException {
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // Enable response compression
        CompressedResponseWrapper wrapper = new CompressedResponseWrapper(httpResponse);
        chain.doFilter(request, wrapper);
        wrapper.finishResponse();
    }
}

// Configuration for minimal resource usage
# application-green.properties
# Minimal logging to reduce I/O
logging.level.root=WARN
logging.level.org.springframework=ERROR

# Reduced actuator endpoints
management.endpoints.enabled-by-default=false
management.endpoint.health.enabled=true
management.endpoint.metrics.enabled=false

# Smaller connection pools
spring.datasource.hikari.maximum-pool-size=3
spring.datasource.hikari.minimum-idle=1

# Reduced cache sizes
spring.cache.caffeine.spec=maximumSize=500,expireAfterWrite=2m

# Disable unnecessary features
spring.jpa.show-sql=false
spring.jpa.open-in-view=false
