I'll show you how to implement the custom `@ForwardHeaders` annotation with **WebClient** instead of Feign.

## Custom @ForwardHeaders Annotation with WebClient

### 1. Create the Custom Annotation (Same as before)

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ForwardHeaders {
    String[] value() default {"Authorization", "X-Trace-Id", "Content-Type"};
    boolean required() default false;
    String prefix() default "";
}
```

### 2. Header Context (Same as before)

```java
import java.util.HashMap;
import java.util.Map;

public class HeaderContext {
    private static final ThreadLocal<Map<String, String>> headerStorage = 
        ThreadLocal.withInitial(HashMap::new);
    
    public static void setHeader(String name, String value) {
        headerStorage.get().put(name, value);
    }
    
    public static String getHeader(String name) {
        return headerStorage.get().get(name);
    }
    
    public static Map<String, String> getAllHeaders() {
        return new HashMap<>(headerStorage.get());
    }
    
    public static void clear() {
        headerStorage.remove();
    }
    
    public static boolean hasHeader(String name) {
        return headerStorage.get().containsKey(name);
    }
}
```

### 3. Updated Aspect for WebClient

```java
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;

@Aspect
@Component
public class HeaderForwardingAspect {
    
    @Around("@annotation(forwardHeaders)")
    public Object forwardHeaders(ProceedingJoinPoint joinPoint, ForwardHeaders forwardHeaders) throws Throwable {
        
        System.out.println("🔄 HeaderForwardingAspect triggered for method: " + joinPoint.getSignature().getName());
        
        ServletRequestAttributes attributes = 
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            
            for (String headerName : forwardHeaders.value()) {
                String headerValue = request.getHeader(headerName);
                
                if (headerValue != null) {
                    String finalHeaderName = forwardHeaders.prefix().isEmpty() ? 
                        headerName : forwardHeaders.prefix() + headerName;
                    
                    HeaderContext.setHeader(finalHeaderName, headerValue);
                    System.out.println("📝 Stored header: " + finalHeaderName + " = " + headerValue);
                } else if (forwardHeaders.required()) {
                    throw new IllegalArgumentException("Required header missing: " + headerName);
                }
            }
        }
        
        try {
            return joinPoint.proceed();
        } finally {
            HeaderContext.clear();
            System.out.println("🧹 Cleared header context");
        }
    }
}
```

### 4. WebClient Configuration with Header Filter

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Configuration
public class WebClientConfig {
    
    @Bean
    public WebClient webClient() {
        return WebClient.builder()
            .filter(headerForwardingFilter())
            .build();
    }
    
    private ExchangeFilterFunction headerForwardingFilter() {
        return ExchangeFilterFunction.ofRequestProcessor(clientRequest -> {
            
            // Get headers from thread-local storage
            Map<String, String> storedHeaders = HeaderContext.getAllHeaders();
            
            if (!storedHeaders.isEmpty()) {
                ClientRequest.Builder builder = ClientRequest.from(clientRequest);
                
                // Add all stored headers to the request
                storedHeaders.forEach((name, value) -> {
                    builder.header(name, value);
                    System.out.println("🚀 Added header to WebClient call: " + name + " = " + value);
                });
                
                return Mono.just(builder.build());
            }
            
            return Mono.just(clientRequest);
        });
    }
}
```

### 5. Service Classes for API Calls

```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class ApiService {
    
    private final WebClient webClient;
    
    @Autowired
    public ApiService(WebClient webClient) {
        this.webClient = webClient;
    }
    
    // Service 1 API calls
    public Mono<String> callService1Api() {
        return webClient.get()
            .uri("http://localhost:8081/api1")
            .retrieve()
            .bodyToMono(String.class)
            .doOnNext(response -> System.out.println("📥 Service1 response: " + response));
    }
    
    public Mono<String> postToService1(Object data) {
        return webClient.post()
            .uri("http://localhost:8081/api1/data")
            .bodyValue(data)
            .retrieve()
            .bodyToMono(String.class)
            .doOnNext(response -> System.out.println("📥 Service1 POST response: " + response));
    }
    
    // Service 2 API calls
    public Mono<String> callService2Api() {
        return webClient.get()
            .uri("http://localhost:8082/api2")
            .retrieve()
            .bodyToMono(String.class)
            .doOnNext(response -> System.out.println("📥 Service2 response: " + response));
    }
    
    public Mono<String> processInService2(Object data) {
        return webClient.post()
            .uri("http://localhost:8082/api2/process")
            .bodyValue(data)
            .retrieve()
            .bodyToMono(String.class)
            .doOnNext(response -> System.out.println("📥 Service2 POST response: " + response));
    }
}
```

### 6. Controller Using the Custom Annotation

```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
public class MainController {
    
    @Autowired
    private ApiService apiService;
    
    // Basic usage - forwards default headers
    @GetMapping("/basic")
    @ForwardHeaders  // Uses default: {"Authorization", "X-Trace-Id", "Content-Type"}
    public Mono<String> basicCall() {
        System.out.println("🎯 Making basic calls to both services...");
        
        return Mono.zip(
            apiService.callService1Api(),
            apiService.callService2Api()
        ).map(tuple -> "Combined: " + tuple.getT1() + " | " + tuple.getT2());
    }
    
    // Custom headers
    @GetMapping("/custom")
    @ForwardHeaders({"Authorization", "X-User-Id", "X-Session-Id", "X-Client-Version"})
    public Mono<String> customHeaders() {
        System.out.println("🎯 Making calls with custom headers...");
        
        return Mono.zip(
            apiService.callService1Api(),
            apiService.callService2Api()
        ).map(tuple -> "Custom headers forwarded: " + tuple.getT1() + " | " + tuple.getT2());
    }
    
    // Required headers with prefix
    @PostMapping("/advanced")
    @ForwardHeaders(
        value = {"Authorization", "X-Trace-Id"}, 
        required = true, 
        prefix = "Fwd-"
    )
    public Mono<String> advancedCall(@RequestBody Object data) {
        System.out.println("🎯 Making POST calls with required headers and prefix...");
        
        return Mono.zip(
            apiService.postToService1(data),
            apiService.processInService2(data)
        ).map(tuple -> "Advanced call: " + tuple.getT1() + " | " + tuple.getT2());
    }
    
    // Multiple sequential calls
    @GetMapping("/sequential")
    @ForwardHeaders({"Authorization", "X-Trace-Id"})
    public Mono<String> sequentialCalls() {
        System.out.println("🎯 Making sequential calls...");
        
        return apiService.callService1Api()
            .flatMap(response1 -> 
                apiService.callService2Api()
                    .map(response2 -> "Sequential: " + response1 + " then " + response2)
            );
    }
    
    // Complex workflow with multiple calls
    @GetMapping("/workflow")
    @ForwardHeaders({"Authorization", "X-User-Id", "X-Trace-Id"})
    public Mono<String> complexWorkflow() {
        System.out.println("🎯 Starting complex workflow...");
        
        return apiService.callService1Api()
            .flatMap(result1 -> {
                // Use result1 to make more calls
                return Mono.zip(
                    apiService.callService2Api(),
                    apiService.postToService1(result1),
                    apiService.processInService2(result1)
                );
            })
            .map(tuple -> String.format("Workflow completed: %s, %s, %s", 
                tuple.getT1(), tuple.getT2(), tuple.getT3()));
    }
}
```

### 7. Alternative: Synchronous Version (if you prefer blocking calls)

```java
@Service
public class SyncApiService {
    
    private final WebClient webClient;
    
    @Autowired
    public SyncApiService(WebClient webClient) {
        this.webClient = webClient;
    }
    
    public String callService1ApiSync() {
        return webClient.get()
            .uri("http://localhost:8081/api1")
            .retrieve()
            .bodyToMono(String.class)
            .block(); // Convert to synchronous call
    }
    
    public String callService2ApiSync() {
        return webClient.get()
            .uri("http://localhost:8082/api2")
            .retrieve()
            .bodyToMono(String.class)
            .block();
    }
}

@RestController
public class SyncController {
    
    @Autowired
    private SyncApiService syncApiService;
    
    @GetMapping("/sync")
    @ForwardHeaders({"Authorization", "X-Trace-Id"})
    public String synchronousCall() {
        System.out.println("🎯 Making synchronous calls...");
        
        String response1 = syncApiService.callService1ApiSync();
        String response2 = syncApiService.callService2ApiSync();
        
        return "Sync results: " + response1 + " | " + response2;
    }
}
```

### 8. Enable AOP in Main Application

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@SpringBootApplication
@EnableAspectJAutoProxy  // Enable AOP
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

### 9. Dependencies (Maven)

```xml
<dependencies>
    <!-- Spring Boot Web Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- Spring WebFlux (for WebClient) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>
    
    <!-- AOP Support -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-aop</artifactId>
    </dependency>
</dependencies>
```

## How It Works with WebClient

1. **Request arrives** with headers like `Authorization: Bearer xyz`

2. **Aspect intercepts** method with `@ForwardHeaders` annotation

3. **Headers extracted** and stored in `ThreadLocal`

4. **WebClient calls made** - the filter automatically adds stored headers

5. **Headers forwarded** to all downstream API calls

6. **Cleanup** - `ThreadLocal` cleared after method completion

## Example Usage

```bash
# Test the endpoint
curl -H "Authorization: Bearer token123" \
     -H "X-Trace-Id: trace-456" \
     -H "X-User-Id: user789" \
     http://localhost:8080/custom

# Console output:
# 🔄 HeaderForwardingAspect triggered for method: customHeaders
# 📝 Stored header: Authorization = Bearer token123
# 📝 Stored header: X-User-Id = user789
# 🎯 Making calls with custom headers...
# 🚀 Added header to WebClient call: Authorization = Bearer token123
# 🚀 Added header to WebClient call: X-User-Id = user789
# 📥 Service1 response: Hello from Service1
# 🚀 Added header to WebClient call: Authorization = Bearer token123
# 🚀 Added header to WebClient call: X-User-Id = user789
# 📥 Service2 response: Hello from Service2
# 🧹 Cleared header context
```

## Key Advantages with WebClient

- **Reactive Support**: Works with both reactive (`Mono`/`Flux`) and blocking calls
- **No External Dependencies**: Uses Spring Boot's built-in WebClient
- **Better Performance**: Non-blocking I/O with reactive streams
- **Flexible**: Can handle both GET and POST requests easily
- **Clean Code**: Business logic remains focused, headers handled automatically

This approach gives you the same declarative header forwarding benefits without requiring Feign!