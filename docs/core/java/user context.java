
// 1. User Context Data Transfer Object
public class UserContext {
    private String userSortCode;
    private String partyId;
    private String businessPartyId;
    private String userId;
    
    public UserContext() {}
    
    public UserContext(String userSortCode, String partyId, String businessPartyId, String userId) {
        this.userSortCode = userSortCode;
        this.partyId = partyId;
        this.businessPartyId = businessPartyId;
        this.userId = userId;
    }
    
    // Getters and setters
    public String getUserSortCode() { return userSortCode; }
    public void setUserSortCode(String userSortCode) { this.userSortCode = userSortCode; }
    
    public String getPartyId() { return partyId; }
    public void setPartyId(String partyId) { this.partyId = partyId; }
    
    public String getBusinessPartyId() { return businessPartyId; }
    public void setBusinessPartyId(String businessPartyId) { this.businessPartyId = businessPartyId; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    @Override
    public String toString() {
        return "UserContext{" +
                "userSortCode='" + userSortCode + '\'' +
                ", partyId='" + partyId + '\'' +
                ", businessPartyId='" + businessPartyId + '\'' +
                ", userId='" + userId + '\'' +
                '}';
    }
}

// 2. Custom Annotation for User Context Population
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface PopulateUserContext {
    /**
     * Whether user context is required (throws exception if missing)
     */
    boolean required() default true;
    
    /**
     * Custom error message when user context data is missing
     */
    String errorMessage() default "Required user context data is missing from payload";
    
    /**
     * Whether to validate that all user context fields are present
     */
    boolean validateAllFields() default false;
    
    /**
     * Specific fields to validate (if empty, validates all fields when validateAllFields=true)
     */
    String[] requiredFields() default {};
}

// 3. Thread Local User Context Manager
import org.springframework.stereotype.Component;

@Component
public class UserContextHolder {
    private static final ThreadLocal<UserContext> userContextThreadLocal = new ThreadLocal<>();
    
    public static void setUserContext(UserContext userContext) {
        userContextThreadLocal.set(userContext);
    }
    
    public static UserContext getUserContext() {
        return userContextThreadLocal.get();
    }
    
    public static String getUserSortCode() {
        UserContext context = getUserContext();
        return context != null ? context.getUserSortCode() : null;
    }
    
    public static String getPartyId() {
        UserContext context = getUserContext();
        return context != null ? context.getPartyId() : null;
    }
    
    public static String getBusinessPartyId() {
        UserContext context = getUserContext();
        return context != null ? context.getBusinessPartyId() : null;
    }
    
    public static String getUserId() {
        UserContext context = getUserContext();
        return context != null ? context.getUserId() : null;
    }
    
    public static void clear() {
        userContextThreadLocal.remove();
    }
    
    public static boolean hasUserContext() {
        return getUserContext() != null;
    }
}

// 4. Custom Exception for Missing User Context
public class UserContextMissingException extends RuntimeException {
    public UserContextMissingException(String message) {
        super(message);
    }
    
    public UserContextMissingException(String message, Throwable cause) {
        super(message, cause);
    }
}

// 5. Request Payload with User Context
import com.fasterxml.jackson.annotation.JsonProperty;

public class RequestPayload {
    @JsonProperty("user_sort_code")
    private String userSortCode;
    
    @JsonProperty("party_id")
    private String partyId;
    
    @JsonProperty("business_party_id")
    private String businessPartyId;
    
    @JsonProperty("user_id")
    private String userId;
    
    // Additional payload fields
    private String requestId;
    private String channel;
    private Object data;
    
    public RequestPayload() {}
    
    // Constructors
    public RequestPayload(String userSortCode, String partyId, String businessPartyId, String userId) {
        this.userSortCode = userSortCode;
        this.partyId = partyId;
        this.businessPartyId = businessPartyId;
        this.userId = userId;
    }
    
    // Getters and setters
    public String getUserSortCode() { return userSortCode; }
    public void setUserSortCode(String userSortCode) { this.userSortCode = userSortCode; }
    
    public String getPartyId() { return partyId; }
    public void setPartyId(String partyId) { this.partyId = partyId; }
    
    public String getBusinessPartyId() { return businessPartyId; }
    public void setBusinessPartyId(String businessPartyId) { this.businessPartyId = businessPartyId; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    
    public Object getData() { return data; }
    public void setData(Object data) { this.data = data; }
}

// 6. Service Request DTO
public class ServiceRequest {
    private RequestPayload payload;
    private String correlationId;
    private String timestamp;
    
    public ServiceRequest() {}
    
    public ServiceRequest(RequestPayload payload) {
        this.payload = payload;
    }
    
    public RequestPayload getPayload() { return payload; }
    public void setPayload(RequestPayload payload) { this.payload = payload; }
    
    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }
    
    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}

// 7. AOP Aspect for User Context Population
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.lang.reflect.Method;
import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;

@Aspect
@Component
public class UserContextAspect {
    
    private static final Logger logger = LoggerFactory.getLogger(UserContextAspect.class);
    
    @Around("@annotation(PopulateUserContext)")
    public Object populateUserContext(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        PopulateUserContext annotation = method.getAnnotation(PopulateUserContext.class);
        
        try {
            // Extract and populate user context
            extractAndPopulateUserContext(joinPoint.getArgs(), annotation);
            
            // Log user context (optional)
            if (logger.isDebugEnabled()) {
                logger.debug("User context populated: {}", UserContextHolder.getUserContext());
            }
            
            // Proceed with method execution
            return joinPoint.proceed();
            
        } finally {
            // Clear context after method execution to prevent memory leaks
            UserContextHolder.clear();
        }
    }
    
    private void extractAndPopulateUserContext(Object[] args, PopulateUserContext annotation) {
        RequestPayload payload = findPayloadFromArgs(args);
        
        if (payload == null && annotation.required()) {
            throw new UserContextMissingException(annotation.errorMessage());
        }
        
        if (payload != null) {
            UserContext userContext = createUserContextFromPayload(payload);
            
            // Validate required fields if specified
            if (annotation.validateAllFields() || annotation.requiredFields().length > 0) {
                validateUserContext(userContext, annotation);
            }
            
            UserContextHolder.setUserContext(userContext);
        }
    }
    
    private RequestPayload findPayloadFromArgs(Object[] args) {
        for (Object arg : args) {
            if (arg == null) continue;
            
            // Direct payload
            if (arg instanceof RequestPayload) {
                return (RequestPayload) arg;
            }
            
            // Object containing payload field
            try {
                Field payloadField = arg.getClass().getDeclaredField("payload");
                payloadField.setAccessible(true);
                Object payloadValue = payloadField.get(arg);
                if (payloadValue instanceof RequestPayload) {
                    return (RequestPayload) payloadValue;
                }
            } catch (NoSuchFieldException | IllegalAccessException e) {
                // Continue searching
            }
        }
        return null;
    }
    
    private UserContext createUserContextFromPayload(RequestPayload payload) {
        return new UserContext(
            payload.getUserSortCode(),
            payload.getPartyId(),
            payload.getBusinessPartyId(),
            payload.getUserId()
        );
    }
    
    private void validateUserContext(UserContext userContext, PopulateUserContext annotation) {
        List<String> fieldsToValidate;
        
        if (annotation.requiredFields().length > 0) {
            fieldsToValidate = Arrays.asList(annotation.requiredFields());
        } else {
            fieldsToValidate = Arrays.asList("userSortCode", "partyId", "businessPartyId", "userId");
        }
        
        for (String fieldName : fieldsToValidate) {
            String fieldValue = getFieldValue(userContext, fieldName);
            if (fieldValue == null || fieldValue.trim().isEmpty()) {
                throw new UserContextMissingException(
                    "Required field '" + fieldName + "' is missing or empty in user context");
            }
        }
    }
    
    private String getFieldValue(UserContext userContext, String fieldName) {
        switch (fieldName) {
            case "userSortCode": return userContext.getUserSortCode();
            case "partyId": return userContext.getPartyId();
            case "businessPartyId": return userContext.getBusinessPartyId();
            case "userId": return userContext.getUserId();
            default: return null;
        }
    }
}

// 8. Spring Boot Configuration
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@Configuration
@EnableAspectJAutoProxy
public class UserContextConfiguration {
    // AOP configuration for user context aspect
}

// 9. Example Service Implementation
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class BankingService {
    
    private static final Logger logger = LoggerFactory.getLogger(BankingService.class);
    
    @PopulateUserContext(required = true)
    public String processAccountRequest(ServiceRequest request) {
        // User context is automatically populated
        String sortCode = UserContextHolder.getUserSortCode();
        String partyId = UserContextHolder.getPartyId();
        String businessPartyId = UserContextHolder.getBusinessPartyId();
        
        logger.info("Processing account request for sort code: {}, party ID: {}", 
                   sortCode, partyId);
        
        return "Account processed for party: " + partyId;
    }
    
    @PopulateUserContext(
        required = true, 
        validateAllFields = true,
        errorMessage = "Complete user context required for transaction processing"
    )
    public String processTransaction(ServiceRequest request) {
        UserContext context = UserContextHolder.getUserContext();
        
        logger.info("Processing transaction for user context: {}", context);
        
        return "Transaction processed for business party: " + context.getBusinessPartyId();
    }
    
    @PopulateUserContext(
        required = true,
        requiredFields = {"partyId", "userSortCode"}
    )
    public String validateUser(ServiceRequest request) {
        String partyId = UserContextHolder.getPartyId();
        String sortCode = UserContextHolder.getUserSortCode();
        
        return "User validated - Party: " + partyId + ", Sort Code: " + sortCode;
    }
    
    @PopulateUserContext(required = false)
    public String processPublicRequest(ServiceRequest request) {
        if (UserContextHolder.hasUserContext()) {
            return "Authenticated request for party: " + UserContextHolder.getPartyId();
        } else {
            return "Anonymous public request processed";
        }
    }
}

// 10. REST Controller Example
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/banking")
public class BankingController {
    
    @Autowired
    private BankingService bankingService;
    
    @PostMapping("/account")
    public ResponseEntity<String> processAccount(@RequestBody ServiceRequest request) {
        try {
            String result = bankingService.processAccountRequest(request);
            return ResponseEntity.ok(result);
        } catch (UserContextMissingException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
    
    @PostMapping("/transaction")
    public ResponseEntity<String> processTransaction(@RequestBody ServiceRequest request) {
        try {
            String result = bankingService.processTransaction(request);
            return ResponseEntity.ok(result);
        } catch (UserContextMissingException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}

// 11. Example Usage and Testing
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.beans.factory.annotation.Autowired;

@SpringBootApplication
public class UserContextApplication implements CommandLineRunner {
    
    @Autowired
    private BankingService bankingService;
    
    public static void main(String[] args) {
        SpringApplication.run(UserContextApplication.class, args);
    }
    
    @Override
    public void run(String... args) throws Exception {
        // Example usage
        RequestPayload payload = new RequestPayload(
            "12-34-56", // userSortCode
            "PTY123456", // partyId  
            "BPY789012", // businessPartyId
            "USR001" // userId
        );
        
        ServiceRequest request = new ServiceRequest(payload);
        
        try {
            String result = bankingService.processAccountRequest(request);
            System.out.println("Result: " + result);
        } catch (UserContextMissingException e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}

// 12. Application Properties (application.yml)
/*
logging:
  level:
    com.yourpackage.UserContextAspect: DEBUG
    
management:
  endpoints:
    web:
      exposure:
        include: health,info
        
spring:
  application:
    name: user-context-service
*/

Thanks and Regards,
Nithyeswari
