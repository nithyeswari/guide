# Spring Boot WebClient: 50 Best Practices

A comprehensive guide for optimal performance, memory management, and logging configuration in Spring Boot WebClient applications.

## Table of Contents
- [Configuration & Setup](#configuration--setup)
- [Performance Optimization](#performance-optimization)
- [Memory Management](#memory-management)
- [Connection Management](#connection-management)
- [Error Handling & Resilience](#error-handling--resilience)
- [Logging & Monitoring](#logging--monitoring)
- [Security Best Practices](#security-best-practices)
- [Testing Strategies](#testing-strategies)
- [Reactive Programming](#reactive-programming)
- [Production Considerations](#production-considerations)

---

## Configuration & Setup

### 1. **Create a Single WebClient Bean**
```java
@Bean
@Scope("singleton")
public WebClient webClient() {
    return WebClient.builder()
        .baseUrl("https://api.example.com")
        .build();
}
```
WebClient instances are thread-safe and expensive to create. Reuse them across your application.

### 2. **Configure Base URL at Bean Level**
```java
@Bean
public WebClient apiWebClient() {
    return WebClient.builder()
        .baseUrl("${app.external-api.base-url}")
        .build();
}
```
Centralize URL configuration to avoid hardcoding and enable environment-specific settings.

### 3. **Use Builder Pattern for Complex Configurations**
```java
@Bean
public WebClient webClient(WebClient.Builder builder) {
    return builder
        .codecs(this::configureCodecs)
        .filter(this::addLoggingFilter)
        .build();
}
```

### 4. **Configure Default Headers Globally**
```java
@Bean
public WebClient webClient() {
    return WebClient.builder()
        .defaultHeader(HttpHeaders.USER_AGENT, "MyApp/1.0")
        .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
        .build();
}
```

### 5. **Use Configuration Properties for Settings**
```java
@ConfigurationProperties(prefix = "webclient")
@Data
public class WebClientProperties {
    private int connectionTimeout = 10000;
    private int responseTimeout = 30000;
    private int maxConnections = 100;
}
```

---

## Performance Optimization

### 6. **Configure Connection Pool Size Based on Load**
```java
ConnectionProvider provider = ConnectionProvider.builder("custom")
    .maxConnections(500)
    .pendingAcquireMaxCount(1000)
    .build();
```

### 7. **Set Appropriate Timeout Values**
```java
HttpClient httpClient = HttpClient.create()
    .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10000)
    .responseTimeout(Duration.ofSeconds(30));
```

### 8. **Enable HTTP/2 When Possible**
```java
HttpClient httpClient = HttpClient.create()
    .protocol(HttpProtocol.H2C, HttpProtocol.HTTP11);
```

### 9. **Configure Keep-Alive Settings**
```java
HttpClient httpClient = HttpClient.create()
    .option(ChannelOption.SO_KEEPALIVE, true)
    .option(ChannelOption.TCP_NODELAY, true);
```

### 10. **Use Compression for Large Payloads**
```java
HttpClient httpClient = HttpClient.create()
    .compress(true);
```

### 11. **Optimize JSON Processing**
```java
@Bean
public ObjectMapper objectMapper() {
    return new ObjectMapper()
        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .enable(JsonGenerator.Feature.IGNORE_UNKNOWN);
}
```

### 12. **Configure Reactor Netty Workers**
```java
// In application.properties
reactor.netty.ioWorkerCount=8
reactor.netty.ioSelectCount=2
```

---

## Memory Management

### 13. **Set Maximum In-Memory Buffer Size**
```java
.codecs(configurer -> 
    configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
```

### 14. **Use Streaming for Large Responses**
```java
public Flux<DataItem> streamLargeDataset() {
    return webClient.get()
        .retrieve()
        .bodyToFlux(DataItem.class)
        .limitRate(100); // Control backpressure
}
```

### 15. **Implement Proper Resource Disposal**
```java
@PreDestroy
public void cleanup() {
    if (connectionProvider instanceof DisposableServer) {
        ((DisposableServer) connectionProvider).dispose();
    }
}
```

### 16. **Use DataBuffer for Binary Data**
```java
public Mono<Resource> downloadFile() {
    return webClient.get()
        .retrieve()
        .bodyToMono(DataBuffer.class)
        .map(buffer -> new ByteArrayResource(buffer.asByteBuffer().array()));
}
```

### 17. **Configure JVM Memory Settings**
```bash
-Xmx4g -Xms2g
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
-XX:+UnlockExperimentalVMOptions
```

---

## Connection Management

### 18. **Configure Connection Pool Eviction**
```java
ConnectionProvider provider = ConnectionProvider.builder("custom")
    .maxIdleTime(Duration.ofSeconds(20))
    .maxLifeTime(Duration.ofSeconds(60))
    .evictInBackground(Duration.ofSeconds(120))
    .build();
```

### 19. **Set Connection Acquisition Timeout**
```java
ConnectionProvider provider = ConnectionProvider.builder("custom")
    .pendingAcquireTimeout(Duration.ofSeconds(60))
    .build();
```

### 20. **Monitor Connection Pool Metrics**
```java
@Component
public class ConnectionPoolMetrics {
    
    @EventListener
    public void handleConnectionPoolMetrics(ConnectionPoolMetricsEvent event) {
        log.info("Active connections: {}, Idle connections: {}", 
                event.getActiveConnections(), event.getIdleConnections());
    }
}
```

### 21. **Use Different Connection Pools for Different Services**
```java
@Bean("internalApiWebClient")
public WebClient internalApiWebClient() {
    ConnectionProvider internal = ConnectionProvider.builder("internal")
        .maxConnections(50)
        .build();
    // Configure for internal API
}

@Bean("externalApiWebClient")  
public WebClient externalApiWebClient() {
    ConnectionProvider external = ConnectionProvider.builder("external")
        .maxConnections(200)
        .build();
    // Configure for external API
}
```

---

## Error Handling & Resilience

### 22. **Implement Comprehensive Error Handling**
```java
public Mono<ApiResponse> callApi() {
    return webClient.get()
        .retrieve()
        .onStatus(HttpStatus::is4xxClientError, this::handle4xxError)
        .onStatus(HttpStatus::is5xxServerError, this::handle5xxError)
        .bodyToMono(ApiResponse.class);
}
```

### 23. **Use Retry with Exponential Backoff**
```java
.retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
    .maxBackoff(Duration.ofSeconds(10))
    .jitter(0.1))
```

### 24. **Implement Circuit Breaker Pattern**
```java
@Component
public class CircuitBreakerWebClient {
    private final CircuitBreaker circuitBreaker = CircuitBreaker.ofDefaults("api");
    
    public Mono<String> callWithCircuitBreaker() {
        return Mono.fromCallable(() -> 
            circuitBreaker.executeSupplier(() -> 
                webClient.get().retrieve().bodyToMono(String.class).block()))
            .subscribeOn(Schedulers.boundedElastic());
    }
}
```

### 25. **Configure Global Exception Handler**
```java
@Component
public class WebClientExceptionFilter implements ExchangeFilterFunction {
    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        return next.exchange(request)
            .onErrorMap(ConnectTimeoutException.class, ex -> 
                new ServiceUnavailableException("Service timeout", ex))
            .onErrorMap(IOException.class, ex -> 
                new ServiceUnavailableException("Network error", ex));
    }
}
```

### 26. **Use Fallback Mechanisms**
```java
public Mono<ApiResponse> callWithFallback() {
    return webClient.get()
        .retrieve()
        .bodyToMono(ApiResponse.class)
        .onErrorReturn(createFallbackResponse())
        .timeout(Duration.ofSeconds(30));
}
```

### 27. **Validate Response Status Codes**
```java
.onStatus(status -> status.value() >= 400, response -> {
    return response.bodyToMono(String.class)
        .flatMap(body -> Mono.error(new ApiException(body, status)));
})
```

---

## Logging & Monitoring

### 28. **Configure Structured Logging**
```yaml
logging:
  level:
    reactor.netty.http.client: DEBUG
    org.springframework.web.reactive.function.client: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
```

### 29. **Implement Request/Response Logging Filter**
```java
public ExchangeFilterFunction logRequest() {
    return ExchangeFilterFunction.ofRequestProcessor(clientRequest -> {
        log.info("Request: {} {}", clientRequest.method(), clientRequest.url());
        clientRequest.headers().forEach((name, values) -> 
            log.debug("Header: {}={}", name, values));
        return Mono.just(clientRequest);
    });
}
```

### 30. **Add Correlation ID Tracking**
```java
public ExchangeFilterFunction addCorrelationId() {
    return (request, next) -> {
        String correlationId = MDC.get("correlationId");
        ClientRequest newRequest = ClientRequest.from(request)
            .header("X-Correlation-ID", correlationId)
            .build();
        return next.exchange(newRequest);
    };
}
```

### 31. **Monitor Performance Metrics**
```java
@Component
public class WebClientMetrics {
    private final MeterRegistry meterRegistry;
    private final Timer.Sample sample;
    
    public ExchangeFilterFunction metricsFilter() {
        return ExchangeFilterFunction.ofResponseProcessor(response -> {
            Timer.Sample.start(meterRegistry)
                .stop(Timer.builder("webclient.request")
                    .tag("status", String.valueOf(response.statusCode().value()))
                    .register(meterRegistry));
            return Mono.just(response);
        });
    }
}
```

### 32. **Log Slow Requests**
```java
public ExchangeFilterFunction logSlowRequests() {
    return ExchangeFilterFunction.ofRequestProcessor(request -> {
        long startTime = System.currentTimeMillis();
        return Mono.just(request)
            .doOnNext(req -> {
                long duration = System.currentTimeMillis() - startTime;
                if (duration > 5000) {
                    log.warn("Slow request detected: {} {} took {}ms", 
                            req.method(), req.url(), duration);
                }
            });
    });
}
```

---

## Security Best Practices

### 33. **Implement OAuth2 Authentication**
```java
@Bean
public WebClient oauth2WebClient(ClientRegistrationRepository clientRegistrations,
                                OAuth2AuthorizedClientRepository authorizedClients) {
    ServletOAuth2AuthorizedClientExchangeFilterFunction oauth2 = 
        new ServletOAuth2AuthorizedClientExchangeFilterFunction(
            clientRegistrations, authorizedClients);
    
    return WebClient.builder()
        .filter(oauth2.setDefaultClientRegistrationId("api-client"))
        .build();
}
```

### 34. **Configure SSL/TLS Properly**
```java
SslContext sslContext = SslContextBuilder.forClient()
    .trustManager(InsecureTrustManagerFactory.INSTANCE)
    .build();

HttpClient httpClient = HttpClient.create()
    .secure(sslSpec -> sslSpec.sslContext(sslContext));
```

### 35. **Sanitize Sensitive Headers in Logs**
```java
public ExchangeFilterFunction sanitizeHeaders() {
    Set<String> sensitiveHeaders = Set.of("authorization", "x-api-key");
    
    return ExchangeFilterFunction.ofRequestProcessor(request -> {
        request.headers().forEach((name, values) -> {
            if (!sensitiveHeaders.contains(name.toLowerCase())) {
                log.debug("Header: {}={}", name, values);
            } else {
                log.debug("Header: {}=[PROTECTED]", name);
            }
        });
        return Mono.just(request);
    });
}
```

### 36. **Validate SSL Certificates in Production**
```java
@Profile("!dev")
@Bean
public WebClient secureWebClient() {
    SslContext sslContext = SslContextBuilder.forClient()
        .trustManager(TrustManagerFactory.getDefaultAlgorithm())
        .build();
    // Configure with proper certificate validation
}
```

---

## Testing Strategies

### 37. **Use MockWebServer for Integration Tests**
```java
@TestConfiguration
public class TestWebClientConfig {
    
    @Bean
    @Primary
    public WebClient testWebClient() {
        return WebClient.builder()
            .baseUrl("http://localhost:" + mockWebServer.getPort())
            .build();
    }
}
```

### 38. **Create WebClient Test Utilities**
```java
@TestComponent
public class WebClientTestUtils {
    
    public static MockResponse createJsonResponse(Object body) {
        return new MockResponse()
            .setResponseCode(200)
            .setHeader("Content-Type", "application/json")
            .setBody(asJson(body));
    }
}
```

### 39. **Test Error Scenarios**
```java
@Test
void shouldHandleTimeoutGracefully() {
    mockWebServer.enqueue(new MockResponse()
        .setResponseCode(200)
        .setBodyDelay(35, TimeUnit.SECONDS));
    
    StepVerifier.create(webClient.get().retrieve().bodyToMono(String.class))
        .expectError(TimeoutException.class)
        .verify();
}
```

### 40. **Mock External Dependencies**
```java
@MockBean
private WebClient externalApiClient;

@Test
void shouldCallExternalApi() {
    when(externalApiClient.get()).thenReturn(requestHeadersUriSpec);
    when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
    // Configure mock chain
}
```

---

## Reactive Programming

### 41. **Avoid Blocking Operations**
```java
// BAD
public String getData() {
    return webClient.get()
        .retrieve()
        .bodyToMono(String.class)
        .block(); // Blocks the thread
}

// GOOD
public Mono<String> getData() {
    return webClient.get()
        .retrieve()
        .bodyToMono(String.class);
}
```

### 42. **Use Proper Scheduler for Blocking Operations**
```java
public Mono<String> processData() {
    return webClient.get()
        .retrieve()
        .bodyToMono(String.class)
        .publishOn(Schedulers.boundedElastic())
        .map(this::processBlocking);
}
```

### 43. **Handle Backpressure Appropriately**
```java
public Flux<DataItem> streamData() {
    return webClient.get()
        .retrieve()
        .bodyToFlux(DataItem.class)
        .onBackpressureBuffer(1000)
        .limitRate(100);
}
```

### 44. **Use flatMap for Dependent Calls**
```java
public Mono<CombinedResult> getCombinedData(String id) {
    return webClient.get()
        .uri("/user/{id}", id)
        .retrieve()
        .bodyToMono(User.class)
        .flatMap(user -> webClient.get()
            .uri("/profile/{id}", user.getProfileId())
            .retrieve()
            .bodyToMono(Profile.class)
            .map(profile -> new CombinedResult(user, profile)));
}
```

### 45. **Implement Parallel Processing**
```java
public Mono<List<Result>> processParallel(List<String> ids) {
    return Flux.fromIterable(ids)
        .flatMap(id -> webClient.get()
            .uri("/data/{id}", id)
            .retrieve()
            .bodyToMono(Result.class), 10) // Concurrency level
        .collectList();
}
```

---

## Production Considerations

### 46. **Configure Health Checks**
```java
@Component
public class WebClientHealthIndicator implements HealthIndicator {
    
    @Override
    public Health health() {
        try {
            String response = webClient.get()
                .uri("/health")
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(5))
                .block();
            
            return Health.up()
                .withDetail("external-api", "UP")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("external-api", "DOWN")
                .withException(e)
                .build();
        }
    }
}
```

### 47. **Implement Graceful Shutdown**
```java
@Component
public class WebClientShutdownHandler {
    
    @EventListener
    public void handleContextClosing(ContextClosedEvent event) {
        // Gracefully close connections
        connectionProvider.dispose();
    }
}
```

### 48. **Configure Rate Limiting**
```java
@Component
public class RateLimitingFilter implements ExchangeFilterFunction {
    private final RateLimiter rateLimiter = RateLimiter.create(100.0); // 100 requests/second
    
    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        return Mono.fromCallable(rateLimiter::acquire)
            .subscribeOn(Schedulers.boundedElastic())
            .then(next.exchange(request));
    }
}
```

### 49. **Monitor and Alert on Failures**
```java
@Component
public class WebClientAlerting {
    private final MeterRegistry meterRegistry;
    
    public ExchangeFilterFunction alertingFilter() {
        return ExchangeFilterFunction.ofResponseProcessor(response -> {
            if (response.statusCode().is5xxServerError()) {
                Counter.builder("webclient.errors")
                    .tag("status", String.valueOf(response.statusCode().value()))
                    .register(meterRegistry)
                    .increment();
            }
            return Mono.just(response);
        });
    }
}
```

### 50. **Document API Integration Patterns**
```java
/**
 * WebClient configuration for External Payment API
 * 
 * Configuration:
 * - Connection timeout: 10 seconds
 * - Response timeout: 30 seconds
 * - Retry policy: 3 attempts with exponential backoff
 * - Circuit breaker: 50% failure threshold
 * 
 * Usage:
 * - Use for payment processing operations
 * - Includes automatic retry for transient failures
 * - Logs all requests for audit purposes
 */
@Bean("paymentApiWebClient")
public WebClient paymentApiWebClient() {
    // Implementation with comprehensive documentation
}
```

---

## Quick Reference Commands

### Performance Tuning Checklist
- [ ] Connection pool sized appropriately
- [ ] Timeouts configured for all operations
- [ ] Memory buffers sized correctly
- [ ] Compression enabled for large payloads
- [ ] HTTP/2 enabled where supported

### Security Checklist
- [ ] SSL/TLS properly configured
- [ ] Sensitive headers sanitized in logs
- [ ] Authentication mechanisms implemented
- [ ] Rate limiting configured
- [ ] Input validation implemented

### Monitoring Checklist
- [ ] Request/response logging configured
- [ ] Performance metrics collected
- [ ] Health checks implemented
- [ ] Alerting rules defined
- [ ] Correlation IDs tracked

---

## Advanced Best Practices

### 51. **Implement Custom Codecs for Specialized Formats**
```java
@Bean
public WebClient customCodecWebClient() {
    return WebClient.builder()
        .codecs(configurer -> {
            configurer.customCodecs().register(new ProtobufDecoder());
            configurer.customCodecs().register(new ProtobufEncoder());
            configurer.customCodecs().register(new AvroDecoder());
        })
        .build();
}
```

### 52. **Use WebClient for File Upload with Progress Tracking**
```java
public Mono<String> uploadFileWithProgress(MultipartFile file) {
    return DataBufferUtils.readInputStream(
            () -> file.getInputStream(), 
            new DefaultDataBufferFactory(), 
            1024)
        .doOnNext(buffer -> updateProgress(buffer.readableByteCount()))
        .collectList()
        .flatMap(buffers -> {
            MultiValueMap<String, HttpEntity<?>> parts = new LinkedMultiValueMap<>();
            parts.add("file", new MultipartFileResource(file));
            
            return webClient.post()
                .uri("/upload")
                .body(BodyInserters.fromMultipartData(parts))
                .retrieve()
                .bodyToMono(String.class);
        });
}
```

### 53. **Implement Advanced Load Balancing**
```java
@Component
public class LoadBalancedWebClient {
    private final List<String> endpoints;
    private final AtomicInteger counter = new AtomicInteger(0);
    
    public Mono<String> callWithLoadBalancing() {
        String endpoint = selectEndpoint();
        return webClient.mutate()
            .baseUrl(endpoint)
            .build()
            .get()
            .retrieve()
            .bodyToMono(String.class)
            .onErrorResume(error -> {
                // Try next endpoint on failure
                return callWithLoadBalancing();
            });
    }
    
    private String selectEndpoint() {
        int index = counter.getAndIncrement() % endpoints.size();
        return endpoints.get(index);
    }
}
```

### 54. **Configure Request/Response Transformation**
```java
public ExchangeFilterFunction transformRequest() {
    return ExchangeFilterFunction.ofRequestProcessor(request -> {
        // Add custom headers based on business logic
        String tenantId = getCurrentTenantId();
        String apiVersion = determineApiVersion(request.url());
        
        return Mono.just(ClientRequest.from(request)
            .header("X-Tenant-ID", tenantId)
            .header("API-Version", apiVersion)
            .build());
    });
}

public ExchangeFilterFunction transformResponse() {
    return ExchangeFilterFunction.ofResponseProcessor(response -> {
        // Modify response headers or body
        return Mono.just(ClientResponse.from(response)
            .header("X-Processed-By", "WebClient-Filter")
            .build());
    });
}
```

### 55. **Implement Distributed Tracing**
```java
@Component
public class TracingWebClientCustomizer implements WebClientCustomizer {
    private final Tracer tracer;
    
    @Override
    public void customize(WebClient.Builder webClientBuilder) {
        webClientBuilder.filter(ExchangeFilterFunction.ofRequestProcessor(request -> {
            Span span = tracer.nextSpan()
                .name("http-client-request")
                .tag("http.method", request.method().name())
                .tag("http.url", request.url().toString())
                .start();
            
            return Mono.just(ClientRequest.from(request)
                .header("X-Trace-Id", span.context().traceId())
                .build())
                .doFinally(signal -> span.end());
        }));
    }
}
```

### 56. **Use Reactive Caching Strategies**
```java
@Service
public class CachedApiService {
    private final Cache<String, Mono<ApiResponse>> cache = 
        Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .build();
    
    public Mono<ApiResponse> getCachedData(String key) {
        return cache.get(key, k -> 
            webClient.get()
                .uri("/data/{key}", k)
                .retrieve()
                .bodyToMono(ApiResponse.class)
                .cache(Duration.ofMinutes(10))
        );
    }
}
```

### 57. **Implement Advanced Retry Strategies**
```java
public class SmartRetryConfig {
    
    public static Retry smartRetry() {
        return Retry.from(retrySignals -> 
            retrySignals.flatMap(signal -> {
                if (signal.totalRetries() >= 5) {
                    return Mono.error(signal.failure());
                }
                
                // Different strategies based on error type
                if (signal.failure() instanceof ConnectTimeoutException) {
                    return Mono.delay(Duration.ofSeconds(2L * signal.totalRetries()));
                } else if (signal.failure() instanceof ReadTimeoutException) {
                    return Mono.delay(Duration.ofSeconds(1L * signal.totalRetries()));
                } else {
                    return Mono.delay(Duration.ofMillis(100));
                }
            })
        );
    }
}
```

### 58. **Configure WebSocket Integration**
```java
@Configuration
public class WebSocketWebClientConfig {
    
    @Bean
    public WebSocketClient webSocketClient() {
        ReactorNettyWebSocketClient client = new ReactorNettyWebSocketClient();
        client.setMaxFramePayloadLength(1024 * 1024); // 1MB
        return client;
    }
    
    public Flux<String> connectWebSocket(String url) {
        return webSocketClient.execute(URI.create(url), session ->
            session.receive()
                .map(WebSocketMessage::getPayloadAsText)
                .doOnNext(message -> log.info("Received: {}", message))
        );
    }
}
```

### 59. **Implement Request Deduplication**
```java
@Component
public class RequestDeduplicationFilter implements ExchangeFilterFunction {
    private final Cache<String, Mono<ClientResponse>> requestCache = 
        Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofSeconds(30))
            .build();
    
    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        String requestKey = generateRequestKey(request);
        
        return requestCache.get(requestKey, key -> 
            next.exchange(request)
                .doOnNext(response -> log.debug("Cached response for key: {}", key))
        );
    }
    
    private String generateRequestKey(ClientRequest request) {
        return request.method() + ":" + request.url() + ":" + 
               request.headers().hashCode();
    }
}
```

### 60. **Configure Multi-Environment Profiles**
```yaml
# application-dev.yml
webclient:
  external-api:
    base-url: https://dev-api.example.com
    connection-timeout: 30000
    retry-attempts: 1
    log-level: DEBUG

# application-prod.yml  
webclient:
  external-api:
    base-url: https://api.example.com
    connection-timeout: 10000
    retry-attempts: 3
    log-level: WARN
```

### 61. **Implement Request Queue Management**
```java
@Service
public class QueuedWebClientService {
    private final Semaphore semaphore = new Semaphore(100); // Limit concurrent requests
    private final LinkedBlockingQueue<Runnable> requestQueue = new LinkedBlockingQueue<>(1000);
    
    public Mono<String> queuedRequest(String url) {
        return Mono.fromCallable(() -> {
            semaphore.acquire();
            return requestQueue.offer(() -> {
                try {
                    return webClient.get()
                        .uri(url)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();
                } finally {
                    semaphore.release();
                }
            });
        }).subscribeOn(Schedulers.boundedElastic());
    }
}
```

### 62. **Use Conditional Request Headers**
```java
public Mono<ApiResponse> conditionalRequest(String etag, ZonedDateTime lastModified) {
    return webClient.get()
        .uri("/data")
        .headers(headers -> {
            if (etag != null) {
                headers.setIfNoneMatch(etag);
            }
            if (lastModified != null) {
                headers.setIfModifiedSince(lastModified);
            }
        })
        .retrieve()
        .onStatus(HttpStatus.NOT_MODIFIED::equals, response -> 
            Mono.just(getCachedResponse()))
        .bodyToMono(ApiResponse.class);
}
```

### 63. **Implement Advanced Metrics Collection**
```java
@Component
public class DetailedWebClientMetrics {
    private final MeterRegistry meterRegistry;
    private final Timer.Builder timerBuilder;
    
    public ExchangeFilterFunction detailedMetricsFilter() {
        return ExchangeFilterFunction.ofRequestProcessor(request -> {
            Timer.Sample sample = Timer.start(meterRegistry);
            
            return Mono.just(request)
                .doOnNext(req -> {
                    Counter.builder("webclient.requests.total")
                        .tag("method", req.method().name())
                        .tag("uri", extractUriTemplate(req.url()))
                        .register(meterRegistry)
                        .increment();
                })
                .doFinally(signal -> {
                    sample.stop(Timer.builder("webclient.request.duration")
                        .tag("method", request.method().name())
                        .tag("outcome", signal.toString())
                        .register(meterRegistry));
                });
        });
    }
}
```

### 64. **Configure Custom SSL Context**
```java
@Configuration
public class CustomSSLConfig {
    
    @Bean
    public SslContext customSslContext() throws Exception {
        KeyStore trustStore = KeyStore.getInstance("JKS");
        trustStore.load(new FileInputStream("custom-truststore.jks"), "password".toCharArray());
        
        TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance("SunX509");
        trustManagerFactory.init(trustStore);
        
        return SslContextBuilder.forClient()
            .trustManager(trustManagerFactory)
            .protocols("TLSv1.3", "TLSv1.2")
            .ciphers(Arrays.asList("TLS_AES_256_GCM_SHA384", "TLS_CHACHA20_POLY1305_SHA256"))
            .build();
    }
}
```

### 65. **Implement Response Streaming with Backpressure**
```java
@Service
public class StreamingService {
    
    public Flux<ProcessedData> streamAndProcess() {
        return webClient.get()
            .uri("/stream")
            .retrieve()
            .bodyToFlux(RawData.class)
            .onBackpressureBuffer(1000, 
                dropped -> log.warn("Dropped {} items due to backpressure", dropped.size()))
            .limitRate(100) // Process max 100 items per second
            .flatMap(this::processItem, 10) // Process 10 items concurrently
            .onErrorContinue((error, item) -> 
                log.error("Failed to process item: {}", item, error));
    }
    
    private Mono<ProcessedData> processItem(RawData raw) {
        return Mono.fromCallable(() -> transform(raw))
            .subscribeOn(Schedulers.parallel())
            .timeout(Duration.ofSeconds(5));
    }
}
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Connection Pool Exhaustion
```bash
# Symptoms: TimeoutException, "Connection pool is exhausted"
# Solution: Increase pool size or reduce connection lifetime
ConnectionProvider.builder("custom")
    .maxConnections(500)        # Increase if needed
    .maxIdleTime(Duration.ofSeconds(10))  # Reduce idle time
    .build();
```

#### Memory Leaks
```bash
# Symptoms: OutOfMemoryError, gradual memory increase
# Solutions:
1. Reduce maxInMemorySize
2. Use streaming for large responses
3. Implement proper resource disposal
4. Monitor and tune GC settings
```

#### Slow Response Times
```bash
# Debug steps:
1. Enable request/response logging
2. Monitor connection pool metrics
3. Check network latency
4. Verify timeout configurations
5. Profile application with tools like JProfiler
```

#### SSL/TLS Issues
```bash
# Common fixes:
1. Verify certificate chain
2. Check TLS version compatibility
3. Validate cipher suites
4. Enable SSL debug logging: -Djavax.net.debug=ssl
```

---

## Performance Profiling Tools

### JVM Profiling
```bash
# Enable JFR (Java Flight Recorder)
-XX:+FlightRecorder 
-XX:StartFlightRecording=duration=60s,filename=webclient-profile.jfr

# Enable GC logging
-XX:+UseG1GC 
-XX:+PrintGC 
-XX:+PrintGCDetails 
-XX:+PrintGCTimeStamps
```

### Application Metrics
```java
// Custom metrics for WebClient monitoring
@Component
public class WebClientProfiler {
    
    @EventListener
    public void profileSlowRequests(WebClientSlowRequestEvent event) {
        if (event.getDuration() > Duration.ofSeconds(5)) {
            log.warn("Slow request detected: {} took {}ms", 
                    event.getUrl(), event.getDuration().toMillis());
            
            // Trigger detailed profiling
            enableDetailedProfiling();
        }
    }
}
```

---

## Cloud-Native Considerations

### 66. **Configure for Kubernetes Deployments**
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        env:
        - name: JAVA_OPTS
          value: "-Xmx768m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

### 67. **Implement Service Discovery Integration**
```java
@Service
public class ServiceDiscoveryWebClient {
    private final DiscoveryClient discoveryClient;
    
    public Mono<String> callService(String serviceName) {
        return Mono.fromCallable(() -> 
                discoveryClient.getInstances(serviceName))
            .map(instances -> selectHealthyInstance(instances))
            .flatMap(instance -> 
                webClient.mutate()
                    .baseUrl(instance.getUri().toString())
                    .build()
                    .get()
                    .retrieve()
                    .bodyToMono(String.class));
    }
}
```

### 68. **Configure for Istio Service Mesh**
```java
@Bean
public WebClient istioWebClient() {
    return WebClient.builder()
        .filter((request, next) -> {
            // Add Istio-specific headers
            ClientRequest newRequest = ClientRequest.from(request)
                .header("x-request-id", generateRequestId())
                .header("x-b3-traceid", getCurrentTraceId())
                .build();
            return next.exchange(newRequest);
        })
        .build();
}
```

---

## Additional Resources

### Official Documentation
- [Spring WebClient Reference](https://docs.spring.io/spring-framework/docs/current/reference/html/web-reactive.html#webflux-client)
- [Project Reactor Documentation](https://projectreactor.io/docs)
- [Reactor Netty Reference](https://projectreactor.io/docs/netty/release/reference/index.html)
- [Spring Boot WebFlux Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/web.html#web.reactive)
- [Micrometer Metrics](https://micrometer.io/docs)

### Performance and Monitoring
- [Spring Boot Actuator Guide](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Grafana WebClient Dashboard Templates](https://grafana.com/grafana/dashboards/4701)
- [Prometheus Metrics for Spring Boot](https://prometheus.io/docs/guides/spring-boot/)
- [New Relic APM Integration](https://docs.newrelic.com/docs/agents/java-agent/)
- [AppDynamics Spring Boot Monitoring](https://docs.appdynamics.com/latest/en/application-monitoring/install-app-server-agents/java-agent)

### Testing and Development Tools
- [WireMock for API Testing](http://wiremock.org/docs/)
- [TestContainers for Integration Testing](https://www.testcontainers.org/)
- [MockWebServer Documentation](https://github.com/square/okhttp/tree/master/mockwebserver)
- [Spring Cloud Contract](https://spring.io/projects/spring-cloud-contract)
- [Postman Collections for API Testing](https://www.postman.com/collection/)

### Security Resources
- [Spring Security OAuth2 Client](https://docs.spring.io/spring-security/site/docs/current/reference/html5/#oauth2client)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Spring Boot Security Best Practices](https://spring.io/guides/topicals/spring-security-architecture/)
- [SSL/TLS Configuration Guide](https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices)

### Reactive Programming Resources
- [Reactive Streams Specification](https://www.reactive-streams.org/)
- [RxJava vs Project Reactor](https://www.baeldung.com/rxjava-vs-reactor)
- [Reactive Programming Patterns](https://www.reactivemanifesto.org/)
- [Backpressure and Flow Control](https://projectreactor.io/docs/core/release/reference/#_on_backpressure_and_ways_to_reshape_requests)

### Books and Articles
- **"Spring in Action, 6th Edition"** by Craig Walls - Comprehensive Spring WebFlux coverage
- **"Reactive Programming with RxJava"** by Tomasz Nurkiewicz - Reactive patterns
- **"Java Performance: The Definitive Guide"** by Scott Oaks - JVM tuning for reactive apps
- **"Microservices Patterns"** by Chris Richardson - Distributed system patterns
- **"Release It!"** by Michael Nygard - Production resilience patterns

### Community and Blogs
- [Spring Blog - WebFlux Posts](https://spring.io/blog/category/webflux)
- [Baeldung WebClient Tutorials](https://www.baeldung.com/spring-5-webclient)
- [DZone Reactive Programming Zone](https://dzone.com/reactive-programming)
- [Spring Community Forums](https://community.spring.io/)
- [Stack Overflow - Spring WebClient](https://stackoverflow.com/questions/tagged/spring-webclient)

### Tools and Libraries
- **Circuit Breakers**: [Resilience4j](https://resilience4j.readme.io/), [Hystrix](https://github.com/Netflix/Hystrix)
- **Load Testing**: [Gatling](https://gatling.io/), [JMeter](https://jmeter.apache.org/)
- **Monitoring**: [Zipkin](https://zipkin.io/), [Jaeger](https://www.jaegertracing.io/), [Sleuth](https://spring.io/projects/spring-cloud-sleuth)
- **Caching**: [Caffeine](https://github.com/ben-manes/caffeine), [Redis](https://redis.io/)
- **API Documentation**: [SpringDoc OpenAPI](https://springdoc.org/), [Swagger](https://swagger.io/)

### Performance Analysis Tools
- **APM Solutions**: New Relic, AppDynamics, Dynatrace, DataDog
- **JVM Profilers**: JProfiler, YourKit, VisualVM, async-profiler
- **Memory Analysis**: Eclipse MAT, JVisualVM, GCViewer
- **Network Analysis**: Wireshark, tcpdump, netstat

### Deployment and DevOps
- [Spring Boot Docker Best Practices](https://spring.io/guides/gs/spring-boot-docker/)
- [Kubernetes Spring Boot Guide](https://spring.io/guides/gs/spring-boot-kubernetes/)
- [Helm Charts for Spring Boot](https://github.com/helm/charts/tree/master/stable/spring-boot)
- [AWS ECS Spring Boot Deployment](https://aws.amazon.com/blogs/containers/deploy-spring-boot-application-on-amazon-ecs/)

---

## Performance Benchmarking

### Load Testing Configuration
```java
// Gatling simulation example
class WebClientLoadTest extends Simulation {
    
    val httpProtocol = http
        .baseUrl("http://localhost:8080")
        .acceptHeader("application/json")
        .userAgentHeader("WebClient-LoadTest")
    
    val scn = scenario("WebClient Load Test")
        .exec(http("get_data")
            .get("/api/data")
            .check(status.is(200)))
        .pause(1)
    
    setUp(
        scn.inject(rampUsers(100) during (60 seconds))
    ).protocols(httpProtocol)
}
```

### JMX Monitoring
```java
@Component
public class WebClientJMXMetrics implements WebClientJMXMetricsMBean {
    
    @Override
    public long getActiveConnections() {
        return connectionProvider.metrics().map(metrics -> 
            metrics.getActiveConnections()).orElse(0L);
    }
    
    @Override
    public long getTotalRequests() {
        return meterRegistry.counter("webclient.requests.total").count();
    }
}
```

---

**Remember**: These practices should be implemented gradually and always validated against your specific use case through proper testing and monitoring. Performance optimization is an iterative process that requires continuous measurement and adjustment.