package com.example.openapi;

import io.swagger.v3.oas.models.OpenAPI;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration to integrate with SpringDoc OpenAPI
 */
@Configuration
public class SpringDocConfig {

    /**
     * This defines the main OpenAPI group that will use our merged OpenAPI bean
     * This is what SpringDoc will display in the Swagger UI
     */
    @Bean
    public GroupedOpenApi allApisGroup(@Qualifier("mergedOpenAPI") OpenAPI mergedOpenAPI) {
        return GroupedOpenApi.builder()
                .group("all-apis")
                .displayName("All APIs")
                .addOpenApiCustomizer(openApi -> {
                    // Replace the auto-generated OpenAPI with our merged one
                    // Copy all properties from our merged OpenAPI to the auto-generated one
                    if (mergedOpenAPI.getPaths() != null) {
                        openApi.setPaths(mergedOpenAPI.getPaths());
                    }
                    if (mergedOpenAPI.getComponents() != null) {
                        openApi.setComponents(mergedOpenAPI.getComponents());
                    }
                    if (mergedOpenAPI.getTags() != null) {
                        openApi.setTags(mergedOpenAPI.getTags());
                    }
                    if (mergedOpenAPI.getInfo() != null) {
                        openApi.setInfo(mergedOpenAPI.getInfo());
                    }
                    if (mergedOpenAPI.getServers() != null) {
                        openApi.setServers(mergedOpenAPI.getServers());
                    }
                    if (mergedOpenAPI.getSecurity() != null) {
                        openApi.setSecurity(mergedOpenAPI.getSecurity());
                    }
                    // Copy any other fields as needed
                })
                .pathsToMatch("/**") // Match all paths
                .build();
    }

    /**
     * Optionally, you can also create additional groups for specific subsets of APIs
     */
    @Bean
    public GroupedOpenApi userApisGroup() {
        return GroupedOpenApi.builder()
                .group("user-apis")
                .displayName("User Management APIs")
                .pathsToMatch("/api/users/**")
                .build();
    }
    
    @Bean
    public GroupedOpenApi productApisGroup() {
        return GroupedOpenApi.builder()
                .group("product-apis")
                .displayName("Product Management APIs")
                .pathsToMatch("/api/products/**")
                .build();
    }
}