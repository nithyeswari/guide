package com.example.openapiserver.controller;

import com.example.openapiserver.service.OpenApiService;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/")
@RequiredArgsConstructor
public class IndexController {

    private final OpenApiService openApiService;
    
    @GetMapping
    @ResponseBody
    public Map<String, Object> index() {
        Map<String, Object> response = new HashMap<>();
        response.put("application", "OpenAPI Mock Server");
        response.put("status", "running");
        
        Map<String, OpenAPI> specs = openApiService.getLoadedSpecs();
        Map<String, Object> specsInfo = specs.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> {
                            Map<String, Object> info = new HashMap<>();
                            OpenAPI spec = entry.getValue();
                            Info apiInfo = spec.getInfo();
                            
                            info.put("title", apiInfo != null ? apiInfo.getTitle() : "Untitled");
                            info.put("version", apiInfo != null ? apiInfo.getVersion() : "Unknown");
                            info.put("paths", spec.getPaths() != null ? spec.getPaths().size() : 0);
                            
                            return info;
                        }
                ));
        
        response.put("loadedSpecs", specsInfo);
        response.put("endpoints", new String[] {
            "/api/specs - List all available specifications",
            "/api/specs/{specName}/endpoints - List all endpoints for a specification"
        });
        
        return response;
    }
}