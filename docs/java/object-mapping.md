# Object Mapping

This document describes different approaches to object mapping in Java and provides a concrete implementation of a JSON-based model mapper.

## Comprehensive Guide to Model Mapping

(Content from comprehensive.md)

Model mapping is a critical component in modern enterprise applications, especially in microservices architectures where different services may use different representations of similar domain concepts. Model mappers provide a way to transform objects between these different representations, ensuring clean separation of concerns and maintainability of the codebase.

### Industry Practices

- **Single Responsibility Principle**: Keep mapping logic separate from business logic.
- **Immutability**: Prefer immutable objects where possible.
- **Type Safety**: Use strongly-typed mappers to catch errors at compile time.
- **Configuration Over Code**: Externalize mapping rules in configuration files.

### Popular Mapping Libraries

- **MapStruct**: Compile-time code generation, excellent performance.
- **ModelMapper**: Intelligent mapping based on conventions.
- **JMapper**: Annotation-based mapping.
- **Dozer**: Mature mapping framework with multiple configuration options.
- **Spring's BeanUtils**: Simple property copying.
- **Orika**: Bidirectional mapping and nested mapping support.

## JSON-Based Model Mapper Implementation

This is an example of a flexible, JSON-configurable model mapper.

### `model.json`

```json
{
  "SourceModelToTargetModel": {
    "sourceId": "targetId",
    "firstName": "fullName",
    "lastName": "fullName",
    "address": "addressInfo",
    "contactInfo.email": "emailAddress",
    "contactInfo.phone": "phoneNumber"
  },
  "AddressToAddressDto": {
    "street": "streetAddress",
    "city": "cityName",
    "zipCode": "postalCode",
    "country": "countryName"
  }
}
```

### `modelwithtransformation.json`

```json
{
  "name": "orderDtoToEntity",
  "fields": {
    "id": "orderId",
    "orderNumber": {
      "field": "reference",
      "transform": "toUpperCase"
    },
    "totalAmount": "amount",
    "customer.id": "customerId",
    "customer.fullName": {
      "field": "customerName",
      "transform": "toLowerCase"
    },
    "items": {
      "field": "orderItems",
      "nested": "orderItemDtoToEntity"
    }
  }
}
```

### `modelmapper.java`

```java
package com.example.modelmapper.service;

// ... imports

@Service
public class ModelMapper {

    private final Map<String, Map<String, String>> mappingConfigs;

    public ModelMapper(Map<String, Map<String, String>> mappingConfigs) {
        this.mappingConfigs = mappingConfigs;
    }

    public <S, T> T map(S source, Class<T> targetClass) {
        // ... mapping logic
    }
}
```

### `modemapwithtranformation.java`

```java
package com.example.modelmapper.advanced;

// ... imports

@Service
public class AdvancedModelMapperService {

    // ... with transformation logic
}
```
