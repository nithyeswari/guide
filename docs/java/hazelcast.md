# Dynamic Mapping System with Hazelcast

## Overview
This project implements a dynamic mapping system that allows runtime configuration updates without application redeployment. It uses Hazelcast as a distributed cache for mapping configurations and supports initial configuration through YAML properties.

## Features
- Initial mapping configuration through YAML/properties files
- Runtime mapping configuration updates
- No database dependency
- Distributed caching with Hazelcast
- High availability and fault tolerance
- REST API for mapping management
- Support for complex transformations
- Immediate cluster-wide updates
- Environment-specific configurations

## Architecture

### Core Components

1. **MappingProperties**
   - Holds initial mapping configurations from YAML
   - Supports multiple mapping types
   - Environment-specific configurations

2. **MappingConfig**
   - Defines mapping rules between source and target objects
   - Supports various transformation types
   - Serializable for Hazelcast storage

3. **HazelcastConfig**
   - Configures Hazelcast instance
   - Sets up distributed map for mappings
   - Configures backup and reliability settings

4. **MappingCacheService**
   - Manages mapping configurations in Hazelcast
   - Initializes mappings from properties
   - Handles CRUD operations for mappings

5. **DynamicMapper**
   - Performs object-to-object mapping
   - Uses cached configurations
   - Supports multiple transformation types

## Setup

### Dependencies
Add these to your `pom.xml`:
```xml
<dependencies>
    <dependency>
        <groupId>com.hazelcast</groupId>
        <artifactId>hazelcast-spring</artifactId>
        <version>5.3.0</version>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <version>1.18.30</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

### Configuration

1. Create `application.yml`:
```yaml
mapping:
  configurations:
    - sourceType: UserSource
      targetType: UserTarget
      mappings:
        - sourceField: firstName,lastName
          targetField: fullName
          transformationType: CONCATENATE
          transformationConfig:
            delimiter: " "
        - sourceField: email
          targetField: emailAddress
          transformationType: DIRECT
        - sourceField: roles
          targetField: permissions
          transformationType: VALUE_MAPPING
          transformationConfig:
            mappings:
              ROLE_ADMIN: ADMIN_PERMISSION
              ROLE_USER: USER_PERMISSION
```

2. Create Hazelcast configuration:
```java
@Configuration
public class HazelcastConfig {
    @Bean
    public Config hazelcastConfig() {
        Config config = new Config();
        config.setInstanceName("mapping-cache");
        
        MapConfig mapConfig = new MapConfig("mappings")
            .setTimeToLiveSeconds(0)
            .setBackupCount(1);
        
        config.addMapConfig(mapConfig);
        return config;
    }
}
```

## Usage

### Define Mapping Properties
```java
@Configuration
@ConfigurationProperties(prefix = "mapping")
@Getter @Setter
public class MappingProperties {
    private List<TypeMapping> configurations = new ArrayList<>();
}
```

### Use the Mapper
```java
@Service
public class UserService {
    private final DynamicMapper mapper;

    public UserTarget convertUser(UserSource source) {
        return mapper.map(source, UserTarget.class);
    }
}
```

### Manage Mappings via REST API
```bash
# Reload mappings from properties
curl -X POST http://your-app/api/mappings/reload

# Get current mappings
curl http://your-app/api/mappings/UserSource/UserTarget

# Update specific mapping
curl -X PUT http://your-app/api/mappings/UserSource/UserTarget \
     -H "Content-Type: application/json" \
     -d '[{
         "sourceField": "firstName,lastName",
         "targetField": "fullName",
         "transformationType": "CONCATENATE",
         "transformationConfig": {
             "delimiter": ", "
         }
     }]'
```

## Supported Transformation Types

1. **DIRECT**
   - Simple value copy
   - No transformation applied

2. **CONCATENATE**
   - Combines multiple fields
   - Configurable delimiter
   ```yaml
   transformationConfig:
     delimiter: " "
   ```

3. **VALUE_MAPPING**
   - Maps values using configuration
   - Supports one-to-one value mapping
   ```yaml
   transformationConfig:
     mappings:
       ROLE_ADMIN: ADMIN_PERMISSION
       ROLE_USER: USER_PERMISSION
   ```

## Environment-Specific Configuration

1. Create environment-specific YAML files:
   - `application-dev.yml`
   - `application-test.yml`
   - `application-prod.yml`

2. Activate profile:
```bash
java -jar app.jar --spring.profiles.active=prod
```

## Best Practices

1. **Configuration Management**
   - Keep mapping configurations in version control
   - Use meaningful mapping names
   - Document transformations
   - Validate configurations at startup

2. **Performance**
   - Keep mapping configurations small
   - Use appropriate backup count
   - Consider enabling near-cache for read-heavy scenarios

3. **Monitoring**
   - Log mapping updates
   - Track mapping usage
   - Monitor Hazelcast cluster health

4. **Security**
   - Secure REST endpoints
   - Validate mapping configurations
   - Implement access control

## Troubleshooting

### Common Issues

1. **Configuration Not Loading**
   - Check YAML syntax
   - Verify file location
   - Check property prefix

2. **Mapping Not Found**
   - Check if mapping key is correct
   - Verify mapping initialization
   - Check Hazelcast connection

3. **Transformation Fails**
   - Validate transformation configuration
   - Check source field exists
   - Verify field types match

## Future Enhancements

1. **Configuration**
   - Add validation rules
   - Support for complex transformations
   - Custom transformation types

2. **Monitoring**
   - Add metrics collection
   - Implement health checks
   - Create dashboard

3. **Security**
   - Role-based access control
   - Audit logging
   - Configuration encryption

## Contributing
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Create pull request

## License
MIT License