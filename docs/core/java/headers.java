I'll explain the custom `@ForwardHeaders` annotation approach in detail with a complete working example.

## Custom @ForwardHeaders Annotation - Complete Implementation

### 1. Create the Custom Annotation

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)  // Can be applied to methods
@Retention(RetentionPolicy.RUNTIME)  // Available at runtime for reflection
public @interface ForwardHeaders {
    // Default headers to forward if none specified
    String[] value() default {"Authorization", "X-Trace-Id", "Content-Type"};
    
    // Optional: Add more configuration options
    boolean required() default false;  // Whether headers are mandatory
    String prefix() default "";        // Add prefix to forwarded headers
}
```

### 2. Create Header Context (Thread-Local Storage)

```java
import java.util.HashMap;
import java.util.Map;

public class HeaderContext {
    
    // Thread-local storage to store headers for current request thread
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
        headerStorage.remove();  // Clean up to prevent memory leaks
    }
    
    public static boolean hasHeader(String name) {
        return headerStorage.get().containsKey(name);
    }
}
```

### 3. Create the Aspect (AOP Implementation)

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
        
        // Get current HTTP request
        ServletRequestAttributes attributes = 
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            
            // Extract and store headers specified in annotation
            for (String headerName : forwardHeaders.value()) {
                String headerValue = request.getHeader(headerName);
                
                if (headerValue != null) {
                    // Add prefix if specified
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
            // Execute the actual method
            return joinPoint.proceed();
        } finally {
            // Always clean up thread-local storage
            HeaderContext.clear();
            System.out.println("🧹 Cleared header context");
        }
    }
}
```

### 4. Configure Feign to Use Stored Headers

```java
import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FeignHeaderConfig {
    
    @Bean
    public RequestInterceptor headerForwardingInterceptor() {
        return new RequestInterceptor() {
            @Override
            public void apply(RequestTemplate template) {
                // Get all headers from thread-local storage
                Map<String, String> headers = HeaderContext.getAllHeaders();
                
                for (Map.Entry<String, String> entry : headers.entrySet()) {
                    template.header(entry.getKey(), entry.getValue());
                    System.out.println("🚀 Added header to Feign call: " + 
                        entry.getKey() + " = " + entry.getValue());
                }
            }
        };
    }
}
```

### 5. Define Your Feign Clients

```java
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "service1", url = "http://localhost:8081")
public interface Service1Client {
    
    @GetMapping("/api1")
    String callApi1();
    
    @PostMapping("/api1/data")
    String postToApi1(@RequestBody Object data);
}

@FeignClient(name = "service2", url = "http://localhost:8082")
public interface Service2Client {
    
    @GetMapping("/api2")
    String callApi2();
    
    @PostMapping("/api2/process")
    String processInApi2(@RequestBody Object data);
}
```

### 6. Use the Custom Annotation in Your Controller

```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MainController {
    
    @Autowired
    private Service1Client service1Client;
    
    @Autowired
    private Service2Client service2Client;
    
    // Basic usage - forwards default headers
    @GetMapping("/basic")
    @ForwardHeaders  // Uses default: {"Authorization", "X-Trace-Id", "Content-Type"}
    public String basicCall() {
        System.out.println("🎯 Making calls to both services...");
        
        String response1 = service1Client.callApi1();
        String response2 = service2Client.callApi2();
        
        return "Combined: " + response1 + " | " + response2;
    }
    
    // Custom headers
    @GetMapping("/custom")
    @ForwardHeaders({"Authorization", "X-User-Id", "X-Session-Id", "X-Client-Version"})
    public String customHeaders() {
        System.out.println("🎯 Making calls with custom headers...");
        
        String response1 = service1Client.callApi1();
        String response2 = service2Client.callApi2();
        
        return "Custom headers forwarded: " + response1 + " | " + response2;
    }
    
    // Required headers with prefix
    @PostMapping("/advanced")
    @ForwardHeaders(
        value = {"Authorization", "X-Trace-Id"}, 
        required = true, 
        prefix = "Fwd-"
    )
    public String advancedCall(@RequestBody Object data) {
        System.out.println("🎯 Making POST calls with required headers and prefix...");
        
        String response1 = service1Client.postToApi1(data);
        String response2 = service2Client.processInApi2(data);
        
        return "Advanced call: " + response1 + " | " + response2;
    }
    
    // Multiple annotations can be combined
    @GetMapping("/multi-service")
    @ForwardHeaders({"Authorization", "X-Trace-Id"})
    public String multiServiceCall() {
        // This method will automatically forward specified headers to ALL Feign calls
        return callMultipleServices();
    }
    
    private String callMultipleServices() {
        // These calls will automatically include forwarded headers
        String result1 = service1Client.callApi1();
        String result2 = service2Client.callApi2();
        String result3 = service1Client.postToApi1(new Object());
        
        return String.format("Results: %s, %s, %s", result1, result2, result3);
    }
}
```

### 7. Enable AOP in Your Application

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@SpringBootApplication
@EnableFeignClients
@EnableAspectJAutoProxy  // This enables AOP
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

### 8. Add Required Dependencies

```xml
<dependencies>
    <!-- Spring Boot Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- Spring Cloud OpenFeign -->
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-openfeign</artifactId>
    </dependency>
    
    <!-- AOP Support -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-aop</artifactId>
    </dependency>
</dependencies>
```

## How It Works

1. **Request comes in** with headers like `Authorization: Bearer xyz` and `X-Trace-Id: abc123`

2. **Aspect intercepts** the method annotated with `@ForwardHeaders`

3. **Headers are extracted** from the current HTTP request and stored in `ThreadLocal`

4. **Method executes** - your business logic runs

5. **Feign calls are made** - the `RequestInterceptor` automatically adds stored headers to all outgoing requests

6. **Cleanup happens** - `ThreadLocal` is cleared to prevent memory leaks

## Example Request Flow

```bash
# Incoming request
curl -H "Authorization: Bearer token123" \
     -H "X-Trace-Id: trace-456" \
     -H "X-User-Id: user789" \
     http://localhost:8080/custom

# This will automatically forward those headers to both:
# - http://localhost:8081/api1 (Service1)  
# - http://localhost:8082/api2 (Service2)
```

## Advantages

- **Declarative**: Just add `@ForwardHeaders` to any method
- **Automatic**: No need to manually pass headers to each Feign call  
- **Flexible**: Specify which headers to forward per method
- **Clean**: Keeps your controller methods focused on business logic
- **Reusable**: Can be applied to any method that makes multiple API calls

## Console Output Example

```
🔄 HeaderForwardingAspect triggered for method: customCall
📝 Stored header: Authorization = Bearer token123
📝 Stored header: X-User-Id = user789
🎯 Making calls with custom headers...
🚀 Added header to Feign call: Authorization = Bearer token123
🚀 Added header to Feign call: X-User-Id = user789
🚀 Added header to Feign call: Authorization = Bearer token123
🚀 Added header to Feign call: X-User-Id = user789
🧹 Cleared header context
```

This approach provides a clean, reusable way to automatically forward headers to multiple API calls without cluttering your business logic!