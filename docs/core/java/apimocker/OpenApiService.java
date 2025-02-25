package com.example.openapiserver.service;

import com.example.openapiserver.config.OpenApiConfig;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.parser.OpenAPIV3Parser;
import io.swagger.v3.parser.core.models.ParseOptions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenApiService {
    
    private final OpenApiConfig openApiConfig;
    private final Map<String, OpenAPI> loadedSpecs = new HashMap<>();
    
    /**
     * Initialize by loading all available OpenAPI specifications
     */
    public void init() throws IOException {
        List<Resource> specResources = openApiConfig.loadSpecifications();
        ParseOptions parseOptions = new ParseOptions();
        parseOptions.setResolve(true);
        parseOptions.setResolveFully(true);
        
        for (Resource resource : specResources) {
            try {
                String filename = resource.getFilename();
                if (filename != null) {
                    log.info("Loading OpenAPI spec: {}", filename);
                    OpenAPI openAPI = new OpenAPIV3Parser().read(resource.getFile().getAbsolutePath(), null, parseOptions);
                    if (openAPI != null) {
                        loadedSpecs.put(filename, openAPI);
                        log.info("Successfully loaded spec: {} with {} paths", filename, 
                                openAPI.getPaths() != null ? openAPI.getPaths().size() : 0);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to load OpenAPI spec: {}", resource.getFilename(), e);
            }
        }
    }
    
    /**
     * Get all loaded OpenAPI specifications
     */
    public Map<String, OpenAPI> getLoadedSpecs() {
        return loadedSpecs;
    }
    
    /**
     * Get a specific loaded specification by name
     */
    public OpenAPI getSpecByName(String name) {
        return loadedSpecs.get(name);
    }
    
    /**
     * Get the default specification
     */
    public OpenAPI getDefaultSpec() {
        return loadedSpecs.get(openApiConfig.getDefaultSpec());
    }
    
    /**
     * Extract all endpoints from a given specification
     * @param specName Name of the specification to extract endpoints from
     * @return Map of path -> PathItem containing all endpoints
     */
    public Map<String, PathItem> getEndpoints(String specName) {
        OpenAPI openAPI = loadedSpecs.get(specName);
        if (openAPI != null && openAPI.getPaths() != null) {
            return openAPI.getPaths();
        }
        return new HashMap<>();
    }
    
    /**
     * Get all operations (GET, POST, etc.) for a specific path in a specification
     */
    public Map<PathItem.HttpMethod, Operation> getOperationsForPath(String specName, String path) {
        Map<String, PathItem> endpoints = getEndpoints(specName);
        PathItem pathItem = endpoints.get(path);
        
        Map<PathItem.HttpMethod, Operation> operations = new HashMap<>();
        if (pathItem != null) {
            if (pathItem.getGet() != null) operations.put(PathItem.HttpMethod.GET, pathItem.getGet());
            if (pathItem.getPost() != null) operations.put(PathItem.HttpMethod.POST, pathItem.getPost());
            if (pathItem.getPut() != null) operations.put(PathItem.HttpMethod.PUT, pathItem.getPut());
            if (pathItem.getDelete() != null) operations.put(PathItem.HttpMethod.DELETE, pathItem.getDelete());
            if (pathItem.getPatch() != null) operations.put(PathItem.HttpMethod.PATCH, pathItem.getPatch());
            if (pathItem.getHead() != null) operations.put(PathItem.HttpMethod.HEAD, pathItem.getHead());
            if (pathItem.getOptions() != null) operations.put(PathItem.HttpMethod.OPTIONS, pathItem.getOptions());
        }
        
        return operations;
    }
}