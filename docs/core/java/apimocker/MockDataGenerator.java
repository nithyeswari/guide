package com.example.openapiserver.service;

import com.example.openapiserver.config.MockDataConfig;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.github.javafaker.Faker;
import io.swagger.v3.oas.models.media.*;
import io.swagger.v3.oas.models.responses.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MockDataGenerator {

    private final MockDataConfig mockDataConfig;
    private final ObjectMapper objectMapper;
    private final Faker faker = new Faker();
    
    /**
     * Generate mock response for a given response schema
     */
    public Object generateMockResponse(ApiResponse apiResponse) {
        if (apiResponse == null || apiResponse.getContent() == null) {
            return "No content defined for this response";
        }
        
        // Try common content types
        for (String contentType : Arrays.asList("application/json", "application/xml", "*/*")) {
            MediaType mediaType = apiResponse.getContent().get(contentType);
            if (mediaType != null && mediaType.getSchema() != null) {
                return generateMockData(mediaType.getSchema());
            }
        }
        
        return "Unsupported content type or no schema defined";
    }
    
    /**
     * Generate mock data based on an OpenAPI schema
     */
    public Object generateMockData(Schema<?> schema) {
        if (schema == null) {
            return null;
        }
        
        // Check for examples in the schema
        if (mockDataConfig.isUseExamples() && schema.getExample() != null) {
            return schema.getExample();
        }
        
        // Handle different schema types
        if (schema instanceof ArraySchema) {
            return generateArrayData((ArraySchema) schema);
        } else if (schema instanceof ObjectSchema || (schema.getProperties() != null && !schema.getProperties().isEmpty())) {
            return generateObjectData(schema);
        } else if (schema instanceof StringSchema) {
            return generateStringData((StringSchema) schema);
        } else if (schema instanceof NumberSchema) {
            return generateNumberData((NumberSchema) schema);
        } else if (schema instanceof IntegerSchema) {
            return generateIntegerData((IntegerSchema) schema);
        } else if (schema instanceof BooleanSchema) {
            return generateBooleanData();
        } else if (schema instanceof DateSchema || schema instanceof DateTimeSchema) {
            return generateDateData(schema);
        } else if (schema.getEnum() != null && !schema.getEnum().isEmpty()) {
            return generateEnumData(schema);
        } else {
            // Default to string for unknown types
            return faker.lorem().word();
        }
    }
    
    /**
     * Generate mock array data
     */
    private Object generateArrayData(ArraySchema schema) {
        Schema<?> itemsSchema = schema.getItems();
        if (itemsSchema == null) {
            return new ArrayList<>();
        }
        
        int minItems = schema.getMinItems() != null ? schema.getMinItems() : 0;
        int maxItems = schema.getMaxItems() != null ? schema.getMaxItems() : mockDataConfig.getDefaultListSize();
        int itemCount = Math.min(maxItems, Math.max(minItems, mockDataConfig.getDefaultListSize()));
        
        List<Object> result = new ArrayList<>();
        for (int i = 0; i < itemCount; i++) {
            result.add(generateMockData(itemsSchema));
        }
        
        return result;
    }
    
    /**
     * Generate mock object data
     */
    private Object generateObjectData(Schema<?> schema) {
        ObjectNode objectNode = objectMapper.createObjectNode();
        
        if (schema.getProperties() != null) {
            schema.getProperties().forEach((key, propertySchema) -> {
                if (propertySchema instanceof ComposedSchema) {
                    handleComposedSchema(objectNode, key, (ComposedSchema) propertySchema);
                } else {
                    Object value = generateMockData(propertySchema);
                    addToObjectNode(objectNode, key, value);
                }
            });
        }
        
        // Handle additionalProperties
        if (schema.getAdditionalProperties() instanceof Schema) {
            Schema<?> additionalPropsSchema = (Schema<?>) schema.getAdditionalProperties();
            // Add a few random additional properties
            for (int i = 0; i < 2; i++) {
                String randomKey = "prop" + faker.lorem().word();
                Object value = generateMockData(additionalPropsSchema);
                addToObjectNode(objectNode, randomKey, value);
            }
        }
        
        return objectNode;
    }
    
    /**
     * Handle composed schemas (oneOf, anyOf, allOf)
     */
    private void handleComposedSchema(ObjectNode objectNode, String key, ComposedSchema composedSchema) {
        if (composedSchema.getAllOf() != null && !composedSchema.getAllOf().isEmpty()) {
            // For allOf, merge all schemas
            ObjectNode merged = objectMapper.createObjectNode();
            for (Schema<?> schema : composedSchema.getAllOf()) {
                Object innerResult = generateMockData(schema);
                if (innerResult instanceof ObjectNode) {
                    merged.setAll((ObjectNode) innerResult);
                }
            }
            objectNode.set(key, merged);
        } else if (composedSchema.getOneOf() != null && !composedSchema.getOneOf().isEmpty()) {
            // For oneOf, pick a random schema
            List<Schema> oneOfSchemas = composedSchema.getOneOf();
            Schema<?> selected = oneOfSchemas.get(new Random().nextInt(oneOfSchemas.size()));
            Object value = generateMockData(selected);
            addToObjectNode(objectNode, key, value);
        } else if (composedSchema.getAnyOf() != null && !composedSchema.getAnyOf().isEmpty()) {
            // For anyOf, pick a random schema (similar to oneOf for mocking)
            List<Schema> anyOfSchemas = composedSchema.getAnyOf();
            Schema<?> selected = anyOfSchemas.get(new Random().nextInt(anyOfSchemas.size()));
            Object value = generateMockData(selected);
            addToObjectNode(objectNode, key, value);
        }
    }
    
    /**
     * Generate mock string data
     */
    private String generateStringData(StringSchema schema) {
        String format = schema.getFormat() != null ? schema.getFormat() : "";
        
        switch (format.toLowerCase()) {
            case "email":
                return faker.internet().emailAddress();
            case "uri":
            case "url":
                return faker.internet().url();
            case "uuid":
                return UUID.randomUUID().toString();
            case "date":
                return LocalDate.now().toString();
            case "date-time":
                return Instant.now().toString();
            case "password":
                return faker.internet().password();
            case "byte":
                return Base64.getEncoder().encodeToString(faker.lorem().word().getBytes());
            case "binary":
                return "binary data";
            case "hostname":
                return faker.internet().domainName();
            case "ipv4":
                return faker.internet().ipV4Address();
            case "ipv6":
                return faker.internet().ipV6Address();
            default:
                int minLength = schema.getMinLength() != null ? schema.getMinLength() : 0;
                int maxLength = schema.getMaxLength() != null ? schema.getMaxLength() : mockDataConfig.getDefaultStringLength();
                
                if (minLength > maxLength) {
                    maxLength = minLength;
                }
                
                String pattern = schema.getPattern();
                if (pattern != null) {
                    try {
                        return faker.regexify(pattern);
                    } catch (Exception e) {
                        log.warn("Failed to generate string from regex pattern: {}", pattern);
                    }
                }
                
                if (maxLength <= 5) {
                    return faker.lorem().characters(minLength, maxLength);
                } else {
                    return faker.lorem().characters(Math.max(minLength, 1), maxLength);
                }
        }
    }
    
    /**
     * Generate mock number data
     */
    private Object generateNumberData(NumberSchema schema) {
        Double minimum = schema.getMinimum() != null ? schema.getMinimum().doubleValue() : 0.0;
        Double maximum = schema.getMaximum() != null ? schema.getMaximum().doubleValue() : 1000.0;
        
        if (minimum > maximum) {
            maximum = minimum + 100.0;
        }
        
        double range = maximum - minimum;
        double randomValue = minimum + (Math.random() * range);
        
        // Handle multipleOf constraint
        if (schema.getMultipleOf() != null) {
            double multipleOf = schema.getMultipleOf().doubleValue();
            randomValue = Math.floor(randomValue / multipleOf) * multipleOf;
        }
        
        // Round to reasonable precision
        BigDecimal bd = new BigDecimal(randomValue).setScale(2, RoundingMode.HALF_UP);
        return bd.doubleValue();
    }
    
    /**
     * Generate mock integer data
     */
    private Integer generateIntegerData(IntegerSchema schema) {
        Integer minimum = schema.getMinimum() != null ? schema.getMinimum().intValue() : 0;
        Integer maximum = schema.getMaximum() != null ? schema.getMaximum().intValue() : 100;
        
        if (minimum > maximum) {
            maximum = minimum + 100;
        }
        
        int value = faker.number().numberBetween(minimum, maximum);
        
        // Handle multipleOf constraint
        if (schema.getMultipleOf() != null) {
            int multipleOf = schema.getMultipleOf().intValue();
            value = (value / multipleOf) * multipleOf;
        }
        
        return value;
    }
    
    /**
     * Generate mock boolean data
     */
    private Boolean generateBooleanData() {
        return faker.bool().bool();
    }
    
    /**
     * Generate mock date data
     */
    private String generateDateData(Schema<?> schema) {
        Date date = faker.date().between(
                Date.from(LocalDate.now().minusYears(1).atStartOfDay(ZoneId.systemDefault()).toInstant()),
                Date.from(LocalDate.now().plusYears(1).atStartOfDay(ZoneId.systemDefault()).toInstant())
        );
        
        String format = schema.getFormat();
        if ("date-time".equals(format)) {
            return Instant.ofEpochMilli(date.getTime()).toString();
        } else {
            return new SimpleDateFormat(mockDataConfig.getDateFormat()).format(date);
        }
    }
    
    /**
     * Generate data from enum values
     */
    private Object generateEnumData(Schema<?> schema) {
        List<Object> enumValues = schema.getEnum();
        return enumValues.get(new Random().nextInt(enumValues.size()));
    }
    
    /**
     * Helper method to add a value to an ObjectNode
     */
    private void addToObjectNode(ObjectNode objectNode, String key, Object value) {
        if (value == null) {
            objectNode.putNull(key);
        } else if (value instanceof String) {
            objectNode.put(key, (String) value);
        } else if (value instanceof Integer) {
            objectNode.put(key, (Integer) value);
        } else if (value instanceof Long) {
            objectNode.put(key, (Long) value);
        } else if (value instanceof Float) {
            objectNode.put(key, (Float) value);
        } else if (value instanceof Double) {
            objectNode.put(key, (Double) value);
        } else if (value instanceof Boolean) {
            objectNode.put(key, (Boolean) value);
        } else if (value instanceof BigDecimal) {
            objectNode.put(key, (BigDecimal) value);
        } else if (value instanceof ObjectNode) {
            objectNode.set(key, (ObjectNode) value);
        } else if (value instanceof ArrayNode) {
            objectNode.set(key, (ArrayNode) value);
        } else if (value instanceof List) {
            try {
                String json = objectMapper.writeValueAsString(value);
                JsonNode jsonNode = objectMapper.readTree(json);
                objectNode.set(key, jsonNode);
            } catch (JsonProcessingException e) {
                log.error("Error converting list to JSON", e);
                objectNode.putNull(key);
            }
        } else {
            try {
                String json = objectMapper.writeValueAsString(value);
                JsonNode jsonNode = objectMapper.readTree(json);
                objectNode.set(key, jsonNode);
            } catch (JsonProcessingException e) {
                log.error("Error converting object to JSON", e);
                objectNode.put(key, value.toString());
            }
        }
    }
}