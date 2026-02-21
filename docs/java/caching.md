# Spring Boot Caching with Caffeine

## Overview
This project demonstrates the implementation of caching in Spring Boot applications using Caffeine cache. It provides high-performance caching capabilities with advanced features like automatic resource management, statistics gathering, and flexible eviction policies.

## Features
- High-performance local caching
- Automatic cache eviction policies
- Time-based expiration
- Size-based eviction
- Statistics monitoring
- Memory leak protection
- Async loading capabilities

## Prerequisites
- Java 17 or higher
- Spring Boot 3.x
- Maven/Gradle

## Dependencies
Add the following to your `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

## Configuration
Basic cache configuration:

```java
@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(500)
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .recordStats());
        return cacheManager;
    }
}
```

## Usage Examples

### Basic Caching
```java
@Service
public class UserService {
    @Cacheable("users")
    public User getUser(Long id) {
        return userRepository.findById(id);
    }

    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    @CachePut(value = "users", key = "#user.id")
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}
```

### Advanced Configuration
```java
Caffeine.newBuilder()
    .maximumSize(10_000)
    .expireAfterWrite(1, TimeUnit.HOURS)
    .expireAfterAccess(30, TimeUnit.MINUTES)
    .refreshAfterWrite(1, TimeUnit.MINUTES)
    .recordStats()
```

## Monitoring
Access cache statistics:

```java
@Autowired
private CacheManager cacheManager;

public void getCacheStats() {
    CaffeineCache cache = (CaffeineCache) cacheManager.getCache("users");
    CacheStats stats = cache.getNativeCache().stats();
    log.info("Hit rate: {}", stats.hitRate());
    log.info("Miss rate: {}", stats.missRate());
    log.info("Load success count: {}", stats.loadSuccessCount());
}
```

## Best Practices
1. Choose appropriate cache sizes based on your data volume
2. Set reasonable TTL values
3. Monitor cache statistics in production
4. Use cache eviction policies wisely
5. Consider using async loading for expensive operations
6. Implement proper error handling for cache operations

## Performance Considerations
- Monitor memory usage
- Track cache hit/miss ratios
- Adjust cache sizes based on usage patterns
- Consider using weak references for memory-sensitive caches

## Troubleshooting
Common issues and solutions:

1. Cache not working
   - Verify @EnableCaching is present
   - Check cache manager configuration
   - Ensure method calls are coming from external

2. Memory issues
   - Adjust maximum size
   - Implement eviction policies
   - Use weak references

3. Performance problems
   - Monitor cache statistics
   - Adjust cache settings
   - Review access patterns

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the LICENSE.md file for details.

## Support
For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## References
- [Spring Framework Documentation](https://docs.spring.io/spring-framework/docs/current/reference/html/integration.html#cache)
- [Caffeine Documentation](https://github.com/ben-manes/caffeine)
- [Spring Boot Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/)