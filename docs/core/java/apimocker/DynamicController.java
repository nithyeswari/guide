package com.example.openapiserver.controller;

import com.example.openapiserver.service.MockDataGenerator;
import com.example.openapiserver.service.OpenApiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.parameters.RequestBody;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@Slf4j
public class DynamicController {

    private final OpenApiService openApiService;
    private final MockDataGenerator mockDataGenerator;
    private final ObjectMapper objectMapper;
    private final ApplicationContext applicationContext;
    
    @PostConstruct
    public void init() throws IOException {
        openApiService.init();
    }
    
    /**
     * Handle GET requests dynamically
     */
    @GetMapping("/**")
    public ResponseEntity<?> handleGet(HttpServletRequest request) {
        return handleRequest(request, PathItem.HttpMethod.GET);
    }
    
    /**
     * Handle POST requests dynamically
     */
    @PostMapping("/**")
    public ResponseEntity<?> handlePost(HttpServletRequest request, @RequestBody(required = false) String body) {
        return handleRequest(request, PathItem.HttpMethod.POST, body);
    }
    
    /**
     * Handle PUT requests dynamically
     */
    @PutMapping("/**")
    public ResponseEntity<?> handlePut(HttpServletRequest request, @RequestBody(required = false) String body) {
        return handleRequest(request, PathItem.HttpMethod.PUT, body);
    }
    
    /**
     * Handle DELETE requests dynamically
     */
    @DeleteMapping("/**")
    public ResponseEntity<?> handleDelete(HttpServletRequest request) {
        return handleRequest(request, PathItem.HttpMethod.DELETE);
    }
    
    /**
     * Handle PATCH requests dynamically
     */
    @PatchMapping("/**")
    public ResponseEntity<?> handlePatch(HttpServletRequest request, @RequestBody(required = false) String body) {
        return handleRequest(request, PathItem.HttpMethod.PATCH, body);
    }
    
    /**
     * Handle request for any HTTP method
     */
    private ResponseEntity<?> handleRequest(HttpServletRequest request, PathItem.HttpMethod method) {
        return handleRequest(request, method, null);
    }
    
    /**
     * Handle request for any HTTP method with request body
     */
    private ResponseEntity<?> handleRequest(HttpServletRequest request, PathItem.HttpMethod method, String requestBody) {
        String path = request.getRequestURI();
        String specName = request.getParameter("spec");
        
        // If no spec provided, use default
        if (specName == null || specName.isEmpty()) {
            OpenAPI defaultSpec = openApiService.getDefaultSpec();
            if (defaultSpec != null) {
                return processRequestWithSpec(path, method, defaultSpec, requestBody);
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("No default specification available. Please specify a spec parameter.");
            }
        }
        
        // Try to use the requested spec
        OpenAPI openAPI = openApiService.getSpecByName(specName);
        if (openAPI == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Specification '" + specName + "' not found.");
        }
        
        return processRequestWithSpec(path, method, openAPI, requestBody);
    }
    
    /**
     * Process a request against a specific OpenAPI spec
     */
    private ResponseEntity<?> processRequestWithSpec(String requestPath, PathItem.HttpMethod method, 
                                                    OpenAPI openAPI, String requestBody) {
        // If no paths defined in spec
        if (openAPI.getPaths() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("No paths defined in the specification.");
        }
        
        // Find matching path
        Map.Entry<String, PathItem> matchingPath = findMatchingPath(requestPath, openAPI);
        
        if (matchingPath == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("No matching path found for: " + requestPath);
        }
        
        // Get the operation for the HTTP method
        Operation operation = getOperationForMethod(matchingPath.getValue(), method);
        
        if (operation == null) {
            return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                    .body("Method " + method + " not allowed for path: " + matchingPath.getKey());
        }
        
        // Get response for the operation
        ApiResponses responses = operation.getResponses();
        
        // First try to get "200" or "201" response
        ApiResponse successResponse = responses.get("200");
        if (successResponse == null) {
            successResponse = responses.get("201");
        }
        
        // If no success response defined, use the default or first available
        if (successResponse == null) {
            successResponse = responses.getDefault();
        }
        
        if (successResponse == null && !responses.isEmpty()) {
            successResponse = responses.values().iterator().next();
        }
        
        if (successResponse == null) {
            return ResponseEntity.status(HttpStatus.OK)
                    .body("No response schema defined for this operation.");
        }
        
        // Generate mock response based on the schema
        Object mockResponse = mockDataGenerator.generateMockResponse(successResponse);
        
        // Determine appropriate status code
        HttpStatus statusCode = HttpStatus.OK;
        try {
            int code = Integer.parseInt(responses.keySet().iterator().next());
            statusCode = HttpStatus.valueOf(code);
        } catch (Exception e) {
            // Default to 200 OK if invalid status code
        }
        
        return ResponseEntity.status(statusCode).body(mockResponse);
    }
    
    /**
     * Find a matching path in the OpenAPI spec
     */
    private Map.Entry<String, PathItem> findMatchingPath(String requestPath, OpenAPI openAPI) {
        // Remove context path if present
        if (requestPath.startsWith("/")) {
            requestPath = requestPath.substring(1);
        }
        
        // Direct match first
        PathItem pathItem = openAPI.getPaths().get("/" + requestPath);
        if (pathItem != null) {
            return new AbstractMap.SimpleEntry<>("/" + requestPath, pathItem);
        }
        
        // Then try with trailing slash
        if (!requestPath.endsWith("/")) {
            pathItem = openAPI.getPaths().get("/" + requestPath + "/");
            if (pathItem != null) {
                return new AbstractMap.SimpleEntry<>("/" + requestPath + "/", pathItem);
            }
        }
        
        // Then try matching path templates
        for (Map.Entry<String, PathItem> entry : openAPI.getPaths().entrySet()) {
            String specPath = entry.getKey();
            
            // Convert OpenAPI path template to regex pattern
            String patternString = specPath.replaceAll("\\{[^/]+\\}", "([^/]+)");
            Pattern pattern = Pattern.compile(patternString);
            Matcher matcher = pattern.matcher("/" + requestPath);
            
            if (matcher.matches()) {
                return entry;
            }
        }
        
        return null;
    }
    
    /**
     * Get the operation for the given HTTP method
     */
    private Operation getOperationForMethod(PathItem pathItem, PathItem.HttpMethod method) {
        switch (method) {
            case GET:
                return pathItem.getGet();
            case POST:
                return pathItem.getPost();
            case PUT:
                return pathItem.getPut();
            case DELETE:
                return pathItem.getDelete();
            case PATCH:
                return pathItem.getPatch();
            case HEAD:
                return pathItem.getHead();
            case OPTIONS:
                return pathItem.getOptions();
            default:
                return null;
        }
    }
    
    /**
     * Controller endpoint to list available specs
     */
    @GetMapping("/api/specs")
    public ResponseEntity<Map<String, Object>> listSpecs() {
        Map<String, OpenAPI> specs = openApiService.getLoadedSpecs();
        
        Map<String, Object> result = new HashMap<>();
        result.put("defaultSpec", openApiService.getDefaultSpec() != null);
        
        Map<String, Object> specsInfo = new HashMap<>();
        specs.forEach((name, spec) -> {
            Map<String, Object> specInfo = new HashMap<>();
            specInfo.put("title", spec.getInfo() != null ? spec.getInfo().getTitle() : "Untitled");
            specInfo.put("version", spec.getInfo() != null ? spec.getInfo().getVersion() : "Unknown");
            specInfo.put("pathCount", spec.getPaths() != null ? spec.getPaths().size() : 0);
            
            specsInfo.put(name, specInfo);
        });
        
        result.put("specs", specsInfo);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Controller endpoint to list endpoints for a spec
     */
    @GetMapping("/api/specs/{specName}/endpoints")
    public ResponseEntity<Map<String, Object>> listEndpoints(@PathVariable String specName) {
        OpenAPI openAPI = openApiService.getSpecByName(specName);
        
        if (openAPI == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Collections.singletonMap("error", "Spec not found: " + specName));
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("spec", specName);
        result.put("title", openAPI.getInfo() != null ? openAPI.getInfo().getTitle() : "Untitled");
        
        List<Map<String, Object>> endpoints = new ArrayList<>();
        
        if (openAPI.getPaths() != null) {
            openAPI.getPaths().forEach((path, pathItem) -> {
                Map<String, Object> endpoint = new HashMap<>();
                endpoint.put("path", path);
                
                List<String> methods = new ArrayList<>();
                if (pathItem.getGet() != null) methods.add("GET");
                if (pathItem.getPost() != null) methods.add("POST");
                if (pathItem.getPut() != null) methods.add("PUT");
                if (pathItem.getDelete() != null) methods.add("DELETE");
                if (pathItem.getPatch() != null) methods.add("PATCH");
                
                endpoint.put("methods", methods);
                endpoint.put("description", pathItem.getDescription());
                
                endpoints.add(endpoint);
            });
        }
        
        result.put("endpoints", endpoints);
        return ResponseEntity.ok(result);
    }
}