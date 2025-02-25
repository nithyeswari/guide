package com.example.openapiserver.config;

import com.example.openapiserver.service.OpenApiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.util.FileCopyUtils;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Component
@RequiredArgsConstructor
@Slf4j
public class AppInitializer implements CommandLineRunner {

    private final OpenApiService openApiService;
    private final OpenApiConfig openApiConfig;

    @Override
    public void run(String... args) throws Exception {
        log.info("Initializing OpenAPI Mock Server...");
        
        // Create specs directory if it doesn't exist
        String specsLocation = "specs";
        Path specsPath = Paths.get(specsLocation);
        
        if (!Files.exists(specsPath)) {
            try {
                Files.createDirectories(specsPath);
                log.info("Created directory: {}", specsPath);
                
                // Copy sample Petstore OpenAPI spec
                copyDefaultSpec(specsPath);
            } catch (IOException e) {
                log.error("Failed to create specs directory", e);
            }
        }
        
        // Initialize OpenAPI service to load specs
        try {
            openApiService.init();
            log.info("Loaded {} OpenAPI specifications", openApiService.getLoadedSpecs().size());
        } catch (Exception e) {
            log.error("Failed to initialize OpenAPI service", e);
        }
    }
    
    /**
     * Copy default Petstore OpenAPI spec to specs directory
     */
    private void copyDefaultSpec(Path specsPath) {
        try {
            // Check if default spec already exists
            Path defaultSpecPath = specsPath.resolve(openApiConfig.getDefaultSpec());
            if (Files.exists(defaultSpecPath)) {
                log.info("Default spec already exists: {}", defaultSpecPath);
                return;
            }
            
            // Copy from classpath resources
            Resource resource = new ClassPathResource("/sample-specs/petstore.yaml");
            if (resource.exists()) {
                try (Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
                    String content = FileCopyUtils.copyToString(reader);
                    Files.write(defaultSpecPath, content.getBytes(StandardCharsets.UTF_8));
                    log.info("Copied default spec to: {}", defaultSpecPath);
                }
            } else {
                log.warn("Default spec resource not found: /sample-specs/petstore.yaml");
            }
        } catch (IOException e) {
            log.error("Failed to copy default spec", e);
        }
    }
}