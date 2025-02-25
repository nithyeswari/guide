package com.example.openapi;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.parser.OpenAPIV3Parser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

/**
 * Example of dynamically loading OpenAPI specs and registering them
 */
@Component
public class DynamicOpenApiLoader {

    @Autowired
    private ResourceLoader resourceLoader;
    
    @Autowired
    private OpenApiBeanCollector.OpenApiRegistrar registrar;
    
    @Value("${openapi.spec.locations:classpath:openapi/*.yaml}")
    private String[] specLocations;
    
    @PostConstruct
    public void loadSpecs() throws IOException {
        // Example for loading from classpath resources
        for (String location : specLocations) {
            Resource[] resources = resourceLoader.getResources(location);
            
            for (Resource resource : resources) {
                OpenAPI openAPI = parseOpenAPIFromResource(resource);
                if (openAPI != null) {
                    registrar.registerOpenApi(openAPI);
                }
            }
        }
        
        // Example for programmatically creating an OpenAPI spec
        OpenAPI programmaticApi = new OpenAPI()
            .info(new Info()
                .title("Programmatically Created API")
                .version("1.0.0")
                .description("This API was created programmatically"));
            
        // Add paths, components, etc.
        
        registrar.registerOpenApi(programmaticApi);
    }
    
    private OpenAPI parseOpenAPIFromResource(Resource resource) {
        try (InputStream is = resource.getInputStream()) {
            // Convert input stream to string
            String content = inputStreamToString(is);
            
            // Parse YAML to OpenAPI
            return new OpenAPIV3Parser().readContents(content).getOpenAPI();
        } catch (Exception e) {
            // Log error but continue processing other resources
            System.err.println("Error parsing OpenAPI from " + resource.getFilename() + ": " + e.getMessage());
            return null;
        }
    }
    
    private String inputStreamToString(InputStream is) {
        try (Scanner scanner = new Scanner(is, StandardCharsets.UTF_8.name())) {
            return scanner.useDelimiter("\\A").next();
        }
    }
}