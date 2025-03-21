package com.example.openapi;

import io.swagger.v3.oas.models.OpenAPI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

import java.util.ArrayList;
import java.util.List;

/**
 * This configuration class collects all your OpenAPI beans
 * so they can be injected as a collection.
 */
@Configuration
public class OpenApiBeanCollector {

    /**
     * If your existing OpenAPI beans are created dynamically,
     * you can use this collector to gather them all.
     */
    @Bean
    @Scope(ConfigurableBeanFactory.SCOPE_SINGLETON)
    public List<OpenAPI> openApiSpecifications() {
        return new ArrayList<>();
    }
    
    /**
     * This interface allows you to register OpenAPI beans programmatically
     */
    public interface OpenApiRegistrar {
        void registerOpenApi(OpenAPI openApi);
    }
    
    /**
     * Implementation of the registrar that collects OpenAPI beans
     */
    @Configuration
    public static class OpenApiRegistrarImpl implements OpenApiRegistrar {
        private final List<OpenAPI> openApiSpecs;
        
        @Autowired
        public OpenApiRegistrarImpl(List<OpenAPI> openApiSpecs) {
            this.openApiSpecs = openApiSpecs;
        }
        
        @Override
        public void registerOpenApi(OpenAPI openApi) {
            if (openApi != null) {
                openApiSpecs.add(openApi);
            }
        }
    }
}