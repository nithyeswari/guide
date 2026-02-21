# Spring Boot Application with Redis Sidecar Cache

This project demonstrates implementing Redis as a sidecar container in Kubernetes to provide a local cache for a Spring Boot application.

## Table of Contents
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Implementation](#implementation)
  - [Kubernetes Configuration](#kubernetes-configuration)
  - [Spring Boot Configuration](#spring-boot-configuration)
  - [Redis Instance Startup](#redis-instance-startup)
- [Deployment](#deployment)
- [Usage Examples](#usage-examples)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)

## Architecture

This project uses the sidecar pattern in Kubernetes where:
- Redis runs as a separate container within the same pod as your Spring Boot application
- Both containers share the same network namespace, allowing the application to connect to Redis via localhost
- The Redis cache lifecycle is coupled with the application pod lifecycle
- Each pod gets its own independent Redis instance

**Key Benefits of the Sidecar Pattern for Redis:**
- Ultra-low latency access to cache (microseconds via localhost connection)
- Data isolation between different application instances
- Simplified deployment and scaling (Redis automatically scales with your application)
- No need to manage a separate Redis deployment

## Prerequisites

- Kubernetes cluster (1.19+)
- kubectl CLI tool
- Docker
- Java 17+ and Spring Boot 3.x
- Maven or Gradle

## Implementation

### Kubernetes Configuration

The core of the sidecar implementation is in the Deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spring-app
  template:
    metadata:
      labels:
        app: spring-app
    spec:
      containers:
      # Main application container
      - name: spring-app
        image: your-registry/spring-app:1.0.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        
      # Redis sidecar container
      - name: redis-cache
        image: redis:7.0
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        volumeMounts:
        - name: redis-config
          mountPath: /usr/local/etc/redis/redis.conf
          subPath: redis.conf
        command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
      
      # Volumes for configuration
      volumes:
      - name: redis-config
        configMap:
          name: redis-config
```

And the ConfigMap for Redis configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    maxmemory 200mb
    maxmemory-policy allkeys-lru
    appendonly no
    save ""
```

### Spring Boot Configuration

#### application.yml

```yaml
spring:
  redis:
    host: localhost  # Connect to Redis in the same pod
    port: 6379
  cache:
    type: redis
    redis:
      time-to-live: 600000  # Cache TTL in milliseconds (10 minutes)
```

#### Redis Configuration

```java
@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration cacheConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
                        new GenericJackson2JsonRedisSerializer()));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(cacheConfig)
                .build();
    }
}
```

### Redis Instance Startup

When you deploy your application with Redis as a sidecar, here's how Redis instances come up:

1. **Pod Scheduling**: Kubernetes schedules the entire pod (Spring Boot + Redis containers) as a unit
2. **Container Initialization**: 
   - Kubernetes starts all containers in the pod
   - Redis starts using the command: `redis-server /usr/local/etc/redis/redis.conf`
3. **Instance Creation**: 
   - Each pod gets its own independent Redis instance
   - For a deployment with 3 replicas, you'll have 3 separate Redis instances
4. **Configuration Loading**: 
   - Redis loads configuration from the mounted ConfigMap
   - Parameters like memory limits and eviction policies are applied
5. **Ready State**: 
   - Redis becomes available on localhost:6379 within its pod
   - Your Spring Boot app connects to it using the local address

**Instance Distribution:**

```
Pod 1                         Pod 2                         Pod 3
+-----------------------+     +-----------------------+     +-----------------------+
| +-------------------+ |     | +-------------------+ |     | +-------------------+ |
| |   Spring Boot     | |     | |   Spring Boot     | |     | |   Spring Boot     | |
| |   Application     | |     | |   Application     | |     | |   Application     | |
| +-------------------+ |     | +-------------------+ |     | +-------------------+ |
|                       |     |                       |     |                       |
| +-------------------+ |     | +-------------------+ |     | +-------------------+ |
| |   Redis Instance  | |     | |   Redis Instance  | |     | |   Redis Instance  | |
| |   (localhost:6379)| |     | |   (localhost:6379)| |     | |   (localhost:6379)| |
| +-------------------+ |     | +-------------------+ |     | +-------------------+ |
+-----------------------+     +-----------------------+     +-----------------------+
```

Key points about Redis instances:
- Each pod runs its own isolated Redis instance (not clustered)
- Redis is only accessible from within its own pod
- When the deployment scales, new pods each get their own Redis
- Cache data is isolated to each pod with no data sharing between instances
- These are typically non-persistent, in-memory caches

## Deployment

1. Apply the Redis ConfigMap:
   ```bash
   kubectl apply -f redis-config.yaml
   ```

2. Deploy the application with Redis sidecar:
   ```bash
   kubectl apply -f deployment.yaml
   ```

3. Expose the service (if needed):
   ```bash
   kubectl apply -f service.yaml
   ```

## Usage Examples

### Caching Service Methods

```java
@Service
public class ProductService {

    private final ProductRepository productRepository;
    
    @Autowired
    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }
    
    @Cacheable(value = "products", key = "#id")
    public Product getProductById(Long id) {
        // Only executed if not in cache
        return productRepository.findById(id).orElse(null);
    }
    
    @CachePut(value = "products", key = "#product.id")
    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }
    
    @CacheEvict(value = "products", key = "#id")
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }
}
```

### Testing Cache Connection

```java
@RestController
@RequestMapping("/api/cache")
public class CacheTestController {

    private final RedisTemplate<String, String> redisTemplate;
    
    @Autowired
    public CacheTestController(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    @GetMapping("/test")
    public ResponseEntity<String> testCache() {
        String key = "test:key";
        String value = "Redis is working in sidecar mode!";
        
        redisTemplate.opsForValue().set(key, value, Duration.ofMinutes(5));
        String retrieved = redisTemplate.opsForValue().get(key);
        
        if (value.equals(retrieved)) {
            return ResponseEntity.ok("Cache is working: " + retrieved);
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Cache test failed!");
        }
    }
}
```

## Performance Considerations

- **Memory Allocation**: Carefully size the Redis container based on your cache needs
- **Eviction Policy**: allkeys-lru is set by default to evict least recently used keys when memory is full
- **TTL Settings**: Configure appropriate cache TTL in the Spring Boot cache configuration
- **Serialization**: JSON serialization is used by default, but consider more efficient options for large objects
- **Pod Isolation**: Be aware that each pod has its own cache, so cache hits depend on which pod handles a request

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Verify Redis is running in the pod:
     ```bash
     kubectl exec -it <pod-name> -c redis-cache -- redis-cli ping
     ```
   - Check Redis logs:
     ```bash
     kubectl logs <pod-name> -c redis-cache
     ```

2. **Cache Not Working**
   - Verify @EnableCaching annotation is present
   - Check Redis memory usage:
     ```bash
     kubectl exec -it <pod-name> -c redis-cache -- redis-cli info memory
     ```
   - Ensure serializable objects are being cached
   
3. **Pod Memory Issues**
   - Adjust Redis maxmemory setting in ConfigMap
   - Monitor pod resource usage:
     ```bash
     kubectl top pod <pod-name>
     ```

4. **Inconsistent Cache Results**
   - Remember each pod has its own Redis instance
   - If load balancing between pods, consider if shared cache might be better
   - Check which pod handled your request:
     ```bash
     kubectl logs <pod-name> -c spring-app | grep your-request-id
     ```
