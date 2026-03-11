# Quarkus RESTEasy Reactive — Header Propagation, Internals & Spring Boot Comparison

A comprehensive engineering reference consolidating the internal mechanics of header propagation in RESTEasy Reactive, why `incomingHeaders` is empty in `ClientHeadersFactory`, all proven workarounds, and a side-by-side comparison with Spring Boot MVC, WebFlux, and OpenFeign patterns — researched from Quarkus GitHub issues [#4404](https://github.com/quarkusio/quarkus/issues/4404), [#14736](https://github.com/quarkusio/quarkus/issues/14736), [#16059](https://github.com/quarkusio/quarkus/issues/16059), [#24375](https://github.com/quarkusio/quarkus/issues/24375), and community best practices.

---

## Table of Contents

- [1. Architecture Overview — Internal Pipelines](#1-architecture-overview--internal-pipelines)
  - [1.1 Quarkus RESTEasy Reactive — Full Request Pipeline](#11-quarkus-resteasy-reactive--full-request-pipeline)
  - [1.2 The Bridge Bean Pattern — Production Solution](#12-the-bridge-bean-pattern--production-solution)
  - [1.3 Spring Boot vs Quarkus — Architecture Comparison](#13-spring-boot-vs-quarkus--architecture-comparison)
- [2. Why incomingHeaders Is Empty — Diagnosis Table](#2-why-incomingheaders-is-empty--diagnosis-table)
- [3. @NameBinding Filter vs CDI Interceptor](#3-namebinding-filter-vs-cdi-interceptor)
- [4. Proven Solutions — Header Propagation in Quarkus](#4-proven-solutions--header-propagation-in-quarkus)
- [5. Spring Boot — Header Propagation Patterns](#5-spring-boot--header-propagation-patterns)
- [6. Full Comparison: Quarkus vs Spring Boot](#6-full-comparison-quarkus-vs-spring-boot)
- [7. Consolidated Best Practices](#7-consolidated-best-practices)
- [8. Anti-Patterns](#8-anti-patterns)
- [9. Quarkus Internals Deep Dive](#9-quarkus-internals-deep-dive)
- [10. Testing Strategies](#10-testing-strategies)

---

## 1. Architecture Overview — Internal Pipelines

### 1.1 Quarkus RESTEasy Reactive — Full Request Pipeline

The diagram below shows the complete internal flow of an HTTP request through Quarkus RESTEasy Reactive, and precisely where each mechanism operates. This explains why headers are available in some contexts and empty in others.

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

### 1.2 The Bridge Bean Pattern — Production Solution

The bridge bean pattern solves the problem cleanly by separating concerns: a JAX-RS filter does all HTTP work, a `@RequestScoped` CDI bean carries the context, and both the CDI interceptor and the `ClientHeadersFactory` inject from it.

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

### 1.3 Spring Boot vs Quarkus — Architecture Comparison

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

---

## 2. Why incomingHeaders Is Empty — Diagnosis Table

This is the most common source of confusion. The table below maps every possible call origin to whether the headers are populated.

| Call Origin / Context | JAX-RS Context Active? | HeaderContainer Populated? | incomingHeaders in Factory | Fix |
|---|---|---|---|---|
| JAX-RS resource method body | Yes | Yes | Populated | None needed |
| `ContainerRequestFilter` (JAX-RS) | Yes | Yes | Populated (usually) | None needed |
| CDI `@Interceptor` (`@AroundInvoke`) | No — CDI layer | No | **Empty** | Bridge bean or Vert.x inject |
| Security augmentor / `HttpAuthMechanism` | No — Pre-JAX-RS | No | **Empty** | Vert.x inject only |
| `@Scheduled` / Quartz background job | No — No HTTP ctx | No | **Empty** | Pass headers explicitly |
| Async boundary (`Uni` / `CompletionStage`) | No — Wrong thread | No | **Empty** | `ReactiveClientHeadersFactory` + Vert.x |
| Classic RESTEasy (non-reactive) | Yes | Yes | Populated | None — works by design |

### Why This Happens — Internal Mechanics

```java
// Quarkus internal: HeaderCapturingServerFilter (simplified)
// This filter runs INSIDE the RESTEasy Reactive pipeline
public class HeaderCapturingServerFilter implements ContainerRequestFilter {
    @Override
    public void filter(ContainerRequestContext requestContext) {
        // Populates a HeaderContainer that ClientHeadersFactory reads from
        HeaderContainer container = getHeaderContainer();
        requestContext.getHeaders().forEach(container::put);
    }
}

// Your ClientHeadersFactory receives whatever HeaderContainer has:
public class MyFactory implements ClientHeadersFactory {
    @Override
    public MultivaluedMap<String, String> update(
            MultivaluedMap<String, String> incomingHeaders,  // ← FROM HeaderContainer
            MultivaluedMap<String, String> clientOutgoingHeaders) {
        // If HeaderCapturingServerFilter didn't run → incomingHeaders is EMPTY
        // This happens outside JAX-RS pipeline (CDI interceptors, schedulers, etc.)
    }
}
```

---

## 3. @NameBinding Filter vs CDI Interceptor

### 3.1 Why Your Interceptor Doesn't Fire — Checklist

| Check | `@NameBinding` Filter | CDI `@Interceptor` | Consequence If Wrong |
|---|---|---|---|
| Annotation meta-type | `@NameBinding` (JAX-RS) | `@InterceptorBinding` (CDI) | Interceptor silently ignored — no error |
| `@Priority` required? | No (optional) | **YES — mandatory** | Without it: registered but never invoked |
| Annotation on resource? | Yes — method or class | Yes — method or class | Won't trigger on unannotated targets |
| Annotation on impl class? | Yes — `@Provider` class | Yes — `@Interceptor` class | Discovery fails at startup |
| Works outside JAX-RS? | No — HTTP only | Yes — any CDI bean | Use interceptor for service-layer cross-cutting |
| Abort request early? | `abortWith(Response)` | Must throw exception | Choose filter for auth/validation gating |
| Access method params? | Not available | `InvocationContext.getParameters()` | Use interceptor for method-level logic |
| Access return value? | Not available | `InvocationContext.proceed()` result | Use interceptor for response decoration |
| Header access reliability | `ContainerRequestContext` | `incomingHeaders` empty; use bridge bean | Bridge bean solves both cases |

> **Critical Mistake:** Never use `@NameBinding` as the meta-annotation for a CDI interceptor. They are entirely different systems. `@NameBinding` = JAX-RS provider chain. `@InterceptorBinding` = CDI Arc bean wrapping.

### 3.2 Correct CDI Interceptor Setup

```java
// CORRECT: @InterceptorBinding — NOT @NameBinding
@InterceptorBinding
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface Audited {}


// CORRECT: @Priority is MANDATORY
@Audited
@Interceptor
@Priority(Interceptor.Priority.APPLICATION + 10)
@ApplicationScoped
public class AuditInterceptor {
    @Inject RequestHeaderContext ctx;  // Bridge bean

    @AroundInvoke
    public Object audit(InvocationContext ic) throws Exception {
        String corr = ctx.getCorrelationId();  // available via bridge bean
        log.info("Audit: method={}, correlationId={}",
                 ic.getMethod().getName(), corr);
        return ic.proceed();
    }
}


// Annotation on BOTH the interceptor AND the resource
@Path("/orders")
@ApplicationScoped
@Audited   // ← Required here too
public class OrderResource { }
```

### 3.3 Correct @NameBinding Filter Setup

```java
// Step 1: Define the name binding annotation
@NameBinding
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface RequiresAuth {}


// Step 2: Create the filter with @Provider and the binding annotation
@Provider
@RequiresAuth
@Priority(Priorities.AUTHENTICATION)
public class AuthFilter implements ContainerRequestFilter {
    @Override
    public void filter(ContainerRequestContext ctx) {
        String auth = ctx.getHeaderString("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            ctx.abortWith(Response.status(401)
                .entity("Missing or invalid Authorization header").build());
        }
    }
}


// Step 3: Apply to resource
@Path("/protected")
@RequiresAuth  // ← filter only applies to annotated resources
public class ProtectedResource {
    @GET
    public Response getData() { return Response.ok("secret").build(); }
}
```

---

## 4. Proven Solutions — Header Propagation in Quarkus

> **Golden Rule:** Never rely on `incomingHeaders` in RESTEasy Reactive. Always source from Vert.x `HttpServerRequest` injection or a `@RequestScoped` bridge bean.

### Solution A — Vert.x HttpServerRequest Injection (Recommended)

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

**Usage with MicroProfile REST Client:**

```java
@RegisterRestClient(configKey = "downstream-api")
@RegisterClientHeaders(VertxHeadersFactory.class)
@Path("/api")
public interface DownstreamClient {
    @GET
    @Path("/resource")
    ResourceDto getResource();
}
```

### Solution B — @RequestScoped Bridge Bean (Most Testable)

```java
// 1. Bridge bean — the single source of truth for request context
@RequestScoped
public class RequestHeaderContext {
    private String correlationId = UUID.randomUUID().toString();
    private String authorization;
    private String tenantId;
    private String requestId;

    // getters / setters
    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String id) { this.correlationId = id; }
    public String getAuthorization() { return authorization; }
    public void setAuthorization(String auth) { this.authorization = auth; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String id) { this.tenantId = id; }
    public String getRequestId() { return requestId; }
    public void setRequestId(String id) { this.requestId = id; }
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

        // Primary: bridge bean. Fallback: Vert.x direct.
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

### Solution C — ReactiveClientHeadersFactory (Async Pipelines)

```java
import io.quarkus.rest.client.reactive.ReactiveClientHeadersFactory;

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

**When to use which:**

| Scenario | Solution |
|---|---|
| Simple header propagation, no CDI interceptor needs | **A** — Vert.x inject |
| CDI interceptors need headers + outbound propagation + unit tests | **B** — Bridge bean |
| Reactive `Uni`/`Multi` pipelines with REST client calls | **C** — `ReactiveClientHeadersFactory` |
| Combination of all above | **B + C** — Bridge bean with reactive factory |

---

## 5. Spring Boot — Header Propagation Patterns

### 5.1 Spring Boot MVC (Blocking)

```java
// HandlerInterceptor captures headers → @RequestScope bean
@Component
public class HeaderInterceptor implements HandlerInterceptor {
    private final RequestHeaderContext ctx;

    public HeaderInterceptor(RequestHeaderContext ctx) {
        this.ctx = ctx;
    }

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


// ClientHttpRequestInterceptor propagates to RestTemplate
@Component
public class PropagationInterceptor implements ClientHttpRequestInterceptor {
    private final RequestHeaderContext ctx;

    public PropagationInterceptor(RequestHeaderContext ctx) {
        this.ctx = ctx;
    }

    @Override
    public ClientHttpResponse intercept(HttpRequest req, byte[] body,
            ClientHttpRequestExecution exec) throws IOException {
        req.getHeaders().add("X-Correlation-ID", ctx.getCorrelationId());
        req.getHeaders().add("Authorization",    ctx.getAuthorization());
        if (ctx.getTenantId() != null) {
            req.getHeaders().add("X-Tenant-ID", ctx.getTenantId());
        }
        return exec.execute(req, body);
    }
}
```

### 5.2 Spring Boot WebFlux (Reactive)

```java
// WebFilter stores headers in Reactor Context
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


// WebClient ExchangeFilterFunction reads from Reactor Context
@Bean
public WebClient webClient() {
    return WebClient.builder()
        .filter((req, next) -> Mono.deferContextual(ctx -> {
            ClientRequest modified = ClientRequest.from(req)
                .header("X-Correlation-ID",
                    ctx.getOrDefault("correlationId", "unknown"))
                .header("Authorization",
                    ctx.getOrDefault("authorization", ""))
                .build();
            return next.exchange(modified);
        }))
        .build();
}
```

### 5.3 Spring Cloud OpenFeign (Most Common Enterprise Pattern)

```java
// Feign RequestInterceptor — the de-facto enterprise standard
@Component
public class FeignHeaderInterceptor implements RequestInterceptor {
    private final RequestHeaderContext ctx;

    public FeignHeaderInterceptor(RequestHeaderContext ctx) {
        this.ctx = ctx;
    }

    @Override
    public void apply(RequestTemplate template) {
        if (ctx.getAuthorization() != null)
            template.header("Authorization",    ctx.getAuthorization());
        if (ctx.getCorrelationId() != null)
            template.header("X-Correlation-ID", ctx.getCorrelationId());
        if (ctx.getTenantId() != null)
            template.header("X-Tenant-ID",      ctx.getTenantId());
    }
}


// Feign client — no extra configuration needed
@FeignClient(name = "downstream-service")
public interface DownstreamClient {
    @GetMapping("/resource")
    ResourceDto getResource();
}
```

---

## 6. Full Comparison: Quarkus vs Spring Boot

### 6.1 Feature-by-Feature Comparison

| Feature / Concern | Quarkus RESTEasy Reactive | Spring Boot MVC | Spring Boot WebFlux |
|---|---|---|---|
| **Runtime model** | Non-blocking, Vert.x event loop | Blocking, thread-per-request | Non-blocking, Reactor/Netty |
| **Inbound header filter** | `ContainerRequestFilter` + `@NameBinding` | `OncePerRequestFilter` / `HandlerInterceptor` | `WebFilter` / `HandlerFilterFunction` |
| **CDI / AOP interceptor** | `@Interceptor` + `@InterceptorBinding` + `@Priority` REQUIRED | `@Aspect` (Spring AOP) or `HandlerInterceptor` | `@Aspect` (Spring AOP), Reactor-aware |
| **Context storage** | `@RequestScoped` CDI bean + Vert.x `HttpServerRequest` | `@RequestScope` bean backed by ThreadLocal | Reactor Context (explicit `contextWrite()`) |
| **Outbound client header propagation** | `ClientHeadersFactory` / `ReactiveClientHeadersFactory` | `ClientHttpRequestInterceptor` (RestTemplate) | `ExchangeFilterFunction` (WebClient) |
| **OpenFeign equivalent** | MicroProfile REST Client + `@RegisterClientHeaders` | Spring Cloud OpenFeign + `RequestInterceptor` | N/A — use WebClient |
| **incomingHeaders reliability** | **Unreliable** outside JAX-RS body — use Vert.x inject | ThreadLocal safe (same thread always) | Must use Reactor Context (same challenge as Quarkus) |
| **Auto header propagation config** | `quarkus.rest-client.propagate-headers` (unreliable in reactive) | No built-in — manual wiring required | No built-in — manual ExchangeFilter |
| **Distributed tracing** | `quarkus-opentelemetry` — auto-propagates `traceparent` | Micrometer Tracing — W3C / B3 supported | Micrometer Tracing + WebClient Observation |
| **Async boundary safety** | `ReactiveClientHeadersFactory` + Vert.x inject | ThreadLocal breaks async! Use `@Async` carefully | Reactor Context required — explicit but safe |
| **Unit testability** | Bridge bean easily mockable + `@QuarkusTest` | Easy — MockMvc + `@RequestScope` works | `StepVerifier` needed — Reactor Context test overhead |
| **Startup time** | ~0.5-1s (native: ~20ms) | ~2-5s | ~2-4s |
| **Memory footprint** | ~30-70 MB (native: ~10-30 MB) | ~150-300 MB | ~100-200 MB |
| **Native compilation** | GraalVM (first-class support) | GraalVM (Spring Native, improving) | GraalVM (Spring Native) |
| **Complexity rating** | Medium-High (explicit wiring needed) | Low (ThreadLocal hides complexity) | Medium (Reactor Context verbose) |

### 6.2 Industry-Standard Headers — Financial Services

| Header | Purpose | Protocol Standard | Propagate? | Financial Criticality |
|---|---|---|---|---|
| `Authorization` | Bearer JWT / OAuth2 token | RFC 7235 / OAuth2 | Always | **CRITICAL** — FCA/PRA/PCI-DSS |
| `X-Correlation-ID` | End-to-end trace across hops | De-facto standard | Always | **CRITICAL** — audit trail |
| `X-Request-ID` | Per-hop unique ID | IETF draft / OpenAPI | Yes | HIGH — idempotency |
| `X-Tenant-ID` | Multi-tenancy routing | Internal convention | Yes | HIGH — PCI-DSS isolation |
| `traceparent` | W3C distributed trace | W3C Trace Context | Auto (OTel) | HIGH — observability |
| `X-B3-TraceId` | Zipkin trace ID | Zipkin B3 | Auto (OTel) | HIGH — legacy Zipkin |
| `X-Forwarded-For` | Original client IP | RFC 7239 | Trusted GW only | MEDIUM — fraud/rate-limit |
| `Accept-Language` | Localisation preference | RFC 7231 | When needed | MEDIUM — regulatory comms |
| `Cookie` | Session tokens | RFC 6265 | **Never** verbatim | Leak risk — extract only |
| `Host` | Target host | RFC 7230 | **Never** | HTTP stack sets this |
| `Content-Length` | Body size | RFC 7230 | **Never** | Changes per service |

### 6.3 When to Use Filter vs Interceptor — Decision Matrix

| Use Case | Recommended Mechanism | Stack | Reason |
|---|---|---|---|
| Auth / JWT validation | `ContainerRequestFilter` | Quarkus | Full HTTP ctx; `abortWith()` available |
| Auth / JWT validation | `OncePerRequestFilter` / `HandlerInterceptor` | Spring MVC | `preHandle()` return false aborts |
| Correlation ID extract + MDC | `ContainerRequestFilter` (JAX-RS) | Quarkus | First touch point; full header access |
| Business logic auditing | CDI `@Interceptor` | Quarkus | `InvocationContext` gives method args |
| Metrics / method timing | CDI `@Interceptor` / `@Timed` | Quarkus | `@AroundInvoke` brackets execution |
| Header propagation outbound | Vert.x inject in `ClientHeadersFactory` | Quarkus | `incomingHeaders` unreliable in reactive |
| Rate limiting (global) | `ContainerRequestFilter` | Quarkus | Aborts before any business logic |
| Idempotency key | CDI `@Interceptor` | Quarkus | Access to method signature |
| Feign outbound headers | `RequestInterceptor` | Spring Boot | `apply()` fires for every Feign call |
| WebClient outbound headers | `ExchangeFilterFunction` | Spring WebFlux | `deferContextual()` reads Reactor ctx |
| Distributed tracing | `quarkus-opentelemetry` (auto) | Quarkus | Zero-config `traceparent` propagation |
| Non-HTTP cross-cutting | CDI `@Interceptor` only | Quarkus | Filters are HTTP-only |

---

## 7. Consolidated Best Practices

### 7.1 Quarkus Reactive — Quick Reference

| Scenario | Do This | Avoid |
|---|---|---|
| Read incoming headers in server filter | `ContainerRequestContext.getHeaderString()` | `@Context HttpHeaders` in CDI bean |
| Pass headers to CDI interceptor | `@RequestScoped` bridge bean populated by filter | Injecting `ContainerRequestContext` directly |
| Propagate headers to REST client | `@Inject HttpServerRequest vertxRequest` in factory | Relying on `incomingHeaders` parameter |
| CDI interceptor not firing | Check `@InterceptorBinding` + `@Priority` present | Using `@NameBinding` on interceptor |
| Async Uni pipeline | `ReactiveClientHeadersFactory` | Blocking `ClientHeadersFactory` |
| Auto distributed tracing | `quarkus-opentelemetry` dependency | Manual `traceparent` header copy |
| Security header (non-auth) | Strip or validate in `ContainerRequestFilter` | Blind propagation from client |
| Testing header propagation | `@RequestScoped` bridge bean (mock-friendly) | Depending on Vert.x in unit tests |

### 7.2 Spring Boot — Quick Reference

| Scenario | Do This | Avoid |
|---|---|---|
| Read headers in MVC | `HandlerInterceptor.preHandle()` | Injecting `HttpServletRequest` into singletons |
| Propagate to RestTemplate | `ClientHttpRequestInterceptor` | Manual header setting per-call |
| Propagate to WebClient | `ExchangeFilterFunction` + `deferContextual()` | Storing headers in ThreadLocal for async |
| Propagate to Feign | `RequestInterceptor` bean | `RequestTemplate` manual in each Feign method |
| Async boundary (MVC) | `@Async` loses ThreadLocal! Use `TaskDecorator` | Assuming ThreadLocal survives async |
| Distributed tracing | `spring-boot-starter-actuator` + Micrometer | Manual B3 header copy |

> **Industry Standard:** A single `@RequestScoped` context bean populated by one filter and injected everywhere else is the most maintainable pattern regardless of framework. It creates a clean contract and is trivially mockable in tests.

---

## 8. Anti-Patterns

### 8.1 Quarkus Anti-Patterns

#### Anti-Pattern 1: Trusting `incomingHeaders` in Reactive Mode

```java
// BAD: incomingHeaders is empty outside JAX-RS pipeline
@ApplicationScoped
public class BrokenFactory implements ClientHeadersFactory {
    @Override
    public MultivaluedMap<String, String> update(
            MultivaluedMap<String, String> incomingHeaders,  // ← EMPTY!
            MultivaluedMap<String, String> clientOutgoingHeaders) {
        // This returns nothing useful when called from CDI interceptor
        return incomingHeaders;
    }
}

// GOOD: Use Vert.x injection
@ApplicationScoped
public class WorkingFactory implements ClientHeadersFactory {
    @Inject HttpServerRequest vertxRequest;  // Always populated

    @Override
    public MultivaluedMap<String, String> update(
            MultivaluedMap<String, String> incomingHeaders,
            MultivaluedMap<String, String> clientOutgoingHeaders) {
        MultivaluedHashMap<String, String> result = new MultivaluedHashMap<>();
        String auth = vertxRequest.getHeader("Authorization");
        if (auth != null) result.add("Authorization", auth);
        return result;
    }
}
```

#### Anti-Pattern 2: Using @NameBinding for CDI Interceptors

```java
// BAD: @NameBinding is JAX-RS, not CDI — interceptor will NEVER fire
@NameBinding  // ← WRONG
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface Audited {}

@Audited
@Interceptor  // ← This needs @InterceptorBinding, not @NameBinding
public class AuditInterceptor {
    @AroundInvoke
    public Object audit(InvocationContext ic) throws Exception {
        // Never executed — silent failure
        return ic.proceed();
    }
}

// GOOD: Use @InterceptorBinding
@InterceptorBinding  // ← CORRECT
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface Audited {}
```

#### Anti-Pattern 3: Missing @Priority on CDI Interceptor

```java
// BAD: No @Priority — interceptor is registered but never invoked
@Audited
@Interceptor
@ApplicationScoped
public class AuditInterceptor {
    @AroundInvoke
    public Object audit(InvocationContext ic) throws Exception {
        return ic.proceed();  // Never called
    }
}

// GOOD: @Priority is mandatory
@Audited
@Interceptor
@Priority(Interceptor.Priority.APPLICATION + 10)  // ← REQUIRED
@ApplicationScoped
public class AuditInterceptor { ... }
```

#### Anti-Pattern 4: Injecting ContainerRequestContext into CDI Beans

```java
// BAD: ContainerRequestContext is JAX-RS scoped, not CDI
@ApplicationScoped
public class MyService {
    @Context
    ContainerRequestContext requestContext;  // ← null or stale outside filter chain

    public void doWork() {
        String auth = requestContext.getHeaderString("Authorization");  // NPE
    }
}

// GOOD: Use bridge bean or Vert.x
@ApplicationScoped
public class MyService {
    @Inject RequestHeaderContext ctx;  // Bridge bean — always works

    public void doWork() {
        String auth = ctx.getAuthorization();  // Safe
    }
}
```

#### Anti-Pattern 5: Blocking on Vert.x Event Loop

```java
// BAD: Blocking call on event loop thread
@Path("/data")
public class DataResource {
    @Inject
    @RestClient
    DownstreamClient client;

    @GET
    public Uni<Response> getData() {
        // Thread.sleep or synchronous JDBC on event loop = DEADLOCK
        Thread.sleep(1000);
        return Uni.createFrom().item(client.fetch());
    }
}

// GOOD: Use non-blocking patterns
@Path("/data")
public class DataResource {
    @Inject
    @RestClient
    DownstreamClient client;

    @GET
    public Uni<Response> getData() {
        return Uni.createFrom().item(() -> client.fetch())
            .onItem().delayIt().by(Duration.ofSeconds(1))
            .onItem().transform(data -> Response.ok(data).build());
    }
}
```

#### Anti-Pattern 6: Propagating All Headers Blindly

```java
// BAD: Propagating everything — security and protocol leak risk
@Override
public MultivaluedMap<String, String> update(
        MultivaluedMap<String, String> incomingHeaders,
        MultivaluedMap<String, String> clientOutgoingHeaders) {
    return incomingHeaders;  // Leaks Cookie, Host, Content-Length, etc.
}

// GOOD: Explicit allowlist
private static final Set<String> SAFE_HEADERS = Set.of(
    "Authorization", "X-Correlation-ID", "X-Tenant-ID", "X-Request-ID"
);

@Override
public MultivaluedMap<String, String> update(
        MultivaluedMap<String, String> incomingHeaders,
        MultivaluedMap<String, String> clientOutgoingHeaders) {
    MultivaluedHashMap<String, String> result = new MultivaluedHashMap<>();
    SAFE_HEADERS.forEach(name -> {
        String v = vertxRequest.getHeader(name);
        if (v != null) result.add(name, v);
    });
    return result;
}
```

### 8.2 Spring Boot Anti-Patterns

#### Anti-Pattern 7: Assuming ThreadLocal Survives @Async

```java
// BAD: ThreadLocal is lost when @Async runs on a different thread
@Service
public class MyService {
    @Async
    public CompletableFuture<String> asyncCall() {
        // RequestContextHolder.getRequestAttributes() → null
        String auth = ((ServletRequestAttributes) RequestContextHolder
            .getRequestAttributes()).getRequest().getHeader("Authorization");
        // NPE!
    }
}

// GOOD: Use TaskDecorator to propagate context
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
```

#### Anti-Pattern 8: Injecting HttpServletRequest into Singletons

```java
// BAD: Request-scoped object in singleton scope
@Service
public class HeaderService {
    private final HttpServletRequest request;  // ← Singleton holds request!

    public HeaderService(HttpServletRequest request) {
        this.request = request;  // Same instance for all requests
    }
}

// GOOD: Use @RequestScope bean or inject lazily
@Service
public class HeaderService {
    private final ObjectProvider<HttpServletRequest> requestProvider;

    public HeaderService(ObjectProvider<HttpServletRequest> requestProvider) {
        this.requestProvider = requestProvider;
    }

    public String getAuth() {
        return requestProvider.getObject().getHeader("Authorization");
    }
}
```

---

## 9. Quarkus Internals Deep Dive

### 9.1 Build-Time vs Runtime — The Quarkus Philosophy

Unlike Spring Boot which does most configuration at startup (classpath scanning, condition evaluation, proxy generation), Quarkus moves as much as possible to **build time**:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    BUILD TIME (Maven/Gradle)                         │
│                                                                      │
│  1. Extension processors scan annotations                            │
│  2. CDI bean discovery and validation                                │
│  3. REST endpoint route generation                                   │
│  4. Configuration defaults resolution                                │
│  5. Bytecode generation for proxies and interceptors                │
│  6. Dead code elimination                                            │
│  7. GraalVM native image metadata generation                        │
│                                                                      │
│  Result: Pre-computed application metadata, minimal runtime work     │
├──────────────────────────────────────────────────────────────────────┤
│                    RUNTIME (Application Start)                       │
│                                                                      │
│  1. Read runtime config (application.properties)                    │
│  2. Instantiate pre-resolved beans                                  │
│  3. Start Vert.x event loop                                         │
│  4. Register pre-built routes                                        │
│  5. READY (~0.5-1s JVM, ~20ms native)                               │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.2 CDI — ArC Container vs Spring DI

Quarkus uses **ArC** — a build-time CDI implementation (subset of CDI 4.0):

| Feature | Quarkus ArC | Spring DI |
|---|---|---|
| Bean discovery | Build time | Runtime (classpath scan) |
| Proxy generation | Build time (bytecode) | Runtime (CGLIB/JDK proxy) |
| Scope support | `@ApplicationScoped`, `@RequestScoped`, `@Singleton`, `@Dependent` | `@Singleton`, `@Prototype`, `@RequestScope`, `@SessionScope` |
| Interceptor binding | `@InterceptorBinding` + `@Priority` | `@Aspect` + `@Around` |
| Lazy initialization | Default for `@ApplicationScoped` (proxy) | `@Lazy` annotation |
| Circular dependencies | Build-time error (strict) | Allowed with proxy (can hide bugs) |
| Qualifier | `@Named`, custom `@Qualifier` | `@Qualifier`, `@Primary` |
| Event system | CDI Events (`@Observes`) | `ApplicationEvent` / `@EventListener` |

### 9.3 RESTEasy Reactive vs Spring MVC — Request Threading Model

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
└──────────────────────────────────────────────────────────────────┘
```

### 9.4 Quarkus Extension System

Extensions are the Quarkus equivalent of Spring Boot starters, but with build-time processing:

```
quarkus-extension/
├── deployment/              ← Build-time module
│   ├── src/
│   │   └── MyProcessor.java  ← @BuildStep methods
│   └── pom.xml
└── runtime/                 ← Runtime module
    ├── src/
    │   └── MyRecorder.java    ← Records bytecode for runtime
    └── pom.xml
```

```java
// Build-time processor — runs during Maven/Gradle build
public class MyExtensionProcessor {
    @BuildStep
    AdditionalBeanBuildItem registerBeans() {
        // Register beans at build time — no classpath scanning needed
        return AdditionalBeanBuildItem.builder()
            .addBeanClass(MyHeadersFactory.class)
            .setUnremovable()
            .build();
    }

    @BuildStep
    void configureRoutes(BuildProducer<RouteBuildItem> routes) {
        // Pre-build routes — no reflection at runtime
    }
}
```

### 9.5 Quarkus Configuration System

```properties
# application.properties — Quarkus config

# REST Client configuration
quarkus.rest-client."com.example.DownstreamClient".url=https://api.downstream.com
quarkus.rest-client."com.example.DownstreamClient".scope=jakarta.inject.Singleton
quarkus.rest-client."com.example.DownstreamClient".connect-timeout=5000
quarkus.rest-client."com.example.DownstreamClient".read-timeout=10000

# Using config key (cleaner)
quarkus.rest-client.downstream-api.url=https://api.downstream.com
quarkus.rest-client.downstream-api.scope=jakarta.inject.Singleton

# Header propagation (unreliable in reactive — prefer Vert.x inject)
# quarkus.rest-client.propagate-headers=Authorization,X-Correlation-ID

# Vert.x thread pool tuning
quarkus.vertx.worker-pool-size=20
quarkus.vertx.event-loops-pool-size=4

# HTTP server
quarkus.http.port=8080
quarkus.http.idle-timeout=30s

# OpenTelemetry (auto header propagation)
quarkus.otel.enabled=true
quarkus.otel.exporter.otlp.endpoint=http://otel-collector:4317
quarkus.otel.propagators=tracecontext,baggage
```

### 9.6 Dev Services and Live Coding

One of Quarkus's strongest features — no Spring equivalent:

```properties
# Quarkus automatically starts containers in dev mode
# No configuration needed — just add the extension

# Adds Kafka dev service (auto-starts Redpanda)
# dependency: quarkus-smallrye-reactive-messaging-kafka

# Adds PostgreSQL dev service (auto-starts Postgres container)
# dependency: quarkus-jdbc-postgresql

# Adds Keycloak dev service (auto-starts Keycloak)
# dependency: quarkus-oidc

# Live coding: save file → app reloads in ~0.5s
# mvn quarkus:dev
# gradle quarkusDev
```

---

## 10. Testing Strategies

### 10.1 Quarkus — Testing Header Propagation

```java
// Unit test with mocked bridge bean — no Vert.x dependency
@QuarkusTest
class BridgeHeadersFactoryTest {

    @InjectMock
    RequestHeaderContext ctx;

    @Inject
    BridgeHeadersFactory factory;

    @Test
    void shouldPropagateCorrelationId() {
        when(ctx.getCorrelationId()).thenReturn("test-corr-123");
        when(ctx.getAuthorization()).thenReturn("Bearer token123");

        MultivaluedMap<String, String> result = factory.update(
            new MultivaluedHashMap<>(),  // incomingHeaders (ignored)
            new MultivaluedHashMap<>()   // clientOutgoingHeaders
        );

        assertThat(result.getFirst("X-Correlation-ID")).isEqualTo("test-corr-123");
        assertThat(result.getFirst("Authorization")).isEqualTo("Bearer token123");
    }
}


// Integration test — full HTTP flow
@QuarkusTest
class HeaderPropagationIntegrationTest {

    @Test
    void shouldPropagateHeadersToDownstream() {
        given()
            .header("Authorization", "Bearer jwt-token")
            .header("X-Correlation-ID", "corr-456")
            .header("X-Tenant-ID", "tenant-A")
        .when()
            .get("/api/resource")
        .then()
            .statusCode(200);
        // Verify downstream received headers via WireMock or similar
    }
}
```

### 10.2 CDI Interceptor Testing

```java
@QuarkusTest
class AuditInterceptorTest {

    @InjectMock
    RequestHeaderContext ctx;

    @Inject
    OrderResource orderResource;  // Has @Audited annotation

    @Test
    void interceptorShouldAccessBridgeBean() {
        when(ctx.getCorrelationId()).thenReturn("audit-corr-789");

        // The interceptor fires and reads from bridge bean
        Response response = orderResource.getOrders();

        assertThat(response.getStatus()).isEqualTo(200);
        // Verify MDC was populated, logs were written, etc.
    }
}
```

### 10.3 Spring Boot Equivalent

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class HeaderPropagationTest {

    @Autowired
    TestRestTemplate restTemplate;

    @Test
    void shouldPropagateHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer test-token");
        headers.set("X-Correlation-ID", "test-corr");

        ResponseEntity<String> response = restTemplate.exchange(
            "/api/resource", HttpMethod.GET,
            new HttpEntity<>(headers), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
```

---

## Quick Start — Minimal Quarkus Header Propagation Setup

For teams getting started, here's the minimal production-ready setup:

### Step 1: Dependencies

```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-rest</artifactId>              <!-- RESTEasy Reactive -->
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-rest-client-reactive</artifactId>  <!-- REST Client -->
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-opentelemetry</artifactId>     <!-- Auto tracing -->
</dependency>
```

### Step 2: Bridge Bean + Filter + Factory

Copy [Solution B](#solution-b--requestscoped-bridge-bean-most-testable) from Section 4 above.

### Step 3: REST Client Interface

```java
@RegisterRestClient(configKey = "downstream-api")
@RegisterClientHeaders(BridgeHeadersFactory.class)
@Path("/api/v1")
public interface DownstreamClient {

    @GET
    @Path("/resource/{id}")
    Uni<ResourceDto> getResource(@PathParam("id") String id);

    @POST
    @Path("/resource")
    Uni<ResourceDto> createResource(CreateRequest request);
}
```

### Step 4: Configuration

```properties
quarkus.rest-client.downstream-api.url=https://api.downstream.com
quarkus.rest-client.downstream-api.connect-timeout=5000
quarkus.rest-client.downstream-api.read-timeout=10000
quarkus.otel.enabled=true
```

---

## References

- Quarkus GitHub Issues: [#4404](https://github.com/quarkusio/quarkus/issues/4404), [#14736](https://github.com/quarkusio/quarkus/issues/14736), [#16059](https://github.com/quarkusio/quarkus/issues/16059), [#24375](https://github.com/quarkusio/quarkus/issues/24375), [#37945](https://github.com/quarkusio/quarkus/issues/37945)
- [Quarkus REST Client Reactive Guide](https://quarkus.io/guides/rest-client-reactive)
- [Quarkus CDI Reference](https://quarkus.io/guides/cdi-reference)
- [MicroProfile REST Client Specification](https://download.eclipse.org/microprofile/microprofile-rest-client-3.0/microprofile-rest-client-spec-3.0.html)
- [RESTEasy Reactive Architecture](https://quarkus.io/guides/resteasy-reactive)
- [Quarkus OpenTelemetry Guide](https://quarkus.io/guides/opentelemetry)

---

*Document version: March 2026 | Quarkus 3.x (RESTEasy Reactive) | Spring Boot 3.x*
