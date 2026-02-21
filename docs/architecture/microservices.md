# Microservices Architecture — Patterns & Anti-Patterns

> Comprehensive guide to designing, building, and operating microservices at scale

## Table of Contents

- [Core Principles](#core-principles)
- [Design Patterns](#design-patterns)
- [Communication Patterns](#communication-patterns)
- [Data Management Patterns](#data-management-patterns)
- [Resilience Patterns](#resilience-patterns)
- [Observability](#observability)
- [Anti-Patterns](#anti-patterns)
- [Service Mesh](#service-mesh)
- [Migration Strategies](#migration-strategies)
- [Resources](#resources)

---

## Core Principles

### When to Use Microservices

✅ **Use microservices when:**
- Teams need to deploy independently
- Different services have different scaling needs
- Domain boundaries are well-understood
- Organization has DevOps maturity
- System needs polyglot persistence or processing

❌ **Avoid microservices when:**
- Small team (< 5 engineers)
- Domain is not well-understood yet
- Tight coupling between components
- No CI/CD pipeline or container platform
- Premature optimization of a monolith that works

### The Microservices Tradeoffs

```
┌───────────────────────────────────────────────────────────────┐
│                    WHAT YOU GAIN                               │
├───────────────────────────────────────────────────────────────┤
│ ✅ Independent deployment    ✅ Technology diversity            │
│ ✅ Independent scaling       ✅ Fault isolation                 │
│ ✅ Team autonomy             ✅ Easier to understand per service│
├───────────────────────────────────────────────────────────────┤
│                    WHAT IT COSTS                               │
├───────────────────────────────────────────────────────────────┤
│ ❌ Network complexity        ❌ Data consistency challenges     │
│ ❌ Distributed debugging     ❌ Operational overhead            │
│ ❌ Service discovery          ❌ Testing complexity              │
│ ❌ Latency (network hops)    ❌ Versioning challenges           │
└───────────────────────────────────────────────────────────────┘
```

## Design Patterns

### 1. API Gateway Pattern

Single entry point that routes requests to appropriate microservices.

```
Client → API Gateway → Service A
                    → Service B
                    → Service C
```

**Implementation options:**
| Tool | Provider | Notes |
|------|----------|-------|
| Kong | Open source | Plugin-rich, Lua-based |
| AWS API Gateway | AWS | Managed, integrates with Lambda |
| Apigee | Google Cloud | Enterprise API management |
| Azure API Management | Azure | Managed, policy-based |
| Envoy | CNCF | High-performance proxy |
| Spring Cloud Gateway | VMware | Java-native, reactive |

**Best practices:**
- Keep gateway stateless
- Implement rate limiting and throttling
- Centralize authentication (JWT validation)
- Cache responses at the gateway level
- Use circuit breakers for backend calls

### 2. Backend for Frontend (BFF)

Dedicated backend per frontend type (web, mobile, IoT).

```
Web App    → Web BFF    → Microservices
Mobile App → Mobile BFF → Microservices
IoT Device → IoT BFF   → Microservices
```

### 3. Strangler Fig Pattern

Incrementally migrate from monolith to microservices.

```
Phase 1: Monolith handles all traffic
Phase 2: New service + proxy; route specific paths to new service
Phase 3: More services extracted, monolith shrinks
Phase 4: Monolith fully decomposed or becomes thin shell
```

### 4. Sidecar / Ambassador / Adapter

```
┌─────────────────────────────────┐
│           Pod / Host             │
│  ┌──────────┐  ┌──────────────┐ │
│  │  Service  │  │   Sidecar    │ │
│  │  (app)    │←→│  (logging,   │ │
│  │           │  │   mesh, TLS) │ │
│  └──────────┘  └──────────────┘ │
└─────────────────────────────────┘
```

### 5. Service Decomposition Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **By Business Capability** | Align services with business domains | DDD-driven organizations |
| **By Subdomain** | Bounded contexts from DDD | Complex domains |
| **By Data Ownership** | Each service owns its data | Data-intensive systems |
| **By Team** | One service per team (Conway's Law) | Large organizations |
| **By Volatility** | Separate frequently changing parts | Mixed change rates |

## Communication Patterns

### Synchronous

| Pattern | Protocol | Use Case |
|---------|----------|----------|
| **REST** | HTTP/1.1 or HTTP/2 | CRUD operations, public APIs |
| **gRPC** | HTTP/2 + Protobuf | Service-to-service, low latency, streaming |
| **GraphQL** | HTTP | Flexible queries, BFF layer |

### Asynchronous

| Pattern | Implementation | Use Case |
|---------|---------------|----------|
| **Event-Driven** | Kafka, RabbitMQ, Pulsar | Decoupled services, event sourcing |
| **Message Queue** | SQS, RabbitMQ | Task distribution, workload buffering |
| **Pub/Sub** | SNS, Kafka, Google Pub/Sub | Broadcasting events to multiple consumers |
| **Event Streaming** | Kafka, Kinesis, EventHub | Real-time data pipelines |

### Choreography vs Orchestration

```
CHOREOGRAPHY (event-driven):
  Order Created → [Payment Service listens] → Payment Processed → [Shipping listens]
  ✅ Loose coupling, ❌ Hard to track flow

ORCHESTRATION (central coordinator):
  Saga Orchestrator → Create Order → Process Payment → Ship Order
  ✅ Clear workflow, ❌ Single point of coordination
```

## Data Management Patterns

### Database per Service

Each microservice owns its database — the foundational data pattern.

```
Service A → PostgreSQL
Service B → MongoDB
Service C → Redis
Service D → DynamoDB
```

### Saga Pattern

Manages distributed transactions across services.

**Choreography-based Saga:**
```
Order Service → publishes "OrderCreated"
Payment Service → listens, processes, publishes "PaymentCompleted"
Inventory Service → listens, reserves, publishes "InventoryReserved"
Shipping Service → listens, ships
```

**Orchestration-based Saga:**
```
Saga Orchestrator:
  1. Create Order → success
  2. Process Payment → success
  3. Reserve Inventory → FAILURE
  4. Compensate: Refund Payment → Fail Order
```

### CQRS (Command Query Responsibility Segregation)

```
Commands (Write) → Write Model → Event Store
                                      ↓
Queries (Read)  ← Read Model  ← Projection/Materialized View
```

### Event Sourcing

Store state as a sequence of events, not current state.

```
Events:
  1. AccountCreated { id: 123, name: "Alice" }
  2. MoneyDeposited { amount: 1000 }
  3. MoneyWithdrawn { amount: 200 }
  4. MoneyDeposited { amount: 500 }

Current State: Balance = 1000 - 200 + 500 = 1300
```

### Transactional Outbox

Guarantees at-least-once delivery of events alongside database writes.

```
1. Write to business table + outbox table in ONE transaction
2. Background process reads outbox → publishes to message broker
3. Mark outbox entry as published
```

## Resilience Patterns

### Circuit Breaker

```
States: CLOSED → OPEN → HALF-OPEN → CLOSED
         ↑                              │
         └──────────────────────────────┘

CLOSED:    Requests pass through, failures counted
OPEN:      Requests immediately fail (fast-fail)
HALF-OPEN: Limited requests test if service recovered
```

**Implementations:** Resilience4j (Java), Polly (.NET), gobreaker (Go), Hystrix (legacy)

### Bulkhead

Isolate failures so one failing component doesn't take down everything.

```
Thread Pool Bulkhead:
  Service A calls → [Pool 1: 10 threads] → Payment Service
                  → [Pool 2: 5 threads]  → Notification Service
                  → [Pool 3: 20 threads] → Order Service
```

### Retry with Exponential Backoff

```
Attempt 1: immediate
Attempt 2: wait 100ms
Attempt 3: wait 200ms
Attempt 4: wait 400ms
Attempt 5: wait 800ms + jitter
```

### Timeout Pattern

Always set timeouts — never wait forever.

| Timeout Type | Typical Value | Purpose |
|-------------|--------------|---------|
| Connection timeout | 1-5s | Fail fast if service unreachable |
| Read timeout | 5-30s | Limit wait for response |
| Circuit breaker timeout | 30-60s | Time in OPEN state |
| Retry total timeout | 30-120s | Overall operation limit |

### Rate Limiting

```
Token Bucket:
  - Bucket fills at constant rate (e.g., 100 requests/second)
  - Each request consumes a token
  - No tokens = request rejected (429 Too Many Requests)

Sliding Window:
  - Track requests in sliding time window
  - Smoother than fixed window
```

## Observability

### The Three Pillars

| Pillar | Tool | Purpose |
|--------|------|---------|
| **Logs** | ELK Stack, Loki, CloudWatch Logs | What happened |
| **Metrics** | Prometheus + Grafana, Datadog, CloudWatch | How is it performing |
| **Traces** | Jaeger, Zipkin, Tempo, X-Ray | Request flow across services |

### OpenTelemetry

The industry standard for instrumentation:

```
Application → OTel SDK → OTel Collector → Backend (Jaeger, Prometheus, etc.)
```

### Distributed Tracing

```
Request: GET /orders/123
  ├── api-gateway (12ms)
  │   ├── auth-service (3ms)
  │   └── order-service (45ms)
  │       ├── db-query (15ms)
  │       ├── payment-service (20ms)
  │       └── notification-service (5ms, async)
```

### Health Checks

```
/health/live    → Is the process running? (Kubernetes liveness)
/health/ready   → Can it serve traffic? (Kubernetes readiness)
/health/startup → Has it finished initializing? (Kubernetes startup)
```

## Anti-Patterns

### ❌ Distributed Monolith

**Symptom:** All services must deploy together; changes cascade across services.

**Root Cause:** Tight coupling — shared databases, synchronous call chains, shared code libraries.

**Fix:** Enforce service boundaries, use async communication, database-per-service.

### ❌ Nano-services

**Symptom:** Dozens of tiny services that do almost nothing individually.

**Root Cause:** Over-decomposition — splitting before understanding domain boundaries.

**Fix:** Start with a modular monolith, extract services when boundaries are proven.

### ❌ Shared Database

**Symptom:** Multiple services read/write the same database tables.

**Root Cause:** Convenience over correctness — bypasses service boundaries.

**Fix:** Each service owns its data. Use events or APIs for data sharing.

### ❌ Synchronous Chain

**Symptom:** `A → B → C → D` — long synchronous call chains with cascading failures.

**Root Cause:** RPC-everywhere mindset from monolith.

**Fix:** Use async messaging, event-driven architecture, or CQRS.

### ❌ No API Versioning

**Symptom:** Breaking changes cause consumer outages.

**Root Cause:** No contract-first approach.

**Fix:** Semantic versioning, backward-compatible changes, consumer-driven contracts (Pact).

### ❌ Chatty Services

**Symptom:** Hundreds of fine-grained calls between services per request.

**Root Cause:** Service boundaries aligned with data, not business capabilities.

**Fix:** Coarse-grained APIs, BFF pattern, data aggregation.

### ❌ Hardcoded Service URLs

**Symptom:** Services break when endpoints change.

**Root Cause:** No service discovery.

**Fix:** Use service discovery (Consul, Eureka) or DNS-based routing (Kubernetes Services).

### ❌ Missing Idempotency

**Symptom:** Duplicate payments, double-bookings on retry.

**Root Cause:** No idempotency keys on mutating operations.

**Fix:** Use idempotency keys, at-least-once delivery + deduplication.

### Anti-Pattern Summary

| Anti-Pattern | Detection Signal | Severity |
|-------------|-----------------|----------|
| Distributed Monolith | Can't deploy independently | Critical |
| Shared Database | Multiple services same tables | Critical |
| Nano-services | > 1 service per developer | High |
| Synchronous Chain | > 3 hops deep | High |
| Chatty Services | > 10 calls per user request | High |
| No Versioning | Consumer breaks on deploy | Medium |
| Hardcoded URLs | Config changes need redeploy | Medium |
| Missing Idempotency | Duplicate side effects on retry | High |

## Service Mesh

### What It Solves

Offloads networking concerns (TLS, retries, observability) from application code to infrastructure.

```
┌────────────────────┐    ┌────────────────────┐
│  Service A         │    │  Service B         │
│  ┌──────────────┐  │    │  ┌──────────────┐  │
│  │  Application │  │    │  │  Application │  │
│  └──────┬───────┘  │    │  └──────┬───────┘  │
│  ┌──────┴───────┐  │    │  ┌──────┴───────┐  │
│  │  Envoy Proxy │←─┼────┼─→│  Envoy Proxy │  │
│  └──────────────┘  │    │  └──────────────┘  │
└────────────────────┘    └────────────────────┘
         ↑                         ↑
         └─────────┬───────────────┘
            Control Plane (Istio/Linkerd)
```

### Comparison

| Feature | Istio | Linkerd | Consul Connect |
|---------|-------|---------|----------------|
| **Data Plane** | Envoy | linkerd2-proxy (Rust) | Envoy |
| **Complexity** | High | Low | Medium |
| **Performance** | Good | Better (lighter proxy) | Good |
| **mTLS** | Yes | Yes | Yes |
| **Traffic Management** | Advanced | Basic | Basic |
| **Multi-cluster** | Yes | Yes | Yes |
| **Best For** | Large enterprises | Simplicity-focused | HashiCorp stack |

## Migration Strategies

### Monolith to Microservices

**Phase 1: Modular Monolith**
```
Monolith → Split into modules with clear boundaries
         → Enforce module interfaces (no cross-module DB access)
         → Add integration tests at module boundaries
```

**Phase 2: Extract First Service**
```
Pick the easiest, most independent module
Deploy as separate service behind API Gateway
Use Strangler Fig — route traffic incrementally
```

**Phase 3: Iterate**
```
Extract next service based on:
  - Business value of independence
  - Team ownership boundaries
  - Scaling needs
  - Technology mismatch
```

**Phase 4: Decompose Data**
```
Split shared database into per-service databases
Implement data synchronization (events, CDC)
Handle data consistency with Sagas
```

---

## Resources

### Books

- **"Building Microservices"** — Sam Newman (2nd edition)
- **"Microservices Patterns"** — Chris Richardson
- **"Monolith to Microservices"** — Sam Newman
- **"Domain-Driven Design"** — Eric Evans
- **"Release It!"** — Michael Nygard (resilience patterns)
- **"Designing Distributed Systems"** — Brendan Burns

### Key Websites

- [microservices.io](https://microservices.io/) — Chris Richardson's patterns catalog
- [12factor.net](https://12factor.net/) — Twelve-Factor App methodology
- [martinfowler.com/microservices](https://martinfowler.com/microservices/) — Martin Fowler's articles
- [CNCF Landscape](https://landscape.cncf.io/) — Cloud-native tools map

### GitHub Repositories

- [awesome-microservices](https://github.com/mfornos/awesome-microservices)
- [microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Google's sample app
- [eShopOnContainers](https://github.com/dotnet-architecture/eShopOnContainers) — Microsoft's reference
- [ftgo-application](https://github.com/microservices-patterns/ftgo-application) — Chris Richardson's book code

---

*"Don't start with microservices. Start with a modular monolith and extract services when you have a proven need." — Sam Newman*
