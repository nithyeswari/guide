# Spring Boot Testing Guide

## Table of Contents
- [Introduction](#introduction)
- [Testing Pyramid](#testing-pyramid)
- [Unit Testing](#unit-testing)
  - [Service Layer Testing](#service-layer-testing)
  - [Repository Layer Testing](#repository-layer-testing)
  - [Utility Class Testing](#utility-class-testing)
- [Integration Testing](#integration-testing)
  - [Database Integration Tests](#database-integration-tests)
  - [REST API Integration Tests](#rest-api-integration-tests)
  - [Messaging Integration Tests](#messaging-integration-tests)
- [End-to-End Testing](#end-to-end-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [Best Practices](#best-practices)
- [Testing Libraries and Tools](#testing-libraries-and-tools)
- [Sample Test Cases](#sample-test-cases)

## Introduction

This README provides a comprehensive guide for testing Spring Boot applications. Testing is a critical part of the software development lifecycle that ensures your application works as expected and maintains quality over time.

## Testing Pyramid

The testing pyramid is a concept that guides the distribution of tests in your application:

- **Unit Tests**: Form the base of the pyramid - numerous, fast, and focused tests
- **Integration Tests**: Middle layer - fewer tests that verify components work together
- **End-to-End Tests**: Top layer - fewer still, testing complete functionality

Aim for approximately 70% unit tests, 20% integration tests, and 10% end-to-end tests.

## Unit Testing

Unit tests focus on testing individual components in isolation.

### Service Layer Testing

```java
@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    public void testGetUserById() {
        // Arrange
        User expectedUser = new User(1L, "test@example.com", "Test User");
        when(userRepository.findById(1L)).thenReturn(Optional.of(expectedUser));
        
        // Act
        User result = userService.getUserById(1L);
        
        // Assert
        assertEquals(expectedUser, result);
        verify(userRepository, times(1)).findById(1L);
    }
    
    @Test
    public void testGetUserById_NotFound() {
        // Arrange
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(UserNotFoundException.class, () -> {
            userService.getUserById(1L);
        });
    }
}
```

### Repository Layer Testing

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;
    
    @Test
    public void testFindByEmail() {
        // Arrange
        User user = new User(null, "test@example.com", "Test User");
        userRepository.save(user);
        
        // Act
        User found = userRepository.findByEmail("test@example.com").orElse(null);
        
        // Assert
        assertNotNull(found);
        assertEquals("test@example.com", found.getEmail());
    }
}
```

### Utility Class Testing

```java
public class StringUtilsTest {

    @Test
    public void testCapitalize() {
        assertEquals("Hello", StringUtils.capitalize("hello"));
        assertEquals("Hello", StringUtils.capitalize("Hello"));
        assertEquals("", StringUtils.capitalize(""));
        assertNull(StringUtils.capitalize(null));
    }
}
```

## Integration Testing

Integration tests verify that different components work together correctly.

### Database Integration Tests

```java
@SpringBootTest
public class UserServiceIntegrationTest {

    @Autowired
    private UserService userService;
    
    @Autowired
    private UserRepository userRepository;
    
    @BeforeEach
    public void setup() {
        userRepository.deleteAll();
    }
    
    @Test
    public void testCreateAndRetrieveUser() {
        // Create user
        UserDTO userDTO = new UserDTO("test@example.com", "Test User");
        User created = userService.createUser(userDTO);
        
        // Retrieve user
        User retrieved = userService.getUserById(created.getId());
        
        // Assert
        assertNotNull(retrieved);
        assertEquals("test@example.com", retrieved.getEmail());
        assertEquals("Test User", retrieved.getName());
    }
}
```

### REST API Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class UserControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private UserRepository userRepository;
    
    @BeforeEach
    public void setup() {
        userRepository.deleteAll();
    }
    
    @Test
    public void testGetUser() {
        // Arrange
        User user = new User(null, "test@example.com", "Test User");
        User savedUser = userRepository.save(user);
        
        // Act
        ResponseEntity<User> response = restTemplate.getForEntity(
                "/api/users/{id}", User.class, savedUser.getId());
        
        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(savedUser.getId(), response.getBody().getId());
        assertEquals(savedUser.getEmail(), response.getBody().getEmail());
    }
    
    @Test
    public void testCreateUser() {
        // Arrange
        UserDTO userDTO = new UserDTO("test@example.com", "Test User");
        
        // Act
        ResponseEntity<User> response = restTemplate.postForEntity(
                "/api/users", userDTO, User.class);
        
        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody().getId());
        assertEquals(userDTO.getEmail(), response.getBody().getEmail());
    }
}
```

### Messaging Integration Tests

```java
@SpringBootTest
public class MessageProcessorIntegrationTest {

    @Autowired
    private MessageSender messageSender;
    
    @Autowired
    private MessageRepository messageRepository;
    
    @Test
    public void testMessageProcessing() throws InterruptedException {
        // Arrange
        String content = "Test message";
        
        // Act
        messageSender.send(content);
        
        // Allow time for message processing
        Thread.sleep(1000);
        
        // Assert
        Message processed = messageRepository.findByContent(content);
        assertNotNull(processed);
        assertTrue(processed.isProcessed());
    }
}
```

## End-to-End Testing

End-to-end tests validate the entire application workflow.

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class UserWorkflowE2ETest {

    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    public void testCompleteUserWorkflow() {
        // Create user
        UserDTO userDTO = new UserDTO("e2e@example.com", "E2E User");
        ResponseEntity<User> createResponse = restTemplate.postForEntity(
                "/api/users", userDTO, User.class);
        assertEquals(HttpStatus.CREATED, createResponse.getStatusCode());
        Long userId = createResponse.getBody().getId();
        
        // Get user
        ResponseEntity<User> getResponse = restTemplate.getForEntity(
                "/api/users/{id}", User.class, userId);
        assertEquals(HttpStatus.OK, getResponse.getStatusCode());
        
        // Update user
        User user = getResponse.getBody();
        user.setName("Updated E2E User");
        restTemplate.put("/api/users/{id}", user, userId);
        
        // Verify update
        ResponseEntity<User> updatedResponse = restTemplate.getForEntity(
                "/api/users/{id}", User.class, userId);
        assertEquals("Updated E2E User", updatedResponse.getBody().getName());
        
        // Delete user
        restTemplate.delete("/api/users/{id}", userId);
        
        // Verify deletion
        ResponseEntity<User> deletedResponse = restTemplate.getForEntity(
                "/api/users/{id}", User.class, userId);
        assertEquals(HttpStatus.NOT_FOUND, deletedResponse.getStatusCode());
    }
}
```

## Performance Testing

Performance tests ensure your application meets performance requirements.

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class UserControllerPerformanceTest {

    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    public void testUserListingPerformance() {
        // Setup test data
        // ...
        
        long startTime = System.currentTimeMillis();
        
        // Act
        ResponseEntity<List<User>> response = restTemplate.exchange(
                "/api/users", HttpMethod.GET, null,
                new ParameterizedTypeReference<List<User>>() {});
        
        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        
        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(duration < 500, "Request took too long: " + duration + "ms");
    }
}
```

## Security Testing

Security tests verify that your application is protected against common vulnerabilities.

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class SecurityIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    public void testUnauthorizedAccess() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                "/api/admin/users", String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }
    
    @Test
    public void testAuthorizedAccess() {
        // Setup authentication
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth("admin", "password");
        HttpEntity<String> entity = new HttpEntity<>(null, headers);
        
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/admin/users", HttpMethod.GET, entity, String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }
}
```

## Best Practices

1. **Test Independence**: Each test should run independently and not depend on other tests.
2. **Arrange-Act-Assert**: Follow this pattern to make tests clear and consistent.
3. **Clean Up**: Always clean up resources after tests, especially in integration tests.
4. **Test Naming**: Use descriptive names that explain what the test is verifying.
5. **Mock External Dependencies**: Use mocks for external services to isolate your tests.
6. **Test Coverage**: Aim for high test coverage, especially for critical business logic.
7. **Continuous Integration**: Run tests automatically in your CI pipeline.
8. **Profile Specific Tests**: Use Spring profiles to configure test environments.
9. **Parameterized Tests**: Use JUnit's parameterized tests for testing multiple scenarios.
10. **Test Data Management**: Use test data builders or factories for consistent test data.

## Testing Libraries and Tools

- **JUnit 5**: The foundation for Java testing
- **Mockito**: For mocking dependencies
- **AssertJ**: For fluent assertions
- **Hamcrest**: For matcher-based assertions
- **Spring Test**: Spring's testing support
- **H2**: In-memory database for tests
- **Testcontainers**: For testing with containerized dependencies
- **WireMock**: For mocking HTTP-based APIs
- **Awaitility**: For testing asynchronous code
- **JaCoCo**: For test coverage reporting
- **Selenium**: For UI testing
- **RestAssured**: For testing REST APIs
- **Apache JMeter**: For performance testing
- **Gatling**: For load testing
- **OWASP ZAP**: For security testing

## Sample Test Cases

### Unit Test for Controller

```java
@ExtendWith(MockitoExtension.class)
public class UserControllerTest {

    @Mock
    private UserService userService;
    
    @InjectMocks
    private UserController userController;
    
    private MockMvc mockMvc;
    
    @BeforeEach
    public void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(userController).build();
    }
    
    @Test
    public void testGetUser() throws Exception {
        // Arrange
        User user = new User(1L, "test@example.com", "Test User");
        when(userService.getUserById(1L)).thenReturn(user);
        
        // Act & Assert
        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }
}
```

### Sliced Test for Web Layer

```java
@WebMvcTest(UserController.class)
public class UserControllerSliceTest {

    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private UserService userService;
    
    @Test
    public void testGetUser() throws Exception {
        // Arrange
        User user = new User(1L, "test@example.com", "Test User");
        when(userService.getUserById(1L)).thenReturn(user);
        
        // Act & Assert
        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }
}
```

### Parameterized Test

```java
public class CalculatorTest {

    @ParameterizedTest
    @CsvSource({
        "1, 1, 2",
        "5, 3, 8",
        "10, -5, 5",
        "0, 0, 0"
    })
    public void testAdd(int a, int b, int expected) {
        assertEquals(expected, Calculator.add(a, b));
    }
}
```

### Custom Test Annotations

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public @interface IntegrationTest {
}

// Usage
@IntegrationTest
public class UserIntegrationTest {
    // Test methods
}
```

### Testing with Testcontainers

```java
@SpringBootTest
@Testcontainers
public class PostgresIntegrationTest {

    @Container
    public static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:14")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");
    
    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    public void testSaveUser() {
        User user = new User(null, "test@example.com", "Test User");
        User saved = userRepository.save(user);
        assertNotNull(saved.getId());
    }
}
```

### Testing Scheduled Tasks

```java
@SpringBootTest
public class ScheduledTasksTest {

    @SpyBean
    private TaskScheduler taskScheduler;
    
    @Test
    public void testScheduledTask() {
        verify(taskScheduler, timeout(2000).atLeastOnce())
                .schedule(any(Runnable.class), any(Trigger.class));
    }
}
```

### Testing Exception Handling

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class ExceptionHandlingTest {

    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    public void testGlobalExceptionHandler() {
        ResponseEntity<ErrorResponse> response = restTemplate.getForEntity(
                "/api/users/999", ErrorResponse.class);
        
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("User not found with id: 999", response.getBody().getMessage());
    }
}
```