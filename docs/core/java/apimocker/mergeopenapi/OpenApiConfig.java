package com.example.openapi;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.components.Components;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.*;
import java.util.stream.Collectors;

@Configuration
public class OpenApiConfig {
    private static final Logger logger = LoggerFactory.getLogger(OpenApiConfig.class);
    
    // Inject all your existing OpenAPI beans here
    // If you have them in a list or collection already, you can inject that directly
    @Autowired
    private List<OpenAPI> existingOpenApiSpecs;
    
    // Alternative: If your OpenAPI beans have specific names/qualifiers
    /*
    @Autowired
    @Qualifier("userServiceOpenApi")
    private OpenAPI userServiceOpenApi;
    
    @Autowired
    @Qualifier("productServiceOpenApi")
    private OpenAPI productServiceOpenApi;
    
    // Add more service-specific OpenAPI beans as needed
    */
    
    @Bean
    @Primary
    public OpenAPI mergedOpenAPI() {
        logger.info("Creating merged OpenAPI bean from {} specifications", existingOpenApiSpecs.size());
        
        if (existingOpenApiSpecs.isEmpty()) {
            logger.warn("No OpenAPI specifications found to merge");
            return new OpenAPI();
        }
        
        // Start with the first spec as the base
        OpenAPI mergedSpec = existingOpenApiSpecs.get(0).copy();
        
        // Merge the rest
        for (int i = 1; i < existingOpenApiSpecs.size(); i++) {
            OpenAPI currentSpec = existingOpenApiSpecs.get(i);
            logger.debug("Merging specification #{}", i + 1);
            
            // Merge paths
            mergePaths(mergedSpec, currentSpec);
            
            // Merge components
            mergeComponents(mergedSpec, currentSpec);
            
            // Merge servers
            mergeServers(mergedSpec, currentSpec);
            
            // Merge security requirements
            mergeSecurityRequirements(mergedSpec, currentSpec);
            
            // Merge tags
            mergeTags(mergedSpec, currentSpec);
            
            // Use the most complete info block
            if (mergedSpec.getInfo() == null && currentSpec.getInfo() != null) {
                mergedSpec.setInfo(currentSpec.getInfo());
            }
        }
        
        logger.info("Successfully created merged OpenAPI bean with {} paths", 
                mergedSpec.getPaths() != null ? mergedSpec.getPaths().size() : 0);
        
        return mergedSpec;
    }
    
    /**
     * Alternative implementation if you have named OpenAPI beans instead of a collection
     */
    /*
    @Bean
    @Primary
    public OpenAPI mergedOpenAPIFromNamed() {
        List<OpenAPI> specs = new ArrayList<>();
        specs.add(userServiceOpenApi);
        specs.add(productServiceOpenApi);
        // Add more as needed
        
        // Then perform the merging as above
        // ...
    }
    */
    
    /**
     * Merge paths from source spec into target spec
     */
    private void mergePaths(OpenAPI target, OpenAPI source) {
        if (source.getPaths() == null || source.getPaths().isEmpty()) {
            return;
        }
        
        if (target.getPaths() == null) {
            target.setPaths(new Paths());
        }
        
        for (Map.Entry<String, PathItem> entry : source.getPaths().entrySet()) {
            String path = entry.getKey();
            PathItem sourcePathItem = entry.getValue();
            PathItem targetPathItem = target.getPaths().get(path);
            
            if (targetPathItem == null) {
                // Path doesn't exist in target, simply add it
                target.getPaths().addPathItem(path, sourcePathItem);
            } else {
                // Path exists, merge operations
                mergePathOperations(targetPathItem, sourcePathItem);
            }
        }
    }
    
    /**
     * Merge path operations from source into target
     */
    private void mergePathOperations(PathItem target, PathItem source) {
        if (source.getGet() != null && target.getGet() == null) target.setGet(source.getGet());
        if (source.getPost() != null && target.getPost() == null) target.setPost(source.getPost());
        if (source.getPut() != null && target.getPut() == null) target.setPut(source.getPut());
        if (source.getDelete() != null && target.getDelete() == null) target.setDelete(source.getDelete());
        if (source.getOptions() != null && target.getOptions() == null) target.setOptions(source.getOptions());
        if (source.getHead() != null && target.getHead() == null) target.setHead(source.getHead());
        if (source.getPatch() != null && target.getPatch() == null) target.setPatch(source.getPatch());
        if (source.getTrace() != null && target.getTrace() == null) target.setTrace(source.getTrace());
        
        // Merge parameters
        if (source.getParameters() != null && !source.getParameters().isEmpty()) {
            if (target.getParameters() == null) {
                target.setParameters(new ArrayList<>());
            }
            
            // Add only non-duplicate parameters
            for (io.swagger.v3.oas.models.parameters.Parameter sourceParam : source.getParameters()) {
                boolean isDuplicate = target.getParameters().stream()
                        .anyMatch(targetParam -> Objects.equals(targetParam.getName(), sourceParam.getName()) && 
                                 Objects.equals(targetParam.getIn(), sourceParam.getIn()));
                
                if (!isDuplicate) {
                    target.addParametersItem(sourceParam);
                }
            }
        }
    }
    
    /**
     * Merge components from source spec into target spec
     */
    private void mergeComponents(OpenAPI target, OpenAPI source) {
        if (source.getComponents() == null) {
            return;
        }
        
        if (target.getComponents() == null) {
            target.setComponents(new Components());
        }
        
        Components targetComponents = target.getComponents();
        Components sourceComponents = source.getComponents();
        
        // Merge schemas
        if (sourceComponents.getSchemas() != null) {
            if (targetComponents.getSchemas() == null) {
                targetComponents.setSchemas(new HashMap<>());
            }
            targetComponents.getSchemas().putAll(sourceComponents.getSchemas());
        }
        
        // Merge responses
        if (sourceComponents.getResponses() != null) {
            if (targetComponents.getResponses() == null) {
                targetComponents.setResponses(new HashMap<>());
            }
            targetComponents.getResponses().putAll(sourceComponents.getResponses());
        }
        
        // Merge parameters
        if (sourceComponents.getParameters() != null) {
            if (targetComponents.getParameters() == null) {
                targetComponents.setParameters(new HashMap<>());
            }
            targetComponents.getParameters().putAll(sourceComponents.getParameters());
        }
        
        // Merge request bodies
        if (sourceComponents.getRequestBodies() != null) {
            if (targetComponents.getRequestBodies() == null) {
                targetComponents.setRequestBodies(new HashMap<>());
            }
            targetComponents.getRequestBodies().putAll(sourceComponents.getRequestBodies());
        }
        
        // Merge security schemes
        if (sourceComponents.getSecuritySchemes() != null) {
            if (targetComponents.getSecuritySchemes() == null) {
                targetComponents.setSecuritySchemes(new HashMap<>());
            }
            targetComponents.getSecuritySchemes().putAll(sourceComponents.getSecuritySchemes());
        }
        
        // Merge examples
        if (sourceComponents.getExamples() != null) {
            if (targetComponents.getExamples() == null) {
                targetComponents.setExamples(new HashMap<>());
            }
            targetComponents.getExamples().putAll(sourceComponents.getExamples());
        }
        
        // Merge callbacks
        if (sourceComponents.getCallbacks() != null) {
            if (targetComponents.getCallbacks() == null) {
                targetComponents.setCallbacks(new HashMap<>());
            }
            targetComponents.getCallbacks().putAll(sourceComponents.getCallbacks());
        }
        
        // Merge links
        if (sourceComponents.getLinks() != null) {
            if (targetComponents.getLinks() == null) {
                targetComponents.setLinks(new HashMap<>());
            }
            targetComponents.getLinks().putAll(sourceComponents.getLinks());
        }
        
        // Merge headers
        if (sourceComponents.getHeaders() != null) {
            if (targetComponents.getHeaders() == null) {
                targetComponents.setHeaders(new HashMap<>());
            }
            targetComponents.getHeaders().putAll(sourceComponents.getHeaders());
        }
    }
    
    /**
     * Merge servers from source spec into target spec
     */
    private void mergeServers(OpenAPI target, OpenAPI source) {
        if (source.getServers() == null || source.getServers().isEmpty()) {
            return;
        }
        
        if (target.getServers() == null) {
            target.setServers(new ArrayList<>());
        }
        
        // Add unique servers only
        for (Server sourceServer : source.getServers()) {
            boolean exists = target.getServers().stream()
                    .anyMatch(targetServer -> targetServer.getUrl().equals(sourceServer.getUrl()));
            
            if (!exists) {
                target.addServersItem(sourceServer);
            }
        }
    }
    
    /**
     * Merge security requirements from source spec into target spec
     */
    private void mergeSecurityRequirements(OpenAPI target, OpenAPI source) {
        if (source.getSecurity() == null || source.getSecurity().isEmpty()) {
            return;
        }
        
        if (target.getSecurity() == null) {
            target.setSecurity(new ArrayList<>());
        }
        
        // Add unique security requirements
        for (SecurityRequirement sourceReq : source.getSecurity()) {
            boolean exists = false;
            
            for (SecurityRequirement targetReq : target.getSecurity()) {
                if (sourceReq.keySet().equals(targetReq.keySet())) {
                    exists = true;
                    break;
                }
            }
            
            if (!exists) {
                target.addSecurityItem(sourceReq);
            }
        }
    }
    
    /**
     * Merge tags from source spec into target spec
     */
    private void mergeTags(OpenAPI target, OpenAPI source) {
        if (source.getTags() == null || source.getTags().isEmpty()) {
            return;
        }
        
        if (target.getTags() == null) {
            target.setTags(new ArrayList<>());
        }
        
        // Add unique tags only
        for (Tag sourceTag : source.getTags()) {
            boolean exists = target.getTags().stream()
                    .anyMatch(targetTag -> targetTag.getName().equals(sourceTag.getName()));
            
            if (!exists) {
                target.addTagsItem(sourceTag);
            }
        }
    }
}