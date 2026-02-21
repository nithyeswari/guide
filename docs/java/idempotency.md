# Spring Boot Nonce Implementation with Gradle

## 1. Project Setup

### Build Configuration (build.gradle)
```groovy
plugins {
    id 'org.springframework.boot' version '3.2.2'
    id 'io.spring.dependency-management' version '1.1.4'
    id 'java'
    id 'jacoco'  // For code coverage
    id 'com.diffplug.spotless' version '6.25.0'  // For code formatting
}

group = 'com.example'
version = '0.0.1-SNAPSHOT'
sourceCompatibility = '17'

configurations {
    compileOnly {
        extendsFrom annotationProcessor
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Carbon Awareness
    implementation 'org.greensoft:carbon-aware-sdk:1.0.0'
    implementation 'io.github.energy-consumption:energy-consumption-sdk:1.0.0'
    implementation 'org.greensoft:carbon-metrics:1.0.0'
    
    // Spring Boot
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    
    // Redis client
    implementation 'io.lettuce:lettuce-core'
    
    // Lombok
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    
    // Testing
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.testcontainers:testcontainers'
    testImplementation 'com.redis.testcontainers:testcontainers-redis-junit:2.0.1'
}

test {
    useJUnitPlatform()
    finalizedBy jacocoTestReport
}

jacocoTestReport {
    dependsOn test
    reports {
        xml.required = true
        html.required = true
    }
}

spotless {
    java {
        importOrder()
        removeUnusedImports()
        googleJavaFormat()
    }
}
```

### Gradle Wrapper Configuration (gradle/wrapper/gradle-wrapper.properties)
```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

### Settings File (settings.gradle)
```groovy
rootProject.name = 'nonce-service'
```

## 2. Application Configuration

### Application Properties (src/main/resources/application.yml)
```yaml
spring:
  application:
    name: nonce-service
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}
    password: ${REDIS_PASSWORD:}
    timeout: 2000
    lettuce:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 2
        max-wait: 1000ms

nonce:
  ttl: ${NONCE_TTL:900}
  time-window: ${NONCE_TIME_WINDOW:300}
  prefix: ${NONCE_PREFIX:nonce:}

management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus,carbon
  carbon:
    measurement:
      enabled: true
      interval: 60s
    regions:
      - name: default
        provider: local
        location: ${CARBON_LOCATION:us-east-1}
  metrics:
    tags:
      application: ${spring.application.name}
```

## 3. Docker Configuration

### Dockerfile
```dockerfile
FROM gradle:8.5-jdk17 AS build
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY src ./src
RUN gradle build -x test

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Docker Compose (docker-compose.yml)
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - NONCE_TTL=900
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

## 4. Integration Tests with TestContainers

```java
@SpringBootTest
@Testcontainers
class NonceServiceIntegrationTest {

    @Container
    static RedisContainer redis = new RedisContainer(DockerImageName.parse("redis:7-alpine"));

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);
    }

    @Autowired
    private NonceService nonceService;

    @Test
    void shouldHandleConcurrentRequests() throws InterruptedException {
        int threadCount = 10;
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger();
        String baseNonce = UUID.randomUUID().toString();

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    String nonce = baseNonce + "-" + index;
                    nonceService.validateAndStore(nonce, System.currentTimeMillis() / 1000);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    // Expected for duplicate nonces
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await(5, TimeUnit.SECONDS);
        assertEquals(threadCount, successCount.get());
    }
}
```

## 5. Performance Testing with Gatling

### Gatling Build Configuration
```groovy
plugins {
    id 'io.gatling.gradle' version '3.10.3'
}

dependencies {
    gatling 'org.scala-lang:scala-library:2.13.12'
    gatling 'io.gatling:gatling-core:3.10.3'
    gatling 'io.gatling:gatling-http:3.10.3'
}
```

### Gatling Test Simulation
```scala
class NonceSimulation extends Simulation {
  
  val httpProtocol = http
    .baseUrl("http://localhost:8080")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  val feeder = Iterator.continually(Map(
    "nonce" -> UUID.randomUUID().toString,
    "timestamp" -> (System.currentTimeMillis() / 1000).toString
  ))

  val scn = scenario("Nonce Validation")
    .feed(feeder)
    .exec(http("validate_nonce")
      .post("/api/resource")
      .header("X-Nonce", "${nonce}")
      .header("X-Timestamp", "${timestamp}")
      .body(StringBody("""{"data": "test"}"""))
      .check(status.is(200)))

  setUp(
    scn.inject(
      rampUsersPerSec(1) to 100 during (1 minute),
      constantUsersPerSec(100) during (2 minutes)
    )
  ).protocols(httpProtocol)
}
```

## 6. Gradle Tasks for Common Operations

Add these to build.gradle:
```groovy
tasks {
    register('bootRunDev') {
        group = 'application'
        description = 'Runs the application in development mode'
        doFirst {
            bootRun.configure {
                systemProperty 'spring.profiles.active', 'dev'
            }
        }
        finalizedBy 'bootRun'
    }

    register('integrationTest', Test) {
        group = 'verification'
        description = 'Runs integration tests'
        useJUnitPlatform {
            includeTags 'integration'
        }
        systemProperty 'spring.profiles.active', 'test'
    }

    register('cleanRedis') {
        group = 'application'
        description = 'Cleans Redis data'
        doLast {
            exec {
                commandLine 'docker-compose', 'rm', '-f', '-s', 'redis'
            }
        }
    }
}
```

## 7. Running and Testing

### Build and Run
```bash
# Build the application
./gradlew build

# Run application
./gradlew bootRun

# Run with development profile
./gradlew bootRunDev

# Run tests
./gradlew test

# Run integration tests
./gradlew integrationTest

# Run Gatling performance tests
./gradlew gatlingRun
```

### Docker Operations
```bash
# Build and run with Docker Compose
docker-compose up --build

# Stop and remove containers
docker-compose down

# Clean Redis data
./gradlew cleanRedis
```

## 8. CI/CD Pipeline Configuration

### GitHub Actions Workflow (.github/workflows/gradle.yml)
```yaml
name: Gradle CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: gradle
          
      - name: Build with Gradle
        run: ./gradlew build
        
      - name: Run tests
        run: ./gradlew test
        
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: build/reports/tests/
          
      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: build/reports/jacoco/
```

## 9. Spotless Code Formatting

Add to build.gradle:
```groovy
spotless {
    java {
        importOrder()
        removeUnusedImports()
        googleJavaFormat()
        formatAnnotations()
    }
    groovyGradle {
        target '*.gradle'
        greclipse()
    }
}

// Run spotless before compile
tasks.withType(JavaCompile) {
    dependsOn 'spotlessApply'
}
```

## 10. Best Practices

1. **Gradle Best Practices**
   - Use version catalogs for dependency management
   - Configure common repositories in settings.gradle
   - Use appropriate task ordering and dependencies
   - Enable parallel execution when possible

2. **Testing Best Practices**
   - Separate unit and integration tests
   - Use TestContainers for integration tests
   - Configure test logging appropriately
   - Enable test caching

3. **Performance**
   - Configure appropriate Gradle daemon settings
   - Use build cache
   - Enable parallel test execution
   - Configure appropriate JVM options
