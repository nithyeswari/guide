# Quarkus vs Spring Boot — Complete Engineering Reference

A comprehensive engineering reference covering every layer of Quarkus and Spring Boot — architecture internals, request pipelines, dependency injection, data access, security, messaging, observability, cross-cutting concerns, testing, native compilation, migration paths, and industry adoption — with side-by-side code comparisons at every level.

---

## Table of Contents

- [1. Architecture Overview — Internal Pipelines](#1-architecture-overview--internal-pipelines)
- [2. Bootstrap & Startup Internals](#2-bootstrap--startup-internals)
- [3. Dependency Injection Deep Dive — CDI ArC vs Spring DI](#3-dependency-injection-deep-dive--cdi-arc-vs-spring-di)
- [4. Web Layer — REST API Internals](#4-web-layer--rest-api-internals)
- [5. Header Propagation — The Hard Problem](#5-header-propagation--the-hard-problem)
- [6. Data Access Layer — Panache vs Spring Data](#6-data-access-layer--panache-vs-spring-data)
- [7. Configuration System Internals](#7-configuration-system-internals)
- [8. Security Architecture](#8-security-architecture)
- [9. Cross-Cutting Concerns — Interceptors, AOP, Filters](#9-cross-cutting-concerns--interceptors-aop-filters)
- [10. Messaging & Event-Driven Architecture](#10-messaging--event-driven-architecture)
- [11. Caching Layer](#11-caching-layer)
- [12. Health Checks, Metrics & Observability](#12-health-checks-metrics--observability)
- [13. Testing — Every Layer Compared](#13-testing--every-layer-compared)
- [14. Native Compilation — GraalVM Internals](#14-native-compilation--graalvm-internals)
- [15. Developer Experience & Tooling](#15-developer-experience--tooling)
- [16. Performance Benchmarks & Resource Usage](#16-performance-benchmarks--resource-usage)
- [17. Anti-Patterns — Both Frameworks](#17-anti-patterns--both-frameworks)
- [18. Migration Path — Quarkus to Spring Boot](#18-migration-path--quarkus-to-spring-boot)
- [19. Migration Path — Spring Boot to Quarkus](#19-migration-path--spring-boot-to-quarkus)
- [20. Industry Adoption & Case Studies](#20-industry-adoption--case-studies)
- [21. Decision Framework — When to Use What](#21-decision-framework--when-to-use-what)
- [22. Practical Recipes — Quick-Start Patterns](#22-practical-recipes--quick-start-patterns)
- [23. References & Further Reading](#23-references--further-reading)

---

## 1. Architecture Overview — Internal Pipelines

### 1.1 Quarkus RESTEasy Reactive — Full Request Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        QUARKUS RESTEasy Reactive Pipeline                    │
│                                                                              │
│  HTTP Request                                                                │
│      │                                                                       │
│      ▼                                                                       │
│  ┌─────────────────────┐                                                     │
│  │   Vert.x HTTP       │  ◄── HttpServerRequest available here               │
│  │   Server Layer       │      (io.vertx.core.http.HttpServerRequest)        │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  Security Layer      │  ◄── HttpAuthMechanism / SecurityAugmentor         │
│  │  (Pre-JAX-RS)        │      ❌ NO JAX-RS context — incomingHeaders EMPTY  │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  CDI Layer           │  ◄── @Interceptor / @AroundInvoke                  │
│  │  (Arc Container)     │      ❌ NO HeaderContainer — incomingHeaders EMPTY │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────────────────────────────────────┐                     │
│  │  RESTEasy Reactive Processing Begins                 │                    │
│  │  ┌───────────────────────────────────────────┐       │                    │
│  │  │  HeaderCapturingServerFilter (internal)    │       │                    │
│  │  │  ► Populates HeaderContainer               │       │                    │
│  │  │  ► This is the SOLE source of              │       │                    │
│  │  │    incomingHeaders in ClientHeadersFactory │       │                    │
│  │  └───────────────────┬───────────────────────┘       │                    │
│  │                      │                                │                    │
│  │                      ▼                                │                    │
│  │  ┌───────────────────────────────────────────┐       │                    │
│  │  │  ContainerRequestFilter(s)                 │       │                    │
│  │  │  (@NameBinding filters run here)           │       │                    │
│  │  │  ✅ Full HTTP context available            │       │                    │
│  │  │  ✅ ContainerRequestContext.getHeaders()   │       │                    │
│  │  └───────────────────┬───────────────────────┘       │                    │
│  │                      │                                │                    │
│  │                      ▼                                │                    │
│  │  ┌───────────────────────────────────────────┐       │                    │
│  │  │  JAX-RS Resource Method                    │       │                    │
│  │  │  ✅ incomingHeaders POPULATED              │       │                    │
│  │  │  ✅ @Context HttpHeaders works             │       │                    │
│  │  └───────────────────────────────────────────┘       │                    │
│  └─────────────────────────────────────────────────────┘                     │
│                                                                              │
│  Outbound REST Client Call:                                                  │
│  ┌─────────────────────────────────────────────────────┐                     │
│  │  ClientHeadersFactory.update()                       │                    │
│  │  ► incomingHeaders = HeaderContainer contents        │                    │
│  │  ► EMPTY if called outside JAX-RS pipeline           │                    │
│  │  ► Use Vert.x HttpServerRequest inject instead       │                    │
│  └─────────────────────────────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

> **Root Cause:** The `HeaderCapturingServerFilter` (internal Quarkus class) only runs once RESTEasy Reactive processing begins. The `HeaderContainer` it populates is the **sole source** of `incomingHeaders` in `ClientHeadersFactory`. Anything outside the JAX-RS pipeline — CDI interceptors, security augmentors, schedulers — finds it **empty**.

### 1.2 Spring Boot MVC — Full Request Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        SPRING BOOT MVC Pipeline                              │
│                                                                              │
│  HTTP Request                                                                │
│      │                                                                       │
│      ▼                                                                       │
│  ┌─────────────────────┐                                                     │
│  │  Embedded Tomcat /   │  ◄── Servlet container                             │
│  │  Jetty / Undertow    │      Thread-per-request model                      │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  Servlet Filter      │  ◄── OncePerRequestFilter, CorsFilter              │
│  │  Chain               │      Spring Security FilterChainProxy here         │
│  │  (ordered by @Order) │      ✅ Full HttpServletRequest available          │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  DispatcherServlet   │  ◄── Front controller pattern                      │
│  │  (single entry point)│      HandlerMapping → HandlerAdapter               │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  HandlerInterceptor  │  ◄── preHandle() / postHandle() / afterCompletion  │
│  │  Chain               │      ✅ HttpServletRequest & Response available     │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  AOP Proxy Layer     │  ◄── @Aspect / @Around / @Before / @After          │
│  │  (CGLIB / JDK proxy) │      ✅ Method args, return value accessible       │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  @Controller /       │  ◄── Handler method execution                      │
│  │  @RestController     │      ✅ ThreadLocal context preserved              │
│  │  method              │      ✅ RequestContextHolder works                 │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  RestTemplate /      │  ◄── ClientHttpRequestInterceptor                  │
│  │  WebClient /         │      RequestInterceptor (Feign)                    │
│  │  FeignClient         │      ✅ ThreadLocal context still available        │
│  └─────────────────────┘                                                     │
│                                                                              │
│  Context Model: ThreadLocal (same thread entire request lifecycle)            │
│  ✅ Simple, implicit propagation                                             │
│  ❌ Breaks on @Async, CompletableFuture, reactive boundaries                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Spring Boot WebFlux — Full Request Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        SPRING BOOT WEBFLUX Pipeline                          │
│                                                                              │
│  HTTP Request                                                                │
│      │                                                                       │
│      ▼                                                                       │
│  ┌─────────────────────┐                                                     │
│  │  Reactor Netty       │  ◄── Non-blocking I/O, event loop                  │
│  │  (or Jetty reactive) │      Small thread pool (CPU cores × 2)             │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  WebFilter Chain     │  ◄── Reactive equivalent of Servlet Filter         │
│  │  (ordered)           │      SecurityWebFilterChain for Spring Security    │
│  │                      │      ✅ ServerWebExchange available                │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  HandlerMapping      │  ◄── RouterFunction or @Controller annotation      │
│  │                      │      mapping                                       │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  HandlerFilterFunc   │  ◄── Functional filter (like HandlerInterceptor)   │
│  │  (optional)          │      Works with RouterFunction style               │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  @Controller method  │  ◄── Returns Mono<T> or Flux<T>                    │
│  │  (reactive)          │      ❌ ThreadLocal NOT available                  │
│  │                      │      ✅ Reactor Context via contextWrite()         │
│  └─────────┬───────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │  WebClient           │  ◄── ExchangeFilterFunction                        │
│  │  (reactive HTTP)     │      ✅ deferContextual() reads Reactor Context    │
│  └─────────────────────┘                                                     │
│                                                                              │
│  Context Model: Reactor Context (explicit, subscriber-driven)                │
│  ✅ Async-safe, no thread-affinity issues                                    │
│  ❌ Verbose, must explicitly propagate via contextWrite/deferContextual      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Side-by-Side Architecture Comparison

```
┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────────┐
│  Spring Boot MVC     │  │  Spring Boot WebFlux │  │  Quarkus RESTEasy        │
│  (Blocking)          │  │  (Reactive)          │  │  Reactive                │
├─────────────────────┤  ├─────────────────────┤  ├──────────────────────────┤
│                      │  │                      │  │                          │
│  Tomcat/Jetty        │  │  Reactor Netty       │  │  Vert.x HTTP Server      │
│      │               │  │      │               │  │      │                   │
│      ▼               │  │      ▼               │  │      ▼                   │
│  Servlet Filter      │  │  WebFilter           │  │  Vert.x Handler          │
│  Chain               │  │  Chain               │  │      │                   │
│      │               │  │      │               │  │      ▼                   │
│      ▼               │  │      ▼               │  │  Security Layer          │
│  HandlerInterceptor  │  │  HandlerFilter       │  │  (pre-JAX-RS)            │
│      │               │  │  Function            │  │      │                   │
│      ▼               │  │      │               │  │      ▼                   │
│  @Controller         │  │      ▼               │  │  CDI Interceptors        │
│  method              │  │  @Controller         │  │      │                   │
│      │               │  │  (reactive)          │  │      ▼                   │
│      ▼               │  │      │               │  │  ContainerRequestFilter  │
│  RestTemplate /      │  │      ▼               │  │      │                   │
│  WebClient           │  │  WebClient           │  │      ▼                   │
│                      │  │                      │  │  JAX-RS Resource         │
│ ─────────────────── │  │ ─────────────────── │  │      │                   │
│ Context: ThreadLocal │  │ Context: Reactor     │  │      ▼                   │
│ ✅ Always available  │  │ Context (explicit)   │  │  MicroProfile REST       │
│ ❌ Breaks on @Async  │  │ ✅ Async-safe        │  │  Client                  │
│                      │  │ ❌ Verbose            │  │                          │
│                      │  │                      │  │ Context: @RequestScoped  │
│                      │  │                      │  │ + Vert.x inject          │
│                      │  │                      │  │ ✅ Async-safe with       │
│                      │  │                      │  │   ReactiveClientHeaders  │
│                      │  │                      │  │ ❌ incomingHeaders trap   │
└─────────────────────┘  └─────────────────────┘  └──────────────────────────┘
```

### 1.5 Layered Architecture — Internal Component Map

| Layer | Quarkus | Spring Boot | Key Difference |
|---|---|---|---|
| **HTTP Server** | Vert.x (Netty-based) | Tomcat (default) / Jetty / Undertow / Reactor Netty | Vert.x is always non-blocking; Tomcat is thread-per-request |
| **Routing** | RESTEasy Reactive route table (build-time generated) | DispatcherServlet HandlerMapping (runtime resolved) | Quarkus pre-computes routes at build time |
| **Filter/Interceptor** | ContainerRequestFilter (JAX-RS) + CDI @Interceptor | Servlet Filter + HandlerInterceptor + @Aspect AOP | Different interception points and capabilities |
| **DI Container** | ArC (build-time CDI subset) | Spring IoC (runtime reflection-based) | ArC resolves beans at build time |
| **ORM** | Hibernate ORM + Panache (active record / repository) | Spring Data JPA (repository pattern) | Panache offers active-record style |
| **REST Client** | MicroProfile REST Client + ClientHeadersFactory | RestTemplate / WebClient / OpenFeign | MP REST Client is type-safe interface |
| **Security** | Quarkus Security (Vert.x-based) | Spring Security (FilterChainProxy) | Spring Security is more mature/flexible |
| **Config** | MicroProfile Config + SmallRye | Spring Environment + PropertySource | Both support profiles; Quarkus build-time config |
| **Messaging** | SmallRye Reactive Messaging | Spring Kafka / Spring AMQP / Spring Cloud Stream | SmallRye is annotation-driven reactive |
| **Scheduling** | `@Scheduled` (Quarkus) / Quartz | `@Scheduled` (Spring) / Quartz | Nearly identical API |
| **Health** | MicroProfile Health | Spring Boot Actuator | Actuator is richer out of the box |
| **Metrics** | Micrometer (via quarkus-micrometer) | Micrometer (native integration) | Same library, different auto-config |
| **Caching** | `@CacheResult` (MicroProfile / quarkus-cache) | `@Cacheable` (Spring Cache) | Similar annotation-driven API |
| **Validation** | Hibernate Validator (Bean Validation) | Hibernate Validator (Bean Validation) | Identical — same library |
| **Serialization** | Jackson / JSON-B | Jackson (default) / Gson | Both default to Jackson in practice |

---

## 2. Bootstrap & Startup Internals

### 2.1 Quarkus Build-Time Philosophy

```
┌──────────────────────────────────────────────────────────────────────┐
│                    BUILD TIME (Maven/Gradle)                         │
│                                                                      │
│  1. Extension processors scan annotations (@BuildStep)               │
│  2. CDI bean discovery and validation (ArC)                          │
│  3. REST endpoint route generation (pre-built route table)           │
│  4. Configuration defaults resolution                                │
│  5. Bytecode generation for proxies and interceptors                │
│  6. Dead code elimination (unused beans removed)                     │
│  7. GraalVM native image metadata generation                        │
│  8. Static init recorder playback methods generated                  │
│                                                                      │
│  Result: Pre-computed application metadata, minimal runtime work     │
├──────────────────────────────────────────────────────────────────────┤
│                    RUNTIME (Application Start)                       │
│                                                                      │
│  1. Read runtime config (application.properties)                    │
│  2. Instantiate pre-resolved beans (no classpath scanning)           │
│  3. Start Vert.x event loop                                         │
│  4. Register pre-built routes                                        │
│  5. READY (~0.5-1s JVM, ~20ms native)                               │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Spring Boot Runtime Philosophy

```
┌──────────────────────────────────────────────────────────────────────┐
│                    BUILD TIME (Maven/Gradle)                         │
│                                                                      │
│  1. Compile Java sources                                             │
│  2. Package into executable JAR (fat JAR)                            │
│  3. AOT processing (Spring 6+ optional, for native)                 │
│  4. No bean resolution, no route generation                          │
│                                                                      │
│  Result: Fat JAR with embedded server + all dependencies             │
├──────────────────────────────────────────────────────────────────────┤
│                    RUNTIME (Application Start)                       │
│                                                                      │
│  1. JarLauncher unpacks nested JARs                                  │
│  2. SpringApplication.run() begins                                   │
│  3. Environment preparation (profiles, property sources)             │
│  4. ApplicationContext creation                                      │
│  5. @ComponentScan — classpath scanning via reflection               │
│  6. @Conditional evaluation (100+ auto-configurations)               │
│  7. BeanDefinition registration                                      │
│  8. Bean instantiation + dependency injection                        │
│  9. CGLIB proxy generation for @Configuration, AOP                  │
│  10. SmartLifecycle.start() callbacks                                │
│  11. Embedded server start (Tomcat/Jetty/Undertow)                  │
│  12. READY (~2-5s typical, ~10-30s large apps)                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.3 Startup Comparison — What Happens When

| Phase | Quarkus (Build) | Quarkus (Runtime) | Spring Boot (Runtime) |
|---|---|---|---|
| Classpath scanning | ✅ Build time | ❌ Skip | ✅ Runtime |
| Bean discovery | ✅ Build time | ❌ Skip | ✅ Runtime |
| Proxy generation | ✅ Build time (bytecode) | ❌ Skip | ✅ Runtime (CGLIB) |
| Condition evaluation | ✅ Build time | ❌ Skip | ✅ Runtime (@Conditional) |
| Route generation | ✅ Build time | ❌ Skip | ✅ Runtime (HandlerMapping) |
| Config resolution | ✅ Build time defaults | ✅ Runtime overrides | ✅ Runtime (all) |
| Native metadata | ✅ Build time | N/A | ✅ AOT (Spring 6+) |

### 2.4 Project Bootstrap Commands

```bash
# Quarkus — generate project
mvn io.quarkus.platform:quarkus-maven-plugin:3.17.0:create \
    -DprojectGroupId=com.example \
    -DprojectArtifactId=my-service \
    -Dextensions="rest,rest-client-reactive,hibernate-orm-panache,jdbc-postgresql,smallrye-health,micrometer-registry-prometheus,opentelemetry"

# Or use the Quarkus CLI
quarkus create app com.example:my-service \
    --extension=rest,rest-client-reactive,hibernate-orm-panache

# Spring Boot — generate project
# Via start.spring.io or Spring CLI
spring init --dependencies=web,data-jpa,postgresql,actuator,cloud-openfeign \
    --groupId=com.example --artifactId=my-service my-service

# Or use Spring Initializr REST API
curl https://start.spring.io/starter.zip \
    -d dependencies=web,data-jpa,postgresql,actuator \
    -d groupId=com.example -d artifactId=my-service -o my-service.zip
```

### 2.5 Project Structure Comparison

```
Quarkus Project:                          Spring Boot Project:
─────────────────                         ─────────────────────
my-service/                               my-service/
├── src/main/java/                        ├── src/main/java/
│   └── com/example/                      │   └── com/example/
│       ├── resource/                     │       ├── controller/
│       │   └── OrderResource.java        │       │   └── OrderController.java
│       ├── service/                      │       ├── service/
│       │   └── OrderService.java         │       │   └── OrderService.java
│       ├── repository/                   │       ├── repository/
│       │   └── OrderRepository.java      │       │   └── OrderRepository.java
│       ├── entity/                       │       ├── entity/
│       │   └── Order.java                │       │   └── Order.java
│       ├── client/                       │       ├── client/
│       │   └── PaymentClient.java        │       │   └── PaymentClient.java
│       └── filter/                       │       ├── config/
│           └── HeaderCaptureFilter.java  │       │   └── WebConfig.java
├── src/main/resources/                   │       └── filter/
│   ├── application.properties            │           └── HeaderFilter.java
│   └── META-INF/resources/              ├── src/main/resources/
│       └── index.html                    │   ├── application.yml
├── src/test/java/                        │   ├── application-dev.yml
│   └── com/example/                      │   └── static/
│       └── resource/                     ├── src/test/java/
│           └── OrderResourceTest.java    │   └── com/example/
└── pom.xml                               │       └── controller/
                                          │           └── OrderControllerTest.java
                                          └── pom.xml
```

### 2.6 Main Class Comparison

```java
// === QUARKUS ===
// No main class needed! Quarkus generates it at build time.
// Optional: custom main for CLI apps
@QuarkusMain
public class Application implements QuarkusApplication {
    @Override
    public int run(String... args) {
        Quarkus.waitForExit();
        return 0;
    }
}

// === SPRING BOOT ===
// Main class is required — bootstraps the entire context
@SpringBootApplication  // = @Configuration + @EnableAutoConfiguration + @ComponentScan
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

---

## 3. Dependency Injection Deep Dive — CDI ArC vs Spring DI

### 3.1 Container Internals

```
Quarkus ArC Container:
┌──────────────────────────────────────────────────────────────────┐
│  BUILD TIME                                                       │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  BeanDiscovery → reads @ApplicationScoped, @Inject   │        │
│  │  InterceptorRegistration → @Interceptor + @Priority  │        │
│  │  BeanValidation → circular dependency = BUILD ERROR  │        │
│  │  ProxyGeneration → bytecode (no CGLIB, no reflection)│        │
│  │  Dead code removal → unused beans eliminated         │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                   │
│  RUNTIME                                                          │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  Instantiate pre-resolved beans                       │        │
│  │  Wire pre-computed injection points                   │        │
│  │  NO reflection, NO classpath scanning                 │        │
│  └──────────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────┘

Spring IoC Container:
┌──────────────────────────────────────────────────────────────────┐
│  RUNTIME (all at startup)                                         │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  ClassPathScanningCandidateComponentProvider           │        │
│  │  → scans all packages for @Component, @Service, etc.  │        │
│  │                                                        │        │
│  │  ConfigurationClassPostProcessor                       │        │
│  │  → processes @Configuration, @Bean, @Import            │        │
│  │  → evaluates @Conditional annotations                  │        │
│  │                                                        │        │
│  │  AutowiredAnnotationBeanPostProcessor                  │        │
│  │  → resolves @Autowired injection points                │        │
│  │                                                        │        │
│  │  AopAutoProxyCreator                                   │        │
│  │  → generates CGLIB/JDK proxies for AOP                 │        │
│  │                                                        │        │
│  │  SmartInitializingSingleton                             │        │
│  │  → post-initialization callbacks                       │        │
│  └──────────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Annotation Mapping — Complete Reference

| Concept | Quarkus (CDI) | Spring Boot | Notes |
|---|---|---|---|
| **Component scan** | Automatic (build-time, `beans.xml` optional) | `@ComponentScan` (runtime) | Quarkus discovers by annotation |
| **Bean declaration** | `@ApplicationScoped`, `@Singleton`, `@Dependent` | `@Component`, `@Service`, `@Repository` | CDI uses scope as declaration |
| **Config class** | No equivalent — use `@Produces` methods | `@Configuration` + `@Bean` | |
| **Producer method** | `@Produces` | `@Bean` | |
| **Injection** | `@Inject` | `@Autowired` / `@Inject` / constructor | Spring prefers constructor injection |
| **Qualifier** | `@Named`, custom `@Qualifier` | `@Qualifier`, `@Primary` | |
| **Primary bean** | `@io.quarkus.arc.DefaultBean` / `@Alternative` + `@Priority` | `@Primary` | |
| **Conditional bean** | `@IfBuildProfile`, `@UnlessBuildProfile`, `@LookupIfProperty` | `@Conditional*` (40+ variants) | Spring has far more conditions |
| **Lazy init** | Default for `@ApplicationScoped` (proxy-based) | `@Lazy` | |
| **Eager init** | `@Startup` | Default for singletons | |
| **Event system** | `@Observes`, `@ObservesAsync`, `Event<T>` | `@EventListener`, `ApplicationEventPublisher` | |
| **Lifecycle** | `@PostConstruct`, `@PreDestroy` | `@PostConstruct`, `@PreDestroy`, `InitializingBean` | |
| **Request scope** | `@RequestScoped` | `@RequestScope` | |
| **Session scope** | `@SessionScoped` | `@SessionScope` | |
| **Prototype** | `@Dependent` | `@Scope("prototype")` | |
| **Interceptor** | `@Interceptor` + `@InterceptorBinding` + `@Priority` | `@Aspect` + `@Around`/`@Before`/`@After` | |
| **Decorator** | `@Decorator` + `@Delegate` | No direct equivalent (use AOP) | CDI-specific pattern |
| **Value injection** | `@ConfigProperty` | `@Value` | |
| **Config binding** | `@ConfigMapping` | `@ConfigurationProperties` | |
| **Profile** | `@IfBuildProfile("dev")` | `@Profile("dev")` | Quarkus profiles are build-time |

### 3.3 Bean Scope Comparison — Internal Behavior

```java
// === QUARKUS CDI SCOPES ===

@ApplicationScoped  // Proxy-based lazy singleton. ArC generates a proxy at build time.
                    // The real instance is created on first method call.
                    // Thread-safe: single instance shared across all threads.
public class OrderService { }

@Singleton          // Eager singleton. NO proxy. Instantiated at startup.
                    // Slightly faster (no proxy indirection) but cannot be mocked as easily.
public class CacheWarmer { }

@RequestScoped      // New instance per HTTP request (or CDI request context).
                    // Backed by Vert.x RoutingContext in Quarkus.
                    // Destroyed when request completes.
public class RequestHeaderContext { }

@Dependent          // New instance per injection point. No proxy.
                    // Lifecycle tied to the bean that injects it.
                    // Equivalent to Spring @Scope("prototype").
public class RequestValidator { }

@SessionScoped      // New instance per HTTP session.
                    // Requires quarkus-undertow extension.
public class ShoppingCart { }


// === SPRING BOOT SCOPES ===

@Component          // Default singleton scope. Eagerly created at startup.
@Scope("singleton") // CGLIB proxy if AOP is applied.
public class OrderService { }

@Component
@Scope("prototype") // New instance per injection. Spring does NOT manage lifecycle
                    // after creation (no @PreDestroy).
public class RequestValidator { }

@Component
@RequestScope       // = @Scope(value = "request", proxyMode = ScopedProxyMode.TARGET_CLASS)
                    // Backed by ThreadLocal (Servlet) or Reactor Context (WebFlux).
public class RequestHeaderContext { }

@Component
@SessionScope       // = @Scope(value = "session", proxyMode = ScopedProxyMode.TARGET_CLASS)
public class ShoppingCart { }
```

### 3.4 Advanced DI Patterns

```java
// === QUARKUS: Programmatic lookup ===
@ApplicationScoped
public class PaymentProcessor {
    @Inject
    Instance<PaymentGateway> gateways;  // CDI Instance — lazy, iterable

    public void process(Order order) {
        PaymentGateway gw = gateways.stream()
            .filter(g -> g.supports(order.getCurrency()))
            .findFirst()
            .orElseThrow();
        gw.charge(order);
    }
}

// === SPRING: Programmatic lookup ===
@Service
public class PaymentProcessor {
    private final Map<String, PaymentGateway> gateways;

    public PaymentProcessor(List<PaymentGateway> gatewayList) {
        this.gateways = gatewayList.stream()
            .collect(Collectors.toMap(PaymentGateway::getCurrency, g -> g));
    }

    // Or use ObjectProvider for lazy resolution
    @Autowired
    private ObjectProvider<PaymentGateway> gatewayProvider;
}


// === QUARKUS: Conditional beans ===
@ApplicationScoped
@IfBuildProfile("prod")       // Only exists in prod build
public class RealPaymentGateway implements PaymentGateway { }

@ApplicationScoped
@UnlessBuildProfile("prod")   // Exists in dev/test
public class MockPaymentGateway implements PaymentGateway { }

// Runtime conditional
@ApplicationScoped
@LookupIfProperty(name = "payment.enabled", stringValue = "true")
public class PaymentService { }

// === SPRING: Conditional beans ===
@Service
@Profile("prod")
public class RealPaymentGateway implements PaymentGateway { }

@Service
@Profile("!prod")
public class MockPaymentGateway implements PaymentGateway { }

@Service
@ConditionalOnProperty(name = "payment.enabled", havingValue = "true")
public class PaymentService { }

@Service
@ConditionalOnClass(name = "com.stripe.Stripe")      // Class on classpath
@ConditionalOnBean(DataSource.class)                   // Bean exists
@ConditionalOnMissingBean(PaymentService.class)        // No existing bean
@ConditionalOnExpression("#{environment['app.mode'] == 'live'}")
public class StripePaymentService { }
```

### 3.5 Circular Dependency Handling

```
Quarkus ArC:
  ❌ STRICT — circular dependencies detected at BUILD TIME
  → Fails fast with clear error: "Circular dependency detected: A → B → A"
  → Forces clean architecture from the start
  → No workarounds (by design)

Spring Boot:
  ⚠️ LENIENT (before Spring 6) — allowed circular deps via early proxy references
  ❌ STRICT (Spring 6+ default) — circular deps cause startup failure
  → spring.main.allow-circular-references=true (opt-in for legacy)
  → @Lazy on injection point as workaround
  → ObjectProvider<T> for lazy resolution
```

---

## 4. Web Layer — REST API Internals

### 4.1 Controller/Resource Comparison

```java
// === QUARKUS — JAX-RS Resource ===
@Path("/api/orders")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OrderResource {

    @Inject
    OrderService orderService;

    @GET
    public List<OrderDto> getAll(
            @QueryParam("status") String status,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        return orderService.findAll(status, page, size);
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        return orderService.findById(id)
            .map(o -> Response.ok(o).build())
            .orElse(Response.status(Status.NOT_FOUND).build());
    }

    @POST
    @Transactional
    public Response create(@Valid CreateOrderRequest request,
                           @Context UriInfo uriInfo) {
        OrderDto created = orderService.create(request);
        URI location = uriInfo.getAbsolutePathBuilder()
            .path(String.valueOf(created.getId())).build();
        return Response.created(location).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public OrderDto update(@PathParam("id") Long id,
                           @Valid UpdateOrderRequest request) {
        return orderService.update(id, request);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        orderService.delete(id);
        return Response.noContent().build();
    }

    // Reactive endpoint returning Uni
    @GET
    @Path("/async/{id}")
    public Uni<OrderDto> getByIdAsync(@PathParam("id") Long id) {
        return orderService.findByIdAsync(id);
    }

    // Server-Sent Events with Multi
    @GET
    @Path("/stream")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    public Multi<OrderEvent> streamOrders() {
        return orderService.streamEvents();
    }
}


// === SPRING BOOT — REST Controller ===
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {  // Constructor injection
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<List<OrderDto>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(orderService.findAll(status, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderDto> getById(@PathVariable Long id) {
        return orderService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<OrderDto> create(
            @Valid @RequestBody CreateOrderRequest request,
            UriComponentsBuilder uriBuilder) {
        OrderDto created = orderService.create(request);
        URI location = uriBuilder.path("/api/orders/{id}")
            .buildAndExpand(created.getId()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @Transactional
    public OrderDto update(@PathVariable Long id,
                           @Valid @RequestBody UpdateOrderRequest request) {
        return orderService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        orderService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Reactive with WebFlux
    @GetMapping("/async/{id}")
    public Mono<OrderDto> getByIdAsync(@PathVariable Long id) {
        return orderService.findByIdAsync(id);
    }

    // Server-Sent Events
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<OrderEvent> streamOrders() {
        return orderService.streamEvents();
    }
}
```

### 4.2 Request/Response Annotation Mapping

| Concept | Quarkus (JAX-RS) | Spring Boot | Notes |
|---|---|---|---|
| **Path** | `@Path("/api")` | `@RequestMapping("/api")` | |
| **GET** | `@GET` | `@GetMapping` | |
| **POST** | `@POST` | `@PostMapping` | |
| **PUT** | `@PUT` | `@PutMapping` | |
| **DELETE** | `@DELETE` | `@DeleteMapping` | |
| **PATCH** | `@PATCH` | `@PatchMapping` | |
| **Path param** | `@PathParam("id")` | `@PathVariable("id")` | |
| **Query param** | `@QueryParam("q")` | `@RequestParam("q")` | |
| **Header** | `@HeaderParam("X-Token")` | `@RequestHeader("X-Token")` | |
| **Cookie** | `@CookieParam("session")` | `@CookieValue("session")` | |
| **Request body** | Implicit (POJO parameter) | `@RequestBody` (explicit) | Quarkus auto-detects body |
| **Form param** | `@FormParam("name")` | `@RequestParam("name")` with form | |
| **Matrix param** | `@MatrixParam("color")` | No direct equivalent | |
| **Bean param** | `@BeanParam` | Implicit POJO binding | |
| **Default value** | `@DefaultValue("10")` | `defaultValue = "10"` | |
| **Content type** | `@Consumes(MediaType.APPLICATION_JSON)` | `consumes = "application/json"` | |
| **Response type** | `@Produces(MediaType.APPLICATION_JSON)` | `produces = "application/json"` | |
| **Response wrapper** | `Response` / `RestResponse<T>` | `ResponseEntity<T>` | |
| **Context injection** | `@Context UriInfo`, `@Context HttpHeaders` | Injected as method params | |
| **Validation** | `@Valid` (Bean Validation) | `@Valid` / `@Validated` | |

### 4.3 Exception Handling

```java
// === QUARKUS — ExceptionMapper ===
@Provider
public class OrderNotFoundExceptionMapper
        implements ExceptionMapper<OrderNotFoundException> {

    @Override
    public Response toResponse(OrderNotFoundException e) {
        return Response.status(Status.NOT_FOUND)
            .entity(new ErrorResponse("ORDER_NOT_FOUND", e.getMessage()))
            .build();
    }
}

// Global exception mapper for all unhandled exceptions
@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Exception> {
    private static final Logger log = Logger.getLogger(GlobalExceptionMapper.class);

    @Override
    public Response toResponse(Exception e) {
        log.error("Unhandled exception", e);

        if (e instanceof ConstraintViolationException cve) {
            List<String> violations = cve.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .toList();
            return Response.status(Status.BAD_REQUEST)
                .entity(new ErrorResponse("VALIDATION_ERROR", violations)).build();
        }

        return Response.status(Status.INTERNAL_SERVER_ERROR)
            .entity(new ErrorResponse("INTERNAL_ERROR", "Unexpected error")).build();
    }
}


// === SPRING BOOT — @ControllerAdvice ===
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(OrderNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("ORDER_NOT_FOUND", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException e) {
        List<String> errors = e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .toList();
        return ResponseEntity.badRequest()
            .body(new ErrorResponse("VALIDATION_ERROR", errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "Unexpected error"));
    }
}
```

### 4.4 REST Client Comparison

```java
// === QUARKUS — MicroProfile REST Client ===
@RegisterRestClient(configKey = "payment-api")
@RegisterClientHeaders(BridgeHeadersFactory.class)
@Path("/api/v1/payments")
public interface PaymentClient {

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    PaymentResponse charge(PaymentRequest request);

    @GET
    @Path("/{id}")
    Uni<PaymentResponse> getPaymentAsync(@PathParam("id") String id);
}

// Configuration
// application.properties
// quarkus.rest-client.payment-api.url=https://payment.example.com
// quarkus.rest-client.payment-api.connect-timeout=5000
// quarkus.rest-client.payment-api.read-timeout=10000

// Usage
@ApplicationScoped
public class OrderService {
    @Inject
    @RestClient
    PaymentClient paymentClient;

    public void processOrder(Order order) {
        PaymentResponse response = paymentClient.charge(
            new PaymentRequest(order.getAmount(), order.getCurrency()));
    }
}


// === SPRING BOOT — OpenFeign ===
@FeignClient(name = "payment-service",
             url = "${payment.api.url}",
             configuration = FeignConfig.class)
public interface PaymentClient {

    @PostMapping("/api/v1/payments")
    PaymentResponse charge(@RequestBody PaymentRequest request);

    @GetMapping("/api/v1/payments/{id}")
    PaymentResponse getPayment(@PathVariable String id);
}

// Feign configuration
@Configuration
public class FeignConfig {
    @Bean
    public RequestInterceptor headerInterceptor(RequestHeaderContext ctx) {
        return template -> {
            template.header("Authorization", ctx.getAuthorization());
            template.header("X-Correlation-ID", ctx.getCorrelationId());
        };
    }

    @Bean
    public Retryer retryer() {
        return new Retryer.Default(100, 1000, 3);
    }
}

// === SPRING BOOT — WebClient (Reactive) ===
@Configuration
public class WebClientConfig {
    @Bean
    public WebClient paymentWebClient(
            @Value("${payment.api.url}") String baseUrl) {
        return WebClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .filter(ExchangeFilterFunctions.basicAuthentication("user", "pass"))
            .filter((req, next) -> Mono.deferContextual(ctx -> {
                ClientRequest modified = ClientRequest.from(req)
                    .header("X-Correlation-ID",
                        ctx.getOrDefault("correlationId", "unknown"))
                    .build();
                return next.exchange(modified);
            }))
            .build();
    }
}

// === SPRING BOOT — RestClient (Spring 6.1+, newest approach) ===
@Configuration
public class RestClientConfig {
    @Bean
    public RestClient paymentRestClient(@Value("${payment.api.url}") String url) {
        return RestClient.builder()
            .baseUrl(url)
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .requestInterceptor((req, body, execution) -> {
                req.getHeaders().add("X-Correlation-ID", UUID.randomUUID().toString());
                return execution.execute(req, body);
            })
            .build();
    }
}
```

### 4.5 Threading Model — Deep Comparison

```
Quarkus RESTEasy Reactive:
┌──────────────────────────────────────────────────────────────────┐
│  Vert.x Event Loop Thread (small pool, e.g., 2× CPU cores)     │
│                                                                  │
│  Request A ──▶ Filter ──▶ Resource ──▶ Non-blocking I/O ──▶    │
│  Request B ──▶ Filter ──▶ Resource ──▶ Non-blocking I/O ──▶    │
│  Request C ──▶ Filter ──▶ Resource ──▶ Non-blocking I/O ──▶    │
│                                                                  │
│  @Blocking annotation → offloads to worker thread pool          │
│  @NonBlocking (default) → stays on event loop                   │
│  @RunOnVirtualThread → offloads to virtual thread (Java 21+)    │
└──────────────────────────────────────────────────────────────────┘

Spring Boot MVC:
┌──────────────────────────────────────────────────────────────────┐
│  Tomcat Thread Pool (default 200 threads)                        │
│                                                                  │
│  Thread-1: Request A ──▶ Filter ──▶ Controller ──▶ BLOCKED ──▶  │
│  Thread-2: Request B ──▶ Filter ──▶ Controller ──▶ BLOCKED ──▶  │
│  Thread-3: Request C ──▶ Filter ──▶ Controller ──▶ BLOCKED ──▶  │
│                                                                  │
│  Each request occupies a thread for its entire duration          │
│  ThreadLocal works naturally (same thread throughout)            │
│  Virtual threads (Spring 6.1+): spring.threads.virtual.enabled  │
└──────────────────────────────────────────────────────────────────┘

Spring Boot WebFlux:
┌──────────────────────────────────────────────────────────────────┐
│  Reactor Netty Event Loop (CPU cores × 2 threads)               │
│                                                                  │
│  Same threading model as Quarkus Vert.x                          │
│  Mono<T> / Flux<T> instead of Uni<T> / Multi<T>                 │
│  Reactor Context instead of CDI @RequestScoped                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Header Propagation — The Hard Problem

### 5.1 Why incomingHeaders Is Empty — Diagnosis Table

| Call Origin / Context | JAX-RS Context Active? | HeaderContainer Populated? | incomingHeaders in Factory | Fix |
|---|---|---|---|---|
| JAX-RS resource method body | Yes | Yes | Populated | None needed |
| `ContainerRequestFilter` (JAX-RS) | Yes | Yes | Populated (usually) | None needed |
| CDI `@Interceptor` (`@AroundInvoke`) | No — CDI layer | No | **Empty** | Bridge bean or Vert.x inject |
| Security augmentor / `HttpAuthMechanism` | No — Pre-JAX-RS | No | **Empty** | Vert.x inject only |
| `@Scheduled` / Quartz background job | No — No HTTP ctx | No | **Empty** | Pass headers explicitly |
| Async boundary (`Uni` / `CompletionStage`) | No — Wrong thread | No | **Empty** | `ReactiveClientHeadersFactory` + Vert.x |
| Classic RESTEasy (non-reactive) | Yes | Yes | Populated | None — works by design |

### 5.2 The Bridge Bean Pattern — Production Solution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Bridge Bean Pattern                                  │
│                                                                              │
│  ┌──────────────────────────┐       ┌──────────────────────────────────┐    │
│  │  ContainerRequestFilter  │       │  @RequestScoped                   │    │
│  │  (@Provider)             │──────▶│  RequestHeaderContext              │    │
│  │                          │ sets  │  ┌──────────────────────────────┐ │    │
│  │  ► Extracts headers from │       │  │ - correlationId: String      │ │    │
│  │    ContainerRequestCtx   │       │  │ - authorization: String      │ │    │
│  │  ► Sets MDC              │       │  │ - tenantId: String           │ │    │
│  │  ► Populates bridge bean │       │  │ - requestId: String          │ │    │
│  └──────────────────────────┘       │  └──────────────────────────────┘ │    │
│                                     └──────────────┬───────────────────┘    │
│                                                     │                        │
│                          ┌──────────────────────────┼──────────────────┐     │
│                          │                          │                  │     │
│                          ▼                          ▼                  ▼     │
│              ┌───────────────────┐   ┌──────────────────┐  ┌──────────────┐ │
│              │  CDI @Interceptor │   │ ClientHeaders     │  │ Service      │ │
│              │  (AuditInterceptor│   │ Factory           │  │ Layer        │ │
│              │   LogInterceptor) │   │ (outbound calls)  │  │ (any CDI     │ │
│              │                   │   │                    │  │  bean)       │ │
│              │  @Inject ctx ✅   │   │ @Inject ctx ✅    │  │ @Inject ✅   │ │
│              └───────────────────┘   └──────────────────┘  └──────────────┘ │
│                                                                              │
│  Key: All consumers @Inject the same @RequestScoped bean                    │
│       No direct dependency on JAX-RS context or Vert.x                      │
│       Trivially mockable in unit tests                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Solution A — Vert.x HttpServerRequest Injection (Quarkus Recommended)

```java
@ApplicationScoped
public class VertxHeadersFactory implements ClientHeadersFactory {

    @Inject
    io.vertx.core.http.HttpServerRequest vertxRequest;  // Always available

    private static final Set<String> PROPAGATE = Set.of(
        "Authorization", "X-Correlation-ID", "X-Tenant-ID", "X-Request-ID"
    );

    @Override
    public MultivaluedMap<String, String> update(
            MultivaluedMap<String, String> incomingHeaders,   // ← ignore this
            MultivaluedMap<String, String> clientOutgoingHeaders) {
        MultivaluedHashMap<String, String> result = new MultivaluedHashMap<>();
        PROPAGATE.forEach(name -> {
            String v = vertxRequest.getHeader(name);
            if (v != null) result.add(name, v);
        });
        return result;
    }
}
```

### 5.4 Solution B — @RequestScoped Bridge Bean (Most Testable)

```java
// 1. Bridge bean
@RequestScoped
public class RequestHeaderContext {
    private String correlationId = UUID.randomUUID().toString();
    private String authorization;
    private String tenantId;
    private String requestId;
    // getters / setters
}

// 2. JAX-RS filter populates the bridge
@Provider
@Priority(Priorities.HEADER_DECORATOR)
public class HeaderCaptureFilter implements ContainerRequestFilter {
    @Inject RequestHeaderContext ctx;

    @Override
    public void filter(ContainerRequestContext req) {
        String cid = req.getHeaderString("X-Correlation-ID");
        if (cid != null) ctx.setCorrelationId(cid);
        ctx.setAuthorization(req.getHeaderString("Authorization"));
        ctx.setTenantId(req.getHeaderString("X-Tenant-ID"));
        ctx.setRequestId(req.getHeaderString("X-Request-ID"));
        MDC.put("correlationId", ctx.getCorrelationId());
    }
}

// 3. ClientHeadersFactory reads from bridge
@ApplicationScoped
public class BridgeHeadersFactory implements ClientHeadersFactory {
    @Inject RequestHeaderContext ctx;
    @Inject HttpServerRequest vertxRequest; // Fallback

    @Override
    public MultivaluedMap<String, String> update(
            MultivaluedMap<String, String> incomingHeaders,
            MultivaluedMap<String, String> clientOutgoingHeaders) {
        MultivaluedHashMap<String, String> out = new MultivaluedHashMap<>();
        String auth = ctx.getAuthorization() != null
            ? ctx.getAuthorization()
            : vertxRequest.getHeader("Authorization");
        if (auth != null) out.add("Authorization", auth);
        out.add("X-Correlation-ID", ctx.getCorrelationId());
        String tenant = ctx.getTenantId();
        if (tenant != null) out.add("X-Tenant-ID", tenant);
        return out;
    }
}
```

### 5.5 Solution C — ReactiveClientHeadersFactory (Async Pipelines)

```java
@ApplicationScoped
public class AsyncHeadersFactory extends ReactiveClientHeadersFactory {
    @Inject HttpServerRequest vertxRequest;

    @Override
    public Uni<MultivaluedMap<String, String>> getHeaders(
            MultivaluedMap<String, String> incomingHeaders,
            MultivaluedMap<String, String> clientOutgoingHeaders) {
        MultivaluedHashMap<String, String> h = new MultivaluedHashMap<>();
        h.add("Authorization", vertxRequest.getHeader("Authorization"));
        h.add("X-Correlation-ID", vertxRequest.getHeader("X-Correlation-ID"));
        return Uni.createFrom().item(h);
    }
}
```

### 5.6 Spring Boot — Header Propagation Patterns

```java
// === Spring MVC — HandlerInterceptor + ClientHttpRequestInterceptor ===
@Component
public class HeaderInterceptor implements HandlerInterceptor {
    private final RequestHeaderContext ctx;

    public HeaderInterceptor(RequestHeaderContext ctx) { this.ctx = ctx; }

    @Override
    public boolean preHandle(HttpServletRequest req,
                            HttpServletResponse res, Object handler) {
        ctx.setCorrelationId(req.getHeader("X-Correlation-ID"));
        ctx.setAuthorization(req.getHeader("Authorization"));
        ctx.setTenantId(req.getHeader("X-Tenant-ID"));
        MDC.put("correlationId", ctx.getCorrelationId());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest req,
                               HttpServletResponse res, Object handler, Exception ex) {
        MDC.clear();
    }
}

// Outbound propagation for RestTemplate
@Component
public class PropagationInterceptor implements ClientHttpRequestInterceptor {
    private final RequestHeaderContext ctx;

    public PropagationInterceptor(RequestHeaderContext ctx) { this.ctx = ctx; }

    @Override
    public ClientHttpResponse intercept(HttpRequest req, byte[] body,
            ClientHttpRequestExecution exec) throws IOException {
        req.getHeaders().add("X-Correlation-ID", ctx.getCorrelationId());
        req.getHeaders().add("Authorization", ctx.getAuthorization());
        if (ctx.getTenantId() != null) {
            req.getHeaders().add("X-Tenant-ID", ctx.getTenantId());
        }
        return exec.execute(req, body);
    }
}


// === Spring WebFlux — WebFilter + Reactor Context ===
@Component
public class HeaderWebFilter implements WebFilter {
    @Override
    public Mono<Void> filter(ServerWebExchange ex, WebFilterChain chain) {
        String cid = ex.getRequest().getHeaders().getFirst("X-Correlation-ID");
        String auth = ex.getRequest().getHeaders().getFirst("Authorization");
        return chain.filter(ex)
            .contextWrite(ctx -> ctx
                .put("correlationId", cid != null ? cid : UUID.randomUUID().toString())
                .put("authorization", auth != null ? auth : ""));
    }
}

// WebClient reads from Reactor Context
@Bean
public WebClient webClient() {
    return WebClient.builder()
        .filter((req, next) -> Mono.deferContextual(ctx -> {
            ClientRequest modified = ClientRequest.from(req)
                .header("X-Correlation-ID", ctx.getOrDefault("correlationId", "unknown"))
                .header("Authorization", ctx.getOrDefault("authorization", ""))
                .build();
            return next.exchange(modified);
        }))
        .build();
}


// === Spring Cloud OpenFeign ===
@Component
public class FeignHeaderInterceptor implements RequestInterceptor {
    private final RequestHeaderContext ctx;

    public FeignHeaderInterceptor(RequestHeaderContext ctx) { this.ctx = ctx; }

    @Override
    public void apply(RequestTemplate template) {
        if (ctx.getAuthorization() != null)
            template.header("Authorization", ctx.getAuthorization());
        if (ctx.getCorrelationId() != null)
            template.header("X-Correlation-ID", ctx.getCorrelationId());
    }
}
```

### 5.7 When to Use Which Solution

| Scenario | Solution |
|---|---|
| Simple header propagation, no CDI interceptor needs | **A** — Vert.x inject |
| CDI interceptors need headers + outbound propagation + unit tests | **B** — Bridge bean |
| Reactive `Uni`/`Multi` pipelines with REST client calls | **C** — `ReactiveClientHeadersFactory` |
| Combination of all above | **B + C** — Bridge bean with reactive factory |

---

## 6. Data Access Layer — Panache vs Spring Data

### 6.1 Repository Pattern Comparison

```java
// === QUARKUS — Panache Repository Pattern ===
@ApplicationScoped
public class OrderRepository implements PanacheRepository<Order> {

    // Built-in: findById, listAll, persist, delete, count, etc.

    public List<Order> findByStatus(OrderStatus status) {
        return list("status", status);
    }

    public List<Order> findByCustomerAndStatus(Long customerId, OrderStatus status) {
        return list("customer.id = ?1 and status = ?2", customerId, status);
    }

    public List<Order> findRecentOrders(int days) {
        return list("createdAt > ?1",
            LocalDateTime.now().minusDays(days));
    }

    // Named query with Sort
    public List<Order> findByStatusSorted(OrderStatus status, Sort sort) {
        return list("status", sort, status);
    }

    // Paginated
    public List<Order> findPaginated(int page, int size) {
        return findAll(Sort.by("createdAt").descending())
            .page(Page.of(page, size))
            .list();
    }

    // Reactive with Panache
    public Uni<List<Order>> findByStatusReactive(OrderStatus status) {
        return list("status", status);
    }
}


// === QUARKUS — Panache Active Record Pattern ===
@Entity
public class Order extends PanacheEntity {

    public String orderNumber;
    public OrderStatus status;
    public BigDecimal amount;
    public LocalDateTime createdAt;

    @ManyToOne
    public Customer customer;

    // Static finder methods (Active Record style)
    public static List<Order> findByStatus(OrderStatus status) {
        return list("status", status);
    }

    public static Order findByOrderNumber(String orderNumber) {
        return find("orderNumber", orderNumber).firstResult();
    }

    public static long countByStatus(OrderStatus status) {
        return count("status", status);
    }

    public static PanacheQuery<Order> findRecentOrders(int days) {
        return find("createdAt > ?1",
            Sort.by("createdAt").descending(),
            LocalDateTime.now().minusDays(days));
    }
}

// Usage:
Order order = new Order();
order.orderNumber = "ORD-001";
order.status = OrderStatus.PENDING;
order.persist();  // Active record — entity saves itself

List<Order> pending = Order.findByStatus(OrderStatus.PENDING);
long count = Order.countByStatus(OrderStatus.SHIPPED);


// === SPRING BOOT — Spring Data JPA ===
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Method name query derivation
    List<Order> findByStatus(OrderStatus status);

    List<Order> findByCustomerIdAndStatus(Long customerId, OrderStatus status);

    List<Order> findByCreatedAtAfter(LocalDateTime date);

    Optional<Order> findByOrderNumber(String orderNumber);

    long countByStatus(OrderStatus status);

    // @Query annotation for complex queries
    @Query("SELECT o FROM Order o WHERE o.status = :status ORDER BY o.createdAt DESC")
    Page<Order> findByStatusPaginated(@Param("status") OrderStatus status,
                                       Pageable pageable);

    @Query("SELECT o FROM Order o JOIN FETCH o.customer WHERE o.id = :id")
    Optional<Order> findByIdWithCustomer(@Param("id") Long id);

    // Native query
    @Query(value = "SELECT * FROM orders WHERE amount > :amount", nativeQuery = true)
    List<Order> findExpensiveOrders(@Param("amount") BigDecimal amount);

    // Modifying query
    @Modifying
    @Query("UPDATE Order o SET o.status = :status WHERE o.id = :id")
    int updateStatus(@Param("id") Long id, @Param("status") OrderStatus status);

    // Projections
    List<OrderSummary> findSummaryByStatus(OrderStatus status);

    // Specifications for dynamic queries
    List<Order> findAll(Specification<Order> spec);
}

// Projections interface
public interface OrderSummary {
    String getOrderNumber();
    BigDecimal getAmount();
    OrderStatus getStatus();
}
```

### 6.2 Entity Mapping Comparison

```java
// === QUARKUS — Panache Entity ===
@Entity
@Table(name = "orders")
@Cacheable  // Second-level cache
public class Order extends PanacheEntity {
    // 'id' field inherited from PanacheEntity (Long, auto-generated)

    @Column(name = "order_number", unique = true, nullable = false)
    public String orderNumber;  // Quarkus convention: public fields (Panache generates getters/setters)

    @Enumerated(EnumType.STRING)
    public OrderStatus status;

    @Column(precision = 19, scale = 4)
    public BigDecimal amount;

    @Column(name = "created_at")
    public LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    public Customer customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<OrderItem> items = new ArrayList<>();

    @PrePersist
    void onPrePersist() {
        createdAt = LocalDateTime.now();
        if (orderNumber == null) {
            orderNumber = "ORD-" + UUID.randomUUID().toString().substring(0, 8);
        }
    }
}


// === SPRING BOOT — JPA Entity ===
@Entity
@Table(name = "orders")
@Cacheable
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;  // Spring convention: private fields + explicit getters/setters

    @Column(name = "order_number", unique = true, nullable = false)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @Column(precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @PrePersist
    void onPrePersist() {
        createdAt = LocalDateTime.now();
        if (orderNumber == null) {
            orderNumber = "ORD-" + UUID.randomUUID().toString().substring(0, 8);
        }
    }

    // Getters and setters (or use Lombok @Data / @Getter / @Setter)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    // ... all other getters/setters
}
```

### 6.3 Database Migration

```java
// Both frameworks use Flyway or Liquibase identically

// === Quarkus ===
// pom.xml: quarkus-flyway
// application.properties:
// quarkus.flyway.migrate-at-start=true
// quarkus.flyway.locations=db/migration

// === Spring Boot ===
// pom.xml: spring-boot-starter-data-jpa (Flyway auto-detected)
// application.yml:
// spring.flyway.enabled=true
// spring.flyway.locations=classpath:db/migration

// Migration files are IDENTICAL for both:
// src/main/resources/db/migration/V1__create_orders.sql
```

### 6.4 Transaction Management

```java
// === QUARKUS ===
@ApplicationScoped
public class OrderService {
    @Inject OrderRepository orderRepo;

    @Transactional  // jakarta.transaction.Transactional
    public Order createOrder(CreateOrderRequest req) {
        Order order = new Order();
        order.amount = req.getAmount();
        order.status = OrderStatus.PENDING;
        orderRepo.persist(order);
        return order;
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void auditLog(String action) { /* separate tx */ }

    // Programmatic transactions
    @Inject UserTransaction utx;

    public void complexOperation() throws Exception {
        utx.begin();
        try {
            // multiple operations
            utx.commit();
        } catch (Exception e) {
            utx.rollback();
            throw e;
        }
    }
}


// === SPRING BOOT ===
@Service
public class OrderService {
    private final OrderRepository orderRepo;

    @Transactional  // org.springframework.transaction.annotation.Transactional
    public Order createOrder(CreateOrderRequest req) {
        Order order = new Order();
        order.setAmount(req.getAmount());
        order.setStatus(OrderStatus.PENDING);
        return orderRepo.save(order);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void auditLog(String action) { /* separate tx */ }

    // Programmatic transactions
    @Autowired TransactionTemplate txTemplate;

    public void complexOperation() {
        txTemplate.execute(status -> {
            // multiple operations
            return null;
        });
    }
}
```

---

## 7. Configuration System Internals

### 7.1 Configuration Binding — Side by Side

```java
// === QUARKUS — @ConfigMapping (type-safe, build-time validated) ===
@ConfigMapping(prefix = "app.payment")
public interface PaymentConfig {
    String apiUrl();
    int connectTimeout();
    int readTimeout();
    Optional<String> apiKey();
    RetryConfig retry();

    interface RetryConfig {
        int maxAttempts();
        Duration delay();
    }
}

// application.properties
// app.payment.api-url=https://payment.example.com
// app.payment.connect-timeout=5000
// app.payment.read-timeout=10000
// app.payment.api-key=sk_live_xxx  (optional)
// app.payment.retry.max-attempts=3
// app.payment.retry.delay=500ms

// Usage:
@ApplicationScoped
public class PaymentService {
    @Inject PaymentConfig config;

    public void init() {
        String url = config.apiUrl();
        int timeout = config.connectTimeout();
        config.apiKey().ifPresent(key -> setupAuth(key));
    }
}

// Individual property injection
@ApplicationScoped
public class SimpleService {
    @ConfigProperty(name = "app.feature.enabled", defaultValue = "false")
    boolean featureEnabled;

    @ConfigProperty(name = "app.name")
    String appName;
}


// === SPRING BOOT — @ConfigurationProperties (type-safe, runtime validated) ===
@ConfigurationProperties(prefix = "app.payment")
@Validated
public class PaymentConfig {
    @NotBlank
    private String apiUrl;
    private int connectTimeout = 5000;
    private int readTimeout = 10000;
    private String apiKey;
    private RetryConfig retry = new RetryConfig();

    public static class RetryConfig {
        private int maxAttempts = 3;
        private Duration delay = Duration.ofMillis(500);
        // getters + setters
    }
    // getters + setters
}

// application.yml
// app:
//   payment:
//     api-url: https://payment.example.com
//     connect-timeout: 5000
//     read-timeout: 10000
//     api-key: sk_live_xxx
//     retry:
//       max-attempts: 3
//       delay: 500ms

// Must enable via @EnableConfigurationProperties or @ConfigurationPropertiesScan
@Configuration
@EnableConfigurationProperties(PaymentConfig.class)
public class AppConfig { }

// Individual property injection
@Service
public class SimpleService {
    @Value("${app.feature.enabled:false}")
    private boolean featureEnabled;

    @Value("${app.name}")
    private String appName;
}
```

### 7.2 Profile / Environment System

```properties
# === QUARKUS PROFILES ===
# application.properties — all profiles in one file
quarkus.http.port=8080

# Dev profile overrides (prefix with %dev.)
%dev.quarkus.http.port=8080
%dev.quarkus.datasource.db-kind=h2
%dev.quarkus.datasource.jdbc.url=jdbc:h2:mem:devdb
%dev.quarkus.hibernate-orm.database.generation=drop-and-create

# Prod profile
%prod.quarkus.datasource.db-kind=postgresql
%prod.quarkus.datasource.jdbc.url=jdbc:postgresql://db:5432/orders
%prod.quarkus.http.port=8080

# Test profile (auto-activated in @QuarkusTest)
%test.quarkus.datasource.db-kind=h2

# Custom profile
%staging.quarkus.datasource.jdbc.url=jdbc:postgresql://staging-db:5432/orders

# Activate: mvn quarkus:dev -Dquarkus.profile=staging
# Or: QUARKUS_PROFILE=staging java -jar app.jar
```

```yaml
# === SPRING BOOT PROFILES ===
# application.yml — default
server:
  port: 8080

# application-dev.yml — separate file per profile
spring:
  datasource:
    url: jdbc:h2:mem:devdb
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop

# application-prod.yml
spring:
  datasource:
    url: jdbc:postgresql://db:5432/orders
  jpa:
    hibernate:
      ddl-auto: validate

# Activate: java -jar app.jar --spring.profiles.active=prod
# Or: SPRING_PROFILES_ACTIVE=prod java -jar app.jar
# Or in application.yml: spring.profiles.active=dev

# Profile groups (Spring Boot 2.4+)
spring:
  profiles:
    group:
      prod: prod-db,prod-security,prod-monitoring
```

### 7.3 Configuration Source Priority

| Priority | Quarkus | Spring Boot |
|---|---|---|
| **1 (Highest)** | System properties (`-D`) | Command-line args (`--`) |
| **2** | Environment variables | `SPRING_APPLICATION_JSON` |
| **3** | `.env` file | System properties |
| **4** | `application.properties` (profile) | Environment variables |
| **5** | `application.properties` (default) | `application-{profile}.yml` |
| **6** | MicroProfile Config sources | `application.yml` |
| **7 (Lowest)** | `@ConfigProperty` defaultValue | `@Value` default |

---

## 8. Security Architecture

### 8.1 Authentication Flow Comparison

```java
// === QUARKUS — OIDC / JWT ===
// pom.xml: quarkus-oidc (for OIDC) or quarkus-smallrye-jwt (for JWT)

// application.properties
// quarkus.oidc.auth-server-url=https://keycloak.example.com/realms/myrealm
// quarkus.oidc.client-id=my-service
// quarkus.oidc.credentials.secret=my-secret
// quarkus.http.auth.permission."authenticated".paths=/api/*
// quarkus.http.auth.permission."authenticated".policy=authenticated

@Path("/api/orders")
@RolesAllowed("order-manager")  // JSR 250 annotation
public class OrderResource {

    @Inject
    SecurityIdentity identity;  // Current authenticated user

    @Inject
    JsonWebToken jwt;           // JWT claims access

    @GET
    public List<Order> getOrders() {
        String userId = identity.getPrincipal().getName();
        String tenantId = jwt.getClaim("tenant_id");
        return orderService.findByTenant(tenantId);
    }

    @POST
    @RolesAllowed({"order-manager", "admin"})
    public Response createOrder(CreateOrderRequest req) {
        // Only order-manager or admin can create
    }

    @DELETE
    @Path("/{id}")
    @RolesAllowed("admin")
    public Response deleteOrder(@PathParam("id") Long id) {
        // Only admin can delete
    }
}

// Custom security policy
@ApplicationScoped
public class TenantSecurityAugmentor implements SecurityIdentityAugmentor {
    @Override
    public Uni<SecurityIdentity> augment(SecurityIdentity identity,
            AuthenticationRequestContext context) {
        // Add tenant-specific roles/permissions
        return Uni.createFrom().item(
            QuarkusSecurityIdentity.builder(identity)
                .addRole("tenant-" + extractTenant(identity))
                .build());
    }
}


// === SPRING BOOT — Spring Security ===
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/orders/**").hasRole("ADMIN")
                .requestMatchers("/api/orders/**").hasAnyRole("ORDER_MANAGER", "ADMIN")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthConverter())
                )
            )
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(csrf -> csrf.disable())
            .build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthConverter() {
        JwtGrantedAuthoritiesConverter converter = new JwtGrantedAuthoritiesConverter();
        converter.setAuthoritiesClaimName("roles");
        converter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
        jwtConverter.setJwtGrantedAuthoritiesConverter(converter);
        return jwtConverter;
    }
}

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @GetMapping
    @PreAuthorize("hasRole('ORDER_MANAGER')")
    public List<Order> getOrders(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        String tenantId = jwt.getClaimAsString("tenant_id");
        return orderService.findByTenant(tenantId);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORDER_MANAGER', 'ADMIN')")
    public ResponseEntity<Order> createOrder(@RequestBody CreateOrderRequest req) { }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) { }

    // Method-level security with SpEL
    @GetMapping("/{id}")
    @PreAuthorize("@orderSecurity.canAccess(#id, authentication)")
    public Order getOrder(@PathVariable Long id) { }
}
```

### 8.2 Security Feature Comparison

| Feature | Quarkus | Spring Boot | Notes |
|---|---|---|---|
| **Auth framework** | Quarkus Security (Vert.x-based) | Spring Security (FilterChainProxy) | Spring Security is more battle-tested |
| **OIDC** | `quarkus-oidc` | `spring-boot-starter-oauth2-resource-server` | Both first-class |
| **JWT** | `quarkus-smallrye-jwt` | Spring Security JWT | Both support RS256, ES256 |
| **Basic Auth** | `quarkus-elytron-security-properties-file` | `httpBasic()` in SecurityFilterChain | |
| **Role annotation** | `@RolesAllowed` (JSR 250) | `@PreAuthorize("hasRole('X')")` | Spring is more expressive (SpEL) |
| **Method security** | `@RolesAllowed`, `@Authenticated` | `@PreAuthorize`, `@PostAuthorize`, `@Secured` | Spring has pre/post filtering |
| **CORS** | `quarkus.http.cors=true` | `CorsConfigurationSource` bean | Both annotation and config |
| **CSRF** | Quarkus Form Auth (optional) | Enabled by default in Spring Security | |
| **Custom auth** | `HttpAuthenticationMechanism` | Custom `AuthenticationProvider` | |
| **Permission eval** | `@PermissionsAllowed` (Quarkus 3+) | `@PreAuthorize("hasPermission(...)")` | |

---

## 9. Cross-Cutting Concerns — Interceptors, AOP, Filters

### 9.1 Complete Filter/Interceptor Comparison

| Layer | Quarkus | Spring Boot | Access | Use Case |
|---|---|---|---|---|
| **HTTP filter (pre-routing)** | Vert.x Route Handler | Servlet Filter / `OncePerRequestFilter` | Raw HTTP request/response | CORS, compression, rate limiting |
| **HTTP filter (post-routing)** | `ContainerRequestFilter` / `ContainerResponseFilter` | `HandlerInterceptor` | HTTP context + route info | Auth, logging, header capture |
| **Method interceptor** | CDI `@Interceptor` + `@InterceptorBinding` + `@Priority` | Spring AOP `@Aspect` + `@Around` | Method args, return value | Auditing, timing, retry |
| **Exception handler** | `ExceptionMapper<T>` (@Provider) | `@ControllerAdvice` + `@ExceptionHandler` | Exception + request context | Error response formatting |
| **Response filter** | `ContainerResponseFilter` | `ResponseBodyAdvice` | Response body + headers | Response wrapping, HATEOAS |
| **Outbound HTTP filter** | `ClientRequestFilter` / `ClientResponseFilter` | `ClientHttpRequestInterceptor` / `ExchangeFilterFunction` | Outbound request/response | Header propagation, logging |

### 9.2 CDI Interceptor vs Spring AOP — Deep Dive

```java
// === QUARKUS CDI INTERCEPTOR ===

// Step 1: Define InterceptorBinding
@InterceptorBinding
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface Timed {}

// Step 2: Implement interceptor (MUST have @Priority)
@Timed
@Interceptor
@Priority(Interceptor.Priority.APPLICATION + 10)  // MANDATORY
public class TimingInterceptor {

    @Inject
    MeterRegistry registry;

    @AroundInvoke
    public Object time(InvocationContext ic) throws Exception {
        String methodName = ic.getMethod().getDeclaringClass().getSimpleName()
            + "." + ic.getMethod().getName();
        Timer.Sample sample = Timer.start(registry);
        try {
            return ic.proceed();
        } finally {
            sample.stop(Timer.builder("method.duration")
                .tag("method", methodName)
                .register(registry));
        }
    }
}

// Step 3: Apply to target
@ApplicationScoped
@Timed  // All methods timed
public class OrderService {

    @Timed  // Or per-method
    public Order createOrder(CreateOrderRequest req) { }
}


// === SPRING AOP ASPECT ===

@Aspect
@Component
public class TimingAspect {

    @Autowired
    private MeterRegistry registry;

    // Pointcut: any method annotated with @Timed
    @Around("@annotation(timed)")
    public Object time(ProceedingJoinPoint pjp, Timed timed) throws Throwable {
        String methodName = pjp.getSignature().getDeclaringType().getSimpleName()
            + "." + pjp.getSignature().getName();
        Timer.Sample sample = Timer.start(registry);
        try {
            return pjp.proceed();
        } finally {
            sample.stop(Timer.builder("method.duration")
                .tag("method", methodName)
                .register(registry));
        }
    }

    // Pointcut expressions — much more powerful than CDI
    @Around("execution(* com.example.service..*(..))")  // All service methods
    public Object timeAllServices(ProceedingJoinPoint pjp) throws Throwable { }

    @Around("within(com.example.repository..*)")  // All repo classes
    public Object timeRepositories(ProceedingJoinPoint pjp) throws Throwable { }

    @Around("@within(org.springframework.stereotype.Service)")  // All @Service beans
    public Object timeServices(ProceedingJoinPoint pjp) throws Throwable { }

    @Before("execution(* com.example..*Controller.*(..)) && args(request,..)")
    public void logRequest(JoinPoint jp, Object request) {
        log.info("Request to {}: {}", jp.getSignature().getName(), request);
    }

    @AfterReturning(pointcut = "execution(* com.example.service..*(..))",
                    returning = "result")
    public void logResult(JoinPoint jp, Object result) {
        log.info("Result from {}: {}", jp.getSignature().getName(), result);
    }

    @AfterThrowing(pointcut = "execution(* com.example..*(..))",
                   throwing = "ex")
    public void logException(JoinPoint jp, Exception ex) {
        log.error("Exception in {}: {}", jp.getSignature().getName(), ex.getMessage());
    }
}
```

### 9.3 AOP Capabilities Comparison

| Capability | Quarkus CDI | Spring AOP | Notes |
|---|---|---|---|
| **Pointcut model** | Annotation-based only (`@InterceptorBinding`) | Annotation + execution + within + args + SpEL | Spring is far more expressive |
| **Wildcard methods** | Not supported — must annotate each target | `execution(* com.example.service..*(..))` | Spring can intercept without annotations |
| **Before advice** | Not supported (use `@AroundInvoke`) | `@Before` | |
| **After advice** | Not supported | `@After`, `@AfterReturning`, `@AfterThrowing` | |
| **Around advice** | `@AroundInvoke` | `@Around` | Both supported |
| **Introduction** | `@Decorator` + `@Delegate` | `@DeclareParents` | CDI decorators are more type-safe |
| **Proxy mechanism** | Build-time bytecode (no CGLIB) | Runtime CGLIB / JDK dynamic proxy | Quarkus proxies are faster |
| **Self-invocation** | Works (bytecode-level) | Broken by default (proxy bypass) | Major Spring gotcha |
| **Priority ordering** | `@Priority(value)` | `@Order(value)` | |

### 9.4 @NameBinding Filter vs CDI Interceptor — Quarkus-Specific

| Check | `@NameBinding` Filter | CDI `@Interceptor` |
|---|---|---|
| Annotation meta-type | `@NameBinding` (JAX-RS) | `@InterceptorBinding` (CDI) |
| `@Priority` required? | No (optional) | **YES — mandatory** |
| Works outside JAX-RS? | No — HTTP only | Yes — any CDI bean |
| Abort request early? | `abortWith(Response)` | Must throw exception |
| Access method params? | Not available | `InvocationContext.getParameters()` |
| Access return value? | Not available | `InvocationContext.proceed()` result |
| Header access | `ContainerRequestContext` | Bridge bean needed |

> **Critical Mistake:** Never use `@NameBinding` as the meta-annotation for a CDI interceptor. `@NameBinding` = JAX-RS provider chain. `@InterceptorBinding` = CDI Arc bean wrapping.

---

## 10. Messaging & Event-Driven Architecture

### 10.1 Kafka — Side by Side

```java
// === QUARKUS — SmallRye Reactive Messaging ===

// Producer
@ApplicationScoped
public class OrderEventProducer {

    @Inject
    @Channel("order-events-out")
    Emitter<OrderEvent> emitter;

    public void publishOrderCreated(Order order) {
        OrderEvent event = new OrderEvent("ORDER_CREATED", order.getId());
        emitter.send(Message.of(event)
            .withMetadata(Metadata.of(
                OutgoingKafkaRecordMetadata.<String>builder()
                    .withKey(order.getId().toString())
                    .withHeaders(new RecordHeaders()
                        .add("correlationId", ctx.getCorrelationId().getBytes()))
                    .build())));
    }
}

// Consumer
@ApplicationScoped
public class OrderEventConsumer {

    @Incoming("order-events-in")
    @Blocking  // Offload to worker thread if doing blocking I/O
    public CompletionStage<Void> consume(Message<OrderEvent> message) {
        OrderEvent event = message.getPayload();
        try {
            processEvent(event);
            return message.ack();
        } catch (Exception e) {
            return message.nack(e);
        }
    }

    // Or simpler:
    @Incoming("order-events-in")
    public void consumeSimple(OrderEvent event) {
        processEvent(event);
    }

    // Reactive stream processing
    @Incoming("raw-orders")
    @Outgoing("processed-orders")
    public Multi<ProcessedOrder> process(Multi<RawOrder> orders) {
        return orders
            .filter(o -> o.getAmount().compareTo(BigDecimal.ZERO) > 0)
            .map(this::enrich);
    }
}

// application.properties
// mp.messaging.outgoing.order-events-out.connector=smallrye-kafka
// mp.messaging.outgoing.order-events-out.topic=order-events
// mp.messaging.outgoing.order-events-out.value.serializer=io.quarkus.kafka.client.serialization.JsonbSerializer
// mp.messaging.incoming.order-events-in.connector=smallrye-kafka
// mp.messaging.incoming.order-events-in.topic=order-events
// mp.messaging.incoming.order-events-in.group.id=order-service
// mp.messaging.incoming.order-events-in.value.deserializer=org.apache.kafka.common.serialization.StringDeserializer


// === SPRING BOOT — Spring Kafka ===

// Producer
@Service
public class OrderEventProducer {

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    public OrderEventProducer(KafkaTemplate<String, OrderEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishOrderCreated(Order order) {
        OrderEvent event = new OrderEvent("ORDER_CREATED", order.getId());

        ProducerRecord<String, OrderEvent> record = new ProducerRecord<>(
            "order-events", order.getId().toString(), event);
        record.headers().add("correlationId",
            ctx.getCorrelationId().getBytes(StandardCharsets.UTF_8));

        kafkaTemplate.send(record)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to send event", ex);
                } else {
                    log.info("Event sent to partition {} offset {}",
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
    }
}

// Consumer
@Service
public class OrderEventConsumer {

    @KafkaListener(topics = "order-events",
                   groupId = "order-service",
                   containerFactory = "kafkaListenerContainerFactory")
    public void consume(
            @Payload OrderEvent event,
            @Header(KafkaHeaders.RECEIVED_KEY) String key,
            @Header(name = "correlationId", required = false) byte[] correlationId,
            Acknowledgment ack) {
        try {
            processEvent(event);
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to process event", e);
            // DLQ handling or retry
        }
    }

    // Batch consumer
    @KafkaListener(topics = "order-events", groupId = "order-batch")
    public void consumeBatch(List<OrderEvent> events, Acknowledgment ack) {
        events.forEach(this::processEvent);
        ack.acknowledge();
    }
}

// application.yml
// spring:
//   kafka:
//     bootstrap-servers: localhost:9092
//     producer:
//       key-serializer: org.apache.kafka.common.serialization.StringSerializer
//       value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
//     consumer:
//       group-id: order-service
//       auto-offset-reset: earliest
//       key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
//       value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
//       properties:
//         spring.json.trusted.packages: com.example.event
```

---

## 11. Caching Layer

```java
// === QUARKUS — quarkus-cache ===
@ApplicationScoped
public class ProductService {

    @CacheResult(cacheName = "products")
    public Product findById(Long id) {
        return productRepo.findById(id);  // Cached by 'id' param
    }

    @CacheInvalidate(cacheName = "products")
    public void evict(Long id) { }

    @CacheInvalidateAll(cacheName = "products")
    public void evictAll() { }

    @CacheResult(cacheName = "product-search")
    public List<Product> search(@CacheKey String query, int page) {
        // Only 'query' is used as cache key
        return productRepo.search(query, page);
    }
}

// application.properties
// quarkus.cache.caffeine."products".maximum-size=1000
// quarkus.cache.caffeine."products".expire-after-write=5M


// === SPRING BOOT — Spring Cache ===
@Service
@CacheConfig(cacheNames = "products")
public class ProductService {

    @Cacheable
    public Product findById(Long id) {
        return productRepo.findById(id).orElseThrow();
    }

    @CacheEvict
    public void evict(Long id) { }

    @CacheEvict(allEntries = true)
    public void evictAll() { }

    @Cacheable(key = "#query")
    public List<Product> search(String query, int page) {
        return productRepo.search(query, page);
    }

    @CachePut(key = "#product.id")
    public Product update(Product product) {
        return productRepo.save(product);  // Updates cache AND database
    }

    // SpEL-based conditional caching
    @Cacheable(condition = "#id > 0", unless = "#result == null")
    public Product findByIdConditional(Long id) { }
}

// application.yml (with Caffeine)
// spring:
//   cache:
//     type: caffeine
//     caffeine:
//       spec: maximumSize=1000,expireAfterWrite=5m
```

---

## 12. Health Checks, Metrics & Observability

### 12.1 Health Checks

```java
// === QUARKUS — MicroProfile Health ===
@Liveness
@ApplicationScoped
public class LivenessCheck implements HealthCheck {
    @Override
    public HealthCheckResponse call() {
        return HealthCheckResponse.up("alive");
    }
}

@Readiness
@ApplicationScoped
public class ReadinessCheck implements HealthCheck {
    @Inject DataSource dataSource;

    @Override
    public HealthCheckResponse call() {
        try (Connection c = dataSource.getConnection()) {
            return HealthCheckResponse.up("database");
        } catch (Exception e) {
            return HealthCheckResponse.down("database");
        }
    }
}

// Endpoints: /q/health/live, /q/health/ready, /q/health


// === SPRING BOOT — Actuator ===
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    @Autowired DataSource dataSource;

    @Override
    public Health health() {
        try (Connection c = dataSource.getConnection()) {
            return Health.up().withDetail("database", "connected").build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}

// Endpoints: /actuator/health/liveness, /actuator/health/readiness, /actuator/health
// application.yml:
// management.endpoints.web.exposure.include=health,info,metrics,prometheus
// management.endpoint.health.show-details=when-authorized
// management.health.livenessstate.enabled=true
// management.health.readinessstate.enabled=true
```

### 12.2 Metrics Comparison

```java
// Both use Micrometer — API is identical

// === QUARKUS ===
// pom.xml: quarkus-micrometer-registry-prometheus
@ApplicationScoped
public class OrderMetrics {
    @Inject MeterRegistry registry;

    private Counter ordersCreated;
    private Timer orderProcessingTime;

    @PostConstruct
    void init() {
        ordersCreated = Counter.builder("orders.created")
            .tag("service", "order-service")
            .register(registry);
        orderProcessingTime = Timer.builder("orders.processing.time")
            .register(registry);
    }
}
// Endpoint: /q/metrics


// === SPRING BOOT ===
// pom.xml: spring-boot-starter-actuator + micrometer-registry-prometheus
@Service
public class OrderMetrics {
    private final Counter ordersCreated;
    private final Timer orderProcessingTime;

    public OrderMetrics(MeterRegistry registry) {
        ordersCreated = Counter.builder("orders.created")
            .tag("service", "order-service")
            .register(registry);
        orderProcessingTime = Timer.builder("orders.processing.time")
            .register(registry);
    }
}
// Endpoint: /actuator/prometheus
```

### 12.3 Distributed Tracing

```properties
# === QUARKUS ===
# pom.xml: quarkus-opentelemetry
quarkus.otel.enabled=true
quarkus.otel.exporter.otlp.endpoint=http://otel-collector:4317
quarkus.otel.propagators=tracecontext,baggage
# Auto-instruments: REST endpoints, REST clients, JDBC, Kafka, gRPC

# === SPRING BOOT ===
# pom.xml: spring-boot-starter-actuator + micrometer-tracing-bridge-otel
#          + opentelemetry-exporter-otlp
management.tracing.enabled=true
management.tracing.sampling.probability=1.0
management.otlp.tracing.endpoint=http://otel-collector:4318/v1/traces
# Auto-instruments: REST endpoints, RestTemplate, WebClient, JDBC
```

### 12.4 Structured Logging

```java
// === QUARKUS ===
// application.properties
// quarkus.log.console.json=true
// quarkus.log.console.json.additional-field."service".value=order-service
// quarkus.log.console.json.additional-field."environment".value=${ENVIRONMENT:dev}

// MDC integration (auto-correlated with OpenTelemetry)
@Provider
@Priority(Priorities.HEADER_DECORATOR)
public class MdcFilter implements ContainerRequestFilter {
    @Override
    public void filter(ContainerRequestContext ctx) {
        MDC.put("correlationId", ctx.getHeaderString("X-Correlation-ID"));
        MDC.put("tenantId", ctx.getHeaderString("X-Tenant-ID"));
    }
}


// === SPRING BOOT ===
// application.yml (Logback JSON via logstash-logback-encoder)
// logging.pattern.level: "%5p [${spring.application.name},%X{traceId},%X{spanId}]"

// Or logback-spring.xml for JSON output
// <encoder class="net.logstash.logback.encoder.LogstashEncoder">
//   <customFields>{"service":"order-service"}</customFields>
// </encoder>
```

---

## 13. Testing — Every Layer Compared

### 13.1 Test Annotations Mapping

| Test Type | Quarkus | Spring Boot |
|---|---|---|
| **Full integration** | `@QuarkusTest` | `@SpringBootTest` |
| **Web layer only** | `@QuarkusTest` + REST Assured | `@WebMvcTest` / `@WebFluxTest` |
| **Data layer only** | `@QuarkusTest` + `@TestProfile` | `@DataJpaTest` |
| **JSON only** | N/A | `@JsonTest` |
| **Mock bean** | `@InjectMock` (quarkus-junit5-mockito) | `@MockBean` / `@MockitoBean` |
| **Spy bean** | `@InjectSpy` | `@SpyBean` |
| **Test profile** | `@TestProfile(MyProfile.class)` | `@ActiveProfiles("test")` |
| **Random port** | `@QuarkusTest` (always random) | `@SpringBootTest(webEnvironment = RANDOM_PORT)` |
| **Native test** | `@QuarkusIntegrationTest` | `@SpringBootTest` + native profile |
| **Dev Services** | Automatic (TestContainers built-in) | `@Testcontainers` + `@Container` |

### 13.2 Test Examples

```java
// === QUARKUS — REST Endpoint Test ===
@QuarkusTest
class OrderResourceTest {

    @InjectMock
    OrderService orderService;

    @Test
    void shouldReturnOrders() {
        when(orderService.findAll(any(), anyInt(), anyInt()))
            .thenReturn(List.of(new OrderDto(1L, "ORD-001", BigDecimal.TEN)));

        given()
            .header("Authorization", "Bearer test-token")
            .queryParam("status", "PENDING")
        .when()
            .get("/api/orders")
        .then()
            .statusCode(200)
            .body("$.size()", is(1))
            .body("[0].orderNumber", equalTo("ORD-001"));
    }

    @Test
    void shouldReturn404ForMissingOrder() {
        when(orderService.findById(999L)).thenReturn(Optional.empty());

        given()
            .header("Authorization", "Bearer test-token")
        .when()
            .get("/api/orders/999")
        .then()
            .statusCode(404);
    }
}

// Quarkus — Dev Services auto-starts PostgreSQL for @QuarkusTest
// No TestContainers config needed — just add quarkus-jdbc-postgresql


// === SPRING BOOT — REST Endpoint Test ===
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    OrderService orderService;

    @Test
    void shouldReturnOrders() throws Exception {
        when(orderService.findAll(any(), anyInt(), anyInt()))
            .thenReturn(List.of(new OrderDto(1L, "ORD-001", BigDecimal.TEN)));

        mockMvc.perform(get("/api/orders")
                .param("status", "PENDING")
                .header("Authorization", "Bearer test-token")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].orderNumber").value("ORD-001"));
    }

    @Test
    void shouldReturn404ForMissingOrder() throws Exception {
        when(orderService.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/orders/999")
                .header("Authorization", "Bearer test-token"))
            .andExpect(status().isNotFound());
    }
}


// === SPRING BOOT — Data Layer Test ===
@DataJpaTest
class OrderRepositoryTest {

    @Autowired
    TestEntityManager entityManager;

    @Autowired
    OrderRepository orderRepository;

    @Test
    void shouldFindByStatus() {
        Order order = new Order();
        order.setOrderNumber("ORD-001");
        order.setStatus(OrderStatus.PENDING);
        entityManager.persistAndFlush(order);

        List<Order> result = orderRepository.findByStatus(OrderStatus.PENDING);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getOrderNumber()).isEqualTo("ORD-001");
    }
}

// No equivalent test slice in Quarkus — use @QuarkusTest with @TestProfile


// === SPRING BOOT — Full Integration with TestContainers ===
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    TestRestTemplate restTemplate;

    @Test
    void shouldCreateAndRetrieveOrder() {
        // Full end-to-end test with real database
    }
}
```

### 13.3 Contract Testing

```java
// Both frameworks support Spring Cloud Contract and Pact

// === Quarkus Pact ===
// pom.xml: quarkus-pact-provider
@QuarkusTest
@Provider("order-service")
@PactFolder("pacts")
class OrderPactProviderTest {
    @TestTarget
    public final Target target = new HttpTarget(8081);
}

// === Spring Boot Pact ===
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Provider("order-service")
@PactFolder("pacts")
class OrderPactProviderTest {
    @LocalServerPort
    int port;

    @BeforeEach
    void setup(PactVerificationContext context) {
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verifyPact(PactVerificationContext context) {
        context.verifyInteraction();
    }
}
```

---

## 14. Native Compilation — GraalVM Internals

### 14.1 How Native Works

```
Quarkus Native Build:
┌──────────────────────────────────────────────────────────────────┐
│  Phase 1: Quarkus Build (augmentation)                           │
│  → Extension processors run @BuildStep methods                   │
│  → Generates all reflection/proxy/serialization config           │
│  → Dead code elimination (unused beans removed)                  │
│  → Records runtime init code                                     │
│                                                                  │
│  Phase 2: GraalVM native-image                                   │
│  → Static analysis (reachability-based)                          │
│  → Ahead-of-Time (AOT) compilation                               │
│  → Substrate VM replaces HotSpot                                 │
│  → No JIT, no classloading, no reflection (mostly)               │
│                                                                  │
│  Result: Single binary, ~20ms startup, ~10-30MB RSS              │
└──────────────────────────────────────────────────────────────────┘

Spring Boot Native Build:
┌──────────────────────────────────────────────────────────────────┐
│  Phase 1: Spring AOT Processing (Spring 6+)                      │
│  → Evaluates @Conditional at build time                          │
│  → Generates reflection hints (RuntimeHintsRegistrar)            │
│  → Creates BeanFactory initialization code                       │
│  → Generates proxy classes ahead of time                         │
│                                                                  │
│  Phase 2: GraalVM native-image (same as Quarkus)                 │
│  → Static analysis + AOT compilation                             │
│  → Spring Native metadata used for reachability                  │
│                                                                  │
│  Result: Single binary, ~50-100ms startup, ~30-80MB RSS          │
└──────────────────────────────────────────────────────────────────┘
```

### 14.2 Native Compilation Commands

```bash
# === Quarkus ===
# Build native (requires GraalVM or uses container build)
mvn package -Dnative

# Container-based build (no local GraalVM needed)
mvn package -Dnative -Dquarkus.native.container-build=true

# Docker native image
mvn package -Dnative -Dquarkus.container-image.build=true

# Run native tests
mvn verify -Dnative


# === Spring Boot ===
# Build native (requires GraalVM)
mvn -Pnative native:compile

# Using Buildpacks (no local GraalVM needed)
mvn -Pnative spring-boot:build-image

# Gradle
./gradlew nativeCompile
./gradlew bootBuildImage

# Run native tests
mvn -Pnative test
```

### 14.3 Native Gotchas

| Issue | Quarkus | Spring Boot | Notes |
|---|---|---|---|
| Reflection | Handled by extensions at build time | `@RegisterReflectionForBinding`, `RuntimeHintsRegistrar` | Quarkus extensions auto-register |
| Dynamic proxies | Build-time generated (ArC) | Hints needed for JDK proxies | |
| Resource loading | Auto-detected by extensions | `@RegisterReflection` or hints | |
| Serialization | Auto-configured for JSON-B/Jackson | Manual registration often needed | |
| Third-party libs | Extension ecosystem (500+) | Hit-or-miss; check Spring Native compatibility | Quarkus has better coverage |
| Build time | ~3-5 min (incremental) | ~5-10 min | Quarkus faster due to build-time work |
| Image size | ~50-100 MB | ~80-150 MB | Quarkus smaller |

---

## 15. Developer Experience & Tooling

### 15.1 Dev Mode Comparison

| Feature | Quarkus | Spring Boot |
|---|---|---|
| **Live reload** | `mvn quarkus:dev` — ~0.5s reload | `spring-boot-devtools` — ~2-5s restart |
| **Hot reload mechanism** | Vert.x classloader swap (no restart) | Full context restart (cached classloader) |
| **Dev Services** | Auto-starts DB, Kafka, Redis, Keycloak containers | Manual TestContainers or Docker Compose |
| **Continuous testing** | Built-in (`quarkus:dev` runs tests on save) | Requires IDE plugin or Infinitest |
| **Dev UI** | `localhost:8080/q/dev-ui` — interactive dashboard | Spring Boot Admin (separate app) |
| **CLI** | `quarkus` CLI (create, ext, dev, build) | `spring` CLI (init, shell) |
| **IDE support** | IntelliJ + VS Code plugins | IntelliJ (excellent) + VS Code (Spring Boot Extension Pack) |
| **Config docs** | Dev UI shows all config options | `spring-configuration-metadata.json` |

### 15.2 Dev Services (Quarkus Exclusive Feature)

```properties
# Just add the extension — Quarkus auto-starts containers in dev/test mode
# No docker-compose, no TestContainers config needed

# PostgreSQL: add quarkus-jdbc-postgresql → auto-starts PostgreSQL
# Kafka: add quarkus-smallrye-reactive-messaging-kafka → auto-starts Redpanda
# Redis: add quarkus-redis → auto-starts Redis
# MongoDB: add quarkus-mongodb → auto-starts MongoDB
# Keycloak: add quarkus-oidc → auto-starts Keycloak with realm import
# Elasticsearch: add quarkus-elasticsearch → auto-starts Elasticsearch
# RabbitMQ: add quarkus-smallrye-reactive-messaging-rabbitmq → auto-starts RabbitMQ

# Customize dev services
quarkus.datasource.devservices.image-name=postgres:16
quarkus.datasource.devservices.port=5432
quarkus.kafka.devservices.image-name=vectorized/redpanda:v23.3.5

# Spring Boot equivalent requires manual setup:
# docker-compose.yml + @Testcontainers + @DynamicPropertySource
# Or Spring Boot 3.1+ Docker Compose support:
# spring.docker.compose.enabled=true
# spring.docker.compose.file=compose-dev.yml
```

### 15.3 Extension System Comparison

```
Quarkus Extension:                        Spring Boot Starter:
───────────────────                       ─────────────────────
quarkus-extension/                        spring-boot-starter-custom/
├── deployment/          ← Build-time     ├── src/main/java/
│   ├── src/                              │   └── auto/
│   │   └── MyProcessor.java             │       ├── MyAutoConfiguration.java
│   │       (@BuildStep methods)          │       └── MyProperties.java
│   └── pom.xml                           ├── src/main/resources/
└── runtime/             ← Runtime        │   └── META-INF/
    ├── src/                              │       └── spring/
    │   └── MyRecorder.java              │           └── org.springframework...AutoConfiguration.imports
    └── pom.xml                           └── pom.xml

Key difference:
- Quarkus: Build-time code generation, NO runtime reflection
- Spring:  Runtime auto-configuration, condition evaluation at startup
```

---

## 16. Performance Benchmarks & Resource Usage

### 16.1 Startup Time (Typical Microservice)

| Mode | Quarkus JVM | Quarkus Native | Spring Boot JVM | Spring Boot Native |
|---|---|---|---|---|
| **Simple REST API** | ~0.5s | ~0.02s | ~2.0s | ~0.08s |
| **REST + DB + Kafka** | ~1.2s | ~0.05s | ~4.0s | ~0.15s |
| **Full microservice** | ~1.5s | ~0.06s | ~5-8s | ~0.2s |
| **Large monolith** | ~3-5s | ~0.1s | ~15-30s | ~0.5s |

### 16.2 Memory Usage (RSS)

| Mode | Quarkus JVM | Quarkus Native | Spring Boot JVM | Spring Boot Native |
|---|---|---|---|---|
| **At startup** | ~70 MB | ~12 MB | ~200 MB | ~50 MB |
| **Under load** | ~120 MB | ~30 MB | ~300 MB | ~80 MB |
| **Peak** | ~180 MB | ~50 MB | ~500 MB | ~120 MB |

### 16.3 Throughput (Requests/sec, typical REST + DB)

| Concurrency | Quarkus Reactive | Quarkus Blocking | Spring MVC | Spring WebFlux |
|---|---|---|---|---|
| **10 concurrent** | ~15,000 | ~12,000 | ~10,000 | ~14,000 |
| **100 concurrent** | ~45,000 | ~25,000 | ~18,000 | ~40,000 |
| **1000 concurrent** | ~55,000 | ~20,000 | ~15,000 | ~48,000 |

> **Note:** Benchmarks vary significantly based on hardware, JVM version, GC, and workload. These are representative figures from TechEmpower, Quarkus team benchmarks, and community reports. Always benchmark your specific use case.

### 16.4 Build Time Comparison

| Build Type | Quarkus | Spring Boot |
|---|---|---|
| **Clean JVM build** | ~15-30s | ~20-40s |
| **Incremental JVM** | ~3-5s | ~5-10s |
| **Native build** | ~3-5 min | ~5-10 min |
| **Docker native** | ~5-8 min | ~8-15 min |

---

## 17. Anti-Patterns — Both Frameworks

### 17.1 Quarkus Anti-Patterns

```java
// ❌ Anti-Pattern 1: Trusting incomingHeaders in Reactive Mode
@ApplicationScoped
public class BrokenFactory implements ClientHeadersFactory {
    @Override
    public MultivaluedMap<String, String> update(
            MultivaluedMap<String, String> incomingHeaders,  // ← EMPTY!
            MultivaluedMap<String, String> clientOutgoingHeaders) {
        return incomingHeaders;  // Returns nothing useful
    }
}
// ✅ Fix: Use Vert.x HttpServerRequest injection


// ❌ Anti-Pattern 2: Using @NameBinding for CDI Interceptors
@NameBinding  // ← WRONG — this is JAX-RS, not CDI
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {}

@Audited
@Interceptor  // ← Needs @InterceptorBinding, not @NameBinding
public class AuditInterceptor { /* NEVER fires */ }
// ✅ Fix: Use @InterceptorBinding


// ❌ Anti-Pattern 3: Missing @Priority on CDI Interceptor
@Audited
@Interceptor
@ApplicationScoped
public class AuditInterceptor { /* registered but never invoked */ }
// ✅ Fix: Add @Priority(Interceptor.Priority.APPLICATION + 10)


// ❌ Anti-Pattern 4: Injecting ContainerRequestContext into CDI Beans
@ApplicationScoped
public class MyService {
    @Context
    ContainerRequestContext requestContext;  // ← null outside filter chain
}
// ✅ Fix: Use bridge bean or Vert.x HttpServerRequest


// ❌ Anti-Pattern 5: Blocking on Vert.x Event Loop
@Path("/data")
public class DataResource {
    @GET
    public Uni<Response> getData() {
        Thread.sleep(1000);  // DEADLOCKS the event loop
        return Uni.createFrom().item(Response.ok().build());
    }
}
// ✅ Fix: Use @Blocking or non-blocking I/O


// ❌ Anti-Pattern 6: Propagating All Headers Blindly
@Override
public MultivaluedMap<String, String> update(...) {
    return incomingHeaders;  // Leaks Cookie, Host, Content-Length
}
// ✅ Fix: Explicit allowlist of safe headers
```

### 17.2 Spring Boot Anti-Patterns

```java
// ❌ Anti-Pattern 7: Assuming ThreadLocal Survives @Async
@Service
public class MyService {
    @Async
    public CompletableFuture<String> asyncCall() {
        // RequestContextHolder.getRequestAttributes() → null!
        String auth = ((ServletRequestAttributes) RequestContextHolder
            .getRequestAttributes()).getRequest().getHeader("Authorization");
    }
}
// ✅ Fix: Use TaskDecorator to propagate context
@Bean
public TaskExecutor taskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setTaskDecorator(runnable -> {
        RequestAttributes ctx = RequestContextHolder.getRequestAttributes();
        return () -> {
            RequestContextHolder.setRequestAttributes(ctx);
            try { runnable.run(); }
            finally { RequestContextHolder.resetRequestAttributes(); }
        };
    });
    return executor;
}


// ❌ Anti-Pattern 8: Injecting HttpServletRequest into Singletons
@Service
public class HeaderService {
    private final HttpServletRequest request;  // Same instance for all requests!
    public HeaderService(HttpServletRequest request) { this.request = request; }
}
// ✅ Fix: Use ObjectProvider<HttpServletRequest> or @RequestScope bean


// ❌ Anti-Pattern 9: Self-invocation AOP bypass
@Service
public class OrderService {
    @Transactional
    public void createOrder() {
        this.validateOrder();  // ← @Transactional on validateOrder is IGNORED
                               //   because self-invocation bypasses the CGLIB proxy
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void validateOrder() { /* runs in SAME transaction, not new */ }
}
// ✅ Fix: Inject self via ObjectProvider or extract to separate bean


// ❌ Anti-Pattern 10: @SpringBootTest for every test
@SpringBootTest  // Starts ENTIRE context — slow for unit tests
class OrderServiceTest { }
// ✅ Fix: Use @WebMvcTest, @DataJpaTest, or plain Mockito for unit tests
```

---

## 18. Migration Path — Quarkus to Spring Boot

### 18.1 Migration Strategy Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                QUARKUS → SPRING BOOT MIGRATION PATH               │
│                                                                   │
│  Phase 1: Assessment & Planning (1-2 weeks)                       │
│  ├── Inventory all Quarkus extensions used                        │
│  ├── Map CDI annotations → Spring annotations                    │
│  ├── Identify Quarkus-specific APIs (Panache, SmallRye, etc.)    │
│  └── Identify shared libraries (Hibernate, Jackson, etc.)        │
│                                                                   │
│  Phase 2: Project Setup (1 week)                                  │
│  ├── Generate Spring Boot project with equivalent starters       │
│  ├── Migrate build file (pom.xml / build.gradle)                 │
│  ├── Create @SpringBootApplication main class                    │
│  └── Set up Spring configuration (application.yml)               │
│                                                                   │
│  Phase 3: Core Migration (2-4 weeks per service)                 │
│  ├── Entity classes (minimal changes)                             │
│  ├── Repository layer (Panache → Spring Data)                    │
│  ├── Service layer (CDI → Spring DI)                             │
│  ├── REST endpoints (JAX-RS → Spring MVC)                        │
│  ├── REST clients (MP REST Client → OpenFeign/WebClient)         │
│  └── Configuration (@ConfigMapping → @ConfigurationProperties)   │
│                                                                   │
│  Phase 4: Cross-Cutting (1-2 weeks)                              │
│  ├── Security (Quarkus Security → Spring Security)               │
│  ├── Interceptors (CDI @Interceptor → Spring AOP @Aspect)        │
│  ├── Health checks (MicroProfile Health → Actuator)              │
│  ├── Messaging (SmallRye → Spring Kafka)                         │
│  └── Caching (@CacheResult → @Cacheable)                         │
│                                                                   │
│  Phase 5: Testing (1-2 weeks)                                    │
│  ├── @QuarkusTest → @SpringBootTest/@WebMvcTest                  │
│  ├── @InjectMock → @MockBean                                     │
│  ├── REST Assured (works in both) or MockMvc                     │
│  └── DevServices → TestContainers + @DynamicPropertySource       │
│                                                                   │
│  Phase 6: Observability & DevOps (1 week)                        │
│  ├── Metrics endpoint change (/q/metrics → /actuator/prometheus) │
│  ├── Health endpoint change (/q/health → /actuator/health)       │
│  ├── Update Kubernetes probes                                     │
│  ├── Update CI/CD pipelines                                      │
│  └── Update Dockerfile                                            │
└───────────────────────────────────────────────────────────────────┘
```

### 18.2 Annotation Migration Reference

| Quarkus (CDI/JAX-RS) | Spring Boot | Notes |
|---|---|---|
| `@ApplicationScoped` | `@Service` / `@Component` | Spring defaults to singleton |
| `@RequestScoped` | `@RequestScope` | |
| `@Singleton` | `@Component` (default singleton) | |
| `@Dependent` | `@Scope("prototype")` | |
| `@Inject` | `@Autowired` / constructor injection | Prefer constructor in Spring |
| `@Named("x")` | `@Qualifier("x")` | |
| `@ConfigProperty` | `@Value` | |
| `@ConfigMapping` | `@ConfigurationProperties` | |
| `@Path("/api")` | `@RequestMapping("/api")` | |
| `@GET` | `@GetMapping` | |
| `@POST` | `@PostMapping` | |
| `@PathParam` | `@PathVariable` | |
| `@QueryParam` | `@RequestParam` | |
| `@HeaderParam` | `@RequestHeader` | |
| `@Produces(JSON)` | `produces = APPLICATION_JSON_VALUE` | |
| `@Consumes(JSON)` | `consumes = APPLICATION_JSON_VALUE` | |
| `@Provider` + `ExceptionMapper` | `@ControllerAdvice` + `@ExceptionHandler` | |
| `@RegisterRestClient` | `@FeignClient` | |
| `@RestClient` | N/A (auto-injected by Feign) | |
| `@InterceptorBinding` | `@Aspect` annotation | |
| `@Interceptor` + `@AroundInvoke` | `@Around` (Spring AOP) | |
| `@Transactional` (jakarta) | `@Transactional` (Spring) | Different package |
| `@Liveness` / `@Readiness` | `HealthIndicator` + Actuator config | |
| `@CacheResult` | `@Cacheable` | |
| `@CacheInvalidate` | `@CacheEvict` | |
| `@Scheduled` (Quarkus) | `@Scheduled` (Spring) | |
| `@Incoming` / `@Outgoing` | `@KafkaListener` / `KafkaTemplate` | |
| `@IfBuildProfile("dev")` | `@Profile("dev")` | |
| `@QuarkusTest` | `@SpringBootTest` | |
| `@InjectMock` | `@MockBean` | |

### 18.3 REST Client Migration (MicroProfile → Feign/WebClient)

```java
// === BEFORE (Quarkus) ===
@RegisterRestClient(configKey = "payment-api")
@RegisterClientHeaders(HeadersFactory.class)
@Path("/api/v1/payments")
public interface PaymentClient {
    @POST
    PaymentResponse charge(PaymentRequest request);

    @GET
    @Path("/{id}")
    Uni<PaymentResponse> getPayment(@PathParam("id") String id);
}

// application.properties
// quarkus.rest-client.payment-api.url=https://payment.example.com
// quarkus.rest-client.payment-api.connect-timeout=5000


// === AFTER (Spring Boot — OpenFeign) ===
@FeignClient(name = "payment-api",
             url = "${payment.api.url}",
             configuration = PaymentFeignConfig.class)
public interface PaymentClient {
    @PostMapping("/api/v1/payments")
    PaymentResponse charge(@RequestBody PaymentRequest request);

    @GetMapping("/api/v1/payments/{id}")
    PaymentResponse getPayment(@PathVariable String id);
}

// application.yml
// payment.api.url: https://payment.example.com
// spring.cloud.openfeign.client.config.payment-api.connect-timeout: 5000


// === AFTER (Spring Boot — WebClient for reactive) ===
@Service
public class PaymentClient {
    private final WebClient webClient;

    public PaymentClient(@Value("${payment.api.url}") String baseUrl) {
        this.webClient = WebClient.builder().baseUrl(baseUrl).build();
    }

    public Mono<PaymentResponse> getPayment(String id) {
        return webClient.get()
            .uri("/api/v1/payments/{id}", id)
            .retrieve()
            .bodyToMono(PaymentResponse.class);
    }
}
```

### 18.4 Repository Migration (Panache → Spring Data)

```java
// === BEFORE (Quarkus Panache) ===
@ApplicationScoped
public class OrderRepository implements PanacheRepository<Order> {
    public List<Order> findByStatus(OrderStatus status) {
        return list("status", status);
    }
    public List<Order> findByCustomerPaginated(Long customerId, int page, int size) {
        return find("customer.id", customerId)
            .page(Page.of(page, size)).list();
    }
}

// Active Record style
List<Order> orders = Order.findByStatus(OrderStatus.PENDING);
Order.deleteById(1L);


// === AFTER (Spring Data JPA) ===
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatus(OrderStatus status);
    Page<Order> findByCustomerId(Long customerId, Pageable pageable);
}

// Usage:
List<Order> orders = orderRepository.findByStatus(OrderStatus.PENDING);
orderRepository.deleteById(1L);
Page<Order> page = orderRepository.findByCustomerId(customerId,
    PageRequest.of(page, size));
```

### 18.5 Configuration Migration

```properties
# === BEFORE (Quarkus application.properties) ===
quarkus.http.port=8080
quarkus.datasource.db-kind=postgresql
quarkus.datasource.jdbc.url=jdbc:postgresql://db:5432/orders
quarkus.datasource.username=admin
quarkus.datasource.password=secret
quarkus.hibernate-orm.database.generation=validate
quarkus.hibernate-orm.log.sql=true
quarkus.rest-client.payment-api.url=https://payment.example.com
quarkus.log.console.json=true
quarkus.otel.enabled=true
quarkus.otel.exporter.otlp.endpoint=http://otel-collector:4317
```

```yaml
# === AFTER (Spring Boot application.yml) ===
server:
  port: 8080
spring:
  datasource:
    url: jdbc:postgresql://db:5432/orders
    username: admin
    password: secret
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: true
payment:
  api:
    url: https://payment.example.com
logging:
  pattern:
    console: '{"timestamp":"%d","level":"%p","message":"%m"}%n'
management:
  tracing:
    enabled: true
  otlp:
    tracing:
      endpoint: http://otel-collector:4318/v1/traces
```

### 18.6 Dockerfile Migration

```dockerfile
# === BEFORE (Quarkus JVM) ===
FROM registry.access.redhat.com/ubi8/openjdk-21:1.20
COPY --chown=185 target/quarkus-app/lib/ /deployments/lib/
COPY --chown=185 target/quarkus-app/*.jar /deployments/
COPY --chown=185 target/quarkus-app/app/ /deployments/app/
COPY --chown=185 target/quarkus-app/quarkus/ /deployments/quarkus/
EXPOSE 8080
ENV JAVA_APP_JAR="/deployments/quarkus-run.jar"

# === BEFORE (Quarkus Native) ===
FROM quay.io/quarkus/quarkus-micro-image:2.0
COPY target/*-runner /application
EXPOSE 8080
CMD ["./application", "-Dquarkus.http.host=0.0.0.0"]


# === AFTER (Spring Boot JVM) ===
FROM eclipse-temurin:21-jre-alpine
COPY target/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

# === AFTER (Spring Boot Layered — optimized for Docker cache) ===
FROM eclipse-temurin:21-jre-alpine AS builder
COPY target/*.jar application.jar
RUN java -Djarmode=layertools -jar application.jar extract

FROM eclipse-temurin:21-jre-alpine
COPY --from=builder dependencies/ ./
COPY --from=builder spring-boot-loader/ ./
COPY --from=builder snapshot-dependencies/ ./
COPY --from=builder application/ ./
EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

### 18.7 Migration Tools

| Tool | Purpose | URL |
|---|---|---|
| **OpenRewrite — Quarkus to Spring Boot** | Automated recipe for annotation/config migration | https://docs.openrewrite.org/recipes/quarkus |
| **OpenRewrite — Spring Boot upgrade** | Upgrade Spring Boot versions automatically | https://docs.openrewrite.org/recipes/spring |
| **Spring Boot Migrator** | CLI tool to analyze and migrate projects | https://github.com/spring-projects-experimental/spring-boot-migrator |
| **Windup / MTA** | Red Hat Migration Toolkit for Applications | https://developers.redhat.com/products/mta |
| **IntelliJ Migration** | Built-in refactoring support | IntelliJ IDEA Ultimate |

```xml
<!-- OpenRewrite Quarkus migration recipe -->
<plugin>
    <groupId>org.openrewrite.maven</groupId>
    <artifactId>rewrite-maven-plugin</artifactId>
    <version>5.42.0</version>
    <configuration>
        <activeRecipes>
            <recipe>org.openrewrite.java.migrate.jakarta.JavaxMigrationToJakarta</recipe>
            <!-- Custom recipe for Quarkus → Spring annotation swap -->
        </activeRecipes>
    </configuration>
    <dependencies>
        <dependency>
            <groupId>org.openrewrite.recipe</groupId>
            <artifactId>rewrite-migrate-java</artifactId>
            <version>2.26.0</version>
        </dependency>
    </dependencies>
</plugin>
```

---

## 19. Migration Path — Spring Boot to Quarkus

### 19.1 Official Migration Tool

Red Hat provides the **Quarkus Migration Toolkit** and **OpenRewrite recipes** for Spring-to-Quarkus migration:

```xml
<!-- OpenRewrite Spring → Quarkus recipe -->
<plugin>
    <groupId>org.openrewrite.maven</groupId>
    <artifactId>rewrite-maven-plugin</artifactId>
    <version>5.42.0</version>
    <configuration>
        <activeRecipes>
            <recipe>org.openrewrite.quarkus.migrate.spring.SpringBootToQuarkus</recipe>
        </activeRecipes>
    </configuration>
    <dependencies>
        <dependency>
            <groupId>org.openrewrite.recipe</groupId>
            <artifactId>rewrite-quarkus</artifactId>
            <version>2.9.0</version>
        </dependency>
    </dependencies>
</plugin>
```

### 19.2 Quarkus Spring Compatibility Extensions

Quarkus provides Spring API compatibility layers that let Spring code run on Quarkus with minimal changes:

```xml
<!-- Use Spring annotations on Quarkus — the "gentle migration" path -->
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-spring-di</artifactId>           <!-- @Autowired, @Component, etc. -->
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-spring-web</artifactId>           <!-- @RestController, @GetMapping -->
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-spring-data-jpa</artifactId>      <!-- Spring Data JPA repositories -->
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-spring-security</artifactId>      <!-- @Secured, @PreAuthorize -->
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-spring-cache</artifactId>         <!-- @Cacheable -->
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-spring-scheduled</artifactId>     <!-- @Scheduled -->
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-spring-boot-properties</artifactId> <!-- @ConfigurationProperties -->
</dependency>

<!-- These extensions compile Spring annotations into CDI at build time -->
<!-- Spring code works as-is, but runs on Quarkus runtime (Vert.x, ArC) -->
<!-- Limitations: Not all Spring features supported (no SpEL, limited @Conditional) -->
```

---

## 20. Industry Adoption & Case Studies

### 20.1 Who Uses Quarkus

| Company | Use Case | Scale | Why Quarkus |
|---|---|---|---|
| **Lufthansa Technik** | Aircraft maintenance platform | 500+ microservices | Native compilation, fast startup for Kubernetes |
| **Vodafone** | Customer-facing APIs | Millions of requests/day | Memory efficiency, reduced cloud costs |
| **Red Hat (IBM)** | OpenShift platform services | Internal platform | Parent company, native Kubernetes integration |
| **Decathlon** | E-commerce backend | High-traffic events | Reactive performance, dev productivity |
| **Banco do Brasil** | Banking microservices | Mission-critical, regulated | Fast startup for serverless, native compilation |
| **Swiss Re** | Insurance calculation engines | CPU-intensive workloads | GraalVM native for cold starts |
| **Logitech** | IoT device management | IoT scale | Memory footprint for edge computing |

### 20.2 Who Uses Spring Boot

| Company | Use Case | Scale | Why Spring Boot |
|---|---|---|---|
| **Netflix** | Microservices platform | Millions of streams/day | Spring Cloud ecosystem, battle-tested |
| **Amazon** | Internal services | Massive scale | Ecosystem maturity, talent pool |
| **JPMorgan Chase** | Trading & banking platforms | Ultra-low latency | Spring Security, mature ecosystem |
| **Alibaba** | E-commerce platform | Billions of requests | Spring Cloud Alibaba |
| **Uber** | Payment & ride services | Real-time, global scale | Ecosystem, community support |
| **Goldman Sachs** | Financial services platform | Mission-critical | Spring Security, compliance tooling |
| **Capital One** | Banking APIs | Customer-facing | Spring ecosystem, developer familiarity |
| **Intuit (TurboTax)** | Tax processing platform | Seasonal massive scale | Spring Boot + Cloud for auto-scaling |
| **Target** | Retail platform | Omnichannel | Spring Boot microservices |
| **Pivotal/VMware** | Cloud Foundry platform | PaaS | Parent company (creator of Spring) |

### 20.3 Industry Trends & Analysis

```
Market Share (Enterprise Java Frameworks, 2024-2026):
┌────────────────────────────────────────────────────┐
│  Spring Boot          ████████████████████  ~65%   │
│  Quarkus              ████████             ~18%    │
│  Jakarta EE (WildFly) ████                 ~8%     │
│  Micronaut            ███                  ~5%     │
│  Helidon              █                    ~2%     │
│  Others               █                    ~2%     │
└────────────────────────────────────────────────────┘

Growth Trend:
- Spring Boot: Steady, dominant, huge ecosystem
- Quarkus: Fastest growing, especially in Kubernetes-native orgs
- Micronaut: Growing in serverless/IoT niche
```

### 20.4 Decision Factors by Industry

| Industry | Preferred Framework | Reason |
|---|---|---|
| **Banking / Finance** | Spring Boot (70%) / Quarkus (25%) | Spring Security maturity, regulatory compliance tooling |
| **E-commerce** | Spring Boot (60%) / Quarkus (30%) | Spring ecosystem breadth, Quarkus for performance-critical |
| **Telecommunications** | Quarkus (50%) / Spring Boot (40%) | Quarkus for edge computing, low memory footprint |
| **Healthcare** | Spring Boot (75%) | Compliance, mature ecosystem, talent availability |
| **Cloud/SaaS** | Spring Boot (55%) / Quarkus (35%) | Spring Cloud for cloud-native, Quarkus for Kubernetes |
| **IoT/Edge** | Quarkus (60%) | Native compilation, tiny memory, instant startup |
| **Serverless/FaaS** | Quarkus (65%) | Cold start time is decisive advantage |
| **Government** | Spring Boot (80%) | Risk-averse, talent pool, long-term support |

---

## 21. Decision Framework — When to Use What

### 21.1 Choose Quarkus When

- **Kubernetes-native**: Your infra is Kubernetes-first and you need fast scaling
- **Serverless / FaaS**: Cold start time matters (AWS Lambda, Azure Functions, Google Cloud Run)
- **Memory-constrained**: Edge computing, IoT, or cost-sensitive cloud deployments
- **Native compilation**: GraalVM native is a hard requirement
- **Reactive-first**: Your app is primarily non-blocking I/O
- **Greenfield microservices**: No existing Spring investment to protect
- **Dev Services**: You want zero-config local development with auto-started containers
- **Red Hat ecosystem**: Already using OpenShift, Keycloak, Infinispan

### 21.2 Choose Spring Boot When

- **Mature ecosystem**: You need the broadest library and tooling support
- **Team expertise**: Your team knows Spring and learning curve matters
- **Complex security**: Fine-grained authorization with SpEL, method security, OAuth2 flows
- **AOP-heavy**: You rely on execution pointcuts, wildcard interception
- **Existing codebase**: Migrating from legacy Spring applications
- **Enterprise integration**: Spring Integration, Spring Batch, Spring Cloud
- **Talent availability**: Largest developer talent pool in Java ecosystem
- **Long-term support**: VMware Tanzu / Broadcom LTS (5+ years per major version)

### 21.3 Feature-by-Feature Decision Matrix

| Feature / Concern | Quarkus Advantage | Spring Boot Advantage | Verdict |
|---|---|---|---|
| **Startup time** | 10-100× faster | — | **Quarkus** |
| **Memory usage** | 2-5× less | — | **Quarkus** |
| **Native compilation** | First-class, mature | Improving (Spring 6+) | **Quarkus** |
| **Dev experience** | Dev Services, continuous testing | DevTools, extensive IDE support | **Tie** |
| **Ecosystem breadth** | 500+ extensions | 1000+ starters | **Spring Boot** |
| **Community size** | Growing fast | Massive, dominant | **Spring Boot** |
| **Security** | Adequate | Best-in-class | **Spring Boot** |
| **AOP / interception** | Annotation-only | Full pointcut expressions | **Spring Boot** |
| **Data access** | Panache (active record + repo) | Spring Data (most popular) | **Spring Boot** |
| **Reactive** | Vert.x + Mutiny (Uni/Multi) | Reactor (Mono/Flux) | **Tie** |
| **Testing** | Good (@QuarkusTest) | Excellent (test slices) | **Spring Boot** |
| **Cloud integration** | OpenShift, Kubernetes native | Spring Cloud (Netflix, AWS, GCP, Azure) | **Spring Boot** |
| **Documentation** | Good | Excellent | **Spring Boot** |
| **Job market** | Growing | Dominant | **Spring Boot** |
| **Build time** | Faster (build-time work) | Slower (runtime startup work) | **Quarkus** |
| **Complexity** | Medium-High (explicit wiring) | Low (ThreadLocal hides complexity) | **Spring Boot** |

---

## 22. Practical Recipes — Quick-Start Patterns

A categorized recipe index covering the most common patterns you'll implement in Quarkus (with Spring Boot equivalents). Each recipe is a self-contained, copy-paste-ready pattern.

---

### 22.1 REST Recipes

#### 22.1.1 Basic CRUD Resource

```java
// === QUARKUS ===
@Path("/api/products")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ProductResource {

    @Inject
    ProductService service;

    @GET
    public List<ProductDto> list(
            @QueryParam("category") String category,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        return service.findAll(category, page, size);
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        return service.findById(id)
            .map(p -> Response.ok(p).build())
            .orElse(Response.status(Status.NOT_FOUND).build());
    }

    @POST
    @Transactional
    public Response create(@Valid CreateProductRequest req, @Context UriInfo uriInfo) {
        ProductDto created = service.create(req);
        URI location = uriInfo.getAbsolutePathBuilder()
            .path(String.valueOf(created.getId())).build();
        return Response.created(location).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public ProductDto update(@PathParam("id") Long id, @Valid UpdateProductRequest req) {
        return service.update(id, req);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        service.delete(id);
        return Response.noContent().build();
    }
}
```

```java
// === SPRING BOOT ===
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping
    public List<ProductDto> list(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.findAll(category, page, size);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> getById(@PathVariable Long id) {
        return service.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ProductDto> create(@Valid @RequestBody CreateProductRequest req,
                                              UriComponentsBuilder uriBuilder) {
        ProductDto created = service.create(req);
        URI location = uriBuilder.path("/api/products/{id}")
            .buildAndExpand(created.getId()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public ProductDto update(@PathVariable Long id,
                             @Valid @RequestBody UpdateProductRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
```

#### 22.1.2 Pagination with Page Response

```java
// === QUARKUS — Panache-based pagination ===
@GET
@Path("/paged")
public PagedResponse<ProductDto> listPaged(
        @QueryParam("page") @DefaultValue("0") int page,
        @QueryParam("size") @DefaultValue("20") int size,
        @QueryParam("sort") @DefaultValue("name") String sort) {

    PanacheQuery<Product> query = Product.findAll(Sort.by(sort));
    query.page(Page.of(page, size));

    return new PagedResponse<>(
        query.list().stream().map(ProductMapper::toDto).toList(),
        query.pageCount(),
        query.count(),
        page
    );
}

// Reusable page response DTO
public record PagedResponse<T>(
    List<T> content,
    int totalPages,
    long totalElements,
    int currentPage
) {}
```

```java
// === SPRING BOOT — Spring Data pagination ===
@GetMapping("/paged")
public Page<ProductDto> listPaged(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "name") String sort) {

    Pageable pageable = PageRequest.of(page, size, Sort.by(sort));
    return productRepository.findAll(pageable).map(ProductMapper::toDto);
}
```

#### 22.1.3 File Upload & Download

```java
// === QUARKUS — RESTEasy Reactive Multipart ===
@POST
@Path("/upload")
@Consumes(MediaType.MULTIPART_FORM_DATA)
public Response upload(@MultipartForm FileUploadForm form) {
    String storedPath = storageService.store(form.file, form.fileName);
    return Response.ok(Map.of("path", storedPath)).build();
}

public class FileUploadForm {
    @FormParam("file")
    @PartType(MediaType.APPLICATION_OCTET_STREAM)
    public InputStream file;

    @FormParam("fileName")
    @PartType(MediaType.TEXT_PLAIN)
    public String fileName;
}

@GET
@Path("/download/{fileName}")
@Produces(MediaType.APPLICATION_OCTET_STREAM)
public Response download(@PathParam("fileName") String fileName) {
    File file = storageService.load(fileName);
    return Response.ok(file)
        .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
        .build();
}
```

```java
// === SPRING BOOT ===
@PostMapping("/upload")
public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
    String storedPath = storageService.store(file.getInputStream(), file.getOriginalFilename());
    return ResponseEntity.ok(Map.of("path", storedPath));
}

@GetMapping("/download/{fileName}")
public ResponseEntity<Resource> download(@PathVariable String fileName) {
    Resource resource = storageService.loadAsResource(fileName);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
        .body(resource);
}
```

#### 22.1.4 Server-Sent Events (SSE) Streaming

```java
// === QUARKUS — Multi-based SSE ===
@GET
@Path("/stream")
@Produces(MediaType.SERVER_SENT_EVENTS)
@RestStreamElementType(MediaType.APPLICATION_JSON)
public Multi<ProductEvent> streamProducts() {
    return productService.streamEvents();
}

// Service producing events
@ApplicationScoped
public class ProductService {
    public Multi<ProductEvent> streamEvents() {
        return Multi.createFrom().ticks().every(Duration.ofSeconds(1))
            .onItem().transform(tick -> fetchLatestEvent());
    }
}
```

```java
// === SPRING BOOT — SseEmitter or WebFlux ===
@GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ProductEvent> streamProducts() {
    return productService.streamEvents();
}

// Or with SseEmitter for MVC
@GetMapping("/stream-mvc")
public SseEmitter streamProductsMvc() {
    SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
    executorService.execute(() -> {
        try {
            while (true) {
                emitter.send(fetchLatestEvent());
                Thread.sleep(1000);
            }
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
    });
    return emitter;
}
```

#### 22.1.5 Content Negotiation — Multiple Response Formats

```java
// === QUARKUS — JAX-RS produces multiple types ===
@GET
@Path("/{id}")
@Produces({MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML, MediaType.TEXT_PLAIN})
public Product getById(@PathParam("id") Long id) {
    return Product.findById(id);   // JAX-RS picks format via Accept header
}
```

```java
// === SPRING BOOT — ContentNegotiation ===
@GetMapping(value = "/{id}", produces = {
    MediaType.APPLICATION_JSON_VALUE,
    MediaType.APPLICATION_XML_VALUE,
    MediaType.TEXT_PLAIN_VALUE
})
public Product getById(@PathVariable Long id) {
    return productRepository.findById(id).orElseThrow();
}
```

#### 22.1.6 REST Client — Calling External APIs

```java
// === QUARKUS — MicroProfile REST Client ===
@RegisterRestClient(configKey = "payment-api")
@Path("/api/payments")
public interface PaymentClient {

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    PaymentResponse processPayment(PaymentRequest request);

    @GET
    @Path("/{id}")
    PaymentResponse getPayment(@PathParam("id") String paymentId);
}

// application.properties
// quarkus.rest-client.payment-api.url=https://payment.example.com
// quarkus.rest-client.payment-api.scope=jakarta.inject.Singleton

// Usage in service
@Inject
@RestClient
PaymentClient paymentClient;
```

```java
// === SPRING BOOT — RestClient (Spring 6.1+) ===
@Configuration
public class RestClientConfig {
    @Bean
    public PaymentClient paymentClient(RestClient.Builder builder) {
        RestClient restClient = builder.baseUrl("https://payment.example.com").build();
        return HttpServiceProxyFactory.builderFor(RestClientAdapter.create(restClient))
            .build()
            .createClient(PaymentClient.class);
    }
}

public interface PaymentClient {
    @PostExchange("/api/payments")
    PaymentResponse processPayment(@RequestBody PaymentRequest request);

    @GetExchange("/api/payments/{id}")
    PaymentResponse getPayment(@PathVariable String id);
}
```

#### 22.1.7 HATEOAS / Hypermedia Links

```java
// === QUARKUS — Manual link building ===
@GET
@Path("/{id}")
public Response getById(@PathParam("id") Long id, @Context UriInfo uriInfo) {
    Product product = Product.findById(id);
    URI selfUri = uriInfo.getAbsolutePathBuilder().build();
    URI allUri = uriInfo.getBaseUriBuilder().path(ProductResource.class).build();

    return Response.ok(product)
        .link(selfUri, "self")
        .link(allUri, "all-products")
        .build();
}
```

```java
// === SPRING BOOT — Spring HATEOAS ===
@GetMapping("/{id}")
public EntityModel<Product> getById(@PathVariable Long id) {
    Product product = productRepository.findById(id).orElseThrow();
    return EntityModel.of(product,
        linkTo(methodOn(ProductController.class).getById(id)).withSelfRel(),
        linkTo(methodOn(ProductController.class).list(null, 0, 20)).withRel("all-products"));
}
```

---

### 22.2 Exception Handling Recipes

#### 22.2.1 Global Exception Mapper

```java
// === QUARKUS — JAX-RS ExceptionMapper ===
@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Exception> {

    private static final Logger LOG = Logger.getLogger(GlobalExceptionMapper.class);

    @Override
    public Response toResponse(Exception exception) {
        LOG.error("Unhandled exception", exception);
        return Response.status(Status.INTERNAL_SERVER_ERROR)
            .entity(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"))
            .type(MediaType.APPLICATION_JSON)
            .build();
    }
}

public record ErrorResponse(String code, String message, Instant timestamp) {
    public ErrorResponse(String code, String message) {
        this(code, message, Instant.now());
    }
}
```

```java
// === SPRING BOOT — @ControllerAdvice ===
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGeneral(Exception ex) {
        LOG.error("Unhandled exception", ex);
        return new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred");
    }
}
```

#### 22.2.2 Typed Business Exception Handling

```java
// === QUARKUS — Multiple ExceptionMappers ===

// Business exception
public class BusinessException extends RuntimeException {
    private final String code;
    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }
    public String getCode() { return code; }
}

public class NotFoundException extends BusinessException {
    public NotFoundException(String entity, Object id) {
        super("NOT_FOUND", entity + " with id " + id + " not found");
    }
}

public class ConflictException extends BusinessException {
    public ConflictException(String message) {
        super("CONFLICT", message);
    }
}

// Mapper
@Provider
public class BusinessExceptionMapper implements ExceptionMapper<BusinessException> {

    @Override
    public Response toResponse(BusinessException ex) {
        Status status = switch (ex) {
            case NotFoundException  n -> Status.NOT_FOUND;
            case ConflictException  c -> Status.CONFLICT;
            default                   -> Status.BAD_REQUEST;
        };
        return Response.status(status)
            .entity(new ErrorResponse(ex.getCode(), ex.getMessage()))
            .type(MediaType.APPLICATION_JSON)
            .build();
    }
}
```

```java
// === SPRING BOOT — @ControllerAdvice with specific handlers ===
@RestControllerAdvice
public class BusinessExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(NotFoundException ex) {
        return new ErrorResponse(ex.getCode(), ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleConflict(ConflictException ex) {
        return new ErrorResponse(ex.getCode(), ex.getMessage());
    }

    @ExceptionHandler(BusinessException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleBusiness(BusinessException ex) {
        return new ErrorResponse(ex.getCode(), ex.getMessage());
    }
}
```

#### 22.2.3 Bean Validation Error Handling

```java
// === QUARKUS — ConstraintViolationException mapper ===
@Provider
public class ValidationExceptionMapper
        implements ExceptionMapper<ConstraintViolationException> {

    @Override
    public Response toResponse(ConstraintViolationException ex) {
        List<FieldError> errors = ex.getConstraintViolations().stream()
            .map(cv -> new FieldError(
                extractFieldName(cv.getPropertyPath()),
                cv.getMessage()))
            .toList();

        return Response.status(Status.BAD_REQUEST)
            .entity(new ValidationErrorResponse("VALIDATION_FAILED", errors))
            .type(MediaType.APPLICATION_JSON)
            .build();
    }

    private String extractFieldName(Path path) {
        String fullPath = path.toString();
        return fullPath.contains(".") ? fullPath.substring(fullPath.lastIndexOf('.') + 1) : fullPath;
    }
}

public record FieldError(String field, String message) {}
public record ValidationErrorResponse(String code, List<FieldError> errors) {}
```

```java
// === SPRING BOOT — MethodArgumentNotValidException handler ===
@RestControllerAdvice
public class ValidationExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ValidationErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        List<FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
            .toList();
        return new ValidationErrorResponse("VALIDATION_FAILED", errors);
    }
}
```

#### 22.2.4 Problem Details (RFC 9457)

```java
// === QUARKUS — RFC 9457 Problem Details ===
@Provider
public class ProblemDetailMapper implements ExceptionMapper<BusinessException> {

    @Override
    public Response toResponse(BusinessException ex) {
        var problem = Map.of(
            "type", "https://api.example.com/errors/" + ex.getCode().toLowerCase(),
            "title", ex.getCode(),
            "status", mapStatus(ex).getStatusCode(),
            "detail", ex.getMessage(),
            "instance", "/errors/" + UUID.randomUUID()
        );
        return Response.status(mapStatus(ex))
            .entity(problem)
            .type("application/problem+json")
            .build();
    }

    private Status mapStatus(BusinessException ex) {
        return switch (ex) {
            case NotFoundException  n -> Status.NOT_FOUND;
            case ConflictException  c -> Status.CONFLICT;
            default                   -> Status.BAD_REQUEST;
        };
    }
}
```

```java
// === SPRING BOOT — Built-in ProblemDetail (Spring 6+) ===
@RestControllerAdvice
public class ProblemDetailHandler {

    @ExceptionHandler(BusinessException.class)
    public ProblemDetail handleBusiness(BusinessException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(mapStatus(ex));
        problem.setType(URI.create("https://api.example.com/errors/" + ex.getCode().toLowerCase()));
        problem.setTitle(ex.getCode());
        problem.setDetail(ex.getMessage());
        return problem;
    }

    private HttpStatus mapStatus(BusinessException ex) {
        return switch (ex) {
            case NotFoundException  n -> HttpStatus.NOT_FOUND;
            case ConflictException  c -> HttpStatus.CONFLICT;
            default                   -> HttpStatus.BAD_REQUEST;
        };
    }
}

// Enable in application.properties:
// spring.mvc.problemdetails.enabled=true
```

---

### 22.3 Logging Recipes

#### 22.3.1 Structured JSON Logging

```properties
# === QUARKUS — application.properties ===
quarkus.log.console.format=%d{yyyy-MM-dd HH:mm:ss} %-5p [%c{3.}] (%t) %s%e%n
quarkus.log.console.json=true
quarkus.log.console.json.additional-field.service.value=payment-service
quarkus.log.console.json.additional-field.environment.value=${ENV:dev}
quarkus.log.level=INFO
quarkus.log.category."com.example".level=DEBUG
quarkus.log.category."org.hibernate.SQL".level=DEBUG
```

```yaml
# === SPRING BOOT — application.yml (with Logback) ===
logging:
  level:
    root: INFO
    com.example: DEBUG
    org.hibernate.SQL: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} %-5level [%logger{36}] - %msg%n"

# logback-spring.xml for JSON (using logstash-logback-encoder)
# <encoder class="net.logstash.logback.encoder.LogstashEncoder">
#   <customFields>{"service":"payment-service","environment":"${ENV:dev}"}</customFields>
# </encoder>
```

#### 22.3.2 MDC (Mapped Diagnostic Context) for Request Tracing

```java
// === QUARKUS — MDC with ContainerRequestFilter ===
@Provider
@PreMatching
public class MdcRequestFilter implements ContainerRequestFilter {

    @Override
    public void filter(ContainerRequestContext requestContext) {
        String correlationId = requestContext.getHeaderString("X-Correlation-ID");
        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
        }
        MDC.put("correlationId", correlationId);
        MDC.put("requestPath", requestContext.getUriInfo().getPath());
        MDC.put("method", requestContext.getMethod());
    }
}

@Provider
public class MdcResponseFilter implements ContainerResponseFilter {
    @Override
    public void filter(ContainerRequestContext req, ContainerResponseContext res) {
        res.getHeaders().add("X-Correlation-ID", MDC.get("correlationId"));
        MDC.clear();
    }
}

// application.properties — include MDC fields in log output
// quarkus.log.console.format=%d{yyyy-MM-dd HH:mm:ss} %-5p correlationId=%X{correlationId} [%c{3.}] %s%e%n
```

```java
// === SPRING BOOT — MDC with HandlerInterceptor ===
@Component
public class MdcInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                             Object handler) {
        String correlationId = request.getHeader("X-Correlation-ID");
        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
        }
        MDC.put("correlationId", correlationId);
        MDC.put("requestPath", request.getRequestURI());
        MDC.put("method", request.getMethod());
        response.setHeader("X-Correlation-ID", correlationId);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        MDC.clear();
    }
}

// Register in WebMvcConfigurer
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Autowired MdcInterceptor mdcInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(mdcInterceptor);
    }
}
```

#### 22.3.3 Log Levels Per Package at Runtime

```java
// === QUARKUS — Programmatic log level change ===
// In dev mode: use Dev UI at /q/dev → Logging
// Programmatically:
@Path("/admin/logging")
@ApplicationScoped
public class LoggingResource {

    @PUT
    @Path("/{category}/{level}")
    public Response setLogLevel(@PathParam("category") String category,
                                @PathParam("level") String level) {
        Logger logger = Logger.getLogger(category);
        logger.setLevel(java.util.logging.Level.parse(level.toUpperCase()));
        return Response.ok(Map.of("category", category, "level", level)).build();
    }
}
```

```java
// === SPRING BOOT — Actuator log level change ===
// POST /actuator/loggers/com.example
// {"configuredLevel": "DEBUG"}
// Enable in application.properties:
// management.endpoints.web.exposure.include=loggers
// management.endpoint.loggers.enabled=true
```

#### 22.3.4 Audit Logging with CDI Interceptor / AOP

```java
// === QUARKUS — CDI Interceptor ===
@InterceptorBinding
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {}

@Audited
@Interceptor
@Priority(Interceptor.Priority.APPLICATION)
public class AuditInterceptor {

    private static final Logger LOG = Logger.getLogger(AuditInterceptor.class);

    @Inject
    SecurityIdentity identity;

    @AroundInvoke
    public Object audit(InvocationContext ctx) throws Exception {
        String user = identity.getPrincipal().getName();
        String method = ctx.getMethod().getName();
        LOG.infof("AUDIT user=%s action=%s params=%s", user, method, Arrays.toString(ctx.getParameters()));

        Object result = ctx.proceed();

        LOG.infof("AUDIT user=%s action=%s completed", user, method);
        return result;
    }
}

// Usage: @Audited on method or class
```

```java
// === SPRING BOOT — AOP ===
@Aspect
@Component
public class AuditAspect {

    private static final Logger LOG = LoggerFactory.getLogger(AuditAspect.class);

    @Autowired
    private AuthenticationContext authContext;

    @Around("@annotation(com.example.Audited)")
    public Object audit(ProceedingJoinPoint joinPoint) throws Throwable {
        String user = SecurityContextHolder.getContext().getAuthentication().getName();
        String method = joinPoint.getSignature().getName();
        LOG.info("AUDIT user={} action={} params={}", user, method, Arrays.toString(joinPoint.getArgs()));

        Object result = joinPoint.proceed();

        LOG.info("AUDIT user={} action={} completed", user, method);
        return result;
    }
}
```

---

### 22.4 Monitoring Recipes

#### 22.4.1 Health Checks — Liveness & Readiness

```java
// === QUARKUS — MicroProfile Health ===
// Dependency: quarkus-smallrye-health

@Liveness
@ApplicationScoped
public class LivenessCheck implements HealthCheck {

    @Override
    public HealthCheckResponse call() {
        return HealthCheckResponse.up("alive");
    }
}

@Readiness
@ApplicationScoped
public class ReadinessCheck implements HealthCheck {

    @Inject
    DataSource dataSource;

    @Override
    public HealthCheckResponse call() {
        try (Connection conn = dataSource.getConnection()) {
            conn.createStatement().execute("SELECT 1");
            return HealthCheckResponse.named("database")
                .withData("vendor", conn.getMetaData().getDatabaseProductName())
                .up()
                .build();
        } catch (SQLException e) {
            return HealthCheckResponse.named("database").down().build();
        }
    }
}

// Endpoints:  GET /q/health/live  |  GET /q/health/ready  |  GET /q/health
```

```java
// === SPRING BOOT — Actuator Health ===
// Dependency: spring-boot-starter-actuator

@Component
public class CustomHealthIndicator implements HealthIndicator {

    private final DataSource dataSource;

    public CustomHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Health health() {
        try (Connection conn = dataSource.getConnection()) {
            conn.createStatement().execute("SELECT 1");
            return Health.up()
                .withDetail("vendor", conn.getMetaData().getDatabaseProductName())
                .build();
        } catch (SQLException e) {
            return Health.down(e).build();
        }
    }
}

// application.properties:
// management.endpoint.health.show-details=always
// management.endpoint.health.group.liveness.include=livenessState
// management.endpoint.health.group.readiness.include=readinessState,db

// Endpoints:  GET /actuator/health/liveness  |  GET /actuator/health/readiness
```

#### 22.4.2 Custom Metrics with Micrometer

```java
// === QUARKUS — Micrometer ===
// Dependency: quarkus-micrometer-registry-prometheus

@ApplicationScoped
public class PaymentMetrics {

    private final MeterRegistry registry;
    private final Counter paymentsProcessed;
    private final Counter paymentsFailed;
    private final Timer paymentDuration;

    @Inject
    public PaymentMetrics(MeterRegistry registry) {
        this.registry = registry;
        this.paymentsProcessed = Counter.builder("payments.processed")
            .description("Total payments processed")
            .tag("service", "payment")
            .register(registry);
        this.paymentsFailed = Counter.builder("payments.failed")
            .description("Total payments failed")
            .tag("service", "payment")
            .register(registry);
        this.paymentDuration = Timer.builder("payments.duration")
            .description("Payment processing duration")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);
    }

    public void recordSuccess(Duration duration) {
        paymentsProcessed.increment();
        paymentDuration.record(duration);
    }

    public void recordFailure() {
        paymentsFailed.increment();
    }

    // Gauge for in-flight requests
    public void registerQueueGauge(AtomicInteger queueSize) {
        Gauge.builder("payments.queue.size", queueSize, AtomicInteger::get)
            .description("Current payment queue size")
            .register(registry);
    }
}

// Endpoint: GET /q/metrics (Prometheus format)
```

```java
// === SPRING BOOT — Micrometer (identical API) ===
// Dependency: spring-boot-starter-actuator + micrometer-registry-prometheus

@Component
public class PaymentMetrics {

    // Same Micrometer API as Quarkus — code is identical
    // ...
}

// Endpoint: GET /actuator/prometheus
// application.properties:
// management.endpoints.web.exposure.include=prometheus,health,metrics
```

#### 22.4.3 Timed Method Annotations

```java
// === QUARKUS ===
@Path("/api/payments")
@ApplicationScoped
public class PaymentResource {

    @GET
    @Timed(value = "payment.list.time", description = "Time to list payments",
           percentiles = {0.5, 0.95, 0.99})
    @Counted(value = "payment.list.count", description = "Number of list calls")
    public List<PaymentDto> listPayments() {
        return paymentService.findAll();
    }
}
```

```java
// === SPRING BOOT ===
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @GetMapping
    @Timed(value = "payment.list.time", description = "Time to list payments",
           percentiles = {0.5, 0.95, 0.99})
    @Counted(value = "payment.list.count", description = "Number of list calls")
    public List<PaymentDto> listPayments() {
        return paymentService.findAll();
    }
}

// Enable @Timed/@Counted in config:
// @Bean TimedAspect timedAspect(MeterRegistry registry) { return new TimedAspect(registry); }
```

#### 22.4.4 OpenTelemetry Distributed Tracing

```properties
# === QUARKUS — application.properties ===
quarkus.otel.exporter.otlp.traces.endpoint=http://jaeger:4317
quarkus.otel.service.name=payment-service
quarkus.otel.traces.sampler=parentbased_traceidratio
quarkus.otel.traces.sampler.arg=0.1
```

```java
// Custom spans in Quarkus
@ApplicationScoped
public class PaymentService {

    @Inject
    Tracer tracer;

    @WithSpan("processPayment")
    public PaymentResult process(@SpanAttribute("payment.amount") BigDecimal amount,
                                  @SpanAttribute("payment.currency") String currency) {
        Span span = Span.current();
        span.setAttribute("payment.provider", "stripe");

        // Child span for external call
        Span childSpan = tracer.spanBuilder("stripe-api-call").startSpan();
        try (Scope scope = childSpan.makeCurrent()) {
            return callStripeApi(amount, currency);
        } finally {
            childSpan.end();
        }
    }
}
```

```yaml
# === SPRING BOOT — application.yml ===
management:
  tracing:
    sampling:
      probability: 0.1
  otlp:
    tracing:
      endpoint: http://jaeger:4317

spring:
  application:
    name: payment-service
```

---

### 22.5 Database Recipes

#### 22.5.1 Active Record Pattern (Panache)

```java
// === QUARKUS — Panache Active Record ===
@Entity
@Table(name = "products")
public class Product extends PanacheEntity {

    @Column(nullable = false)
    public String name;

    @Column(nullable = false)
    public BigDecimal price;

    @Enumerated(EnumType.STRING)
    public Category category;

    public boolean active = true;

    // Custom finders — static methods
    public static List<Product> findByCategory(Category category) {
        return find("category", category).list();
    }

    public static List<Product> findActive() {
        return find("active", true).list();
    }

    public static List<Product> search(String term) {
        return find("LOWER(name) LIKE LOWER(?1)", "%" + term + "%").list();
    }

    public static long countByCategory(Category category) {
        return count("category", category);
    }

    public static PanacheQuery<Product> findActivePaged() {
        return find("active", Sort.by("name"), true);
    }
}

// Usage:
// Product.findByCategory(Category.ELECTRONICS);
// Product.findById(1L);
// product.persist();
// Product.deleteById(1L);
```

#### 22.5.2 Repository Pattern

```java
// === QUARKUS — Panache Repository ===
@ApplicationScoped
public class ProductRepository implements PanacheRepository<Product> {

    public List<Product> findByCategory(Category category) {
        return find("category", category).list();
    }

    public List<Product> findByPriceRange(BigDecimal min, BigDecimal max) {
        return find("price BETWEEN ?1 AND ?2", min, max).list();
    }

    public Optional<Product> findByName(String name) {
        return find("name", name).firstResultOptional();
    }

    public long deactivateByCategory(Category category) {
        return update("active = false WHERE category = ?1", category);
    }
}
```

```java
// === SPRING BOOT — Spring Data JPA ===
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByCategory(Category category);

    List<Product> findByPriceBetween(BigDecimal min, BigDecimal max);

    Optional<Product> findByName(String name);

    @Modifying
    @Query("UPDATE Product p SET p.active = false WHERE p.category = :category")
    long deactivateByCategory(@Param("category") Category category);

    // Derived query methods — Spring Data generates the query
    List<Product> findByActiveTrueOrderByNameAsc();

    Page<Product> findByCategoryAndActiveTrue(Category category, Pageable pageable);
}
```

#### 22.5.3 Transactions — Declarative & Programmatic

```java
// === QUARKUS — Transactions ===

// Declarative
@ApplicationScoped
public class OrderService {

    @Inject OrderRepository orderRepo;
    @Inject InventoryService inventoryService;

    @Transactional
    public Order placeOrder(CreateOrderRequest req) {
        Order order = new Order(req);
        order.persist();
        inventoryService.decrementStock(req.productId(), req.quantity());
        return order;
    }

    // Programmatic (fine-grained control)
    @Inject UserTransaction tx;

    public void transferFunds(Long fromId, Long toId, BigDecimal amount) throws Exception {
        tx.begin();
        try {
            Account from = Account.findById(fromId);
            Account to = Account.findById(toId);
            from.balance = from.balance.subtract(amount);
            to.balance = to.balance.add(amount);
            tx.commit();
        } catch (Exception e) {
            tx.rollback();
            throw e;
        }
    }

    // Transactional with rollback rules
    @Transactional(rollbackOn = BusinessException.class,
                    dontRollbackOn = WarningException.class)
    public void riskyOperation() { /* ... */ }
}
```

```java
// === SPRING BOOT — Transactions ===

// Declarative
@Service
public class OrderService {

    @Transactional
    public Order placeOrder(CreateOrderRequest req) {
        Order order = orderRepository.save(new Order(req));
        inventoryService.decrementStock(req.productId(), req.quantity());
        return order;
    }

    // Programmatic
    @Autowired TransactionTemplate txTemplate;

    public void transferFunds(Long fromId, Long toId, BigDecimal amount) {
        txTemplate.execute(status -> {
            Account from = accountRepository.findById(fromId).orElseThrow();
            Account to = accountRepository.findById(toId).orElseThrow();
            from.setBalance(from.getBalance().subtract(amount));
            to.setBalance(to.getBalance().add(amount));
            return null;
        });
    }

    @Transactional(rollbackFor = BusinessException.class,
                    noRollbackFor = WarningException.class)
    public void riskyOperation() { /* ... */ }
}
```

#### 22.5.4 Database Migrations — Flyway & Liquibase

```properties
# === QUARKUS — Flyway ===
# Dependency: quarkus-flyway
quarkus.flyway.migrate-at-start=true
quarkus.flyway.locations=db/migration
quarkus.flyway.baseline-on-migrate=true
# SQL files in: src/main/resources/db/migration/V1__create_tables.sql
```

```sql
-- V1__create_products.sql
CREATE TABLE products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category);
```

```properties
# === SPRING BOOT — Flyway (auto-configured) ===
# Dependency: flyway-core
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.baseline-on-migrate=true
# Same SQL migration files
```

#### 22.5.5 Native Queries & Projections

```java
// === QUARKUS — Native SQL + Projections ===
@ApplicationScoped
public class ReportRepository {

    @Inject
    EntityManager em;

    public List<SalesSummary> getMonthlySales(int year) {
        return em.createNativeQuery("""
            SELECT category, EXTRACT(MONTH FROM created_at) AS month,
                   SUM(amount) AS total, COUNT(*) AS count
            FROM orders
            WHERE EXTRACT(YEAR FROM created_at) = :year
            GROUP BY category, EXTRACT(MONTH FROM created_at)
            ORDER BY month, category
            """, SalesSummary.class)
            .setParameter("year", year)
            .getResultList();
    }
}

// DTO projection
@SqlResultSetMapping(name = "SalesSummaryMapping",
    classes = @ConstructorResult(targetClass = SalesSummary.class,
        columns = {
            @ColumnResult(name = "category", type = String.class),
            @ColumnResult(name = "month", type = Integer.class),
            @ColumnResult(name = "total", type = BigDecimal.class),
            @ColumnResult(name = "count", type = Long.class)
        }))
public record SalesSummary(String category, int month, BigDecimal total, long count) {}
```

```java
// === SPRING BOOT — Native query with projection ===
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query(nativeQuery = true, value = """
        SELECT category, EXTRACT(MONTH FROM created_at) AS month,
               SUM(amount) AS total, COUNT(*) AS count
        FROM orders
        WHERE EXTRACT(YEAR FROM created_at) = :year
        GROUP BY category, EXTRACT(MONTH FROM created_at)
        ORDER BY month, category
        """)
    List<SalesSummaryProjection> getMonthlySales(@Param("year") int year);

    // Interface-based projection
    interface SalesSummaryProjection {
        String getCategory();
        Integer getMonth();
        BigDecimal getTotal();
        Long getCount();
    }
}
```

---

### 22.6 Async & Reactive Recipes

#### 22.6.1 Reactive REST Endpoints with Uni/Multi

```java
// === QUARKUS — Mutiny (Uni for single, Multi for stream) ===
@Path("/api/orders")
@ApplicationScoped
public class OrderResource {

    @Inject
    OrderService orderService;

    // Single async result
    @GET
    @Path("/{id}")
    public Uni<Response> getById(@PathParam("id") Long id) {
        return orderService.findByIdAsync(id)
            .onItem().ifNotNull().transform(o -> Response.ok(o).build())
            .onItem().ifNull().continueWith(Response.status(Status.NOT_FOUND).build());
    }

    // Async creation with chaining
    @POST
    @Transactional
    public Uni<Response> create(@Valid CreateOrderRequest req, @Context UriInfo uriInfo) {
        return orderService.createAsync(req)
            .onItem().transform(order -> {
                URI location = uriInfo.getAbsolutePathBuilder()
                    .path(String.valueOf(order.getId())).build();
                return Response.created(location).entity(order).build();
            });
    }

    // Stream of results
    @GET
    @Path("/stream")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    public Multi<OrderEvent> streamOrders() {
        return orderService.streamEvents();
    }
}
```

```java
// === SPRING BOOT — WebFlux (Mono for single, Flux for stream) ===
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @GetMapping("/{id}")
    public Mono<ResponseEntity<OrderDto>> getById(@PathVariable Long id) {
        return orderService.findByIdAsync(id)
            .map(ResponseEntity::ok)
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Mono<ResponseEntity<OrderDto>> create(@Valid @RequestBody CreateOrderRequest req,
                                                  UriComponentsBuilder uriBuilder) {
        return orderService.createAsync(req)
            .map(order -> {
                URI location = uriBuilder.path("/api/orders/{id}")
                    .buildAndExpand(order.getId()).toUri();
                return ResponseEntity.created(location).body(order);
            });
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<OrderEvent> streamOrders() {
        return orderService.streamEvents();
    }
}
```

#### 22.6.2 Async Service Layer Patterns

```java
// === QUARKUS — Mutiny combinators ===
@ApplicationScoped
public class OrderService {

    @Inject PaymentClient paymentClient;
    @Inject InventoryClient inventoryClient;
    @Inject NotificationService notificationService;

    // Parallel async calls — combine results
    public Uni<OrderSummary> getOrderSummary(Long orderId) {
        Uni<Order> orderUni = Order.findById(orderId);
        Uni<PaymentInfo> paymentUni = paymentClient.getPayment(orderId);
        Uni<ShippingInfo> shippingUni = shippingClient.getStatus(orderId);

        return Uni.combine().all()
            .unis(orderUni, paymentUni, shippingUni)
            .asTuple()
            .onItem().transform(tuple ->
                new OrderSummary(tuple.getItem1(), tuple.getItem2(), tuple.getItem3()));
    }

    // Sequential async chain with error handling
    public Uni<OrderResult> placeOrder(CreateOrderRequest req) {
        return inventoryClient.reserve(req.productId(), req.quantity())
            .onItem().transformToUni(reservation ->
                paymentClient.charge(req.paymentMethod(), req.amount()))
            .onItem().transformToUni(payment ->
                persistOrder(req, payment))
            .onItem().invoke(order ->
                notificationService.sendConfirmation(order))   // fire-and-forget
            .onFailure(PaymentException.class)
                .recoverWithItem(ex -> OrderResult.failed("Payment failed: " + ex.getMessage()));
    }

    // Retry with backoff
    public Uni<PaymentResponse> chargeWithRetry(PaymentRequest req) {
        return paymentClient.charge(req)
            .onFailure(RetryableException.class)
            .retry()
            .withBackOff(Duration.ofMillis(200), Duration.ofSeconds(2))
            .atMost(3);
    }
}
```

```java
// === SPRING BOOT — WebFlux combinators ===
@Service
public class OrderService {

    // Parallel async calls
    public Mono<OrderSummary> getOrderSummary(Long orderId) {
        Mono<Order> orderMono = orderRepository.findById(orderId);
        Mono<PaymentInfo> paymentMono = paymentClient.getPayment(orderId);
        Mono<ShippingInfo> shippingMono = shippingClient.getStatus(orderId);

        return Mono.zip(orderMono, paymentMono, shippingMono)
            .map(tuple -> new OrderSummary(tuple.getT1(), tuple.getT2(), tuple.getT3()));
    }

    // Sequential chain with error handling
    public Mono<OrderResult> placeOrder(CreateOrderRequest req) {
        return inventoryClient.reserve(req.productId(), req.quantity())
            .flatMap(reservation -> paymentClient.charge(req.paymentMethod(), req.amount()))
            .flatMap(payment -> persistOrder(req, payment))
            .doOnSuccess(order -> notificationService.sendConfirmation(order))
            .onErrorResume(PaymentException.class,
                ex -> Mono.just(OrderResult.failed("Payment failed: " + ex.getMessage())));
    }

    // Retry with backoff
    public Mono<PaymentResponse> chargeWithRetry(PaymentRequest req) {
        return paymentClient.charge(req)
            .retryWhen(Retry.backoff(3, Duration.ofMillis(200)).maxBackoff(Duration.ofSeconds(2))
                .filter(RetryableException.class::isInstance));
    }
}
```

#### 22.6.3 Virtual Threads (Loom)

```properties
# === QUARKUS — Virtual Threads (3.x+) ===
# No global switch — annotate per-endpoint
```

```java
// Quarkus: @RunOnVirtualThread on blocking endpoints
@GET
@Path("/report")
@RunOnVirtualThread
public ReportDto generateReport(@QueryParam("year") int year) {
    // Blocking I/O runs on virtual thread — no event loop blocking
    return reportService.generateExpensiveReport(year);
}
```

```properties
# === SPRING BOOT — Virtual Threads (3.2+) ===
spring.threads.virtual.enabled=true
# All request handling uses virtual threads automatically
```

---

### 22.7 Synchronous / Blocking Recipes

#### 22.7.1 Blocking REST with Imperative Style

```java
// === QUARKUS — RESTEasy Reactive (blocking annotation) ===
@Path("/api/reports")
@ApplicationScoped
public class ReportResource {

    @Inject ReportService reportService;

    @GET
    @Path("/sales")
    @Blocking   // Offloads to worker thread pool — safe for JDBC/file I/O
    public SalesReport getSalesReport(
            @QueryParam("from") LocalDate from,
            @QueryParam("to") LocalDate to) {
        return reportService.generateSalesReport(from, to);
    }
}
```

```java
// === SPRING BOOT — Standard MVC (blocking by default) ===
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/sales")
    public SalesReport getSalesReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.generateSalesReport(from, to);
    }
}
```

#### 22.7.2 Synchronous REST Client Calls

```java
// === QUARKUS — Synchronous REST Client ===
@RegisterRestClient(configKey = "inventory-api")
@Path("/api/inventory")
public interface InventoryClient {

    @GET
    @Path("/{sku}")
    StockLevel getStock(@PathParam("sku") String sku);     // Blocking call

    @PUT
    @Path("/{sku}/reserve")
    Reservation reserve(@PathParam("sku") String sku, ReserveRequest request);
}

// Called from @Blocking endpoint or worker thread
@Blocking
@GET
@Path("/availability/{sku}")
public AvailabilityResponse checkAvailability(@PathParam("sku") String sku) {
    StockLevel stock = inventoryClient.getStock(sku);     // Synchronous
    PriceInfo price = pricingClient.getPrice(sku);         // Synchronous
    return new AvailabilityResponse(stock, price);
}
```

```java
// === SPRING BOOT — RestClient (synchronous) ===
@Configuration
public class ClientConfig {
    @Bean
    public InventoryClient inventoryClient(RestClient.Builder builder) {
        return HttpServiceProxyFactory
            .builderFor(RestClientAdapter.create(
                builder.baseUrl("https://inventory.example.com").build()))
            .build().createClient(InventoryClient.class);
    }
}

// Called normally — Spring MVC is blocking by default
@GetMapping("/availability/{sku}")
public AvailabilityResponse checkAvailability(@PathVariable String sku) {
    StockLevel stock = inventoryClient.getStock(sku);
    PriceInfo price = pricingClient.getPrice(sku);
    return new AvailabilityResponse(stock, price);
}
```

---

### 22.8 Events & Messaging Recipes

#### 22.8.1 CDI Events — In-Process Event Bus

```java
// === QUARKUS — CDI Events ===

// Event payload
public record OrderPlacedEvent(Long orderId, String customerId, BigDecimal total) {}

// Producer — fires event
@ApplicationScoped
public class OrderService {

    @Inject
    Event<OrderPlacedEvent> orderPlacedEvent;

    @Transactional
    public Order placeOrder(CreateOrderRequest req) {
        Order order = new Order(req);
        order.persist();
        orderPlacedEvent.fire(new OrderPlacedEvent(order.id, req.customerId(), order.total));
        return order;
    }

    // Async fire (non-blocking)
    @Transactional
    public Order placeOrderAsync(CreateOrderRequest req) {
        Order order = new Order(req);
        order.persist();
        orderPlacedEvent.fireAsync(new OrderPlacedEvent(order.id, req.customerId(), order.total));
        return order;
    }
}

// Observer — handles event
@ApplicationScoped
public class NotificationObserver {

    private static final Logger LOG = Logger.getLogger(NotificationObserver.class);

    // Synchronous observer
    public void onOrderPlaced(@Observes OrderPlacedEvent event) {
        LOG.infof("Order %d placed — sending confirmation to %s", event.orderId(), event.customerId());
        sendEmail(event);
    }

    // Async observer
    public void onOrderPlacedAsync(@ObservesAsync OrderPlacedEvent event) {
        LOG.infof("Async processing order %d", event.orderId());
        updateAnalytics(event);
    }
}

// Qualified events for filtering
@Qualifier
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.PARAMETER})
public @interface Priority {
    enum Level { HIGH, LOW }
    Level value();
}
```

```java
// === SPRING BOOT — ApplicationEvent ===

// Event payload
public record OrderPlacedEvent(Long orderId, String customerId, BigDecimal total) {}

// Publisher
@Service
public class OrderService {

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Transactional
    public Order placeOrder(CreateOrderRequest req) {
        Order order = orderRepository.save(new Order(req));
        eventPublisher.publishEvent(new OrderPlacedEvent(order.getId(), req.customerId(), order.getTotal()));
        return order;
    }
}

// Listener — synchronous
@Component
public class NotificationListener {

    @EventListener
    public void onOrderPlaced(OrderPlacedEvent event) {
        sendEmail(event);
    }

    // Async listener
    @Async
    @EventListener
    public void onOrderPlacedAsync(OrderPlacedEvent event) {
        updateAnalytics(event);
    }

    // Transactional event — fires after commit
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void afterOrderCommitted(OrderPlacedEvent event) {
        sendExternalNotification(event);
    }
}
```

#### 22.8.2 Vert.x Event Bus (Quarkus-specific)

```java
// === QUARKUS — Vert.x Event Bus for internal messaging ===
@ApplicationScoped
public class EventBusProducer {

    @Inject
    EventBus eventBus;

    public void notifyOrderPlaced(OrderPlacedEvent event) {
        // Fire-and-forget
        eventBus.publish("order.placed", JsonObject.mapFrom(event));

        // Request-reply pattern
        eventBus.<JsonObject>request("order.validate", JsonObject.mapFrom(event))
            .onItem().transform(Message::body)
            .subscribe().with(
                reply -> LOG.info("Validation result: " + reply),
                failure -> LOG.error("Validation failed", failure)
            );
    }
}

// Consumer
@ApplicationScoped
public class EventBusConsumer {

    @ConsumeEvent("order.placed")
    public void handleOrderPlaced(JsonObject event) {
        LOG.info("Received event: " + event.getString("orderId"));
    }

    @ConsumeEvent("order.validate")
    public JsonObject validateOrder(JsonObject event) {
        // Request-reply — return value is the reply
        boolean valid = performValidation(event);
        return new JsonObject().put("valid", valid);
    }

    // Reactive consumer
    @ConsumeEvent("order.process")
    public Uni<String> processOrder(JsonObject event) {
        return orderService.processAsync(event)
            .onItem().transform(result -> "processed");
    }
}
```

#### 22.8.3 Kafka Messaging

```java
// === QUARKUS — SmallRye Reactive Messaging + Kafka ===
// Dependency: quarkus-smallrye-reactive-messaging-kafka

// Producer
@ApplicationScoped
public class OrderEventProducer {

    @Inject
    @Channel("order-events-out")
    Emitter<OrderEvent> emitter;

    public void sendOrderEvent(OrderEvent event) {
        emitter.send(Message.of(event)
            .withMetadata(OutgoingKafkaRecordMetadata.<String>builder()
                .withKey(event.orderId().toString())
                .withHeaders(new RecordHeaders()
                    .add("event-type", "ORDER_PLACED".getBytes()))
                .build()));
    }
}

// Consumer
@ApplicationScoped
public class OrderEventConsumer {

    @Incoming("order-events-in")
    public CompletionStage<Void> consume(Message<OrderEvent> message) {
        OrderEvent event = message.getPayload();
        LOG.infof("Processing order event: %s", event.orderId());
        processEvent(event);
        return message.ack();
    }

    // Stream processing
    @Incoming("raw-events")
    @Outgoing("processed-events")
    public Multi<ProcessedEvent> processStream(Multi<RawEvent> events) {
        return events
            .filter(e -> e.type().equals("ORDER"))
            .onItem().transform(this::enrichEvent);
    }
}

// application.properties
// mp.messaging.outgoing.order-events-out.connector=smallrye-kafka
// mp.messaging.outgoing.order-events-out.topic=order-events
// mp.messaging.outgoing.order-events-out.value.serializer=io.quarkus.kafka.client.serialization.ObjectMapperSerializer
//
// mp.messaging.incoming.order-events-in.connector=smallrye-kafka
// mp.messaging.incoming.order-events-in.topic=order-events
// mp.messaging.incoming.order-events-in.group.id=order-processor
// mp.messaging.incoming.order-events-in.value.deserializer=com.example.OrderEventDeserializer
```

```java
// === SPRING BOOT — Spring Kafka ===
// Dependency: spring-kafka

// Producer
@Service
public class OrderEventProducer {

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    public void sendOrderEvent(OrderEvent event) {
        kafkaTemplate.send("order-events", event.orderId().toString(), event);
    }

    // With headers
    public void sendWithHeaders(OrderEvent event) {
        ProducerRecord<String, OrderEvent> record =
            new ProducerRecord<>("order-events", event.orderId().toString(), event);
        record.headers().add("event-type", "ORDER_PLACED".getBytes());
        kafkaTemplate.send(record);
    }
}

// Consumer
@Service
public class OrderEventConsumer {

    @KafkaListener(topics = "order-events", groupId = "order-processor")
    public void consume(@Payload OrderEvent event,
                        @Header(KafkaHeaders.RECEIVED_KEY) String key,
                        Acknowledgment ack) {
        LOG.info("Processing order event: {}", event.orderId());
        processEvent(event);
        ack.acknowledge();
    }
}

// application.yml
// spring.kafka.bootstrap-servers: localhost:9092
// spring.kafka.consumer.auto-offset-reset: earliest
// spring.kafka.consumer.group-id: order-processor
```

#### 22.8.4 AMQP / RabbitMQ Messaging

```java
// === QUARKUS — SmallRye Reactive Messaging + AMQP ===
// Dependency: quarkus-smallrye-reactive-messaging-amqp

@ApplicationScoped
public class NotificationProducer {

    @Inject
    @Channel("notifications-out")
    Emitter<NotificationEvent> emitter;

    public void sendNotification(NotificationEvent event) {
        emitter.send(event);
    }
}

@ApplicationScoped
public class NotificationConsumer {

    @Incoming("notifications-in")
    public void consume(NotificationEvent event) {
        LOG.infof("Notification received: %s", event.type());
        dispatchNotification(event);
    }
}

// application.properties
// amqp-host=localhost
// amqp-port=5672
// mp.messaging.outgoing.notifications-out.connector=smallrye-amqp
// mp.messaging.outgoing.notifications-out.address=notifications
// mp.messaging.incoming.notifications-in.connector=smallrye-amqp
// mp.messaging.incoming.notifications-in.address=notifications
```

```java
// === SPRING BOOT — Spring AMQP ===
// Dependency: spring-boot-starter-amqp

@Service
public class NotificationProducer {

    private final RabbitTemplate rabbitTemplate;

    public void sendNotification(NotificationEvent event) {
        rabbitTemplate.convertAndSend("notifications-exchange", "notification.key", event);
    }
}

@Service
public class NotificationConsumer {

    @RabbitListener(queues = "notifications")
    public void consume(NotificationEvent event) {
        LOG.info("Notification received: {}", event.type());
        dispatchNotification(event);
    }
}
```

#### 22.8.5 Scheduled Tasks / Cron Jobs

```java
// === QUARKUS — @Scheduled ===
@ApplicationScoped
public class ScheduledJobs {

    @Scheduled(every = "10s")
    public void pollForUpdates() {
        LOG.info("Polling for updates...");
    }

    @Scheduled(cron = "0 0 2 * * ?")   // Daily at 2 AM
    public void nightlyCleanup() {
        LOG.info("Running nightly cleanup");
        cleanupService.removeExpiredSessions();
    }

    @Scheduled(every = "{cleanup.interval}")   // Configurable interval
    public void configurableTask() {
        // cleanup.interval=30s in application.properties
    }

    // Programmatic scheduler
    @Inject Scheduler scheduler;

    public void pauseJob(String identity) {
        scheduler.pause(identity);
    }
}
```

```java
// === SPRING BOOT — @Scheduled ===
@Component
@EnableScheduling
public class ScheduledJobs {

    @Scheduled(fixedRate = 10000)
    public void pollForUpdates() {
        LOG.info("Polling for updates...");
    }

    @Scheduled(cron = "0 0 2 * * ?")
    public void nightlyCleanup() {
        LOG.info("Running nightly cleanup");
        cleanupService.removeExpiredSessions();
    }

    @Scheduled(fixedRateString = "${cleanup.interval:30000}")
    public void configurableTask() { }
}
```

---

### 22.9 Security Recipes

#### 22.9.1 JWT Authentication

```java
// === QUARKUS — SmallRye JWT ===
// Dependency: quarkus-smallrye-jwt

@Path("/api/secure")
@Authenticated
public class SecureResource {

    @Inject
    JsonWebToken jwt;

    @Inject
    @Claim(standard = Claims.groups)
    Set<String> groups;

    @GET
    @Path("/me")
    public Response currentUser() {
        return Response.ok(Map.of(
            "sub", jwt.getSubject(),
            "name", jwt.getName(),
            "groups", groups,
            "issuer", jwt.getIssuer()
        )).build();
    }

    @GET
    @Path("/admin")
    @RolesAllowed("admin")
    public Response adminOnly() {
        return Response.ok("Admin access granted").build();
    }
}

// application.properties
// mp.jwt.verify.publickey.location=META-INF/resources/publicKey.pem
// mp.jwt.verify.issuer=https://auth.example.com
// smallrye.jwt.path.groups=realm_access/roles
```

```java
// === SPRING BOOT — Spring Security + JWT ===
@RestController
@RequestMapping("/api/secure")
public class SecureController {

    @GetMapping("/me")
    public Map<String, Object> currentUser(@AuthenticationPrincipal Jwt jwt) {
        return Map.of(
            "sub", jwt.getSubject(),
            "name", jwt.getClaimAsString("name"),
            "groups", jwt.getClaimAsStringList("groups"),
            "issuer", jwt.getIssuer().toString()
        );
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('admin')")
    public String adminOnly() {
        return "Admin access granted";
    }
}

// application.yml
// spring.security.oauth2.resourceserver.jwt:
//   issuer-uri: https://auth.example.com
//   jwk-set-uri: https://auth.example.com/.well-known/jwks.json
```

#### 22.9.2 Rate Limiting

```java
// === QUARKUS — Custom rate limiter with interceptor ===
@InterceptorBinding
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimited {
    int maxRequests() default 100;
    int windowSeconds() default 60;
}

@RateLimited
@Interceptor
@Priority(Interceptor.Priority.PLATFORM_BEFORE)
public class RateLimitInterceptor {

    @Inject
    RateLimitService rateLimitService;

    @Inject
    SecurityIdentity identity;

    @AroundInvoke
    public Object checkRate(InvocationContext ctx) throws Exception {
        RateLimited annotation = ctx.getMethod().getAnnotation(RateLimited.class);
        String key = identity.getPrincipal().getName();

        if (!rateLimitService.tryAcquire(key, annotation.maxRequests(), annotation.windowSeconds())) {
            throw new WebApplicationException(Response.status(429)
                .entity(new ErrorResponse("RATE_LIMITED", "Too many requests"))
                .build());
        }
        return ctx.proceed();
    }
}
```

```java
// === SPRING BOOT — Bucket4j or custom filter ===
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String key = request.getRemoteAddr();
        Bucket bucket = buckets.computeIfAbsent(key, k ->
            Bucket.builder()
                .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
                .build());

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(429);
            response.getWriter().write("{\"code\":\"RATE_LIMITED\",\"message\":\"Too many requests\"}");
        }
    }
}
```

---

### 22.10 Recipe Quick-Reference Matrix

| Recipe Category | Quarkus Extension | Spring Boot Starter | Section |
|---|---|---|---|
| **REST CRUD** | `quarkus-rest` (RESTEasy Reactive) | `spring-boot-starter-web` | 22.1.1 |
| **Pagination** | `quarkus-hibernate-orm-panache` | `spring-boot-starter-data-jpa` | 22.1.2 |
| **File Upload** | `quarkus-rest` (Multipart) | `spring-boot-starter-web` | 22.1.3 |
| **SSE Streaming** | `quarkus-rest` (Multi) | `spring-boot-starter-webflux` | 22.1.4 |
| **REST Client** | `quarkus-rest-client` | `spring-boot-starter-web` (RestClient) | 22.1.6 |
| **Exception Handling** | JAX-RS `ExceptionMapper` | `@ControllerAdvice` | 22.2 |
| **Validation** | `quarkus-hibernate-validator` | `spring-boot-starter-validation` | 22.2.3 |
| **JSON Logging** | `quarkus-logging-json` | `logstash-logback-encoder` | 22.3.1 |
| **MDC Tracing** | `ContainerRequestFilter` | `HandlerInterceptor` | 22.3.2 |
| **Audit Logging** | CDI `@Interceptor` | Spring AOP `@Aspect` | 22.3.4 |
| **Health Checks** | `quarkus-smallrye-health` | `spring-boot-starter-actuator` | 22.4.1 |
| **Metrics** | `quarkus-micrometer-registry-prometheus` | `micrometer-registry-prometheus` | 22.4.2 |
| **Distributed Tracing** | `quarkus-opentelemetry` | `micrometer-tracing-bridge-otel` | 22.4.4 |
| **Active Record DB** | `quarkus-hibernate-orm-panache` | — (not available) | 22.5.1 |
| **Repository DB** | `quarkus-hibernate-orm-panache` | `spring-boot-starter-data-jpa` | 22.5.2 |
| **Transactions** | `quarkus-narayana-jta` | `spring-boot-starter-data-jpa` | 22.5.3 |
| **DB Migrations** | `quarkus-flyway` | `flyway-core` | 22.5.4 |
| **Async / Reactive** | Mutiny (`Uni`/`Multi`) | Reactor (`Mono`/`Flux`) | 22.6 |
| **Virtual Threads** | `@RunOnVirtualThread` | `spring.threads.virtual.enabled` | 22.6.3 |
| **Blocking / Sync** | `@Blocking` annotation | Default (Spring MVC) | 22.7 |
| **CDI Events** | `@Observes` / `@ObservesAsync` | `@EventListener` / `@Async` | 22.8.1 |
| **Kafka** | `quarkus-smallrye-reactive-messaging-kafka` | `spring-kafka` | 22.8.3 |
| **AMQP / RabbitMQ** | `quarkus-smallrye-reactive-messaging-amqp` | `spring-boot-starter-amqp` | 22.8.4 |
| **Scheduled Jobs** | `quarkus-scheduler` | `@EnableScheduling` | 22.8.5 |
| **JWT Auth** | `quarkus-smallrye-jwt` | `spring-boot-starter-oauth2-resource-server` | 22.9.1 |
| **Rate Limiting** | Custom CDI interceptor | Bucket4j / custom filter | 22.9.2 |

---

## 23. References & Further Reading

### 23.1 Official Documentation

- [Quarkus Guides](https://quarkus.io/guides/)
- [Quarkus REST Client Reactive Guide](https://quarkus.io/guides/rest-client-reactive)
- [Quarkus CDI Reference](https://quarkus.io/guides/cdi-reference)
- [Quarkus OpenTelemetry Guide](https://quarkus.io/guides/opentelemetry)
- [RESTEasy Reactive Architecture](https://quarkus.io/guides/resteasy-reactive)
- [Spring Boot Reference Documentation](https://docs.spring.io/spring-boot/reference/)
- [Spring Framework Reference](https://docs.spring.io/spring-framework/reference/)
- [Spring Security Reference](https://docs.spring.io/spring-security/reference/)
- [Spring Cloud Documentation](https://spring.io/projects/spring-cloud)
- [MicroProfile REST Client Specification](https://download.eclipse.org/microprofile/microprofile-rest-client-3.0/microprofile-rest-client-spec-3.0.html)

### 23.2 Quarkus GitHub Issues (Header Propagation)

- [#4404](https://github.com/quarkusio/quarkus/issues/4404) — ClientHeadersFactory incomingHeaders empty
- [#14736](https://github.com/quarkusio/quarkus/issues/14736) — Header propagation in reactive
- [#16059](https://github.com/quarkusio/quarkus/issues/16059) — ReactiveClientHeadersFactory
- [#24375](https://github.com/quarkusio/quarkus/issues/24375) — incomingHeaders empty with CDI interceptor
- [#37945](https://github.com/quarkusio/quarkus/issues/37945) — Header propagation improvements

### 23.3 Migration & Comparison Articles

- [Red Hat: Migrating Spring Boot to Quarkus](https://developers.redhat.com/articles/2023/01/10/migrate-spring-boot-quarkus)
- [Quarkus Spring Compatibility Documentation](https://quarkus.io/guides/spring-di)
- [OpenRewrite: Quarkus Migration Recipes](https://docs.openrewrite.org/recipes/quarkus)
- [OpenRewrite: Spring Boot Migration Recipes](https://docs.openrewrite.org/recipes/java/spring)
- [Red Hat Migration Toolkit for Applications](https://developers.redhat.com/products/mta/overview)
- [Spring Boot Migrator (Experimental)](https://github.com/spring-projects-experimental/spring-boot-migrator)
- [InfoQ: Quarkus vs Spring Boot Performance](https://www.infoq.com/articles/quarkus-vs-spring-boot/)
- [Baeldung: Spring Boot vs Quarkus](https://www.baeldung.com/spring-boot-vs-quarkus)
- [DZone: Quarkus vs Spring Boot Comparison](https://dzone.com/articles/quarkus-vs-spring-boot)

### 23.4 Performance Benchmarks & Reports

- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/) — Independent performance comparison
- [Quarkus Performance Reports](https://quarkus.io/blog/tag/performance/) — Official Quarkus benchmarks
- [Spring Boot Performance Tuning Guide](https://docs.spring.io/spring-boot/reference/using/devtools.html)

### 23.5 Books

- *Quarkus in Action* — Alex Soto Bueno, Jason Porter (Manning)
- *Practicing Quarkus* — Antonio Goncalves (free online)
- *Full Stack Quarkus and React* — Marc Nuri San Felix (Packt)
- *Cloud Native Java* — Josh Long, Kenny Bastani (O'Reilly)
- *Spring Boot in Action* — Craig Walls (Manning)
- *Spring Microservices in Action* — John Carnell (Manning)
- *Learning Spring Boot 3.0* — Greg Turnquist (Packt)

### 23.6 Conference Talks

- **Devoxx**: "Quarkus: Supersonic Subatomic Java" — Sanne Grinovero (Red Hat)
- **SpringOne**: "Spring Boot 3 and Beyond" — Josh Long (VMware)
- **QCon**: "Choosing Between Quarkus and Spring Boot" — Various speakers
- **JBCNConf**: "From Spring Boot to Quarkus — A Migration Story" — Community
- **KubeCon**: "Cloud Native Java: Quarkus vs Spring Native" — Multiple sessions

### 23.7 Industry Reports

- [JRebel Java Developer Productivity Report](https://www.jrebel.com/resources/java-developer-productivity-report) — Annual framework usage survey
- [Snyk JVM Ecosystem Report](https://snyk.io/jvm-ecosystem-report/) — Framework adoption trends
- [Stack Overflow Developer Survey](https://survey.stackoverflow.co/) — Framework popularity
- [ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar) — Quarkus rated "Trial" / Spring rated "Adopt"

---

*Document version: March 2026 | Quarkus 3.x (RESTEasy Reactive) | Spring Boot 3.x (Spring 6+)*

---
---

# Quarkus — Complete Knowledge Base

> Supersonic Subatomic Java: everything from origins to Quarkus 4.0 roadmap

---

## Table of Contents

1. [Origins & History — How Quarkus Started](#1-origins--history)
2. [The Quarkus 0.11 Launch — Why It Was Significant](#2-the-quarkus-011-launch)
3. [Maven Build System in Quarkus](#3-maven-build-system)
4. [Build Outputs — fast-jar vs uber-jar](#4-build-outputs)
5. [How Quarkus is Fundamentally Different](#5-how-quarkus-is-fundamentally-different)
6. [Augmentation Deep-Dive](#6-augmentation-deep-dive)
7. [The Extension Model](#7-the-extension-model)
8. [Specifications Supported](#8-specifications-supported)
9. [How Specs Are Implemented](#9-how-specs-are-implemented)
10. [Arc — CDI at Build Time](#10-arc--cdi-at-build-time)
11. [Quarkus 4.0 Roadmap & Jakarta EE 11](#11-quarkus-40-roadmap--jakarta-ee-11)

---

## 1. Origins & History

### The Problem (2016–2017)

By 2016, Red Hat engineers working on the JBoss/WildFly team could see that Java's runtime-heavy framework model was fundamentally incompatible with the cloud-native world Kubernetes was creating:

- Spring Boot apps took **10–30 seconds to start** and consumed **300–800 MB RSS** — acceptable for long-lived monolithic servers, catastrophic for ephemeral pods that Kubernetes restarts on demand
- A typical Spring Boot microservice at 200+ MB RAM was manageable with a handful of services; with 300 microservices on Kubernetes it became an enormous cost
- Kubernetes cluster density (how many pods per node before hitting memory limits) directly determines compute bill — Java was losing this game to Go and Node.js
- GraalVM's `native-image` was emerging but required a "closed world" — no dynamic classloading, all reflection declared at compile time — which was incompatible with runtime-scanning frameworks like Spring, Weld, and WildFly

The root architectural problem: the JVM's initialisation model — classpath scanning, CDI container startup, proxy generation, JIT warmup — was designed for servers provisioned once and left running for months. Not for Kubernetes pods.

### Project Shamrock (2018 Q1)

A small skunkworks team in Red Hat's JBoss division began an internal experiment under the working name **Shamrock** (a nod to Red Hat's Irish office heritage).

**Core team:**
- Jason Greene — project lead, distinguished engineer
- Stuart Douglas — runtime/classloading architecture
- Georgios Andrianakis — CDI/Arc lead
- Martin Kouba — CDI specification expertise
- Stéphane Épardaud — REST/reactive components
- Emmanuel Bernard — co-founder, data architecture

**The thesis:** implement CDI Lite as a build-time annotation processor rather than a runtime container. If the framework's initialisation work is deterministic, it can be done once at build time and the result shipped as bytecode — leaving almost nothing for the JVM to do at startup.

**Vert.x** was chosen as the reactive I/O core — non-blocking, event-driven, cloud-native by design.

### The Breakthrough (2018 Q3)

The first working prototype booted a JAX-RS + CDI application in **under 50ms on JVM** and **under 10ms as a native binary**. Key inventions in this phase:

- The **`@BuildStep` + `@Recorder` pattern** — capturing startup logic as bytecode rather than executing it
- The **deployment JAR / runtime JAR split** — build-time processors kept entirely separate from production code
- First demonstration of GraalVM native compilation working for a real Java framework

An internal Red Hat demo showed a REST + database app starting in **9ms** versus **12 seconds** for the equivalent Spring Boot app.

### Renaming to Quarkus (2018 Q4)

The name "Quarkus" was chosen deliberately: **quark** (subatomic particle — the smallest possible unit of matter) + **us** (Java naming tradition). The tagline coined at this stage: **"Supersonic Subatomic Java"**.

Decisions made:
- Open-source under Apache 2.0
- `quarkus.io` domain registered, GitHub organisation created
- **SmallRye** established as the MicroProfile implementation home (Config, Health, Fault Tolerance, JWT, GraphQL, Reactive Messaging…)

### Timeline of Major Milestones

| Date | Event | Version |
|------|--------|---------|
| Mar 2019 | First public release — GitHub made public, Red Hat Developer blog | 0.11.0 |
| Mar–Nov 2019 | 30 releases in 36 weeks — one every 9 days | 0.12–0.26 |
| Nov 2019 | First stable production release | 1.0.0.Final |
| Apr 2020 | Mutiny reactive library introduced — Uni and Multi | 1.3 |
| Nov 2020 | Dev Services — zero-config local dev with auto-started containers | 1.9–1.10 |
| Jun 2021 | Major reactive rewrite — Vert.x 4, RESTEasy Reactive, Continuous Testing | 2.0.0.Final |
| 2022 | Virtual threads (Loom preview), 400+ extensions, OTel replaces OpenTracing | 2.2–2.16 |
| Apr 2023 | Jakarta EE 10 — `javax.*` → `jakarta.*` namespace migration | 3.0.0.Final |
| Nov 2023 | LTS cadence introduced — every 6 months | 3.6 LTS |
| 2024 | Virtual threads production-ready, LangChain4j AI, 600+ extensions | 3.7–3.17 |
| Mar 2026 | Latest LTS at time of writing | 3.33.1 LTS |
| Nov 2026 | Quarkus 4.0 GA (planned — see section 11) | 4.0 |

---

## 2. The Quarkus 0.11 Launch

### The Java Cloud Problem in March 2019

When Quarkus launched publicly in March 2019, Java was in a genuinely precarious position in the cloud-native world. The frameworks were designed for long-lived application servers — not for Kubernetes pods that are ephemeral, auto-scaled, and restarted constantly.

Specific problems the industry was grappling with:
- Spring Boot consuming high CPU time at startup — bad for Kubernetes HPA (Horizontal Pod Autoscaler) which scales on CPU metrics
- JVM not respecting Kubernetes CPU limits by default — leading to throttling and OOMKilled pods
- Java's complex memory model (heap + metaspace + code cache + thread stacks) making resource requests hard to set correctly
- Java flagged as "not cloud-native" in architectural discussions, losing ground to Go and Node.js for new microservice projects

### What Quarkus 0.11 Demonstrated

The initial launch blog post from Red Hat developers — "Introducing Quarkus: a next-generation Kubernetes native Java framework" — published March 7, 2019 — gave the Java community numbers they hadn't seen before:

| Metric | Spring Boot (equivalent app) | Quarkus 0.11 JVM | Quarkus 0.11 Native |
|--------|------------------------------|-------------------|----------------------|
| Startup time | ~3.7 seconds | ~55ms | ~4ms |
| RSS memory | ~200–300 MB | ~70 MB | ~13 MB |

These weren't just impressive benchmarks. They changed the economic argument for Java on Kubernetes. For the first time, a Java framework using the full enterprise stack (CDI, JAX-RS, JPA, MicroProfile) could compete with Go and Node.js on the metrics that matter for Kubernetes operators: startup latency, memory per pod, cold-start in serverless.

### Why the Community Reacted Strongly

The significance went beyond numbers. What Quarkus proved was something the Java community believed impossible: that you could take the entire enterprise Java ecosystem — Hibernate, CDI, JAX-RS, MicroProfile, GraalVM native — and make it genuinely cloud-native without starting over.

The key features in 0.11:
- **CDI (via Arc)** — build-time wiring, no Weld runtime
- **JAX-RS (via RESTEasy)** — HTTP resources with full annotation support
- **JPA (via Hibernate ORM)** — entity mapping, JPQL
- **MicroProfile Config, Health, JWT RBAC** — cloud-native concerns from day one
- **GraalVM native compilation** — out of the box with no manual `reflect-config.json`
- **Live coding / dev mode** — hot reload without JVM restart, from the very first release
- **Single `application.properties`** — unified configuration following Spring Boot's convention

### The Release Cadence Signal

Quarkus 0.12 shipped just two weeks after 0.11, with 213 issues and PRs included. The team moved in two-week sprints. By the time 1.0.0.Final shipped in November 2019, the project had delivered **30 releases in 36 weeks** — one every 9 days — accumulating 177 contributors and an extension catalogue of 80+ entries all supporting native compilation.

The pace signalled that this was not a research prototype. It was production-bound from day one.

### What Made March 2019 a Genuine Inflection Point

Three forces converged simultaneously:
1. **GraalVM `native-image`** was reaching practical maturity — but needed a closed-world Java framework to work with it
2. **Kubernetes** was crossing the enterprise mainstream threshold — the startup time and memory problem was becoming real money
3. **Serverless** (AWS Lambda, Knative) was being taken seriously — cold starts were now a billing line item

Quarkus was the first Java framework to address all three at once, which is what made the launch matter beyond a good benchmark.

---

## 3. Maven Build System

### The `quarkus` Packaging Type

Maven natively understands `jar`, `war`, `pom`. It has no idea what `quarkus` means until the Quarkus Maven plugin registers itself as a **lifecycle extension**:

```xml
<!-- In pom.xml -->
<packaging>quarkus</packaging>

<plugin>
  <groupId>io.quarkus.platform</groupId>
  <artifactId>quarkus-maven-plugin</artifactId>
  <extensions>true</extensions>  <!-- This registers the 'quarkus' lifecycle -->
</plugin>
```

Without `<extensions>true</extensions>`, Maven fails immediately: `"Unknown packaging: quarkus"`. The flag causes the plugin to register its custom lifecycle bindings that replace the standard `jar` phases.

### The Quarkus Maven Plugin Goals

| Goal | Phase binding | What it does |
|------|--------------|--------------|
| `quarkus:build` | `package` | Augmentation + assembles quarkus-app/ or uber-jar |
| `quarkus:dev` | standalone | Dev mode — live reload on every file change |
| `quarkus:test` | standalone | Continuous testing mode — tests re-run on change |
| `quarkus:generate-code` | `generate-sources` | Code gen from OpenAPI specs, gRPC protos |
| `quarkus:generate-code-tests` | `generate-test-sources` | Same for test sources |
| `quarkus:run` | standalone | Run an already-built package in production mode |
| `quarkus:image-build` | standalone | Build container image via Docker/Jib/Buildah |

### Build Lifecycle

| Phase | Quarkus binding |
|-------|-----------------|
| validate | Standard Maven — no Quarkus bindings |
| generate-sources | `quarkus:generate-code` — OpenAPI stubs, gRPC, extension code gen |
| compile | Standard javac — CDI annotations on disk but NOT yet processed |
| test | `@QuarkusTest` starts full Quarkus in same JVM; Dev Services auto-start |
| **package** | **`quarkus:build` — AUGMENTATION runs here ⚡** |

### Complete annotated pom.xml

```xml
<project>
  <!-- 1. Register the quarkus packaging type -->
  <packaging>quarkus</packaging>

  <properties>
    <quarkus.platform.version>3.33.1</quarkus.platform.version>
    <!-- Set package type permanently instead of on every CLI command -->
    <quarkus.package.jar.type>fast-jar</quarkus.package.jar.type>
  </properties>

  <!-- 2. BOM aligns ALL extension versions — no version needed on individual deps -->
  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>io.quarkus.platform</groupId>
        <artifactId>quarkus-bom</artifactId>
        <version>${quarkus.platform.version}</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>

  <dependencies>
    <!-- No <version> needed — BOM manages it -->
    <dependency>
      <groupId>io.quarkus</groupId>
      <artifactId>quarkus-resteasy-reactive</artifactId>
    </dependency>
    <dependency>
      <groupId>io.quarkus</groupId>
      <artifactId>quarkus-junit5</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>io.quarkus.platform</groupId>
        <artifactId>quarkus-maven-plugin</artifactId>
        <version>${quarkus.platform.version}</version>
        <extensions>true</extensions>  <!-- MANDATORY -->
        <executions>
          <execution>
            <goals>
              <goal>build</goal>
              <goal>generate-code</goal>
              <goal>generate-code-tests</goal>
            </goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>

  <!-- Native build profile -->
  <profiles>
    <profile>
      <id>native</id>
      <activation>
        <property><name>native</name></property>
      </activation>
      <properties>
        <quarkus.package.type>native</quarkus.package.type>
      </properties>
    </profile>
  </profiles>
</project>
```

### Common Commands

```bash
# Dev mode
mvn quarkus:dev
mvn quarkus:dev -Ddebug=true          # Remote debugger on :5005
mvn quarkus:dev -Dsuspend              # Wait for debugger before starting

# Build — fast-jar (default)
mvn package
mvn package -Dquarkus.package.jar.type=fast-jar   # explicit
java -jar target/quarkus-app/quarkus-run.jar

# Build — uber-jar
mvn package -Dquarkus.package.jar.type=uber-jar
java -jar target/my-app-1.0.0-runner.jar

# Testing
mvn test                               # @QuarkusTest (same JVM)
mvn verify                             # + @QuarkusIntegrationTest (packaged app)
mvn quarkus:test                       # Continuous testing in dev mode
mvn test -Dtest=PaymentServiceTest

# Native
mvn package -Pnative
mvn package -Pnative -Dquarkus.native.container-build=true  # Via Docker, no local GraalVM
mvn verify -Pnative                    # Native + integration tests

# Container
mvn package -Dquarkus.container-image.build=true
mvn package -Dquarkus.container-image.push=true
mvn package -Dquarkus.kubernetes.deploy=true
```

### Quarkus Application Profiles

| Profile | Activated by | Config prefix in application.properties |
|---------|-------------|----------------------------------------|
| dev | `mvn quarkus:dev` | `%dev.` |
| test | `mvn test` | `%test.` |
| prod | Packaged app (default) | `%prod.` or no prefix |
| custom | `-Dquarkus.profile=staging` | `%staging.` |

---

## 4. Build Outputs

### fast-jar — Default Package Type (since Quarkus 1.12)

Produces a **layered directory structure** optimised for Docker layer caching. Dependencies, application code, and augmented bytecode live in separate sub-directories.

```
target/
└── quarkus-app/                         ← Deploy this entire directory
    ├── quarkus-run.jar                  ← Thin launcher ~50KB. Entry point only.
    │                                      Uses Class-Path manifest → lib/
    │                                      ⚠ DO NOT copy this JAR alone — it won't work
    ├── app/
    │   └── my-service-1.0.jar           ← YOUR compiled classes only
    ├── lib/
    │   ├── boot/                        ← Quarkus bootstrap JARs
    │   └── main/                        ← All 3rd-party dependencies (~50–200 MB)
    └── quarkus/
        ├── generated-bytecode.jar       ← Augmentation output — pre-wired CDI, routes
        └── transformed-bytecode.jar     ← Interceptor-woven classes
```

**Optimised Dockerfile for fast-jar:**

```dockerfile
FROM eclipse-temurin:21-jre-alpine

# Layer 1 — deps rarely change; Docker reuses from cache on code changes
COPY target/quarkus-app/lib/ /app/lib/

# Layer 2 — changes only on Quarkus version bumps
COPY target/quarkus-app/quarkus/ /app/quarkus/

# Layer 3 — your code; changes every build but is tiny
COPY target/quarkus-app/app/ /app/app/
COPY target/quarkus-app/quarkus-run.jar /app/

ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]
```

### uber-jar — Single Self-Contained JAR

Packs everything — your code, all dependencies, Quarkus runtime — into one executable JAR.

```bash
# Enable uber-jar
mvn package -Dquarkus.package.jar.type=uber-jar

# Or permanently in application.properties:
quarkus.package.jar.type=uber-jar
```

**Output structure:**

```
target/
├── my-app-1.0.0-runner.jar    ← Fat executable (50–150 MB). Everything inside.
│                                 Manifest Main-Class: QuarkusEntryPoint
└── my-app-1.0.0.jar           ← Original thin artifact (NOT runnable)
```

> The `-runner` suffix is deliberate: Quarkus avoids replacing the Maven artifact (used for dependency resolution) with the fat jar. Only the `-runner.jar` is executable.

**Dockerfile for uber-jar:**

```dockerfile
FROM eclipse-temurin:21-jre-alpine
# Single layer — simple but no Docker cache benefit on code changes
COPY target/my-app-*-runner.jar /app/app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### Package Type Comparison

| `quarkus.package.jar.type` | Output | Docker cache | Best for |
|---------------------------|--------|-------------|----------|
| `fast-jar` *(default)* | `quarkus-app/` directory | Excellent — only app layer rebuilds | Containers, Kubernetes |
| `uber-jar` | `*-runner.jar` single file | None — full invalidation every build | Simple VMs, legacy CI/CD |
| `legacy-jar` | `*-runner.jar` + `lib/` | Partial | Older tooling compatibility |
| `native` (via `-Pnative`) | Binary executable | N/A | Maximum perf, serverless |
| `native-sources` | GraalVM inputs | N/A | Custom native pipeline |

---

## 5. How Quarkus is Fundamentally Different

### The Core Paradigm Shift

Every traditional Java framework — Spring Boot, WildFly, Payara — does the same thing at startup: scan classpaths, initialise CDI containers, generate proxies, validate configs. This work is deterministic. Quarkus's breakthrough: **do it once, at build time, and ship the result**.

| Concern | Traditional (Spring/WildFly) | Quarkus |
|---------|------------------------------|---------|
| CDI container | Weld / OpenWebBeans at runtime | Arc — builds concrete classes at build time |
| Proxies | Generated at runtime via cglib | Generated as `.class` files at `mvn package` |
| Reflection | Used freely at runtime | Registered at build time; minimised for native |
| Config failure mode | NPE / exception at runtime | **Build failure** — caught before deployment |
| JPA metamodel | Built at EntityManagerFactory creation | Generated at build by Hibernate extension |
| REST routes | Scanned and registered at startup | Route table serialised at build, replayed at boot |
| Startup time | 2–30 seconds | 5–200ms (JVM), <10ms (native) |
| RSS memory | 200–800 MB | 50–150 MB (JVM), 10–50 MB (native) |

### Traditional Runtime Model

```
JVM starts cold
  → Classpath scanned for annotations         (every class, every start)
  → CDI container initialises                 (discovers beans, resolves graph)
  → Proxies generated in memory               (runtime bytecode via cglib/javassist)
  → Config bindings validated                 (fail at runtime on first access)
  → JPA metamodel built                       (entity scanning + SQL generation)
  → REST routes registered                    (annotation scanning + method wiring)
  → App ready                                 (2–30 seconds of overhead paid every restart)
```

### Quarkus Build-Time Model

```
mvn package — augmentation runs
  → CDI bean graph built, written as bytecode  (zero scanning at JVM startup)
  → Proxies generated as real .class files     (no runtime code generation needed)
  → Config bindings validated and wired        (missing config = BUILD FAILURE)
  → JPA metamodel pre-generated                (no entity scanning at startup)
  → Route table serialised to disk             (replayed in microseconds at boot)

JVM starts
  → Loads pre-computed state                   (sub-100ms ready)
```

### The "Closed World" Assumption

Quarkus works because it bets that at build time, the **complete application is known**. No plugins loaded dynamically at runtime, no classpath mutations. This "closed world" lets the augmentation processor pre-compute the entire application graph.

It is the same bet GraalVM `native-image` makes — and Quarkus's build-time model is exactly what makes native compilation tractable without manual `reflect-config.json` files, because extensions declare all reflection at build time.

---

## 6. Augmentation Deep-Dive

Augmentation is Quarkus's build-time processing pipeline that runs during `mvn package`. It transforms your bytecode and produces a pre-computed application state stored in `quarkus/generated-bytecode.jar`.

### The 5-Stage Pipeline

```
mvn package
  │
  ├── 1. Deployment classpath loaded
  │       -deployment JARs pulled onto classpath (build-time only, never shipped)
  │       These contain @BuildStep processor classes
  │
  ├── 2. BuildStep execution
  │       Each extension's @BuildStep methods run in topological dependency order
  │       They consume BuildItems (inputs) → produce BuildItems (outputs)
  │
  │       Key BuildItems:
  │         BeanArchiveIndexBuildItem     CDI bean discovery results (Jandex index)
  │         GeneratedClassBuildItem       bytecode to write to disk
  │         ReflectiveClassBuildItem      classes to register for GraalVM reflection
  │         AdditionalBeanBuildItem       extra beans to inject into CDI context
  │         RouteBuildItem                REST route table entries
  │
  ├── 3. Bytecode recording via @Recorder
  │       @Recorder classes capture startup logic as bytecode
  │       Instead of executing at JVM start: instructions WRITTEN to .class files
  │       At startup, Quarkus "plays back" the recorded bytecode (microseconds)
  │
  ├── 4. Class transformation
  │       Bytecode visitors modify .class files on disk
  │       Interceptor chains woven in statically (no cglib at runtime)
  │       Subclass proxies written as real .class files
  │
  └── 5. Output assembly
          fast-jar  → target/quarkus-app/
          uber-jar  → target/my-app-runner.jar
          native    → GraalVM native-image compilation trigger
```

### The `@Recorder` Mechanism

A Quarkus `@Recorder` is a class whose method invocations are **intercepted at build time** and serialised as bytecode rather than executed. The result: a startup method in `generated-bytecode.jar` that contains pure pre-computed JVM instructions. When the JVM starts, it runs this pre-baked startup method — no framework, no scanning, just bytecode executing in nanoseconds.

---

## 7. The Extension Model

Every Quarkus integration — CDI, REST, Hibernate, Kafka, OIDC — is an **extension**. Each extension is split into exactly **two Maven artifacts**:

### The Three Layers

```
Your Application
  JAX-RS resources, CDI beans, JPA entities
  Written against standard spec APIs — zero Quarkus-specific imports needed
       ↕
Runtime JAR   (e.g. quarkus-resteasy-reactive)
  Ships in quarkus-app/lib/ — goes to production
  Vert.x handlers, serialisers, codecs
  No build-time logic whatsoever
       ↕
Deployment JAR   (e.g. quarkus-resteasy-reactive-deployment)
  Build classpath ONLY — never ships to production
  Contains @BuildStep processors, ASM bytecode visitors, annotation scanners
  Analyses your code at mvn package, then discarded
```

### Example BuildStep (from inside a deployment module)

```java
// This code runs at BUILD TIME only (mvn package), never at runtime
@BuildStep
RouteBuildItem buildRoutes(
    BeanArchiveIndexBuildItem index,            // input: CDI annotation index
    BuildProducer<ReflectiveClassBuildItem> rc  // output: GraalVM reflection regs
) {
    // Scan @Path, @GET, @POST, @QueryParam from Jandex index
    var routes = scanJaxRsAnnotations(index);

    // Register all param/return types for reflection (native image)
    routes.forEach(r -> rc.produce(
        ReflectiveClassBuildItem.builder(r.paramType()).build()
    ));

    // Produce route table BuildItem — consumed by Vert.x at startup
    return new RouteBuildItem(routes);
}
```

> **Deployment JARs never reach production.** `quarkus-app/lib/` contains only runtime JARs. This is why Quarkus apps are leaner — no framework build machinery ships to prod.

---

## 8. Specifications Supported

### Jakarta EE 10 (10 specs)

| Specification | Version | Quarkus implementation |
|--------------|---------|----------------------|
| Jakarta Core | 10 | Shared contracts, interceptors, annotations |
| CDI Lite | 4.1 | Arc (Quarkus own — build-time) |
| Validation | 3.1 | Hibernate Validator |
| Persistence | 3.2 | Hibernate ORM |
| Transactions | 2.0 | Narayana JTA |
| RESTful Web Services | 3.1 | RESTEasy Reactive |
| JSON Processing | 2.1 | Parsson |
| JSON Binding | 3.0 | Yasson |
| Batch | 2.1 | jBeret |
| Data | 1.0 | Hibernate Data Repositories |

### MicroProfile (12 specs)

| Specification | Version | Quarkus implementation |
|--------------|---------|----------------------|
| Config | 3.1 | SmallRye Config |
| JWT RBAC | 2.1 | SmallRye JWT + Quarkus OIDC |
| Health | 4.0 | SmallRye Health |
| Fault Tolerance | 4.1 | SmallRye Fault Tolerance |
| OpenAPI | 4.0 | SmallRye OpenAPI |
| REST Client | 4.0 | RESTEasy Reactive Client |
| Telemetry | 2.0 | OpenTelemetry SDK bridge |
| Context Propagation | 1.3 | SmallRye Context Propagation |
| Reactive Streams Operators | 3.0 | SmallRye Reactive Streams |
| Reactive Messaging | 3.0 | SmallRye Reactive Messaging |
| GraphQL | 2.0 | SmallRye GraphQL |
| Long Running Actions | 2.0 | Narayana LRA |

### OpenTelemetry (6 signals)

| Signal | Version | Notes |
|--------|---------|-------|
| Trace | 1.39 | W3C TraceContext propagation, SpanId/TraceId |
| Context | 1.39 | Context.current(), Scope, async propagation |
| Baggage | 1.39 | In-band key-value propagation (tenant IDs, correlation) |
| Resource | 1.39 | service.name, service.version attached to all signals |
| Metrics | 1.39 | Counters, Histograms, Gauges — OTLP/Prometheus export |
| Logs | 1.39 | Structured log records with trace correlation |

---

## 9. How Specs Are Implemented

### The Core Principle

Quarkus implements specs — but not by embedding an application server. Each spec is its own extension following the **build-time processing model**. The runtime behaviour is spec-compliant and identical; the initialisation pathway is radically different.

### Spec → Implementation Map

| Specification | Quarkus implementation | Processed | Notes |
|--------------|----------------------|-----------|-------|
| Jakarta CDI Lite 4.1 | **Arc** (Quarkus own) | Build time | Bean graph resolved at build; proxies as `.class` files; no Weld |
| Jakarta RESTful WS 3.1 | **RESTEasy Reactive** | Build time | Routes built at augmentation; dispatched via Vert.x event loop |
| Jakarta Persistence 3.2 | **Hibernate ORM** | Build time | JPA metamodel generated at build; schema validation at package time |
| Jakarta Validation 3.1 | **Hibernate Validator** | Hybrid | Constraint metadata at build; validation at runtime per request |
| Jakarta Transactions 2.0 | **Narayana JTA** | Hybrid | `@Transactional` interceptors woven at build; TX management at runtime |
| Jakarta JSON-P 2.1 | **Parsson** | Runtime | Pure data processing — no framework init needed |
| Jakarta JSON-B 3.0 | **Yasson** | Build time | Serialisation metadata computed at build |
| Jakarta Data 1.0 | **Hibernate Data Repos** | Build time | `@Repository` interfaces → generated concrete CDI beans at build |
| Jakarta Batch 2.1 | **jBeret** | Hybrid | Job XML / step wiring at build; execution at runtime |
| MP Config 3.1 | **SmallRye Config** | Build time | `@ConfigProperty` validated at augmentation — missing config = build failure |
| MP JWT RBAC 2.1 | **SmallRye JWT** | Build time | `@RolesAllowed` interceptors woven at build via Arc |
| MP Health 4.0 | **SmallRye Health** | Build time | `@Liveness/@Readiness` beans discovered; `/health` routes registered at build |
| MP Fault Tolerance 4.1 | **SmallRye FT** | Build time | `@Retry/@CircuitBreaker` interceptors woven at build — zero runtime scanning |
| MP OpenAPI 4.0 | **SmallRye OpenAPI** | Build time | Schema generated from JAX-RS + `@Schema` at build; served as static file |
| MP REST Client 4.0 | **RESTEasy Reactive Client** | Build time | `@RegisterRestClient` interfaces → generated CDI beans; HTTP via Vert.x |
| MP Reactive Messaging 3.0 | **SmallRye Reactive Messaging** | Build time | `@Incoming/@Outgoing` channel graph resolved at build; Kafka/AMQP → Mutiny |
| MP Telemetry 2.0 | **OTel SDK bridge** | Hybrid | SDK configured at build; span/metric recording at runtime |
| MP GraphQL 2.0 | **SmallRye GraphQL** | Build time | Schema from `@GraphQLApi` at build; endpoint registered statically |
| MP Context Propagation 1.3 | **SmallRye Context Prop.** | Hybrid | Context managers wired at build; propagation across async at runtime |
| MP LRA 2.0 | **Narayana LRA** | Hybrid | `@LRA` interceptors woven at build; saga coordination at runtime |
| OTel Trace/Metrics/Logs 1.39 | **OpenTelemetry Java SDK** | Hybrid | Exporters configured at build; signal recording at runtime. Auto-instrumented for HTTP, DB, messaging |

---

## 10. Arc — CDI at Build Time

Arc is Quarkus's own CDI implementation — the clearest example of the build-time model. It implements **CDI Lite 4.1** (not full CDI) because full CDI's dynamic APIs are incompatible with build-time processing.

### What Arc Generates

```java
// YOUR code — pure CDI annotations, nothing Quarkus-specific
@ApplicationScoped
public class PaymentService {
    @Inject AccountRepository repo;
    @Inject AuditLogger audit;
    public Result process(Payment p) { ... }
}

// What Arc generates at BUILD TIME as a real .class file in generated-bytecode.jar:
public class PaymentService_ClientProxy extends PaymentService {
    private final Arc.BeanInstanceHandle<PaymentService> delegate;

    @Override
    public Result process(Payment p) {
        return delegate.get().process(p); // scope-aware delegation
    }
}
// No cglib. No reflection tricks. Just a concrete class loaded directly by JVM.
```

### CDI Lite vs Full CDI

| Feature | Full CDI (Weld) | Arc (CDI Lite) |
|---------|-----------------|----------------|
| `@Inject`, `@ApplicationScoped`, `@RequestScoped` | Runtime | Build time — wired as concrete classes |
| `@Interceptor`, `@Decorator` | Runtime codegen | Woven as bytecode at build |
| `@Produces` / `@Disposes` | Runtime | Build time resolved |
| CDI Events / `@Observes` | Runtime | Build time — observer graph resolved |
| Portable Extensions | Runtime plugin API | Not supported — replaced by `@BuildStep` |
| Dynamic bean registration | At runtime via `BeanManager` | Build time only — closed world |
| Proxy generation | Runtime (cglib/javassist) | Build time (`.class` files on disk) |
| Startup overhead | Seconds (scanning + wiring) | Microseconds (replaying pre-built state) |

### Why CDI Lite, Not Full CDI?

Full CDI allows dynamic bean registration at runtime — `BeanManager.createInjectionTarget()` on arbitrary classes discovered at startup. This fundamentally conflicts with build-time processing: you cannot pre-compute a graph that might change at runtime. CDI Lite excludes these dynamic APIs. In practice, over 99% of enterprise applications never need them.

---

## 11. Quarkus 4.0 Roadmap & Jakarta EE 11

> Source: Official GitHub Discussion #52020, posted by Quarkus maintainer Clément Escoffier (@cescoffier), 15 January 2026. All dates are **no-commitment** targets.

### Release Schedule

| Date | Milestone | Notes |
|------|-----------|-------|
| Mar 2026 | **3.33.1 LTS** — current release | Jakarta EE 10, MP 6, Java 17+ |
| Q2–Q3 2026 | 3.x continues monthly | 3.39 expected ~Sep 2026 as next LTS |
| **Sep 2026** | **4.0 Beta 1** | Feature freeze for breaking changes |
| **Oct 2026** | **4.0 Beta 2** | Stabilisation, extension ecosystem catchup |
| **Nov 2026** | **4.0 GA** | Jakarta EE 11 · Java 21 · JPMS · JLink · AI-native |
| Jan 2027 | 4.1 | First feature release on 4.x train |
| **Feb 2027** | **4.2 LTS** | First 4.x long-term support — enterprise production target |

> 3.x will continue alongside 4.0 development. After 4.0 GA, approximately **one year overlap** before 3.x end-of-life — giving teams in regulated environments with longer change cycles time to migrate.

### Key Themes in Quarkus 4.0

#### 1. New Modular Architecture (JPMS)

- Shift toward a **JPMS (Java Platform Module System)** based architecture
- **JLink integration**: generate minimised container images containing only the modules your app uses — smaller attack surface, smaller image size
- Extension structure re-organised with a built-in linter to enforce quality consistency
- Significant reduction in final container image size expected vs 3.x

#### 2. Java 21 Minimum — Java 17 Potentially Dropped

- **Java 21 LTS** required (virtual threads stable, pattern matching, record patterns)
- Java 17 support under active discussion — community feedback being gathered
- **Java 25** features available as opt-in for newer APIs
- `@RunOnVirtualThread` (virtual threads / Project Loom) becomes first-class, not experimental

#### 3. AI-Native: Agentic Patterns + Context Engineering

Quarkus LangChain4j evolves from AI integration into a full agentic framework:

- **Agentic Patterns**: first-class support for multi-step AI agents with tool calling, memory, and planning
- **Context Engineering**: native API for managing context windows, conversation history, and RAG pipelines
- **Built-in Evaluation**: tools for measuring model response quality and regression testing AI behaviour
- **Non-blocking LangChain4j**: full integration with Mutiny reactive core — no blocking AI calls on the event loop
- Ollama, OpenAI, Hugging Face, Azure OpenAI all via CDI-injectable `@RegisterAiService` interfaces

#### 4. Project Leyden + Semeru AOT

Beyond native image — JVM-based ahead-of-time optimisation for faster warmup without GraalVM:

- **Project Leyden** (OpenJDK): CDS (Class Data Sharing) archive generated at build time — faster first-request latency on standard JVM
- **Semeru shared classes**: IBM's JVM cache for shared class metadata across multiple JVM instances in a pod
- Complements native image — not a replacement. JVM users get faster startup without the native compilation cost (3–10 min build)
- Quarkus augmentation aligns naturally: the closed-world model matches Leyden's requirements

#### 5. Spring Compatibility Improvements

Enhanced migration story for Spring Boot → Quarkus:

- **Spring JDBC Template** compatibility — common in banking/enterprise codebases, previously missing
- Expanded **OpenRewrite** migration recipes for automated Spring Boot → Quarkus conversion
- Better support for Spring Security annotations alongside Quarkus OIDC
- Goal: reduce friction for teams migrating from Spring Boot in regulated financial services environments

#### 6. JMS + CLI Improvements

- **"Just Enough JMS"**: lightweight JMS implementation for legacy messaging integration without full ActiveMQ overhead
- New **Quarkus CLI plugin** to ease re-augmentation — rebuild augmented output without full Maven recompile
- Extension quality linter built into the CLI

### Jakarta EE 11 Spec Alignment in Quarkus 4.0

| Specification | Status in 4.0 | Key change |
|--------------|--------------|-----------|
| **CDI 4.1 Lite** | ✅ Arc deepened | Already in 3.x; further optimised |
| **Jakarta Persistence 3.2** | ✅ Hibernate ORM 7 | Full Jakarta EE 11 alignment |
| **Jakarta Data 1.0** | ✅ **GA stable** | Repository pattern without Panache verbosity |
| Jakarta RESTful WS 4.0 | ✅ RESTEasy Reactive | Minor API additions |
| Jakarta Validation 3.1 | ✅ Hibernate Validator 9 | Already stable in 3.x |
| Jakarta Transactions 2.0 | ✅ Narayana | No breaking change |
| **MicroProfile 7.0** | 🔄 On roadmap | Aligned to Jakarta EE 11 baseline |
| Jakarta JSON-P/B | ✅ Stable | No change |
| Jakarta WebSocket 2.2 | ✅ WebSockets Next | Upgraded in 3.20+ |

> Jakarta EE 11 Core Profile was released December 2024. Web Profile and Full Platform released Q1–Q2 2025. Quarkus 4.0 targets full alignment.

---

## Reference: Key People

| Person | Role |
|--------|------|
| Jason Greene | Quarkus project founder, project lead at inception |
| Emmanuel Bernard | Co-founder, data architecture, CDI expertise |
| Stuart Douglas | Runtime/classloading, dev mode architecture |
| Martin Kouba | Arc (CDI Lite) lead author |
| Georgios Andrianakis | CDI, testing infrastructure |
| Stéphane Épardaud | REST, reactive components |
| Clément Escoffier (cescoffier) | Current maintainer, reactive core, Quarkus 4.0 roadmap lead |

---

## Reference: Quarkus vs Spring Boot Benchmarks (Native, 2025)

| Metric | Spring Boot Native | Quarkus Native | Quarkus JVM |
|--------|-------------------|----------------|-------------|
| Startup time | ~104ms | ~49ms | ~200ms |
| RSS at startup | ~149 MB | ~70 MB | ~150 MB |
| Heap memory | ~11 MB | ~3.2 MB | ~80–120 MB |

*Source: Java Code Geeks 2025 benchmarks, GraalVM 25, simple REST + DB application*

---

---

## Reference: Key Links

### Official

| Resource | URL |
|----------|-----|
| Quarkus Home | https://quarkus.io |
| Quarkus Guides | https://quarkus.io/guides |
| Quarkus Blog | https://quarkus.io/blog |
| Quarkus Zulip Chat | https://quarkusio.zulipchat.com |
| Quarkus Newsletter | https://quarkus.io/newsletter |
| Quarkus YouTube | https://www.youtube.com/@QuarkusIo |

### GitHub

| Resource | URL |
|----------|-----|
| Main Repository | https://github.com/quarkusio/quarkus |
| Quarkus Platform | https://github.com/quarkusio/quarkus-platform |
| Quarkiverse Hub (community extensions) | https://github.com/quarkiverse |
| Project Board — Quarkus 4.0 Planning | https://github.com/orgs/quarkusio/projects/33 |
| Quarkus Discussions | https://github.com/quarkusio/quarkus/discussions |
| Quarkus 4.0 Roadmap Discussion #52020 | https://github.com/quarkusio/quarkus/discussions/52020 |
| Issue Tracker | https://github.com/quarkusio/quarkus/issues |

### Extensions & Ecosystem

| Resource | URL |
|----------|-----|
| Extension Registry | https://quarkus.io/extensions |
| Quarkus Starter (code.quarkus.io) | https://code.quarkus.io |
| SmallRye (MicroProfile implementations) | https://smallrye.io |
| LangChain4j Quarkus Extension | https://github.com/quarkiverse/quarkus-langchain4j |
| Quarkus Super-Heroes Demo | https://github.com/quarkusio/quarkus-super-heroes |

### Specifications

| Resource | URL |
|----------|-----|
| Jakarta EE Specifications | https://jakarta.ee/specifications |
| MicroProfile Specifications | https://microprofile.io/specifications |
| OpenTelemetry Java SDK | https://github.com/open-telemetry/opentelemetry-java |
| GraalVM Native Image | https://www.graalvm.org/latest/reference-manual/native-image |

### Migration & Tooling

| Resource | URL |
|----------|-----|
| Spring Boot → Quarkus Migration Guide | https://quarkus.io/guides/spring-boot-users |
| OpenRewrite Quarkus Recipes | https://docs.openrewrite.org/recipes/quarkus |
| Quarkus CLI Reference | https://quarkus.io/guides/cli-tooling |
| Dev Services Guide | https://quarkus.io/guides/dev-services |
| Quarkus Maven Plugin Reference | https://quarkus.io/guides/maven-tooling |

### Learning & Community

| Resource | URL |
|----------|-----|
| Quarkus "Getting Started" Tutorial | https://quarkus.io/guides/getting-started |
| Quarkus Tips (Quarkus Insights videos) | https://quarkus.io/insights |
| Red Hat Developer — Quarkus Articles | https://developers.redhat.com/products/quarkus |
| Stack Overflow — Quarkus Tag | https://stackoverflow.com/questions/tagged/quarkus |

---

*Last updated: March 2026 — based on Quarkus 3.33.1 LTS and official Quarkus 4.0 roadmap discussion #52020*
