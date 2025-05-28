import org.springframework.http.client.ClientHttpResponse;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.client.RestTemplate;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.http.ResponseEntity;
import lombok.Getter;
import java.time.LocalDateTime;

// Single Custom Exception for all 5XX errors
@Getter
public class Server5xxException extends RestClientException {
    private final HttpStatus status;
    private final String responseBody;

    public Server5xxException(HttpStatus status, String responseBody) {
        super(String.format("Server error %d: %s", status.value(), responseBody));
        this.status = status;
        this.responseBody = responseBody;
    }
}

// Custom Error Handler
@Component
public class Custom5xxErrorHandler extends DefaultResponseErrorHandler {
    
    @Override
    public boolean hasError(ClientHttpResponse response) throws IOException {
        return response.getStatusCode().is5xxServerError();
    }
    
    @Override
    public void handleError(ClientHttpResponse response) throws IOException {
        HttpStatus statusCode = response.getStatusCode();
        String responseBody = new String(getResponseBody(response), getCharset(response));
        
        if (statusCode.is5xxServerError()) {
            throw new Server5xxException(statusCode, responseBody);
        }
        
        // Fall back to default handling for non-5xx errors
        super.handleError(response);
    }
}

// Error Response DTO
@Getter
@AllArgsConstructor
public class ErrorResponse {
    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
}

// Global Exception Handler
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    @ExceptionHandler(Server5xxException.class)
    public ResponseEntity<ErrorResponse> handleServer5xxException(
            Server5xxException ex, 
            WebRequest request) {
            
        // Log the error
        log.error("5XX error occurred: {} - {}", ex.getStatus(), ex.getMessage());
        
        ErrorResponse error = new ErrorResponse(
            LocalDateTime.now(),
            ex.getStatus().value(),
            ex.getStatus().getReasonPhrase(),
            ex.getMessage(),
            request.getDescription(false)
        );
        
        return new ResponseEntity<>(error, ex.getStatus());
    }
}

// RestTemplate Configuration
@Configuration
public class RestTemplateConfig {
    
    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.setErrorHandler(new Custom5xxErrorHandler());
        return restTemplate;
    }
}
