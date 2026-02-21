# Dynatrace — Monitoring, Logging & Dashboards for Microservices

> Building production-grade observability with Dynatrace — from instrumentation to beautiful dashboards with working examples

## Table of Contents

- [Why Dynatrace](#why-dynatrace)
- [Architecture & Concepts](#architecture--concepts)
- [Instrumentation](#instrumentation)
- [Metrics, Logs & Traces](#metrics-logs--traces)
- [Dashboard Design](#dashboard-design)
- [Working Dashboard Examples](#working-dashboard-examples)
- [Alerting & SLOs](#alerting--slos)
- [Microservices System Design](#microservices-system-design)
- [Spring Boot Integration](#spring-boot-integration)
- [Log Management](#log-management)
- [Advanced Patterns](#advanced-patterns)
- [Anti-Patterns](#anti-patterns)
- [Best Practices Checklist](#best-practices-checklist)
- [Resources](#resources)

---

## Why Dynatrace

| Capability | Dynatrace | Prometheus + Grafana | Datadog | New Relic |
|-----------|-----------|---------------------|---------|-----------|
| **Auto-instrumentation** | OneAgent (automatic) | Manual | Agent-based | Agent-based |
| **AI-powered root cause** | Davis AI (built-in) | Manual | Watchdog | Applied Intelligence |
| **Distributed tracing** | PurePath (automatic) | Manual (OTel) | APM (auto) | APM (auto) |
| **Log analytics** | Grail (DQL) | Loki | Log Management | Logs |
| **Real user monitoring** | RUM (automatic) | Manual | RUM | Browser agent |
| **Kubernetes monitoring** | ActiveGate + Operator | Exporters | Agent | Agent |
| **Cost** | Premium | Free (DIY ops) | Usage-based | Usage-based |
| **Best for** | Enterprise, auto-everything | Cost-conscious, customizable | Multi-cloud, hybrid | Full-stack, simple |

**Dynatrace differentiators:**
- **OneAgent** — Single agent auto-discovers and instruments everything
- **Smartscape** — Real-time topology map of all dependencies
- **Davis AI** — Root cause analysis with zero configuration
- **PurePath** — End-to-end distributed traces (automatic)
- **Grail** — Unified data lakehouse for metrics, logs, traces, events

---

## Architecture & Concepts

### Dynatrace Components

```
┌──────────────────────────────────────────────────────────────┐
│                    Dynatrace SaaS / Managed                   │
│  ┌───────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Davis AI      │  │  Grail      │  │  Smartscape      │   │
│  │  (root cause)  │  │  (data lake)│  │  (topology map)  │   │
│  └───────────────┘  └─────────────┘  └──────────────────┘   │
│                           ▲                                   │
└───────────────────────────┼───────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │      ActiveGate           │  ← Routing, buffering, API
              └─────────────┬─────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
  ┌──────▼─────┐   ┌──────▼──────┐   ┌──────▼──────┐
  │  OneAgent   │   │  OneAgent   │   │  OneAgent   │
  │  (Host 1)   │   │  (Host 2)   │   │  (K8s Pod)  │
  │  - JVM      │   │  - Node.js  │   │  - Go       │
  │  - OS       │   │  - Docker   │   │  - Python   │
  │  - Network  │   │  - Logs     │   │  - Logs     │
  └─────────────┘   └─────────────┘   └─────────────┘
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **OneAgent** | Auto-instrumenting agent deployed on hosts/pods |
| **ActiveGate** | Proxy for routing data, API access, synthetic monitoring |
| **PurePath** | End-to-end distributed trace (request → all services → response) |
| **Smartscape** | Real-time topology: processes, services, hosts, applications |
| **Davis AI** | AI engine for root cause analysis and anomaly detection |
| **Grail** | Unified data platform (metrics, logs, traces, events, business data) |
| **DQL** | Dynatrace Query Language (SQL-like for Grail data) |
| **Entity** | Anything monitored: host, service, process, application |
| **Custom metric** | User-defined metrics via API, OneAgent SDK, or Micrometer |
| **SLO** | Service Level Objective — target reliability/performance goals |

---

## Instrumentation

### Auto-Instrumentation (Zero Code)

OneAgent automatically captures:
- HTTP request/response (Spring MVC, JAX-RS, Servlet)
- Database calls (JDBC, JPA, MongoDB)
- External HTTP calls (WebClient, RestTemplate, HttpClient)
- Message broker interactions (Kafka, RabbitMQ, JMS)
- Thread and memory metrics
- Garbage collection
- Network I/O and disk I/O

### Custom Instrumentation with Micrometer

```java
// Spring Boot + Micrometer → Dynatrace integration
// pom.xml
// <dependency>
//     <groupId>io.micrometer</groupId>
//     <artifactId>micrometer-registry-dynatrace</artifactId>
// </dependency>

@Configuration
public class MetricsConfig {

    @Bean
    public MeterRegistryCustomizer<DynatraceMeterRegistry> metricsCommonTags() {
        return registry -> registry.config()
            .commonTags(
                "app", "order-service",
                "env", System.getenv("ENV"),
                "version", BuildInfo.getVersion()
            );
    }
}
```

### Custom Business Metrics

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final MeterRegistry meterRegistry;
    private final Counter orderCounter;
    private final Timer orderProcessingTimer;
    private final DistributionSummary orderValueSummary;

    @PostConstruct
    void initMetrics() {
        orderCounter = Counter.builder("orders.created")
            .description("Total orders created")
            .tag("channel", "web")
            .register(meterRegistry);

        orderProcessingTimer = Timer.builder("orders.processing.time")
            .description("Time to process an order")
            .publishPercentiles(0.5, 0.95, 0.99)
            .publishPercentileHistogram()
            .register(meterRegistry);

        orderValueSummary = DistributionSummary.builder("orders.value")
            .description("Order value distribution")
            .baseUnit("usd")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(meterRegistry);
    }

    public Order createOrder(OrderRequest request) {
        return orderProcessingTimer.record(() -> {
            Order order = processOrder(request);

            orderCounter.increment();
            orderValueSummary.record(order.getTotal().doubleValue());

            // Tag-based metrics for dimensions
            meterRegistry.counter("orders.created",
                "channel", request.getChannel(),
                "region", request.getRegion(),
                "payment_method", request.getPaymentMethod()
            ).increment();

            return order;
        });
    }
}
```

### Custom Spans and Traces

```java
// OpenTelemetry instrumentation (Dynatrace supports OTel natively)
@Service
public class PaymentService {

    private final Tracer tracer;

    public PaymentResult processPayment(PaymentRequest request) {
        Span span = tracer.spanBuilder("payment.process")
            .setAttribute("payment.method", request.getMethod())
            .setAttribute("payment.amount", request.getAmount())
            .setAttribute("payment.currency", request.getCurrency())
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            // Validate payment
            Span validationSpan = tracer.spanBuilder("payment.validate").startSpan();
            try {
                validatePayment(request);
            } finally {
                validationSpan.end();
            }

            // Charge payment gateway
            Span chargeSpan = tracer.spanBuilder("payment.charge")
                .setAttribute("gateway", "stripe")
                .startSpan();
            try {
                return chargeGateway(request);
            } finally {
                chargeSpan.end();
            }
        } catch (Exception e) {
            span.setStatus(StatusCode.ERROR, e.getMessage());
            span.recordException(e);
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### Dynatrace OneAgent SDK (Advanced)

```java
// Fine-grained custom tracing beyond auto-instrumentation
import com.dynatrace.oneagent.sdk.api.*;

OneAgentSDK oneAgentSdk = OneAgentSDKFactory.createInstance();

// Custom service entry point
IncomingRemoteCallTracer tracer = oneAgentSdk.traceIncomingRemoteCall(
    "processOrder", "OrderService", "grpc://order-service:50051");
tracer.setDynatraceStringTag(incomingTag);
tracer.start();
try {
    processOrder(order);
} catch (Exception e) {
    tracer.error(e);
    throw e;
} finally {
    tracer.end();
}
```

---

## Metrics, Logs & Traces

### The Three Pillars in Dynatrace

```
                    ┌─────────────────┐
                    │   Grail (DQL)    │ ← Unified query across all data
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
     ┌──────▼──────┐  ┌────▼─────┐  ┌──────▼──────┐
     │   Metrics    │  │   Logs   │  │   Traces    │
     │              │  │          │  │ (PurePaths) │
     │ - Counter    │  │ - Ingest │  │ - Spans     │
     │ - Gauge      │  │ - Parse  │  │ - Waterfall │
     │ - Timer      │  │ - Index  │  │ - Service   │
     │ - Histogram  │  │ - Alert  │  │   flow      │
     └─────────────┘  └──────────┘  └─────────────┘
```

### DQL (Dynatrace Query Language)

```sql
-- Service response time percentiles
fetch dt.entity.service
| filter entity.name == "order-service"
| fieldsAdd responseTime = dt.service.response_time

-- Error rate by service
fetch logs
| filter loglevel == "ERROR"
| summarize errorCount = count(), by: {dt.entity.service}
| sort errorCount desc

-- Kafka consumer lag
fetch metrics
| metric kafka.consumer.lag
| filter consumer_group == "order-service"
| summarize avg(value), by: {topic, partition}

-- Business metric: orders per region
fetch metrics
| metric orders.created
| summarize sum(value), by: {region, interval: 5m}

-- Trace analysis: slow requests
fetch spans
| filter duration > 5000000000  -- 5 seconds in nanoseconds
| fields trace_id, span.name, duration, dt.entity.service
| sort duration desc
| limit 20

-- Log correlation with traces
fetch logs
| filter trace_id == "abc123"
| sort timestamp asc
| fields timestamp, content, loglevel, dt.entity.service
```

---

## Dashboard Design

### Dashboard Design Principles

| Principle | Description |
|-----------|-------------|
| **Audience-first** | Exec dashboard ≠ engineer dashboard ≠ SRE dashboard |
| **Top-down** | Start with business KPIs → drill into technical metrics |
| **RED method** | Rate, Errors, Duration — for every service |
| **USE method** | Utilization, Saturation, Errors — for every resource |
| **Golden signals** | Latency, traffic, errors, saturation |
| **5-second rule** | Dashboard should answer "is everything OK?" in 5 seconds |
| **No vanity metrics** | Every metric should drive a decision or action |

### Dashboard Hierarchy

```
Level 1: Executive Dashboard
  → Business KPIs, revenue impact, SLO status

Level 2: Platform Overview
  → Service health, error rates, latency across all services

Level 3: Service Dashboard
  → Deep dive into a specific service (API, DB, Kafka, cache)

Level 4: Investigation Dashboard
  → Traces, logs, anomalies for troubleshooting
```

### Color Coding Standards

| Color | Meaning | Use For |
|-------|---------|---------|
| Green | Healthy / Within SLO | Status indicators, SLO compliance |
| Yellow/Amber | Warning / Degraded | Approaching thresholds |
| Red | Critical / SLO breach | Errors, outages, breached SLOs |
| Blue | Informational | Traffic, throughput (neutral) |
| Gray | No data / Inactive | Disabled services |

---

## Working Dashboard Examples

### 1. Microservices Platform Overview Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                   MICROSERVICES PLATFORM OVERVIEW                     │
│                   Last updated: 2025-01-15 14:30 UTC                 │
├────────────┬────────────┬────────────┬────────────┬────────────────┤
│  Services  │  Requests  │ Error Rate │  P99 Lat   │   SLO Status   │
│    12/12   │  45.2K/min │   0.12%    │   245ms    │   11/12 met    │
│    ✅ ALL   │    ↑ 5%    │   ↓ 0.03% │   ↓ 15ms   │   ⚠️ 1 at risk │
├────────────┴────────────┴────────────┴────────────┴────────────────┤
│                                                                      │
│  SERVICE HEALTH MAP                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ API GW   │→ │ Order    │→ │ Payment  │→ │ Notify   │           │
│  │ ✅ 12ms  │  │ ✅ 45ms  │  │ ✅ 120ms │  │ ✅ 8ms   │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│       │             │             │                                   │
│       ▼             ▼             ▼                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│  │ Auth     │  │ Inventory│  │ Stripe   │                          │
│  │ ✅ 15ms  │  │ ⚠️ 350ms │  │ ✅ 200ms │                          │
│  └──────────┘  └──────────┘  └──────────┘                          │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  REQUEST RATE (5min intervals)           ERROR RATE (5min intervals) │
│  50K ┤                                   1% ┤                        │
│  40K ┤    ╭─╮                           0.5%┤        ╭╮              │
│  30K ┤╭──╯  ╰──╮                          0%┤───────╯╰──────        │
│  20K ┤╯        ╰──                           ├─┬─┬─┬─┬─┬─┬──       │
│      ├─┬─┬─┬─┬─┬─┬──                        09 10 11 12 13 14      │
│      09 10 11 12 13 14                                               │
├──────────────────────────────────────────────────────────────────────┤
│  RESPONSE TIME DISTRIBUTION (P50/P95/P99)                            │
│  500ms ┤                                                             │
│  400ms ┤              P99 ─────                                      │
│  300ms ┤                                                             │
│  200ms ┤    P95 ──────────                                           │
│  100ms ┤                                                             │
│   50ms ┤  P50 ────────────                                           │
│        ├──┬──┬──┬──┬──┬──                                            │
│        09 10 11 12 13 14                                             │
└──────────────────────────────────────────────────────────────────────┘
```

**DQL queries for this dashboard:**

```sql
-- Total active services
fetch dt.entity.service
| filter isNotNull(entity.detected_name)
| summarize count()

-- Request rate
fetch metrics
| metric builtin:service.requestCount.total
| summarize sum(value), by: {interval: 5m}

-- Error rate
fetch metrics
| metric builtin:service.errors.total.rate
| summarize avg(value)

-- P99 latency
fetch metrics
| metric builtin:service.response.time
| summarize percentile(value, 99)

-- Service response times (for health map)
fetch metrics
| metric builtin:service.response.time
| summarize avg(value), by: {dt.entity.service}
```

### 2. Individual Service Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│                    ORDER SERVICE DASHBOARD                         │
├─────────────┬──────────────┬─────────────┬──────────────────────┤
│  Status: ✅  │  RPM: 8,234  │ Error: 0.05%│  P99: 180ms         │
├─────────────┴──────────────┴─────────────┴──────────────────────┤
│                                                                   │
│  ENDPOINTS                                                        │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Endpoint         │ RPM   │ P50   │ P99   │ Error │ Status   ││
│  │ POST /orders     │ 2,100 │ 45ms  │ 180ms │ 0.1%  │ ✅       ││
│  │ GET /orders/{id} │ 4,500 │ 12ms  │ 35ms  │ 0.01% │ ✅       ││
│  │ PUT /orders/{id} │ 1,200 │ 38ms  │ 150ms │ 0.08% │ ✅       ││
│  │ GET /orders      │ 434   │ 95ms  │ 450ms │ 0.2%  │ ⚠️       ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  DEPENDENCIES                                                     │
│  ┌───────────────────────┬────────┬───────┬───────┬────────────┐│
│  │ Dependency            │ Calls  │ P99   │ Error │ Status     ││
│  │ PostgreSQL            │ 12,400 │ 15ms  │ 0%    │ ✅ Healthy  ││
│  │ Redis Cache           │ 8,200  │ 2ms   │ 0%    │ ✅ Healthy  ││
│  │ Kafka (orders topic)  │ 2,100  │ 8ms   │ 0%    │ ✅ Healthy  ││
│  │ Payment Service       │ 2,100  │ 120ms │ 0.1%  │ ✅ Healthy  ││
│  │ Inventory Service     │ 2,100  │ 350ms │ 0.5%  │ ⚠️ Degraded││
│  └───────────────────────┴────────┴───────┴───────┴────────────┘│
│                                                                   │
│  JVM METRICS                                                      │
│  ┌────────────┬────────────┬────────────┬────────────┐          │
│  │ Heap Used  │ GC Pauses  │ Threads    │ CPU        │          │
│  │ 512/1024MB │ 12ms avg   │ 245 active │ 35%        │          │
│  │ ▓▓▓▓▓░░░░░│ ✅ Normal   │ ✅ Normal  │ ✅ Normal  │          │
│  └────────────┴────────────┴────────────┴────────────┘          │
│                                                                   │
│  KAFKA PRODUCER METRICS                                           │
│  ┌────────────────┬──────────────┬─────────────────────┐        │
│  │ Send Rate      │ Batch Size   │ Latency (ack)       │        │
│  │ 2,100 msg/min  │ 42KB avg     │ 8ms avg, 25ms P99   │        │
│  │ ✅ Normal      │ ✅ Efficient │ ✅ Normal            │        │
│  └────────────────┴──────────────┴─────────────────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

### 3. Kafka Monitoring Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│                    KAFKA MONITORING DASHBOARD                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CLUSTER HEALTH                                                   │
│  Brokers: 5/5 ✅  │  Partitions: 180  │  Under-replicated: 0 ✅  │
│                                                                   │
│  CONSUMER LAG BY GROUP                                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Consumer Group    │ Topic    │ Total Lag │ Trend  │ Status  │ │
│  │ order-service     │ orders   │ 45        │ ↓      │ ✅      │ │
│  │ payment-service   │ payments │ 12        │ →      │ ✅      │ │
│  │ analytics         │ events   │ 12,450    │ ↑↑     │ ❌      │ │
│  │ notification-svc  │ orders   │ 230       │ ↑      │ ⚠️      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  THROUGHPUT (messages/sec)                                        │
│  10K ┤                                                            │
│   8K ┤         ╭───╮                                              │
│   6K ┤╭──╮ ╭──╯   ╰──╮                                           │
│   4K ┤╯  ╰─╯         ╰──                                         │
│   2K ┤                                                            │
│      ├──┬──┬──┬──┬──┬──┬──                                       │
│      06 08 10 12 14 16 18                                         │
│      ── Produce    ── Consume                                     │
│                                                                   │
│  TOPIC DETAILS                                                    │
│  ┌──────────────┬────────┬──────────┬──────────┬───────────────┐ │
│  │ Topic        │ Parts  │ Msgs/sec │ Size     │ Retention     │ │
│  │ orders       │ 6      │ 2,100    │ 12 GB    │ 7 days        │ │
│  │ payments     │ 6      │ 1,800    │ 8 GB     │ 30 days       │ │
│  │ events       │ 12     │ 8,500    │ 45 GB    │ 3 days        │ │
│  │ orders.DLQ   │ 3      │ 2        │ 50 MB    │ 14 days       │ │
│  └──────────────┴────────┴──────────┴──────────┴───────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 4. Business KPI Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│                    BUSINESS KPI DASHBOARD                          │
│                    E-Commerce Platform                             │
├────────────┬────────────┬────────────┬──────────────────────────┤
│  Orders    │  Revenue   │  Cart Conv │  Avg Order Value          │
│  12,450    │  $623,400  │  3.2%      │  $50.07                   │
│  ↑ 8% DoD │  ↑ 12% DoD │  ↓ 0.1%   │  ↑ $2.30                  │
├────────────┴────────────┴────────────┴──────────────────────────┤
│                                                                   │
│  REVENUE BY REGION (Last 24h)                                     │
│  ┌────────────┬───────────┬────────┬───────────────────────────┐ │
│  │ Region     │ Orders    │ Revenue│ Avg Response Time          │ │
│  │ US-East    │ 4,200     │ $210K  │ 120ms ✅                   │ │
│  │ US-West    │ 3,800     │ $190K  │ 135ms ✅                   │ │
│  │ EU-West    │ 2,800     │ $140K  │ 180ms ✅                   │ │
│  │ AP-South   │ 1,650     │ $83K   │ 320ms ⚠️                   │ │
│  └────────────┴───────────┴────────┴───────────────────────────┘ │
│                                                                   │
│  CHECKOUT FUNNEL                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Browse (100%) ──▶ Cart (12%) ──▶ Checkout (4.2%) ──▶        ││
│  │ Payment (3.8%) ──▶ Confirm (3.2%) ──▶ Complete (3.1%)       ││
│  │                                                              ││
│  │ Drop-off: Cart→Checkout: 65% │ Payment failures: 15%        ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  PAYMENT SUCCESS RATE                                             │
│  ┌───────────────┬──────────┬─────────────────────────────────┐ │
│  │ Provider      │ Success  │ Avg Processing Time             │ │
│  │ Stripe        │ 99.2%    │ 850ms                           │ │
│  │ PayPal        │ 97.8%    │ 1,200ms                         │ │
│  │ Apple Pay     │ 99.5%    │ 450ms                           │ │
│  └───────────────┴──────────┴─────────────────────────────────┘ │
│                                                                   │
│  SLO STATUS                                                       │
│  ✅ Availability: 99.97% (target: 99.95%)                        │
│  ✅ Checkout P99: 1.8s (target: 3s)                              │
│  ⚠️ Payment Success: 98.8% (target: 99%, budget: 12% remaining) │
│  ✅ Order Processing: P99 < 500ms (target: 1s)                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Alerting & SLOs

### SLO Definition in Dynatrace

```yaml
# SLO: Order Service Availability
Name: "Order Service Availability"
Target: 99.95%
Warning: 99.97%
Timeframe: Rolling 30 days
Metric: builtin:service.errors.server.successCount / builtin:service.requestCount.total
Filter: Service = "order-service"

# SLO: Checkout Latency P99
Name: "Checkout P99 Latency"
Target: 99% of requests < 3 seconds
Warning: 99.5%
Timeframe: Rolling 7 days
Metric: builtin:service.response.time, percentile 99

# SLO: Kafka Consumer Lag
Name: "Order Processing Freshness"
Target: Consumer lag < 1000 messages (99% of time)
Warning: lag < 500
Timeframe: Rolling 24 hours
```

### Alert Configuration

```json
{
  "alerting-profile": "microservices-critical",
  "rules": [
    {
      "name": "High Error Rate",
      "metric": "builtin:service.errors.server.rate",
      "condition": "above 1% for 5 minutes",
      "severity": "CRITICAL",
      "notify": ["pagerduty", "slack-#incidents"]
    },
    {
      "name": "Response Time Degradation",
      "metric": "builtin:service.response.time:percentile(99)",
      "condition": "above 2000ms for 10 minutes",
      "severity": "WARNING",
      "notify": ["slack-#monitoring"]
    },
    {
      "name": "Kafka Consumer Lag",
      "metric": "kafka.consumer.lag",
      "condition": "above 10000 for 5 minutes",
      "severity": "CRITICAL",
      "notify": ["pagerduty", "slack-#data-platform"]
    },
    {
      "name": "JVM Heap Pressure",
      "metric": "builtin:tech.jvm.memory.pool.used",
      "condition": "above 90% for 15 minutes",
      "severity": "WARNING",
      "notify": ["slack-#monitoring"]
    },
    {
      "name": "SLO Error Budget Burn",
      "type": "slo-burn-rate",
      "slo": "Order Service Availability",
      "condition": "burn rate > 10x for 5 minutes",
      "severity": "CRITICAL",
      "notify": ["pagerduty"]
    }
  ]
}
```

### Multi-Window Burn Rate Alerts

```
Error Budget = 1 - SLO Target = 1 - 0.9995 = 0.05% (per 30 days)

Fast Burn (catch outages):
  Window: 5 min    Burn rate > 14.4x → PAGE
  Window: 1 hour   Burn rate > 14.4x → confirm (not transient)

Slow Burn (catch degradation):
  Window: 6 hours  Burn rate > 6x   → TICKET
  Window: 3 days   Burn rate > 1x   → WARNING
```

---

## Microservices System Design

### Observability Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                            │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ API GW   │  │ Order    │  │ Payment  │  │ Inventory│      │
│  │ +OneAgent│  │ +OneAgent│  │ +OneAgent│  │ +OneAgent│      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │              │              │
│  ┌────▼──────────────▼──────────────▼──────────────▼────────┐  │
│  │                Dynatrace Operator (K8s)                    │  │
│  │  - Auto-inject OneAgent into pods                         │  │
│  │  - Manage ActiveGate lifecycle                            │  │
│  │  - Route data to Dynatrace                                │  │
│  └──────────────────────┬────────────────────────────────────┘  │
│                          │                                       │
│  ┌──────────────────────▼─────────────────────────────────┐    │
│  │  ActiveGate (in-cluster)                                │    │
│  │  - Kubernetes API monitoring                            │    │
│  │  - Prometheus metric ingest                             │    │
│  │  - Log forwarding                                       │    │
│  └──────────────────────┬─────────────────────────────────┘    │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Dynatrace  │
                    │  SaaS/Mgd   │
                    │             │
                    │ Smartscape  │ ← Auto-discovered topology
                    │ Davis AI    │ ← Root cause analysis
                    │ Dashboards  │ ← Visualizations
                    │ SLOs        │ ← Reliability tracking
                    │ Grail       │ ← Unified data
                    └─────────────┘
```

### Kubernetes Deployment

```yaml
# Dynatrace Operator deployment
apiVersion: dynatrace.com/v1beta2
kind: DynaKube
metadata:
  name: dynakube
  namespace: dynatrace
spec:
  apiUrl: https://{your-environment}.live.dynatrace.com/api
  tokens: dynakube-tokens
  oneAgent:
    cloudNativeFullStack:
      image: ""  # Uses default image
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 300m
          memory: 512Mi
  activeGate:
    capabilities:
      - routing
      - kubernetes-monitoring
      - dynatrace-api
    resources:
      requests:
        cpu: 150m
        memory: 256Mi
      limits:
        cpu: 300m
        memory: 512Mi
```

### Structured Logging for Dynatrace

```java
// Logback configuration for Dynatrace log ingestion
// logback-spring.xml
@Slf4j
@Service
public class OrderService {

    public Order createOrder(OrderRequest request) {
        // Structured log — Dynatrace auto-correlates with traces
        log.info("Creating order",
            kv("orderId", order.getId()),
            kv("customerId", request.getCustomerId()),
            kv("total", request.getTotal()),
            kv("items", request.getItems().size()),
            kv("channel", request.getChannel())
        );

        try {
            Order order = processOrder(request);
            log.info("Order created successfully",
                kv("orderId", order.getId()),
                kv("processingTimeMs", elapsed));
            return order;
        } catch (Exception e) {
            log.error("Failed to create order",
                kv("orderId", request.getId()),
                kv("error", e.getMessage()),
                kv("errorType", e.getClass().getSimpleName()),
                e);  // Stack trace
            throw e;
        }
    }
}
```

```xml
<!-- logback-spring.xml for JSON logging -->
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder">
      <includeMdcKeyName>traceId</includeMdcKeyName>
      <includeMdcKeyName>spanId</includeMdcKeyName>
      <customFields>{"service":"order-service","env":"${ENV}"}</customFields>
    </encoder>
  </appender>
  <root level="INFO">
    <appender-ref ref="STDOUT"/>
  </root>
</configuration>
```

---

## Spring Boot Integration

### application.yml

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics, prometheus
  metrics:
    export:
      dynatrace:
        enabled: true
        api-token: ${DT_API_TOKEN}
        uri: ${DT_API_URL}/api/v2/metrics/ingest
        v2:
          default-dimensions:
            app: order-service
            env: ${ENV:dev}
    tags:
      application: order-service
      team: platform
    distribution:
      percentiles-histogram:
        http.server.requests: true
      percentiles:
        http.server.requests: 0.5, 0.95, 0.99
      slo:
        http.server.requests: 100ms, 500ms, 1s, 5s
```

### Health Check Enrichment

```java
@Component
public class KafkaHealthIndicator implements HealthIndicator {

    @Autowired
    private KafkaAdmin kafkaAdmin;

    @Override
    public Health health() {
        try {
            kafkaAdmin.describeCluster()
                .nodes().get(5, TimeUnit.SECONDS);
            return Health.up()
                .withDetail("brokers", "reachable")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}

@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public Health health() {
        try {
            long start = System.currentTimeMillis();
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            long latency = System.currentTimeMillis() - start;

            return Health.up()
                .withDetail("latencyMs", latency)
                .withDetail("status", latency < 100 ? "fast" : "slow")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

---

## Log Management

### Log Ingestion Architecture

```
Application (JSON logs)
     │
     ▼
Fluentd / Fluent Bit / OneAgent log module
     │
     ▼
Dynatrace Log Ingest API (/api/v2/logs/ingest)
     │
     ▼
Grail (indexed, searchable, correlated with traces)
```

### Log Processing Rules

```
// Parse custom log format
PARSE(content, "JSON")

// Extract business fields
FIELDS_ADD(orderId: content["orderId"])
FIELDS_ADD(customerId: content["customerId"])

// Filter noise
FILTER loglevel != "DEBUG"
FILTER NOT CONTAINS(content, "health-check")

// Metric from logs (log-based metrics)
// Count errors per service per minute
fetch logs
| filter loglevel == "ERROR"
| summarize errorCount = count(), by: {dt.entity.service, bin(timestamp, 1m)}
```

### Log-to-Trace Correlation

Dynatrace automatically correlates logs with traces when:
1. OneAgent injects trace context into MDC
2. Logs include `trace_id` and `span_id` fields
3. Logs are ingested through OneAgent or API with context

```
PurePath Trace: req-abc-123
  ├── Span: API Gateway (12ms)
  │   └── Log: "Received POST /orders"
  ├── Span: Order Service (45ms)
  │   ├── Log: "Creating order ORD-789"
  │   ├── Log: "Validated payment method"
  │   └── Span: PostgreSQL INSERT (8ms)
  ├── Span: Payment Service (120ms)
  │   ├── Log: "Processing payment for ORD-789"
  │   └── Span: Stripe API call (95ms)
  └── Span: Kafka produce (3ms)
      └── Log: "Published OrderCreated to topic orders"
```

---

## Advanced Patterns

### 1. Custom Dynatrace API Automation

```python
# Python script to create dashboards programmatically
import requests

DT_URL = "https://{env}.live.dynatrace.com"
DT_TOKEN = "dt0c01.xxx"

headers = {
    "Authorization": f"Api-Token {DT_TOKEN}",
    "Content-Type": "application/json"
}

# Create a dashboard via API
dashboard = {
    "dashboardMetadata": {
        "name": "Order Service - Auto-Generated",
        "owner": "platform-team",
        "tags": ["auto-generated", "order-service"]
    },
    "tiles": [
        {
            "name": "Request Rate",
            "tileType": "DATA_EXPLORER",
            "configured": True,
            "bounds": {"top": 0, "left": 0, "width": 456, "height": 304},
            "queries": [{
                "metric": "builtin:service.requestCount.total",
                "entitySelector": "type(SERVICE),entityName(order-service)"
            }]
        },
        {
            "name": "Error Rate",
            "tileType": "DATA_EXPLORER",
            "configured": True,
            "bounds": {"top": 0, "left": 456, "width": 456, "height": 304},
            "queries": [{
                "metric": "builtin:service.errors.server.rate",
                "entitySelector": "type(SERVICE),entityName(order-service)"
            }]
        }
    ]
}

response = requests.post(
    f"{DT_URL}/api/config/v1/dashboards",
    headers=headers, json=dashboard
)
print(f"Dashboard created: {response.json()['id']}")
```

### 2. Synthetic Monitoring

```json
{
  "name": "Order Flow - Synthetic",
  "type": "MULTI_STEP_MONITOR",
  "frequencyMin": 5,
  "locations": ["us-east-1", "eu-west-1", "ap-south-1"],
  "steps": [
    {
      "name": "Login",
      "url": "https://api.example.com/auth/login",
      "method": "POST",
      "validation": { "statusCode": 200, "maxResponseTime": 2000 }
    },
    {
      "name": "Create Order",
      "url": "https://api.example.com/orders",
      "method": "POST",
      "validation": { "statusCode": 201, "maxResponseTime": 5000 }
    },
    {
      "name": "Check Order Status",
      "url": "https://api.example.com/orders/${orderId}",
      "method": "GET",
      "validation": { "statusCode": 200, "bodyContains": "CREATED" }
    }
  ]
}
```

### 3. Davis AI Integration

Davis AI automatically detects:
- **Anomalies** — Response time spikes, error rate increases, throughput drops
- **Root cause** — Traces the problem to the responsible service, deployment, or infrastructure change
- **Impact** — Identifies affected users, services, and business transactions

```
Davis AI Alert Example:
  PROBLEM: "Response time degradation on order-service"
  ROOT CAUSE: "New deployment (v2.3.1) deployed 15 min ago"
  IMPACT: "3,200 users affected, checkout conversion down 12%"
  EVIDENCE:
    - Response time P99 increased from 180ms to 1,200ms
    - Error rate increased from 0.1% to 2.3%
    - Correlated with deployment event at 14:15 UTC
  RECOMMENDATION: "Consider rollback of v2.3.1"
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| **Dashboard overload** | 50+ tiles, no one reads them | Max 8-12 tiles, audience-specific |
| **Alert fatigue** | 100+ alerts/day, all ignored | Tune thresholds, use SLO-based alerting |
| **No log structure** | `log.info("Error processing " + id)` | Structured JSON logging with key-value pairs |
| **Metric explosion** | High-cardinality tags (userId, requestId) | Use bounded dimensions (region, service, status) |
| **No correlation** | Logs, metrics, traces in separate silos | Ensure trace context propagated in logs |
| **Vanity dashboards** | Beautiful but not actionable | Every metric should drive a decision |
| **Missing business metrics** | Only technical metrics | Add revenue, conversion, cart metrics |
| **No SLOs defined** | Alerting on arbitrary thresholds | Define SLOs, alert on error budget burn |
| **Manual dashboard creation** | Inconsistent, not reproducible | Dashboard-as-code via API |
| **Ignoring dependencies** | Only monitoring your service | Monitor downstream calls, 3rd party APIs |

---

## Best Practices Checklist

### Instrumentation
- [ ] OneAgent deployed on all hosts/pods
- [ ] Dynatrace Operator installed in Kubernetes
- [ ] Custom business metrics defined (orders, revenue, conversions)
- [ ] Structured JSON logging enabled
- [ ] Trace context propagated in logs (trace_id, span_id)
- [ ] Health endpoints exposed (/health/live, /health/ready)

### Dashboards
- [ ] Executive dashboard (business KPIs)
- [ ] Platform overview (all services health)
- [ ] Per-service dashboards (RED metrics, dependencies, JVM)
- [ ] Kafka monitoring dashboard (lag, throughput, DLQ)
- [ ] Infrastructure dashboard (CPU, memory, disk, network)
- [ ] Color coding consistent (green/yellow/red)
- [ ] Dashboards as code (API-managed, version controlled)

### Alerting
- [ ] SLOs defined for all critical services
- [ ] Error budget burn-rate alerts configured
- [ ] No raw threshold alerts (use anomaly detection or SLOs)
- [ ] PagerDuty/Opsgenie integration for critical alerts
- [ ] Slack integration for warnings
- [ ] Runbooks linked to alerts
- [ ] Alert deduplication enabled

### Operations
- [ ] Deployment events sent to Dynatrace (for correlation)
- [ ] Synthetic monitors for critical user journeys
- [ ] Regular dashboard review (remove stale, add missing)
- [ ] On-call team has Dynatrace access and training
- [ ] Post-incident reviews use Dynatrace data

---

## Resources

### Official Documentation
- [Dynatrace Documentation](https://docs.dynatrace.com/)
- [DQL Reference](https://docs.dynatrace.com/docs/platform/grail/dynatrace-query-language)
- [Dynatrace API](https://docs.dynatrace.com/docs/dynatrace-api)
- [Dynatrace OneAgent SDK](https://docs.dynatrace.com/docs/extend-dynatrace/oneagent-sdk)
- [Dynatrace Operator (K8s)](https://docs.dynatrace.com/docs/setup-and-configuration/setup-on-k8s)

### Dynatrace University
- [Dynatrace University](https://university.dynatrace.com/) — Free training courses
- [Dynatrace Certification](https://university.dynatrace.com/certifications) — Associate, Professional, Expert

### Community
- [Dynatrace Community](https://community.dynatrace.com/) — Forums and Q&A
- [Dynatrace GitHub](https://github.com/dynatrace) — Open-source tools and examples
- [Dynatrace Blog](https://www.dynatrace.com/news/blog/) — Use cases and best practices
- [Perform Conference](https://www.dynatrace.com/perform/) — Annual Dynatrace conference

### Related Guides
- [Microservices Patterns](../architecture/microservices.md) — Service architecture patterns
- [Cloud-Native Architecture](../architecture/cloud-native.md) — AWS/Azure/GCP observability
- [Kafka Patterns](kafka.md) — Event streaming monitoring
- [Cross-Cutting Concerns](../architecture/cross-cutting-concerns.md) — Logging, tracing

### Alternative Monitoring Tools
For comparison, also explore:
- **Prometheus + Grafana** — Open-source, cost-effective
- **Datadog** — SaaS, strong multi-cloud
- **New Relic** — SaaS, full-stack observability
- **Elastic Observability** — Open-source, log-centric
- **Splunk** — Enterprise log analytics
- **AWS CloudWatch / Azure Monitor / GCP Cloud Operations** — Cloud-native

---

*"You can't improve what you can't measure. And you can't act on what you can't see. Build dashboards that tell stories, not just display numbers."*
