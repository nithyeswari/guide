package com.example.modelmapper.advanced;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.ReflectionUtils;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Advanced model mapper that supports nested objects and transformations
 */
@Service
public class AdvancedModelMapperService {

    private final ObjectMapper objectMapper;
    private final Map<String, MappingDefinition> mappingDefinitions = new HashMap<>();
    private final Map<String, Function<Object, Object>> transformers = new HashMap<>();

    @Autowired
    public AdvancedModelMapperService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        registerDefaultTransformers();
    }

    /**
     * Register built-in transformers for common type conversions
     */
    private void registerDefaultTransformers() {
        // String to Integer transformer
        transformers.put("stringToInteger", value -> {
            if (value instanceof String) {
                return Integer.parseInt((String) value);
            }
            return value;
        });
        
        // Integer to String transformer
        transformers.put("integerToString", value -> {
            if (value instanceof Integer) {
                return value.toString();
            }
            return value;
        });
        
        // Uppercase transformer
        transformers.put("toUpperCase", value -> {
            if (value instanceof String) {
                return ((String) value).toUpperCase();
            }
            return value;
        });
        
        // Lowercase transformer
        transformers.put("toLowerCase", value -> {
            if (value instanceof String) {
                return ((String) value).toLowerCase();
            }
            return value;
        });
        
        // Join name fields transformer
        transformers.put("joinNames", value -> {
            if (value instanceof Map) {
                Map<?, ?> map = (Map<?, ?>) value;
                Object first = map.get("firstName");
                Object last = map.get("lastName");
                if (first != null && last != null) {
                    return first + " " + last;
                }
            }
            return value;
        });
    }

    /**
     * Register a custom transformer
     */
    public void registerTransformer(String name, Function<Object, Object> transformer) {
        transformers.put(name, transformer);
    }

    /**
     * Load a mapping definition from JSON
     */
    public void loadMappingDefinition(String mappingName, JsonNode definitionJson) {
        MappingDefinition definition = new MappingDefinition();
        definition.setName(mappingName);
        
        // Parse field mappings
        if (definitionJson.has("fields")) {
            JsonNode fieldsNode = definitionJson.get("fields");
            fieldsNode.fields().forEachRemaining(entry -> {
                String sourceField = entry.getKey();
                JsonNode targetInfo = entry.getValue();
                
                FieldMapping fieldMapping = new FieldMapping();
                fieldMapping.setSourceField(sourceField);
                
                if (targetInfo.isTextual()) {
                    // Simple mapping: "sourceField": "targetField"
                    fieldMapping.setTargetField(targetInfo.asText());
                } else if (targetInfo.isObject()) {
                    // Complex mapping with path or transformations
                    if (targetInfo.has("field")) {
                        fieldMapping.setTargetField(targetInfo.get("field").asText());
                    }
                    
                    if (targetInfo.has("transform")) {
                        String transformerName = targetInfo.get("transform").asText();
                        fieldMapping.setTransformer(transformers.get(transformerName));
                    }
                    
                    if (targetInfo.has("nested") && targetInfo.get("nested").isTextual()) {
                        fieldMapping.setNestedMapping(targetInfo.get("nested").asText());
                    }
                }
                
                definition.getFieldMappings().add(fieldMapping);
            });
        }
        
        mappingDefinitions.put(mappingName, definition);
    }

    /**
     * Map source object to target class using the specified mapping
     */
    public <T> T map(Object source, Class<T> targetClass, String mappingName) {
        try {
            MappingDefinition mappingDefinition = mappingDefinitions.get(mappingName);
            if (mappingDefinition == null) {
                throw new IllegalArgumentException("Mapping definition not found: " + mappingName);
            }
            
            T target = targetClass.getDeclaredConstructor().newInstance();
            
            for (FieldMapping fieldMapping : mappingDefinition.getFieldMappings()) {
                String sourceFieldPath = fieldMapping.getSourceField();
                String targetFieldPath = fieldMapping.getTargetField();
                
                // Handle nested paths with dot notation
                Object sourceValue = getNestedValue(source, sourceFieldPath);
                
                // Apply transformation if configured
                if (fieldMapping.getTransformer() != null && sourceValue != null) {
                    sourceValue = fieldMapping.getTransformer().apply(sourceValue);
                }
                
                // Handle nested mapping if configured
                if (fieldMapping.getNestedMapping() != null && sourceValue != null) {
                    String nestedMappingName = fieldMapping.getNestedMapping();
                    Class<?> targetFieldType = getFieldType(targetClass, targetFieldPath);
                    
                    if (sourceValue instanceof List) {
                        List<?> sourceList = (List<?>) sourceValue;
                        List<Object> targetList = new ArrayList<>();
                        
                        for (Object item : sourceList) {
                            Object mappedItem = map(item, targetFieldType, nestedMappingName);
                            targetList.add(mappedItem);
                        }
                        
                        sourceValue = targetList;
                    } else {
                        sourceValue = map(sourceValue, targetFieldType, nestedMappingName);
                    }
                }
                
                // Set the value to the target object
                setNestedValue(target, targetFieldPath, sourceValue);
            }
            
            return target;
        } catch (Exception e) {
            throw new RuntimeException("Error mapping object", e);
        }
    }
    
    /**
     * Get a nested field value using dot notation path
     */
    private Object getNestedValue(Object source, String path) {
        String[] parts = path.split("\\.");
        Object current = source;
        
        for (String part : parts) {
            if (current == null) {
                return null;
            }
            
            Field field = ReflectionUtils.findField(current.getClass(), part);
            if (field == null) {
                return null;
            }
            
            field.setAccessible(true);
            try {
                current = field.get(current);
            } catch (IllegalAccessException e) {
                return null;
            }
        }
        
        return current;
    }
    
    /**
     * Set a nested field value using dot notation path
     */
    private void setNestedValue(Object target, String path, Object value) {
        String[] parts = path.split("\\.");
        Object current = target;
        
        // Navigate to the parent object of the final field
        for (int i = 0; i < parts.length - 1; i++) {
            Field field = ReflectionUtils.findField(current.getClass(), parts[i]);
            if (field == null) {
                return;
            }
            
            field.setAccessible(true);
            try {
                Object next = field.get(current);
                if (next == null) {
                    // Create a new instance of the nested object if null
                    next = field.getType().getDeclaredConstructor().newInstance();
                    field.set(current, next);
                }
                current = next;
            } catch (Exception e) {
                return;
            }
        }
        
        // Set the value on the final field
        Field field = ReflectionUtils.findField(current.getClass(), parts[parts.length - 1]);
        if (field != null) {
            field.setAccessible(true);
            try {
                field.set(current, value);
            } catch (IllegalAccessException e) {
                // Handle exception or ignore
            }
        }
    }
    
    /**
     * Get the type of a field from a class using a dot notation path
     */
    private Class<?> getFieldType(Class<?> clazz, String path) {
        String[] parts = path.split("\\.");
        Class<?> current = clazz;
        
        for (String part : parts) {
            Field field = ReflectionUtils.findField(current, part);
            if (field == null) {
                return null;
            }
            
            current = field.getType();
        }
        
        return current;
    }

    /**
     * Definition class for a mapping between two models
     */
    static class MappingDefinition {
        private String name;
        private List<FieldMapping> fieldMappings = new ArrayList<>();
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public List<FieldMapping> getFieldMappings() {
            return fieldMappings;
        }
    }

    /**
     * Mapping configuration for a single field
     */
    static class FieldMapping {
        private String sourceField;
        private String targetField;
        private Function<Object, Object> transformer;
        private String nestedMapping;
        
        public String getSourceField() {
            return sourceField;
        }
        
        public void setSourceField(String sourceField) {
            this.sourceField = sourceField;
        }
        
        public String getTargetField() {
            return targetField;
        }
        
        public void setTargetField(String targetField) {
            this.targetField = targetField;
        }
        
        public Function<Object, Object> getTransformer() {
            return transformer;
        }
        
        public void setTransformer(Function<Object, Object> transformer) {
            this.transformer = transformer;
        }
        
        public String getNestedMapping() {
            return nestedMapping;
        }
        
        public void setNestedMapping(String nestedMapping) {
            this.nestedMapping = nestedMapping;
        }
    }
}
