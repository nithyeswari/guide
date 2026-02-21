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
- [DQL for Banking — Payments, Beneficiary & Compliance](#dql-for-banking--payments-beneficiary--compliance)
- [Advanced Patterns](#advanced-patterns)
- [Practical Troubleshooting Dashboards](#practical-troubleshooting-dashboards)
- [Session Replay & Real User Monitoring](#session-replay--real-user-monitoring)
- [New Dynatrace Features (2024-2025)](#new-dynatrace-features-2024-2025)
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

## DQL for Banking — Payments, Beneficiary & Compliance

### DQL Reference Repositories

| Repository | Description |
|-----------|-------------|
| [dynatrace-perfclinics/dql-by-usecase](https://github.com/dynatrace-perfclinics/dql-by-usecase) | Learning DQL by use case with video tutorials and playground notebooks |
| [Dynatrace-Asad-Ali/DQL-Examples](https://github.com/Dynatrace-Asad-Ali/DQL-Examples) | DQL examples for parsing, filtering, and summarizing log data |
| [dynatrace-oss/intellij-idea-dql](https://github.com/dynatrace-oss/intellij-idea-dql) | IntelliJ plugin for writing and executing DQL locally |
| [DQL Language Reference](https://docs.dynatrace.com/docs/discover-dynatrace/platform/grail/dynatrace-query-language/dql-reference) | Official DQL documentation |
| [DQL Use Cases](https://docs.dynatrace.com/docs/platform/grail/dynatrace-query-language/dql-use-cases) | Official use case library |
| [Business Event Analysis](https://docs.dynatrace.com/docs/observe/business-observability/bo-analysis) | Business observability with DQL |

### Payment Processing Monitoring

#### Payment Transaction Overview

```sql
-- Payment transaction volume and success rate (last 24h)
fetch bizevents
| filter event.type == "payment.processed"
| summarize
    totalPayments = count(),
    successCount = countIf(status == "SUCCESS"),
    failedCount = countIf(status == "FAILED"),
    pendingCount = countIf(status == "PENDING"),
    totalAmount = sum(amount),
    avgAmount = avg(amount),
    by: {bin(timestamp, 1h)}
| fieldsAdd successRate = (toDouble(successCount) / toDouble(totalPayments)) * 100
| sort timestamp desc

-- Payment success rate by payment method
fetch bizevents
| filter event.type == "payment.processed"
| summarize
    total = count(),
    succeeded = countIf(status == "SUCCESS"),
    failed = countIf(status == "FAILED"),
    avgProcessingTimeMs = avg(processingTimeMs),
    totalVolume = sum(amount),
    by: {paymentMethod}
| fieldsAdd successRate = round((toDouble(succeeded) / toDouble(total)) * 100, 2)
| sort successRate asc

-- Payment failures breakdown by error code
fetch bizevents
| filter event.type == "payment.processed" AND status == "FAILED"
| summarize
    failureCount = count(),
    totalLostRevenue = sum(amount),
    by: {errorCode, errorMessage, paymentMethod}
| sort failureCount desc
| limit 20

-- Payment processing latency percentiles by gateway
fetch bizevents
| filter event.type == "payment.processed"
| summarize
    p50 = percentile(processingTimeMs, 50),
    p95 = percentile(processingTimeMs, 95),
    p99 = percentile(processingTimeMs, 99),
    maxLatency = max(processingTimeMs),
    count = count(),
    by: {paymentGateway, paymentMethod}
| sort p99 desc
```

#### Payment Flow Tracing

```sql
-- End-to-end payment journey (from initiation to settlement)
fetch bizevents
| filter event.type STARTSWITH "payment."
| filter paymentId == "PAY-12345"
| fields timestamp, event.type, status, amount, currency,
         paymentGateway, processingTimeMs, errorCode
| sort timestamp asc

-- Payment SLO: 99.9% success rate for card payments
fetch bizevents
| filter event.type == "payment.processed"
| filter paymentMethod == "CARD"
| summarize
    total = count(),
    succeeded = countIf(status == "SUCCESS"),
    by: {bin(timestamp, 5m)}
| fieldsAdd successRate = (toDouble(succeeded) / toDouble(total)) * 100
| filter successRate < 99.9

-- Stuck/pending payments (processing > 30 seconds)
fetch bizevents
| filter event.type == "payment.initiated"
| filter timestamp < now() - 30s
| lookup [
    fetch bizevents
    | filter event.type == "payment.processed"
    | fields paymentId, completedAt = timestamp
  ], sourceField: paymentId, lookupField: paymentId
| filter isNull(completedAt)
| fields paymentId, amount, currency, paymentMethod, timestamp
| sort timestamp asc

-- Revenue by currency and region (real-time)
fetch bizevents
| filter event.type == "payment.processed" AND status == "SUCCESS"
| summarize
    transactionCount = count(),
    totalRevenue = sum(amount),
    avgTicket = avg(amount),
    by: {currency, region, bin(timestamp, 1h)}
| sort totalRevenue desc
```

#### Payment Gateway Health

```sql
-- Gateway availability and response times
fetch metrics
| metric payment.gateway.response_time
| summarize
    avg(value) as avgMs,
    percentile(value, 99) as p99Ms,
    by: {gateway, bin(timestamp, 5m)}

-- Gateway error rate comparison
fetch bizevents
| filter event.type == "payment.gateway.response"
| summarize
    total = count(),
    errors = countIf(httpStatus >= 500),
    timeouts = countIf(errorCode == "TIMEOUT"),
    by: {gateway, bin(timestamp, 5m)}
| fieldsAdd errorRate = round((toDouble(errors) / toDouble(total)) * 100, 2)
| fieldsAdd timeoutRate = round((toDouble(timeouts) / toDouble(total)) * 100, 2)

-- Payment reconciliation: mismatches between initiated and settled
fetch bizevents
| filter event.type == "payment.initiated"
| filter timestamp BETWEEN now() - 24h AND now() - 1h
| lookup [
    fetch bizevents
    | filter event.type == "payment.settled"
    | fields paymentId, settledAmount = amount, settledAt = timestamp
  ], sourceField: paymentId, lookupField: paymentId
| filter isNull(settledAt) OR amount != settledAmount
| fields paymentId, amount, settledAmount, currency, paymentMethod, timestamp
| sort timestamp asc
```

### Beneficiary Management Monitoring

#### Beneficiary Operations

```sql
-- Beneficiary addition/modification activity
fetch bizevents
| filter event.type STARTSWITH "beneficiary."
| summarize
    additions = countIf(event.type == "beneficiary.added"),
    modifications = countIf(event.type == "beneficiary.modified"),
    deletions = countIf(event.type == "beneficiary.deleted"),
    verifications = countIf(event.type == "beneficiary.verified"),
    by: {bin(timestamp, 1h)}
| sort timestamp desc

-- Beneficiary verification failure rate
fetch bizevents
| filter event.type == "beneficiary.verification"
| summarize
    total = count(),
    passed = countIf(verificationStatus == "PASSED"),
    failed = countIf(verificationStatus == "FAILED"),
    pending = countIf(verificationStatus == "PENDING"),
    by: {verificationType, bin(timestamp, 1h)}
| fieldsAdd failureRate = round((toDouble(failed) / toDouble(total)) * 100, 2)
| sort failureRate desc

-- Beneficiary operations by channel (mobile, web, API, branch)
fetch bizevents
| filter event.type STARTSWITH "beneficiary."
| summarize
    count = count(),
    by: {event.type, channel, bin(timestamp, 1h)}
| sort count desc

-- Suspicious beneficiary activity (rapid additions from same account)
fetch bizevents
| filter event.type == "beneficiary.added"
| summarize
    addedCount = count(),
    uniqueBeneficiaries = countDistinct(beneficiaryId),
    by: {accountId, bin(timestamp, 1h)}
| filter addedCount > 5
| sort addedCount desc

-- Beneficiary name screening match rate
fetch bizevents
| filter event.type == "beneficiary.screening"
| summarize
    total = count(),
    exactMatch = countIf(matchType == "EXACT"),
    fuzzyMatch = countIf(matchType == "FUZZY"),
    noMatch = countIf(matchType == "NO_MATCH"),
    falsePositive = countIf(resolution == "FALSE_POSITIVE"),
    truePositive = countIf(resolution == "TRUE_POSITIVE"),
    by: {screeningProvider, bin(timestamp, 1h)}
| fieldsAdd hitRate = round((toDouble(exactMatch + fuzzyMatch) / toDouble(total)) * 100, 2)
| fieldsAdd falsePositiveRate = round((toDouble(falsePositive) / toDouble(exactMatch + fuzzyMatch)) * 100, 2)
```

#### Beneficiary Transfer Monitoring

```sql
-- Transfers by beneficiary type (domestic, international, internal)
fetch bizevents
| filter event.type == "transfer.executed"
| summarize
    count = count(),
    totalAmount = sum(amount),
    avgAmount = avg(amount),
    failedCount = countIf(status == "FAILED"),
    by: {transferType, currency, bin(timestamp, 1h)}
| sort totalAmount desc

-- High-value beneficiary transfers (above threshold)
fetch bizevents
| filter event.type == "transfer.executed"
| filter amount > 10000
| fields timestamp, accountId, beneficiaryId, beneficiaryName,
         amount, currency, transferType, status, riskScore
| sort amount desc
| limit 50

-- Beneficiary transfer velocity (same beneficiary, multiple transfers)
fetch bizevents
| filter event.type == "transfer.executed"
| summarize
    transferCount = count(),
    totalAmount = sum(amount),
    distinctSenders = countDistinct(accountId),
    by: {beneficiaryId, beneficiaryName, bin(timestamp, 24h)}
| filter transferCount > 10 OR totalAmount > 100000
| sort totalAmount desc
```

### Compliance Check & DRE (Dispute Resolution Engine)

#### Compliance Screening

```sql
-- AML/KYC compliance check summary
fetch bizevents
| filter event.type STARTSWITH "compliance."
| summarize
    totalChecks = count(),
    passed = countIf(result == "PASS"),
    failed = countIf(result == "FAIL"),
    review = countIf(result == "MANUAL_REVIEW"),
    escalated = countIf(result == "ESCALATED"),
    by: {checkType, bin(timestamp, 1h)}
| fieldsAdd passRate = round((toDouble(passed) / toDouble(totalChecks)) * 100, 2)
| sort timestamp desc

-- Compliance check types breakdown
fetch bizevents
| filter event.type == "compliance.check.completed"
| summarize
    count = count(),
    avgDurationMs = avg(durationMs),
    p99DurationMs = percentile(durationMs, 99),
    failRate = countIf(result == "FAIL"),
    by: {checkType}
| sort count desc

-- Check types: SANCTIONS, PEP, ADVERSE_MEDIA, WATCHLIST, CDD, EDD

-- Sanctions screening performance
fetch bizevents
| filter event.type == "compliance.sanctions.screening"
| summarize
    total = count(),
    hits = countIf(screeningResult == "HIT"),
    noHits = countIf(screeningResult == "NO_HIT"),
    pending = countIf(screeningResult == "PENDING_REVIEW"),
    avgLatencyMs = avg(screeningDurationMs),
    p99LatencyMs = percentile(screeningDurationMs, 99),
    by: {screeningProvider, listType, bin(timestamp, 1h)}
| fieldsAdd hitRate = round((toDouble(hits) / toDouble(total)) * 100, 4)

-- PEP (Politically Exposed Person) screening
fetch bizevents
| filter event.type == "compliance.pep.screening"
| summarize
    total = count(),
    matches = countIf(matchFound == true),
    falsePositives = countIf(resolution == "FALSE_POSITIVE"),
    confirmed = countIf(resolution == "CONFIRMED"),
    by: {bin(timestamp, 24h)}
| fieldsAdd matchRate = round((toDouble(matches) / toDouble(total)) * 100, 2)
| fieldsAdd fpRate = round((toDouble(falsePositives) / toDouble(matches)) * 100, 2)

-- Transaction monitoring alerts
fetch bizevents
| filter event.type == "compliance.transaction.alert"
| summarize
    totalAlerts = count(),
    highRisk = countIf(riskLevel == "HIGH"),
    mediumRisk = countIf(riskLevel == "MEDIUM"),
    lowRisk = countIf(riskLevel == "LOW"),
    dismissed = countIf(resolution == "DISMISSED"),
    escalated = countIf(resolution == "ESCALATED"),
    sar_filed = countIf(resolution == "SAR_FILED"),
    by: {alertRule, bin(timestamp, 24h)}
| sort highRisk desc

-- Compliance SLA: screening must complete within 5 seconds
fetch bizevents
| filter event.type STARTSWITH "compliance." AND event.type CONTAINS "screening"
| summarize
    total = count(),
    withinSla = countIf(durationMs <= 5000),
    breached = countIf(durationMs > 5000),
    avgMs = avg(durationMs),
    p99Ms = percentile(durationMs, 99),
    by: {checkType, bin(timestamp, 1h)}
| fieldsAdd slaCompliance = round((toDouble(withinSla) / toDouble(total)) * 100, 2)
| filter slaCompliance < 99.5
```

#### Dispute Resolution Engine (DRE) Monitoring

```sql
-- Dispute lifecycle overview
fetch bizevents
| filter event.type STARTSWITH "dispute."
| summarize
    opened = countIf(event.type == "dispute.opened"),
    investigating = countIf(event.type == "dispute.investigating"),
    resolved = countIf(event.type == "dispute.resolved"),
    escalated = countIf(event.type == "dispute.escalated"),
    closed = countIf(event.type == "dispute.closed"),
    by: {bin(timestamp, 24h)}
| sort timestamp desc

-- Dispute resolution metrics
fetch bizevents
| filter event.type == "dispute.resolved"
| summarize
    totalResolved = count(),
    customerFavor = countIf(resolution == "CUSTOMER_FAVOR"),
    merchantFavor = countIf(resolution == "MERCHANT_FAVOR"),
    split = countIf(resolution == "SPLIT"),
    avgResolutionDays = avg(resolutionDays),
    medianResolutionDays = percentile(resolutionDays, 50),
    totalRefundAmount = sum(refundAmount),
    by: {disputeCategory, bin(timestamp, 7d)}
| fieldsAdd customerWinRate = round((toDouble(customerFavor) / toDouble(totalResolved)) * 100, 2)
| sort totalResolved desc

-- Dispute categories and reasons
fetch bizevents
| filter event.type == "dispute.opened"
| summarize
    count = count(),
    totalAmount = sum(disputeAmount),
    avgAmount = avg(disputeAmount),
    by: {disputeCategory, disputeReason}
| sort count desc
| limit 20

-- Categories: FRAUD, UNAUTHORIZED, NOT_RECEIVED, DEFECTIVE,
--             BILLING_ERROR, DUPLICATE_CHARGE, SUBSCRIPTION_CANCEL

-- Dispute SLA tracking (must acknowledge within 24h, resolve within 15 days)
fetch bizevents
| filter event.type == "dispute.opened"
| lookup [
    fetch bizevents
    | filter event.type == "dispute.acknowledged"
    | fields disputeId, acknowledgedAt = timestamp
  ], sourceField: disputeId, lookupField: disputeId
| lookup [
    fetch bizevents
    | filter event.type == "dispute.resolved"
    | fields disputeId, resolvedAt = timestamp
  ], sourceField: disputeId, lookupField: disputeId
| fieldsAdd ackHours = (toLong(acknowledgedAt) - toLong(timestamp)) / 3600000
| fieldsAdd resolutionDays = (toLong(resolvedAt) - toLong(timestamp)) / 86400000
| fieldsAdd ackSlaBreached = ackHours > 24
| fieldsAdd resolutionSlaBreached = resolutionDays > 15
| summarize
    totalDisputes = count(),
    ackBreaches = countIf(ackSlaBreached == true),
    resolutionBreaches = countIf(resolutionSlaBreached == true),
    avgAckHours = avg(ackHours),
    avgResolutionDays = avg(resolutionDays),
    by: {disputeCategory}

-- Chargeback rate by merchant (Visa/MC threshold: 1%)
fetch bizevents
| filter event.type == "dispute.chargeback"
| summarize
    chargebacks = count(),
    totalChargebackAmount = sum(amount),
    by: {merchantId, merchantName, bin(timestamp, 30d)}
| lookup [
    fetch bizevents
    | filter event.type == "payment.processed" AND status == "SUCCESS"
    | summarize totalTransactions = count(), by: {merchantId}
  ], sourceField: merchantId, lookupField: merchantId
| fieldsAdd chargebackRate = round((toDouble(chargebacks) / toDouble(totalTransactions)) * 100, 4)
| filter chargebackRate > 0.5
| sort chargebackRate desc

-- Fraud dispute patterns (time-of-day, amount distribution)
fetch bizevents
| filter event.type == "dispute.opened" AND disputeCategory == "FRAUD"
| fieldsAdd hourOfDay = formatTimestamp(timestamp, "HH")
| summarize
    count = count(),
    avgAmount = avg(disputeAmount),
    totalAmount = sum(disputeAmount),
    by: {hourOfDay, paymentMethod}
| sort hourOfDay asc

-- DRE engine performance (processing time, queue depth)
fetch bizevents
| filter event.type == "dre.case.processed"
| summarize
    casesProcessed = count(),
    avgProcessingMs = avg(processingTimeMs),
    p95ProcessingMs = percentile(processingTimeMs, 95),
    autoResolved = countIf(autoResolution == true),
    manualReview = countIf(autoResolution == false),
    by: {disputeCategory, bin(timestamp, 1h)}
| fieldsAdd autoResolveRate = round((toDouble(autoResolved) / toDouble(casesProcessed)) * 100, 2)

-- DRE queue health
fetch bizevents
| filter event.type == "dre.queue.status"
| fields timestamp, queueDepth, oldestCaseAge, processingRate, backlogHours
| sort timestamp desc
| limit 24

-- Dispute escalation path analysis
fetch bizevents
| filter event.type STARTSWITH "dispute."
| filter disputeId == "DSP-67890"
| fields timestamp, event.type, status, assignee, team,
         resolution, notes, processingTimeMs
| sort timestamp asc
```

#### Banking Compliance Dashboard (DQL-Powered)

```
┌──────────────────────────────────────────────────────────────────┐
│              COMPLIANCE & DISPUTE RESOLUTION DASHBOARD             │
├────────────┬────────────┬────────────┬──────────────────────────┤
│ Screenings │ Hit Rate   │ Disputes   │ Avg Resolution           │
│  45,230    │   0.12%    │    342     │   4.2 days               │
│  today     │   ↓ 0.01%  │   ↑ 12    │   ↓ 0.5 days            │
├────────────┴────────────┴────────────┴──────────────────────────┤
│                                                                   │
│  COMPLIANCE SCREENING STATUS                                      │
│  ┌─────────────────┬───────┬──────┬────────┬──────┬───────────┐ │
│  │ Check Type      │ Total │ Pass │ Review │ Fail │ SLA %     │ │
│  │ Sanctions       │12,400 │12,350│   45   │   5  │ 99.8% ✅  │ │
│  │ PEP             │ 8,200 │ 8,150│   48   │   2  │ 99.6% ✅  │ │
│  │ Adverse Media   │ 8,200 │ 8,100│   92   │   8  │ 99.2% ✅  │ │
│  │ Watchlist       │12,400 │12,380│   18   │   2  │ 99.9% ✅  │ │
│  │ EDD             │ 4,030 │ 3,800│  210   │  20  │ 98.1% ⚠️  │ │
│  └─────────────────┴───────┴──────┴────────┴──────┴───────────┘ │
│                                                                   │
│  DISPUTE RESOLUTION                                               │
│  ┌─────────────────┬──────┬───────┬──────┬──────────────────┐   │
│  │ Category        │ Open │ In Rev│ Resolved│ Chargeback Rate│   │
│  │ Fraud           │  45  │  32   │  120    │ 0.08% ✅       │   │
│  │ Unauthorized    │  28  │  18   │   85    │ 0.05% ✅       │   │
│  │ Not Received    │  15  │  12   │   65    │ 0.03% ✅       │   │
│  │ Billing Error   │   8  │   5   │   42    │ 0.02% ✅       │   │
│  │ Duplicate Charge│   3  │   2   │   28    │ 0.01% ✅       │   │
│  └─────────────────┴──────┴───────┴─────────┴────────────────┘  │
│                                                                   │
│  PAYMENT HEALTH                                                   │
│  ┌────────────────┬──────────┬─────────┬──────────────────────┐ │
│  │ Gateway        │ Success  │ P99 (ms)│ Volume (24h)         │ │
│  │ Card Network   │ 99.4%    │  850    │ $2.4M                │ │
│  │ SWIFT          │ 99.1%    │ 3,200   │ $12.8M               │ │
│  │ ACH/SEPA       │ 99.7%    │ 1,100   │ $5.6M                │ │
│  │ Real-Time (RTP)│ 99.8%    │  450    │ $890K                │ │
│  └────────────────┴──────────┴─────────┴──────────────────────┘ │
│                                                                   │
│  DRE ENGINE STATUS                                                │
│  Queue Depth: 42 ✅  │  Auto-resolve Rate: 68%  │  Backlog: 0h  │
│  Processing: 850ms avg  │  Cases/hour: 120  │  Escalated: 8      │
└──────────────────────────────────────────────────────────────────┘
```

### Java Business Event Ingestion

```java
// Send business events to Dynatrace for DQL analysis
@Service
@Slf4j
public class PaymentEventPublisher {

    private final MeterRegistry meterRegistry;

    // Option 1: Structured logging (OneAgent auto-ingests)
    public void publishPaymentEvent(Payment payment) {
        log.info("Payment processed",
            kv("event.type", "payment.processed"),
            kv("paymentId", payment.getId()),
            kv("amount", payment.getAmount()),
            kv("currency", payment.getCurrency()),
            kv("paymentMethod", payment.getMethod()),
            kv("paymentGateway", payment.getGateway()),
            kv("status", payment.getStatus()),
            kv("processingTimeMs", payment.getProcessingTimeMs()),
            kv("merchantId", payment.getMerchantId()),
            kv("region", payment.getRegion()),
            kv("errorCode", payment.getErrorCode())
        );

        // Metrics for real-time dashboards
        meterRegistry.counter("payment.processed",
            "status", payment.getStatus(),
            "method", payment.getMethod(),
            "gateway", payment.getGateway()
        ).increment();

        meterRegistry.timer("payment.processing.time",
            "gateway", payment.getGateway()
        ).record(Duration.ofMillis(payment.getProcessingTimeMs()));
    }

    // Option 2: Dynatrace Business Events API (direct)
    public void publishBusinessEvent(String eventType, Map<String, Object> data) {
        // POST to /api/v2/bizevents/ingest
        data.put("event.type", eventType);
        data.put("event.provider", "payment-service");
        data.put("timestamp", Instant.now().toString());
        dynatraceClient.ingestBizEvent(data);
    }
}

// Compliance event publishing
@Service
public class ComplianceEventPublisher {

    public void publishScreeningResult(ScreeningResult result) {
        log.info("Compliance screening completed",
            kv("event.type", "compliance.sanctions.screening"),
            kv("screeningId", result.getId()),
            kv("entityType", result.getEntityType()),  // BENEFICIARY, CUSTOMER, TRANSACTION
            kv("screeningResult", result.getResult()),  // HIT, NO_HIT, PENDING_REVIEW
            kv("matchType", result.getMatchType()),
            kv("screeningProvider", result.getProvider()),
            kv("listType", result.getListType()),       // OFAC, EU, UN, LOCAL
            kv("screeningDurationMs", result.getDurationMs()),
            kv("confidence", result.getConfidenceScore())
        );
    }

    public void publishDisputeEvent(Dispute dispute, String eventType) {
        log.info("Dispute event",
            kv("event.type", "dispute." + eventType),
            kv("disputeId", dispute.getId()),
            kv("disputeCategory", dispute.getCategory()),
            kv("disputeReason", dispute.getReason()),
            kv("disputeAmount", dispute.getAmount()),
            kv("currency", dispute.getCurrency()),
            kv("paymentId", dispute.getOriginalPaymentId()),
            kv("merchantId", dispute.getMerchantId()),
            kv("status", dispute.getStatus()),
            kv("resolution", dispute.getResolution()),
            kv("resolutionDays", dispute.getResolutionDays()),
            kv("autoResolution", dispute.isAutoResolved())
        );
    }
}
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

## Practical Troubleshooting Dashboards

> These dashboards are designed for on-call engineers and SREs to quickly identify, isolate, and resolve production issues.

### 1. Error Investigation Dashboard

**Purpose:** Find and fix errors fast — what's failing, where, and why.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    🔴 ERROR INVESTIGATION DASHBOARD                     │
├───────────────────────────────┬─────────────────────────────────────────┤
│  Error Rate Trend (24h)       │  Top 10 Errors by Count                │
│  ▁▁▂▂▃▃▅▅██▇▅▃▂▁▁           │  ┌─────────────────────────────┐      │
│  Line chart: errors/min       │  │ NullPointerException   1,247 │      │
│  Split by: service_name       │  │ TimeoutException         891 │      │
│                               │  │ 503 ServiceUnavailable   634 │      │
│                               │  │ ConnectionRefused        412 │      │
│                               │  │ DeserializationError     287 │      │
│                               │  └─────────────────────────────┘      │
├───────────────────────────────┼─────────────────────────────────────────┤
│  Failed Requests by Service   │  Error Hotspots (Code-Level)           │
│  ┌──────────────────────┐     │  ┌──────────────────────────────────┐  │
│  │ payment-svc   ██████ │     │  │ PaymentProcessor.java:142        │  │
│  │ order-svc     ████   │     │  │ KafkaConsumer.java:89            │  │
│  │ user-svc      ██     │     │  │ RestClient.java:201              │  │
│  │ notify-svc    █      │     │  │ DatabasePool.java:67             │  │
│  └──────────────────────┘     │  └──────────────────────────────────┘  │
├───────────────────────────────┴─────────────────────────────────────────┤
│  Recent Exceptions (Live Feed)                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 14:23:01 payment-svc  NullPointerException at PaymentProc...:142   ││
│  │ 14:23:03 order-svc    TimeoutException calling payment-svc (5000ms)││
│  │ 14:23:05 payment-svc  ConnectionRefused: redis-master:6379         ││
│  │ 14:23:08 notify-svc   KafkaException: Broker not available         ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**DQL Queries:**

```dql
// Error rate trend per service (last 24 hours, 5-minute buckets)
fetch dt.entity.service
| lookup [
    fetch bizevents
    | filter event.type == "com.dynatrace.error"
    | makeTimeseries count(), by:{dt.entity.service}, interval:5m
  ], sourceField:id, lookupField:dt.entity.service

// Top exceptions with stack trace grouping
fetch logs
| filter loglevel == "ERROR"
| parse content, "LD:exception_class '.java:' INT:line_number"
| summarize count = count(), by:{exception_class, line_number, dt.entity.service}
| sort count desc
| limit 20

// Error spike detection — comparing current hour to previous 24h baseline
fetch logs
| filter loglevel == "ERROR"
| makeTimeseries current_errors = count(), interval:5m
| join [
    fetch logs, from:now()-25h, to:now()-1h
    | filter loglevel == "ERROR"
    | makeTimeseries baseline_errors = avg(count()), interval:5m
  ]
| fieldsAdd spike_ratio = current_errors / baseline_errors
| filter spike_ratio > 3.0

// Failed HTTP requests by endpoint
fetch spans
| filter http.response.status_code >= 500
| summarize error_count = count(),
    by:{http.route, http.request.method, dt.entity.service}
| sort error_count desc
| limit 25

// Live exception feed with trace context
fetch logs, from:now()-15m
| filter loglevel == "ERROR"
| fields timestamp, dt.entity.service, content, trace_id, span_id
| sort timestamp desc
| limit 50
```

### 2. Latency Root-Cause Dashboard

**Purpose:** Find what's slow and trace it to the exact bottleneck.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ⏱ LATENCY ROOT-CAUSE DASHBOARD                       │
├───────────────────────────────┬─────────────────────────────────────────┤
│  P50 / P95 / P99 Trends      │  Slowest Endpoints (P95)               │
│                               │  ┌──────────────────────────────────┐  │
│  P50 ——— 45ms                │  │ POST /api/payments      1,240ms  │  │
│  P95 ─ ─ 320ms               │  │ GET  /api/orders/:id      890ms  │  │
│  P99 ··· 1,200ms             │  │ POST /api/transfers       780ms  │  │
│                               │  │ GET  /api/accounts        340ms  │  │
│  ▁▁▂▃▅██▇▅▃▂▁               │  └──────────────────────────────────┘  │
├───────────────────────────────┼─────────────────────────────────────────┤
│  Time Breakdown (avg request) │  Database Query Hotspots               │
│  ┌──────────────────────────┐ │  ┌──────────────────────────────────┐  │
│  │ App Logic    ████  35%   │ │  │ SELECT * FROM payments   450ms  │  │
│  │ Database     ██████ 45%  │ │  │ INSERT INTO audit_log    230ms  │  │
│  │ External API ██    15%   │ │  │ UPDATE accounts SET      180ms  │  │
│  │ Network      █      5%  │ │  │ SELECT FROM beneficiary  120ms  │  │
│  └──────────────────────────┘ │  └──────────────────────────────────┘  │
├───────────────────────────────┼─────────────────────────────────────────┤
│  Slow Traces (>1s)            │  Dependency Latency Map                │
│  ┌──────────────────────────┐ │  ┌──────────────────────────────────┐  │
│  │ trace_abc → 3,450ms      │ │  │ Redis        ●─── 12ms (healthy)│  │
│  │   └ DB query  2,100ms    │ │  │ PostgreSQL   ●─── 89ms (warn)   │  │
│  │   └ Redis       200ms    │ │  │ Kafka        ●─── 23ms (healthy)│  │
│  │ trace_def → 2,100ms      │ │  │ partner-api  ●─── 670ms (SLOW)  │  │
│  │   └ ext-api   1,800ms    │ │  │ auth-service ●─── 45ms (healthy)│  │
│  └──────────────────────────┘ │  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**DQL Queries:**

```dql
// Percentile latency trends
fetch spans
| filter span.kind == "SERVER"
| makeTimeseries p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99),
    interval:5m

// Slowest endpoints with percentile breakdown
fetch spans
| filter span.kind == "SERVER"
| summarize p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99),
    count = count(),
    by:{http.route, http.request.method}
| sort p95 desc
| limit 15

// Time breakdown by span category (where is time spent?)
fetch spans
| filter trace_id == "<trace_id>"
| fieldsAdd category = if(
    db.system != "", "Database",
    http.url != "" AND span.kind == "CLIENT", "External API",
    messaging.system != "", "Messaging",
    else: "Application Logic"
  )
| summarize total_duration = sum(duration), by:{category}
| fieldsAdd percentage = 100.0 * total_duration / sum(total_duration)

// Database query hotspots — slowest queries
fetch spans
| filter db.system != ""
| summarize avg_duration = avg(duration),
    p95_duration = percentile(duration, 95),
    count = count(),
    by:{db.statement, db.system, dt.entity.service}
| sort p95_duration desc
| limit 20

// Dependency latency (how healthy are downstream services?)
fetch spans
| filter span.kind == "CLIENT"
| summarize avg_latency = avg(duration),
    p95_latency = percentile(duration, 95),
    error_rate = countIf(otel.status_code == "ERROR") / count() * 100,
    by:{peer.service}
| fieldsAdd health = if(p95_latency < 100000000, "healthy",
    p95_latency < 500000000, "warn", else: "SLOW")
| sort p95_latency desc

// Slow traces with breakdown (outlier detection)
fetch spans
| filter span.kind == "SERVER" AND duration > 1000000000
| fields trace_id, duration, http.route, dt.entity.service, timestamp
| sort duration desc
| limit 30
```

### 3. Deployment Regression Dashboard

**Purpose:** Detect if a new deployment broke things — compare before vs after.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    🚀 DEPLOYMENT REGRESSION DASHBOARD                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Deployment Timeline                                                    │
│  ─────●──────────●────────●──────────────────> time                    │
│    v2.3.0     v2.3.1    v2.4.0 ← CURRENT                              │
│                           ▲                                             │
│                    Error rate spike detected                            │
├───────────────────────────────┬─────────────────────────────────────────┤
│  Before vs After (P95 Latency)│  Before vs After (Error Rate)          │
│  ┌──────────────────────────┐ │  ┌──────────────────────────────────┐  │
│  │ Before (v2.3.1): 210ms  │ │  │ Before: 0.12%                    │  │
│  │ After  (v2.4.0): 890ms  │ │  │ After:  2.34%  ⚠ +1,850%       │  │
│  │ Change: +323% ⚠️        │ │  │                                  │  │
│  └──────────────────────────┘ │  └──────────────────────────────────┘  │
├───────────────────────────────┼─────────────────────────────────────────┤
│  New Errors Since Deploy      │  Throughput Comparison                  │
│  ┌──────────────────────────┐ │  ┌──────────────────────────────────┐  │
│  │ OutOfMemoryError    NEW  │ │  │ Before: 2,340 req/s             │  │
│  │ ClassCastException  NEW  │ │  │ After:  1,870 req/s (-20%)      │  │
│  │ SocketTimeout     +400%  │ │  │                                  │  │
│  └──────────────────────────┘ │  └──────────────────────────────────┘  │
├───────────────────────────────┴─────────────────────────────────────────┤
│  JVM Health After Deploy                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Heap Usage: ▁▂▃▅▆██████ (trending up — possible memory leak)      ││
│  │ GC Pause:   ▁▁▁▂▃▃▅▆██  (GC pauses increasing)                   ││
│  │ Thread Count: 245 → 312  (+27%)                                    ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**DQL Queries:**

```dql
// Compare error rate before/after deployment event
fetch events
| filter event.type == "CUSTOM_DEPLOYMENT"
| sort timestamp desc
| limit 1
| fields deploy_time = timestamp, version = tag.version
// Use the deploy_time in subsequent queries:

// Error rate comparison (1h before vs 1h after deployment)
fetch spans, from:now()-3h
| filter span.kind == "SERVER"
| fieldsAdd period = if(timestamp < $deploy_time, "before", "after")
| summarize total = count(),
    errors = countIf(otel.status_code == "ERROR"),
    by:{period}
| fieldsAdd error_rate = 100.0 * errors / total

// Latency regression per endpoint
fetch spans, from:now()-3h
| filter span.kind == "SERVER"
| fieldsAdd period = if(timestamp < $deploy_time, "before", "after")
| summarize p95 = percentile(duration, 95), by:{period, http.route}
| sort http.route

// New exceptions that appeared only after deployment
fetch logs, from:$deploy_time
| filter loglevel == "ERROR"
| parse content, "LD:exception_class"
| summarize post_deploy_count = count(), by:{exception_class}
| lookup [
    fetch logs, from:$deploy_time - 24h, to:$deploy_time
    | filter loglevel == "ERROR"
    | parse content, "LD:exception_class"
    | summarize pre_deploy_count = count(), by:{exception_class}
  ], sourceField:exception_class, lookupField:exception_class
| fieldsAdd pre_deploy_count = coalesce(pre_deploy_count, 0)
| filter pre_deploy_count == 0  // brand new errors
| sort post_deploy_count desc

// JVM memory trend after deployment
fetch metrics, from:now()-6h
| filter metric.key == "jvm.memory.used"
| filter dt.entity.service == "SERVICE-<id>"
| makeTimeseries avg(value), interval:5m

// Send deployment events from CI/CD pipeline (curl example):
// curl -X POST "https://{env-id}.live.dynatrace.com/api/v2/events/ingest" \
//   -H "Authorization: Api-Token $DT_TOKEN" \
//   -d '{
//     "eventType": "CUSTOM_DEPLOYMENT",
//     "title": "Deployment v2.4.0",
//     "properties": {
//       "version": "v2.4.0",
//       "service": "payment-service",
//       "commit": "abc123"
//     }
//   }'
```

### 4. Infrastructure & Resource Bottleneck Dashboard

**Purpose:** Find resource exhaustion — CPU, memory, disk, connections.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    🖥 INFRASTRUCTURE BOTTLENECK DASHBOARD                │
├────────────────────┬────────────────────┬───────────────────────────────┤
│  CPU by Pod        │  Memory by Pod     │  Disk I/O                     │
│  payment-1 ████ 78%│  payment-1 █████89%│  /data  ██████ 67% (warn)    │
│  payment-2 ███  62%│  payment-2 ████ 71%│  /logs  ████   45%           │
│  order-1   ██   41%│  order-1   ███  52%│  /tmp   ██     23%           │
│  order-2   ██   38%│  order-2   ███  48%│                               │
├────────────────────┴────────────────────┴───────────────────────────────┤
│  Connection Pools                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ PostgreSQL Pool: 18/20 active (⚠ near exhaustion)                  ││
│  │ Redis Pool:       5/50 active (healthy)                             ││
│  │ HTTP Pool:       45/100 active (healthy)                            ││
│  │ Kafka Consumers:  3/3 active (at capacity)                          ││
│  └─────────────────────────────────────────────────────────────────────┘│
├───────────────────────────────┬─────────────────────────────────────────┤
│  Thread States                │  GC Activity                            │
│  ┌──────────────────────────┐ │  ┌──────────────────────────────────┐  │
│  │ RUNNABLE         45      │ │  │ Young GC:  12/min (healthy)      │  │
│  │ WAITING          23      │ │  │ Old GC:     3/min (⚠ elevated)  │  │
│  │ TIMED_WAITING    67      │ │  │ GC Pause P95:  120ms            │  │
│  │ BLOCKED          12 ⚠   │ │  │ Heap After GC:  72% (⚠ rising)  │  │
│  └──────────────────────────┘ │  └──────────────────────────────────┘  │
├───────────────────────────────┴─────────────────────────────────────────┤
│  Pod Restart History (last 24h)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ payment-svc-abc123  OOMKilled   3 restarts   last: 14:23           ││
│  │ order-svc-def456    CrashLoop   5 restarts   last: 13:58           ││
│  │ kafka-consumer-ghi  OOMKilled   1 restart    last: 09:12           ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**DQL Queries:**

```dql
// CPU usage by pod (top consumers)
fetch metrics
| filter metric.key == "dt.kubernetes.container.cpu_usage"
| summarize avg_cpu = avg(value), by:{k8s.pod.name, k8s.namespace.name}
| sort avg_cpu desc
| limit 20

// Memory usage with OOM risk detection
fetch metrics
| filter metric.key == "dt.kubernetes.container.memory_working_set"
| summarize current_memory = last(value), by:{k8s.pod.name}
| lookup [
    fetch metrics
    | filter metric.key == "dt.kubernetes.container.memory_limit"
    | summarize mem_limit = last(value), by:{k8s.pod.name}
  ], sourceField:k8s.pod.name, lookupField:k8s.pod.name
| fieldsAdd usage_pct = 100.0 * current_memory / mem_limit
| filter usage_pct > 70
| sort usage_pct desc

// Connection pool saturation
fetch metrics
| filter metric.key == "hikaricp.connections.active"
    OR metric.key == "hikaricp.connections.max"
| summarize latest = last(value), by:{metric.key, pool.name}

// Thread state analysis (detect thread starvation)
fetch metrics
| filter metric.key == "jvm.threads.states"
| summarize count = sum(value), by:{state}
| sort count desc

// GC pause trends (memory leak indicator)
fetch metrics
| filter metric.key == "jvm.gc.pause"
| makeTimeseries p95_gc_pause = percentile(value, 95), interval:10m

// Pod restart events (OOMKill, CrashLoopBackOff)
fetch events
| filter event.type == "K8S_EVENT"
| filter content contains "OOMKilled" OR content contains "CrashLoopBackOff"
    OR content contains "Restarting"
| fields timestamp, k8s.pod.name, reason, content
| sort timestamp desc
| limit 50

// Heap usage after GC (rising = memory leak)
fetch metrics
| filter metric.key == "jvm.memory.used" AND jvm.memory.type == "heap"
| makeTimeseries heap_after_gc = min(value), interval:10m
```

### 5. Dependency Failure & Circuit Breaker Dashboard

**Purpose:** When downstream services or databases fail, see the blast radius.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    🔗 DEPENDENCY FAILURE DASHBOARD                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Dependency Health Map                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  [payment-svc] ──●── [PostgreSQL]     🟢 12ms                      ││
│  │       │         ──●── [Redis]         🟢  3ms                      ││
│  │       │         ──●── [partner-api]   🔴 TIMEOUT                   ││
│  │       │         ──●── [Kafka]         🟢 15ms                      ││
│  │       │                                                             ││
│  │  [order-svc]   ──●── [PostgreSQL]     🟡 230ms (degraded)          ││
│  │       │         ──●── [payment-svc]   🔴 CIRCUIT OPEN              ││
│  │       │         ──●── [Redis]         🟢  5ms                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
├───────────────────────────────┬─────────────────────────────────────────┤
│  Circuit Breaker States       │  Retry / Fallback Activity              │
│  ┌──────────────────────────┐ │  ┌──────────────────────────────────┐  │
│  │ partner-api    OPEN   🔴 │ │  │ Retries:    1,234/min (⚠ high)  │  │
│  │ fraud-check    HALF   🟡 │ │  │ Fallbacks:    567/min            │  │
│  │ notification   CLOSED 🟢 │ │  │ Timeouts:     890/min            │  │
│  │ account-svc    CLOSED 🟢 │ │  │ Bulkhead Rej:  23/min           │  │
│  └──────────────────────────┘ │  └──────────────────────────────────┘  │
├───────────────────────────────┼─────────────────────────────────────────┤
│  Downstream Error Rates       │  Cascade Risk Score                     │
│  ┌──────────────────────────┐ │  ┌──────────────────────────────────┐  │
│  │ partner-api     87% ████│ │  │ payment-svc:  HIGH (3 deps down) │  │
│  │ PostgreSQL       5%  █  │ │  │ order-svc:    MEDIUM (1 dep)     │  │
│  │ Redis            0%     │ │  │ user-svc:     LOW (all healthy)  │  │
│  │ Kafka            1%     │ │  │ notify-svc:   LOW                │  │
│  └──────────────────────────┘ │  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**DQL Queries:**

```dql
// Downstream dependency health (error rate and latency)
fetch spans
| filter span.kind == "CLIENT"
| summarize total = count(),
    errors = countIf(otel.status_code == "ERROR"),
    avg_latency = avg(duration),
    p95_latency = percentile(duration, 95),
    by:{peer.service, dt.entity.service}
| fieldsAdd error_rate = 100.0 * errors / total
| fieldsAdd health = if(error_rate > 50, "DOWN",
    error_rate > 10, "degraded", else: "healthy")
| sort error_rate desc

// Circuit breaker state tracking (Resilience4j metrics)
fetch metrics
| filter metric.key == "resilience4j.circuitbreaker.state"
| summarize state = last(value), by:{name}
// state: 0=CLOSED, 1=OPEN, 2=HALF_OPEN

// Retry activity (high retries = dependency struggling)
fetch metrics
| filter metric.key == "resilience4j.retry.calls"
| summarize retries_per_min = rate(sum(value), 1m), by:{name, kind}
| filter kind == "successful_with_retry" OR kind == "failed_with_retry"

// Timeout trends per dependency
fetch spans
| filter span.kind == "CLIENT" AND otel.status_code == "ERROR"
| filter otel.status_description contains "timeout"
    OR otel.status_description contains "Timeout"
| makeTimeseries timeout_count = count(), by:{peer.service}, interval:5m

// Cascade failure detection — services with multiple failing dependencies
fetch spans
| filter span.kind == "CLIENT" AND otel.status_code == "ERROR"
| summarize failing_deps = countDistinct(peer.service),
    total_errors = count(),
    by:{dt.entity.service}
| filter failing_deps >= 2
| sort failing_deps desc

// Bulkhead rejections (thread pool exhaustion)
fetch metrics
| filter metric.key == "resilience4j.bulkhead.available.concurrent.calls"
| summarize available = last(value), by:{name}
| filter available == 0  // fully saturated
```

### 6. Kafka Consumer Lag & DLQ Dashboard

**Purpose:** Kafka consumers falling behind or messages landing in DLQ.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    📊 KAFKA LAG & DLQ DASHBOARD                         │
├───────────────────────────────┬─────────────────────────────────────────┤
│  Consumer Lag by Group        │  DLQ Messages (last 24h)               │
│  ┌──────────────────────────┐ │  ┌──────────────────────────────────┐  │
│  │ payment-group  ████ 45K  │ │  │ payments.DLQ:    234 (+12/hr)    │  │
│  │ order-group    ██   12K  │ │  │ orders.DLQ:       56 (+3/hr)     │  │
│  │ notify-group   █     3K  │ │  │ compliance.DLQ:   12 (+1/hr)     │  │
│  │ audit-group    ▏    200  │ │  │ notifications.DLQ: 0             │  │
│  └──────────────────────────┘ │  └──────────────────────────────────┘  │
├───────────────────────────────┼─────────────────────────────────────────┤
│  Lag Trend (payment-group)    │  DLQ Error Breakdown                   │
│  ▁▁▂▃▅████████████           │  ┌──────────────────────────────────┐  │
│  ⚠ Lag growing steadily      │  │ DeserializationError   45%       │  │
│  since 13:00                  │  │ ValidationException    30%       │  │
│                               │  │ DuplicateKeyException  15%       │  │
│                               │  │ TimeoutException       10%       │  │
│                               │  └──────────────────────────────────┘  │
├───────────────────────────────┴─────────────────────────────────────────┤
│  Consumer Processing Rate vs Produce Rate                               │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Produce Rate:  ████████████████████  2,340 msg/s                   ││
│  │ Consume Rate:  ████████████          1,450 msg/s  ⚠ falling behind││
│  │ Gap:                       ████████    890 msg/s                    ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**DQL Queries:**

```dql
// Consumer lag by group and topic
fetch metrics
| filter metric.key == "kafka.consumer.lag"
    OR metric.key == "kafka_consumergroup_lag"
| summarize max_lag = max(value),
    by:{consumer_group, topic}
| sort max_lag desc

// DLQ message count trend
fetch bizevents
| filter event.type == "com.kafka.dlq"
| makeTimeseries dlq_count = count(), by:{topic}, interval:1h

// DLQ error analysis (why are messages failing?)
fetch logs
| filter content contains "DLQ" OR content contains "dead.letter"
| parse content, "'exception': 'LD:exception_type'"
| summarize count = count(), by:{exception_type, topic}
| sort count desc

// Produce rate vs consume rate (detect widening gap)
fetch metrics
| filter metric.key == "kafka.producer.record.send.rate"
    OR metric.key == "kafka.consumer.records.consumed.rate"
| makeTimeseries rate = avg(value), by:{metric.key}, interval:5m

// Consumer group health (active members, rebalances)
fetch metrics
| filter metric.key == "kafka.consumer.assigned.partitions"
| summarize partitions = sum(value), by:{consumer_group}
```

### Troubleshooting Workflow: 5-Step Process

```
Step 1: CHECK ERRORS         → Error Investigation Dashboard
        "What's broken?"       Look for error spikes, new exception types

Step 2: CHECK LATENCY         → Latency Root-Cause Dashboard
        "What's slow?"         Find P95/P99 spikes, trace slow paths

Step 3: CHECK DEPLOYMENTS     → Deployment Regression Dashboard
        "Did we break it?"     Compare before/after last deploy

Step 4: CHECK RESOURCES       → Infrastructure Dashboard
        "Are we out of X?"     CPU, memory, connections, threads

Step 5: CHECK DEPENDENCIES    → Dependency Failure Dashboard
        "Is something else     Circuit breakers, downstream errors,
         causing this?"        cascade detection
```

---

## Session Replay & Real User Monitoring

### What is Session Replay?

Session Replay is Dynatrace's capability to visually record and reconstruct user sessions in your web and mobile applications — without capturing screenshots or videos. Instead, it captures DOM mutations and user interactions to faithfully replay exactly what the user experienced.

### How Session Replay Works

```
┌──────────────────────────────────────────────────────────────────┐
│                    SESSION REPLAY ARCHITECTURE                    │
│                                                                  │
│  Browser / Mobile App                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  OneAgent JavaScript / Mobile SDK                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │  │
│  │  │ DOM Mutation  │  │ User Input   │  │ Network/XHR    │   │  │
│  │  │ Observer      │  │ Capture      │  │ Capture        │   │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬─────────┘   │  │
│  │         └─────────────────┼─────────────────┘              │  │
│  │                           ▼                                │  │
│  │              Compressed Event Stream                       │  │
│  │              (~100 KB/min per session)                     │  │
│  └───────────────────────────┬────────────────────────────────┘  │
│                              ▼                                   │
│  Dynatrace Cluster / Grail                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Session Replay Storage  ──→  Linked to PurePath Traces    │  │
│  │  Privacy Engine          ──→  Masking Rules Applied        │  │
│  │  Replay Renderer         ──→  Visual Playback in Browser   │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Key mechanisms:**
- **DOM-based recording** — Captures HTML structure mutations, not pixel-level screenshots
- **Incremental capture** — Only sends DOM changes (diffs), not the entire page
- **Bandwidth-efficient** — ~100 KB/min per session (much lighter than video recording)
- **Linked to traces** — Every replay frame is correlated with PurePath distributed traces
- **Privacy-first** — Masking rules applied before data leaves the browser

### Web Session Replay

```
┌─────────────────────────────────────────────────────────────────────┐
│  SESSION REPLAY PLAYER                                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  ┌──────────────────────────────────────────────────────┐     │  │
│  │  │                                                      │     │  │
│  │  │         Visual Replay of User Session                │     │  │
│  │  │         (reconstructed from DOM events)              │     │  │
│  │  │                                                      │     │  │
│  │  │  [User clicks "Pay Now"] → [Spinner] → [Error page] │     │  │
│  │  │                                                      │     │  │
│  │  └──────────────────────────────────────────────────────┘     │  │
│  │                                                               │  │
│  │  Timeline: ●───────●────────●────●──────●────────────→        │  │
│  │           Click  Page Load  XHR  Error  Rage Click            │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │ Waterfall: GET /api/payment 503 (2,340ms)               │  │  │
│  │  │            PurePath: trace_id=abc123 → view full trace  │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**What it captures:**
| Data Type | Captured | Privacy Notes |
|-----------|----------|---------------|
| Page loads & navigation | Yes | URLs visible |
| Button clicks & form input | Yes | Input values can be masked |
| Mouse movements & scrolls | Yes | No PII |
| XHR/Fetch requests | Yes | Linked to backend traces |
| JavaScript errors | Yes | Stack traces included |
| CSS changes & animations | Yes | Visual fidelity |
| Rage clicks (repeated clicks) | Yes | Frustration signal |
| Page resource loading | Yes | Waterfall timing |

### Mobile Session Replay

Dynatrace extends Session Replay to native mobile apps:

| Feature | iOS | Android |
|---------|-----|---------|
| **Screen recording** | View hierarchy capture | View hierarchy capture |
| **Gesture capture** | Taps, swipes, pinch | Taps, swipes, pinch |
| **Crash replay** | See what user did before crash | See what user did before crash |
| **Network requests** | XHR/OkHttp linked to backend | XHR/OkHttp linked to backend |
| **App lifecycle** | Foreground/background/terminate | Foreground/background/terminate |
| **Privacy masking** | Per-view masking rules | Per-view masking rules |
| **Data overhead** | ~50-80 KB/min | ~50-80 KB/min |

### Privacy & Data Masking

Session Replay provides multiple masking levels to protect sensitive data:

```java
// Dynatrace RUM JavaScript configuration
dtrum.enable({
    sessionReplay: {
        enabled: true,
        maskingRule: "MASK_USER_INPUT",   // Options below
        costControl: 100                   // % of sessions to record
    }
});
```

**Masking levels:**

| Level | What it masks | Use case |
|-------|--------------|----------|
| `ALLOW_ALL` | Nothing masked | Internal/dev environments only |
| `MASK_USER_INPUT` | All form inputs replaced with `***` | **Recommended for most apps** |
| `MASK_ALL_TEXT` | All text content masked | High-security / banking apps |
| `MASK_ALL` | Everything masked (only layout visible) | Maximum privacy, compliance |

**Fine-grained masking with CSS classes:**

```html
<!-- Mask specific elements -->
<span class="dtPrivacyMask">John Smith</span>         <!-- Masked -->
<input class="dtPrivacyMaskInput" type="text" />       <!-- Input masked -->

<!-- Explicitly allow elements (when using MASK_ALL_TEXT) -->
<h1 class="dtPrivacyAllow">Welcome to Dashboard</h1>  <!-- Not masked -->

<!-- Block recording of entire sections -->
<div class="dtPrivacyBlock">                           <!-- Replaced with placeholder -->
    <sensitive-component />
</div>
```

### Session Replay + Troubleshooting Workflow

The power of Session Replay is linking **what the user saw** to **what happened in the backend**:

```
User Experience (Session Replay)          Backend (PurePath Traces)
─────────────────────────────────         ─────────────────────────────
1. User opens payment page                → GET /api/account (200, 45ms)
2. User fills in amount: $500             → (no backend call yet)
3. User clicks "Pay Now"                  → POST /api/payments (503, 5200ms)
   ↳ Sees spinner for 5s                    ↳ payment-svc → db query (4800ms) 💀
   ↳ Error page shown                       ↳ DB connection pool exhausted
4. User rage-clicks "Pay Now" 3x          → POST /api/payments x3 (all fail)
5. User abandons                          → Session end

🔗 Clicking the error in replay → opens the exact PurePath trace
🔗 Clicking the trace → shows DB pool saturation at that moment
```

**DQL for Session Replay analysis:**

```dql
// Sessions with errors (candidates for replay review)
fetch usersessions
| filter totalErrorCount > 0
| summarize sessions = count(),
    avg_errors = avg(totalErrorCount),
    avg_duration = avg(duration),
    by:{city, os, browser}
| sort sessions desc

// Rage click detection (frustrated users)
fetch useraction
| filter type == "RAGE_CLICK"
| summarize rage_clicks = count(), by:{name, application}
| sort rage_clicks desc
| limit 20

// Sessions with high load time (slow experience)
fetch usersessions
| filter totalLoadTime > 5000  // >5s load
| fields sessionId, userType, city, totalLoadTime, totalErrorCount
| sort totalLoadTime desc
| limit 30

// Conversion funnel with drop-off analysis
fetch useraction
| filter application == "Payment Portal"
| summarize users = countDistinct(usersession.internalUserId),
    by:{name}
| filter name in ("Open Payment Page", "Fill Payment Form",
    "Click Pay", "Payment Confirmed")

// Error sessions by geography (find region-specific issues)
fetch usersessions
| filter totalErrorCount > 0 AND hasReplay == true
| summarize error_sessions = count(), by:{country, region}
| sort error_sessions desc
```

---

## New Dynatrace Features (2024-2025)

### Grail — Unified Data Lakehouse

Grail is Dynatrace's massively parallel data lakehouse that unifies **all** observability data under a single query engine (DQL).

```
┌──────────────────────────────────────────────────────────────────┐
│                        GRAIL ARCHITECTURE                        │
│                                                                  │
│  Data Sources              Grail Engine          Query / Analyze │
│  ┌──────────┐          ┌──────────────────┐    ┌──────────────┐ │
│  │ Metrics   │────────→│                  │───→│ DQL Queries  │ │
│  │ Logs      │────────→│  Unified Storage  │───→│ Dashboards   │ │
│  │ Traces    │────────→│  + Indexing       │───→│ Notebooks    │ │
│  │ Events    │────────→│                  │───→│ Alerts       │ │
│  │ BizEvents │────────→│  Massively       │───→│ Davis AI     │ │
│  │ Topology  │────────→│  Parallel        │───→│ AppEngine    │ │
│  │ RUM       │────────→│  Processing      │───→│ Automations  │ │
│  └──────────┘          └──────────────────┘    └──────────────┘ │
│                                                                  │
│  Key Capabilities:                                               │
│  • No pre-aggregation needed — query raw data at any granularity │
│  • Context-aware retention — hot/warm/cold tiers automatically   │
│  • Schema-on-read — no upfront schema definition required        │
│  • Petabyte-scale — handles enterprise-grade data volumes        │
│  • Sub-second queries — massively parallel execution             │
└──────────────────────────────────────────────────────────────────┘
```

**Before Grail vs After Grail:**

| Aspect | Before (Classic) | After (Grail) |
|--------|-----------------|---------------|
| Metrics storage | Fixed 5-min rollups | Raw resolution, any granularity |
| Log storage | Limited retention, separate | Unlimited*, unified with traces |
| Trace storage | PurePath (35 days) | Grail (configurable, context-aware) |
| Query language | USQL (limited) | DQL (full SQL-like, powerful) |
| Cross-signal queries | Not possible | `fetch logs \| join traces` |
| Business events | Limited | First-class `bizevents` |
| Topology data | Separate API | Queryable via DQL |

### Notebooks — Collaborative Analysis

Notebooks are Dynatrace's interactive analysis tool — think Jupyter Notebooks for observability:

```
┌──────────────────────────────────────────────────────────────────┐
│  📓 NOTEBOOK: Payment Service Incident Analysis (Feb 2025)       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Markdown Cell]                                                 │
│  ## Incident Summary                                             │
│  Payment service errors spiked at 14:23 UTC. Investigating      │
│  root cause and blast radius.                                    │
│                                                                  │
│  [DQL Cell]                                                      │
│  fetch logs                                                      │
│  | filter dt.entity.service == "payment-svc"                     │
│  | filter loglevel == "ERROR"                                    │
│  | makeTimeseries count(), interval:5m                           │
│  ──→ 📊 [Rendered chart showing error spike at 14:23]            │
│                                                                  │
│  [DQL Cell]                                                      │
│  fetch spans                                                     │
│  | filter dt.entity.service == "payment-svc"                     │
│  | filter otel.status_code == "ERROR"                            │
│  | summarize count(), by:{http.route}                            │
│  ──→ 📊 [Bar chart: POST /api/payments = 94% of errors]         │
│                                                                  │
│  [Markdown Cell]                                                 │
│  ## Root Cause                                                   │
│  Connection pool exhaustion after partner-api latency spike      │
│  caused thread starvation in payment-svc.                        │
│                                                                  │
│  ## Action Items                                                 │
│  - [ ] Increase HikariCP pool from 20 to 50                     │
│  - [ ] Add circuit breaker on partner-api calls                  │
│  - [ ] Set connection timeout to 3s (currently 30s)              │
│                                                                  │
│  👥 Shared with: @sre-team @payment-team                         │
└──────────────────────────────────────────────────────────────────┘
```

**Use cases for Notebooks:**
- **Incident investigation** — Step-by-step analysis with live DQL queries
- **Post-mortems** — Document findings with embedded charts and data
- **Knowledge sharing** — Reusable runbooks for common issues
- **Capacity planning** — Interactive resource trend analysis
- **Business reviews** — Mix technical metrics with business KPIs

### Davis CoPilot — Natural Language to DQL

Davis CoPilot lets engineers query Dynatrace using natural language, which is then converted to DQL:

```
┌──────────────────────────────────────────────────────────────────┐
│  DAVIS COPILOT                                                   │
│                                                                  │
│  You: "Show me the top 5 slowest API endpoints in the           │
│        payment service over the last hour"                       │
│                                                                  │
│  Davis CoPilot generates:                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ fetch spans, from:now()-1h                                 │  │
│  │ | filter dt.entity.service == "payment-svc"                │  │
│  │ | filter span.kind == "SERVER"                             │  │
│  │ | summarize p95 = percentile(duration, 95),                │  │
│  │     count = count(),                                       │  │
│  │     by:{http.route, http.request.method}                   │  │
│  │ | sort p95 desc                                            │  │
│  │ | limit 5                                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  You: "Now compare this to last week"                           │
│                                                                  │
│  Davis CoPilot: Adds a join with from:now()-1w, to:now()-1w+1h  │
│  and shows a comparison table.                                   │
│                                                                  │
│  You: "Create an alert if any endpoint P95 exceeds 2 seconds"  │
│                                                                  │
│  Davis CoPilot: Generates SLO definition + alert configuration   │
└──────────────────────────────────────────────────────────────────┘
```

**What Davis CoPilot can do:**
- Convert natural language → DQL queries
- Explain existing DQL queries in plain English
- Suggest dashboard tiles based on your question
- Generate alert configurations from plain requirements
- Summarize incidents with root cause context

### AppEngine — Custom Dynatrace Apps

Dynatrace AppEngine lets you build custom applications that run inside the Dynatrace platform:

```
┌──────────────────────────────────────────────────────────────────┐
│  DYNATRACE APPENGINE                                             │
│                                                                  │
│  Build custom apps using:                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  React + TypeScript   (frontend)                           │  │
│  │  Dynatrace SDK        (API access, DQL, Grail, topology)  │  │
│  │  Strato Components    (Dynatrace design system)            │  │
│  │  Serverless Functions  (backend logic)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Example Custom Apps:                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 📊 Release Validation    — Auto-compare metrics pre/post   │  │
│  │ 🏦 Banking Compliance    — Custom compliance dashboard     │  │
│  │ 💰 FinOps Dashboard      — Cloud cost + performance view   │  │
│  │ 🔒 Security Posture      — Vulnerability + runtime data    │  │
│  │ 📋 SLO Management Portal — Team-level SLO tracking         │  │
│  │ 🎫 Incident Management   — Custom workflow + integrations  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Deployment:                                                     │
│  $ npx @dynatrace/create-app@latest my-app                      │
│  $ cd my-app && npm run start    # Local dev                     │
│  $ npx dt-app deploy             # Deploy to Dynatrace           │
└──────────────────────────────────────────────────────────────────┘
```

### Automations (Workflows)

Dynatrace Automations let you build event-driven workflows that execute automatically:

```yaml
# Example: Auto-remediation workflow
trigger:
  type: davis-problem
  filter:
    category: "AVAILABILITY"
    entity.type: "SERVICE"

actions:
  - name: Gather context
    action: dynatrace.query
    input:
      dql: |
        fetch logs, from:now()-15m
        | filter dt.entity.service == "{{ event.entity.id }}"
        | filter loglevel == "ERROR"
        | summarize count(), by:{content}
        | sort count desc | limit 5

  - name: Check if safe to restart
    action: dynatrace.query
    input:
      dql: |
        fetch metrics
        | filter metric.key == "dt.kubernetes.pod.count"
        | filter dt.entity.service == "{{ event.entity.id }}"
        | summarize pods = last(value)

  - name: Restart pod if multiple replicas
    condition: "{{ steps.check_if_safe_to_restart.result.pods > 1 }}"
    action: dynatrace.webhook
    input:
      url: "https://k8s-api/restart/{{ event.entity.name }}"
      method: POST

  - name: Notify team
    action: dynatrace.slack
    input:
      channel: "#incidents"
      message: |
        🔄 Auto-remediation executed for {{ event.entity.name }}
        Problem: {{ event.title }}
        Action: Pod restart ({{ steps.check_if_safe_to_restart.result.pods }} replicas)
        Top errors: {{ steps.gather_context.result }}
```

**Common automation use cases:**
| Use Case | Trigger | Action |
|----------|---------|--------|
| Auto-restart unhealthy pods | Davis problem (availability) | K8s API call |
| Scale-up on load spike | Metric threshold | Cloud scaling API |
| Incident creation | Davis problem (any) | Jira/ServiceNow ticket |
| Deployment validation | Custom event (deploy) | DQL comparison queries |
| SLO breach notification | SLO error budget < 20% | Slack + PagerDuty |
| Cost anomaly alert | Cloud cost spike > 30% | Email + Jira |

### Feature Summary Table

| Feature | Purpose | Available Since | Key Benefit |
|---------|---------|----------------|-------------|
| **Grail** | Unified data lakehouse | 2023 (GA) | Query everything with DQL |
| **Notebooks** | Interactive analysis | 2023 | Collaborative incident investigation |
| **Davis CoPilot** | Natural language → DQL | 2024 | Lower barrier to observability |
| **AppEngine** | Custom Dynatrace apps | 2023 | Extend platform for your use cases |
| **Automations** | Event-driven workflows | 2024 | Auto-remediation, zero-touch ops |
| **Session Replay** | User session playback | 2020 (enhanced 2024) | See exactly what users experienced |
| **Ownership** | Service ownership tracking | 2024 | Clear accountability for services |
| **Vulnerability Analytics** | Runtime CVE detection | 2023 | Security + observability combined |

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

### Session Replay & RUM
- [ ] RUM JavaScript tag deployed on all web apps
- [ ] Session Replay enabled with appropriate masking level
- [ ] Sensitive fields masked with `dtPrivacyMask` CSS class
- [ ] Session recording cost control configured (% of sessions)
- [ ] Mobile SDK integrated for native app replay
- [ ] Rage click detection enabled for frustration analysis
- [ ] Conversion funnels defined for key user journeys

### Operations
- [ ] Deployment events sent to Dynatrace (for correlation)
- [ ] Synthetic monitors for critical user journeys
- [ ] Regular dashboard review (remove stale, add missing)
- [ ] On-call team has Dynatrace access and training
- [ ] Post-incident reviews use Dynatrace data (Notebooks)
- [ ] Automations configured for common remediation scenarios
- [ ] Davis CoPilot enabled for the team

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
