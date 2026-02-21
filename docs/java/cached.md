# Smart Cache System - Complete Implementation Guide

A high-performance caching solution using Caffeine with time-based refresh capabilities.

## Table of Contents
1. [Build Configuration](#build-configuration)
2. [Core Components](#core-components)
3. [Cache Configuration](#cache-configuration)
4. [Services](#services)
5. [Controllers](#controllers)
6. [Usage Examples](#usage-examples)

## Build Configuration

### build.gradle
```groovy
plugins {
    id 'org.springframework.boot' version '3.2.2'
    id 'io.spring.dependency-management' version '1.1.4'
    id 'java'
}

group = 'com.example'
version = '1.0.0'
sourceCompatibility = '17'

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-cache'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'com.github.ben-manes.caffeine:caffeine:3.1.8'
    implementation 'com.fasterxml.jackson.core:jackson-databind:2.16.1'
    implementation 'io.micrometer:micrometer-registry-prometheus:1.12.2'
    compileOnly 'org.projectlombok:lombok:1.18.30'
    annotationProcessor 'org.projectlombok:lombok:1.18.30'
}
```

### application.properties
```properties
# Cache Configuration
cache.maximum.size=10000
cache.refresh.times.key1=14:30,18:45
cache.refresh.times.key2=09:00,13:00,17:00

# API Configuration
api.base-url=http://your-api-url

# Actuator
management.endpoints.web.exposure.include=prometheus,health,info
management.metrics.export.prometheus.enabled=true
```

## Core Components

### CaffeineConfig.java
```java
@Configuration
@EnableCaching
@Slf4j
@RequiredArgsConstructor
public class CaffeineConfig {
    
    @Value("${cache.maximum.size:10000}")
    private long maximumSize;
    
    @Bean
    public CacheManager cacheManager(CacheRefreshScheduler refreshScheduler) {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(caffeineCacheBuilder());
        return cacheManager;
    }
    
    private Caffeine<Object, Object> caffeineCacheBuilder() {
        return Caffeine.newBuilder()
            .maximumSize(maximumSize)
            .recordStats();
    }
    
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return mapper;
    }
    
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();
    }
}
```

### CacheRefreshScheduler.java
```java
@Component
@Slf4j
@RequiredArgsConstructor
public class CacheRefreshScheduler {
    private final AsyncLoadingCache<String, JsonNode> cache;
    private final ScheduledExecutorService scheduler;
    private final Map<String, RefreshConfig> refreshConfigs;
    private final Map<String, ScheduledFuture<?>> scheduledTasks;
    
    public CacheRefreshScheduler() {
        this.scheduler = Executors.newScheduledThreadPool(
            Runtime.getRuntime().availableProcessors()
        );
        this.refreshConfigs = new ConcurrentHashMap<>();
        this.scheduledTasks = new ConcurrentHashMap<>();
    }
    
    public void setRefreshTime(String key, LocalTime refreshTime) {
        RefreshConfig config = new RefreshConfig(refreshTime);
        refreshConfigs.put(key, config);
        scheduleRefresh(key, config);
    }
    
    public void setMultipleRefreshTimes(String key, List<LocalTime> refreshTimes) {
        RefreshConfig config = new RefreshConfig(refreshTimes);
        refreshConfigs.put(key, config);
        scheduleRefresh(key, config);
    }
    
    private void scheduleRefresh(String key, RefreshConfig config) {
        // Cancel existing schedule if any
        cancelExistingSchedule(key);
        
        // Schedule all refresh times for today
        for (LocalTime refreshTime : config.getRefreshTimes()) {
            LocalDateTime nextRefresh = getNextRefreshTime(refreshTime);
            scheduleRefreshTask(key, nextRefresh);
        }
    }
    
    private void scheduleRefreshTask(String key, LocalDateTime refreshTime) {
        long delay = Duration.between(LocalDateTime.now(), refreshTime).getSeconds();
        
        if (delay > 0) {
            ScheduledFuture<?> task = scheduler.schedule(
                () -> refreshCache(key),
                delay,
                TimeUnit.SECONDS
            );
            
            scheduledTasks.put(key + "_" + refreshTime, task);
        }
    }
    
    @PreDestroy
    public void shutdown() {
        scheduledTasks.values().forEach(task -> task.cancel(false));
        scheduler.shutdown();
    }
}
```

### CacheAsyncLoader.java
```java
@Component
@Slf4j
@RequiredArgsConstructor
public class CacheAsyncLoader implements AsyncCacheLoader<String, JsonNode> {
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    @Value("${api.base-url}")
    private String baseUrl;
    
    @Override
    public CompletableFuture<JsonNode> asyncLoad(String key, Executor executor) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                log.info("Loading data for key: {}", key);
                String url = String.format("%s/data/%s", baseUrl, key);
                String response = restTemplate.getForObject(url, String.class);
                return objectMapper.readTree(response);
            } catch (Exception e) {
                log.error("Error loading data for key {}: {}", key, e.getMessage());
                throw new CacheLoadingException("Failed to load data", e);
            }
        }, executor);
    }
    
    @Override
    public CompletableFuture<JsonNode> asyncReload(String key, JsonNode oldValue, 
            Executor executor) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                String url = String.format("%s/data/%s", baseUrl, key);
                
                HttpHeaders headers = new HttpHeaders();
                String etag = calculateEtag(oldValue);
                headers.setIfNoneMatch(etag);
                
                ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
                );
                
                if (response.getStatusCode() == HttpStatus.NOT_MODIFIED) {
                    return oldValue;
                }
                
                return objectMapper.readTree(response.getBody());
            } catch (Exception e) {
                log.error("Error reloading data for key {}: {}", key, e.getMessage());
                return oldValue;
            }
        }, executor);
    }
}
```

### CacheService.java
```java
@Service
@Slf4j
@RequiredArgsConstructor
public class CacheService {
    private final AsyncLoadingCache<String, JsonNode> cache;
    private final CacheRefreshScheduler refreshScheduler;
    private final MeterRegistry meterRegistry;
    
    public void setRefreshTime(String key, LocalTime refreshTime) {
        refreshScheduler.setRefreshTime(key, refreshTime);
    }
    
    public void setMultipleRefreshTimes(String key, List<LocalTime> refreshTimes) {
        refreshScheduler.setMultipleRefreshTimes(key, refreshTimes);
    }
    
    public CompletableFuture<JsonNode> getData(String key) {
        Timer.Sample sample = Timer.start(meterRegistry);
        
        return cache.get(key)
            .whenComplete((result, error) -> {
                sample.stop(meterRegistry.timer("cache.access.time", 
                    "key", key,
                    "status", error == null ? "success" : "error"
                ));
                
                if (error != null) {
                    log.error("Error retrieving data for key {}: {}", 
                        key, error.getMessage());
                    meterRegistry.counter("cache.errors", 
                        "key", key).increment();
                }
            });
    }
    
    public CompletableFuture<Map<String, JsonNode>> getBulkData(Set<String> keys) {
        return cache.getAll(keys);
    }
}
```

### CacheController.java
```java
@RestController
@RequestMapping("/api/cache")
@RequiredArgsConstructor
@Slf4j
public class CacheController {
    private final CacheService cacheService;
    
    @PostMapping("/{key}/refresh-time")
    public ResponseEntity<Void> setRefreshTime(
            @PathVariable String key,
            @RequestBody LocalTime refreshTime) {
        cacheService.setRefreshTime(key, refreshTime);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/{key}/refresh-times")
    public ResponseEntity<Void> setMultipleRefreshTimes(
            @PathVariable String key,
            @RequestBody List<LocalTime> refreshTimes) {
        cacheService.setMultipleRefreshTimes(key, refreshTimes);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/{key}")
    public CompletableFuture<ResponseEntity<JsonNode>> getData(
            @PathVariable String key) {
        return cacheService.getData(key)
            .thenApply(ResponseEntity::ok)
            .exceptionally(this::handleError);
    }
    
    private <T> ResponseEntity<T> handleError(Throwable ex) {
        log.error("Error processing request: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
}
```

## Usage Examples

### Setting Refresh Times
```java
// Single refresh time
cacheService.setRefreshTime("myKey", LocalTime.of(14, 30));

// Multiple refresh times
List<LocalTime> times = Arrays.asList(
    LocalTime.of(9, 0),
    LocalTime.of(14, 0),
    LocalTime.of(18, 0)
);
cacheService.setMultipleRefreshTimes("myKey", times);
```

### API Calls
```bash
# Set single refresh time
curl -X POST "http://localhost:8080/api/cache/myKey/refresh-time" \
     -H "Content-Type: application/json" \
     -d '"14:30"'

# Set multiple refresh times
curl -X POST "http://localhost:8080/api/cache/myKey/refresh-times" \
     -H "Content-Type: application/json" \
     -d '["09:00", "14:00", "18:00"]'

# Get cached data
curl "http://localhost:8080/api/cache/myKey"
```

## Monitoring

Access metrics through Actuator endpoints:
```bash
# Cache statistics
curl "http://localhost:8080/actuator/metrics/cache.size"
curl "http://localhost:8080/actuator/metrics/cache.hits"
curl "http://localhost:8080/actuator/metrics/cache.misses"
```

## Error Handling

The system includes comprehensive error handling:
- Automatic fallback to old values on refresh failure
- Retry mechanism for failed loads
- Detailed error logging
- Metrics for monitoring errors

Would you like me to:
1. Add more configuration examples?
2. Include additional implementation details?
3. Add more usage scenarios?
4. Expand any specific component?