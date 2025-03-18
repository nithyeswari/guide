package com.example.modelmapper.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.util.ReflectionUtils;

import java.io.IOException;
import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

@Configuration
public class ModelMapperConfig {

    @Value("classpath:mapping-config.json")
    private Resource mappingConfigResource;

    @Bean
    public ModelMapper modelMapper() throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode rootNode = objectMapper.readTree(mappingConfigResource.getInputStream());
        
        Map<String, Map<String, String>> mappingConfigs = new HashMap<>();
        
        // Parse JSON mapping configuration
        Iterator<String> fieldNames = rootNode.fieldNames();
        while (fieldNames.hasNext()) {
            String mappingKey = fieldNames.next();
            JsonNode mappingNode = rootNode.get(mappingKey);
            
            Map<String, String> fieldMappings = new HashMap<>();
            Iterator<String> mappingFields = mappingNode.fieldNames();
            
            while (mappingFields.hasNext()) {
                String sourceField = mappingFields.next();
                String targetField = mappingNode.get(sourceField).asText();
                fieldMappings.put(sourceField, targetField);
            }
            
            mappingConfigs.put(mappingKey, fieldMappings);
        }
        
        return new ModelMapper(mappingConfigs);
    }
}

package com.example.modelmapper.service;

import org.springframework.stereotype.Service;
import java.lang.reflect.Field;
import java.util.Map;
import org.springframework.util.ReflectionUtils;

@Service
public class ModelMapper {

    private final Map<String, Map<String, String>> mappingConfigs;

    public ModelMapper(Map<String, Map<String, String>> mappingConfigs) {
        this.mappingConfigs = mappingConfigs;
    }

    /**
     * Maps the source object to the target object type based on the JSON mapping configuration
     * @param source The source object
     * @param targetClass The target class
     * @param <S> Source type
     * @param <T> Target type
     * @return A new instance of target type with mapped values
     */
    public <S, T> T map(S source, Class<T> targetClass) {
        String mappingKey = source.getClass().getSimpleName() + "To" + targetClass.getSimpleName();
        
        Map<String, String> fieldMappings = mappingConfigs.get(mappingKey);
        if (fieldMappings == null) {
            throw new IllegalArgumentException(
                    "No mapping configuration found for " + mappingKey);
        }
        
        try {
            T target = targetClass.getDeclaredConstructor().newInstance();
            
            for (Map.Entry<String, String> mapping : fieldMappings.entrySet()) {
                String sourceFieldName = mapping.getKey();
                String targetFieldName = mapping.getValue();
                
                Field sourceField = ReflectionUtils.findField(source.getClass(), sourceFieldName);
                Field targetField = ReflectionUtils.findField(targetClass, targetFieldName);
                
                if (sourceField != null && targetField != null) {
                    ReflectionUtils.makeAccessible(sourceField);
                    ReflectionUtils.makeAccessible(targetField);
                    
                    Object value = sourceField.get(source);
                    
                    // Handle complex nested objects recursively if needed
                    if (value != null && isComplexObject(value) && 
                            mappingConfigs.containsKey(value.getClass().getSimpleName() + "To" + targetField.getType().getSimpleName())) {
                        value = map(value, targetField.getType());
                    }
                    
                    targetField.set(target, value);
                }
            }
            
            return target;
        } catch (Exception e) {
            throw new RuntimeException("Error mapping object from " + 
                    source.getClass().getSimpleName() + " to " + targetClass.getSimpleName(), e);
        }
    }
    
    /**
     * Checks if an object is a complex type that might need mapping
     */
    private boolean isComplexObject(Object obj) {
        return !(obj instanceof String || obj instanceof Number || 
                obj instanceof Boolean || obj instanceof Character || 
                obj.getClass().isPrimitive());
    }
}

package com.example.modelmapper.controller;

import com.example.modelmapper.dto.SourceModel;
import com.example.modelmapper.dto.TargetModel;
import com.example.modelmapper.service.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mapper")
public class MapperController {

    private final ModelMapper modelMapper;

    @Autowired
    public MapperController(ModelMapper modelMapper) {
        this.modelMapper = modelMapper;
    }

    @PostMapping("/convert")
    public TargetModel convert(@RequestBody SourceModel sourceModel) {
        return modelMapper.map(sourceModel, TargetModel.class);
    }
}

// Example model classes
package com.example.modelmapper.dto;

import lombok.Data;

@Data
public class SourceModel {
    private String sourceId;
    private String firstName;
    private String lastName;
    private Address address;
    private ContactInfo contactInfo;
}

@Data
public class Address {
    private String street;
    private String city;
    private String zipCode;
    private String country;
}

@Data
public class ContactInfo {
    private String email;
    private String phone;
}

@Data
public class TargetModel {
    private String targetId;
    private String fullName;
    private AddressDto addressInfo;
    private String emailAddress;
    private String phoneNumber;
}

@Data
public class AddressDto {
    private String streetAddress;
    private String cityName;
    private String postalCode;
    private String countryName;
}