# Apache Kafka — Patterns, Anti-Patterns & Real-World Use Cases

> Comprehensive guide to event streaming architecture — from fundamentals to production patterns used by Netflix, Uber, LinkedIn, and more

## Table of Contents

- [Kafka Fundamentals](#kafka-fundamentals)
- [Architecture Deep Dive](#architecture-deep-dive)
- [Producer Patterns](#producer-patterns)
- [Consumer Patterns](#consumer-patterns)
- [Stream Processing Patterns](#stream-processing-patterns)
- [Event-Driven Architecture Patterns](#event-driven-architecture-patterns)
- [Schema Management](#schema-management)
- [Spring Kafka Integration](#spring-kafka-integration)
- [Performance & Tuning](#performance--tuning)
- [Monitoring & Observability](#monitoring--observability)
- [Anti-Patterns](#anti-patterns)
- [Real-World Use Cases](#real-world-use-cases-from-industry-leaders)
- [Kafka vs Alternatives](#kafka-vs-alternatives)
- [Best Practices Checklist](#best-practices-checklist)
- [Resources](#resources)

---

## Kafka Fundamentals

### Core Concepts

```
Producer → [Topic: orders] → Consumer Group A (Order Service)
                           → Consumer Group B (Analytics Service)
                           → Consumer Group C (Notification Service)

Topic "orders":
  Partition 0: [msg1] [msg4] [msg7] [msg10]
  Partition 1: [msg2] [msg5] [msg8] [msg11]
  Partition 2: [msg3] [msg6] [msg9] [msg12]
```

| Concept | Description |
|---------|-------------|
| **Topic** | Named category/feed of messages (like a table in a database) |
| **Partition** | Ordered, immutable sequence of messages within a topic |
| **Offset** | Unique ID of a message within a partition (monotonically increasing) |
| **Producer** | Application that publishes messages to topics |
| **Consumer** | Application that reads messages from topics |
| **Consumer Group** | Set of consumers that cooperatively consume from a topic |
| **Broker** | A Kafka server that stores data and serves clients |
| **Cluster** | Group of brokers working together |
| **Replication Factor** | Number of copies of each partition across brokers |
| **ISR** | In-Sync Replicas — replicas that are caught up with the leader |

### Message Anatomy

```json
{
  "topic": "orders",
  "partition": 2,
  "offset": 1042,
  "timestamp": 1708531200000,
  "key": "customer-123",
  "value": {
    "orderId": "ORD-789",
    "customerId": "customer-123",
    "items": [{"sku": "ITEM-1", "qty": 2}],
    "total": 49.99,
    "status": "CREATED"
  },
  "headers": {
    "correlation-id": "req-abc-123",
    "event-type": "OrderCreated",
    "schema-version": "v2"
  }
}
```

### Delivery Guarantees

| Guarantee | Description | Configuration |
|-----------|-------------|---------------|
| **At-most-once** | Messages may be lost, never duplicated | `acks=0` or `acks=1`, auto-commit |
| **At-least-once** | Messages never lost, may be duplicated | `acks=all`, manual commit, retries |
| **Exactly-once** | Messages delivered exactly once | `enable.idempotence=true`, transactional API |

---

## Architecture Deep Dive

### Partition Strategy

```
Key-based partitioning (default):
  partition = hash(key) % numPartitions

  customer-123 → always Partition 2
  customer-456 → always Partition 0
  customer-789 → always Partition 1

  ✅ Guarantees ordering per key
  ❌ Risk of hot partitions if keys are skewed
```

### Replication

```
Topic: payments (replication-factor=3)

Broker 1          Broker 2          Broker 3
┌──────────┐     ┌──────────┐     ┌──────────┐
│ P0 Leader │     │ P0 Follower│    │ P0 Follower│
│ P1 Follower│    │ P1 Leader │     │ P1 Follower│
│ P2 Follower│    │ P2 Follower│    │ P2 Leader │
└──────────┘     └──────────┘     └──────────┘
```

### Consumer Group Rebalancing

```
Consumer Group "order-processor" consuming topic with 6 partitions:

Scenario 1: 3 consumers
  Consumer A → P0, P1
  Consumer B → P2, P3
  Consumer C → P4, P5

Scenario 2: Consumer C dies → rebalance
  Consumer A → P0, P1, P4
  Consumer B → P2, P3, P5

Scenario 3: 6 consumers (optimal)
  Each consumer → 1 partition

Scenario 4: 8 consumers (2 idle)
  6 consumers → 1 partition each
  2 consumers → idle (wasted)
```

**Rule:** Max useful consumers in a group = number of partitions.

---

## Producer Patterns

### 1. Idempotent Producer

Prevents duplicate messages from retries at the broker level.

```java
Properties props = new Properties();
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);    // Required
props.put(ProducerConfig.ACKS_CONFIG, "all");                  // Forced by idempotence
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);   // Forced by idempotence
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5); // Max 5 with idempotence
```

**How it works:** Broker assigns a Producer ID (PID) and sequence number. Duplicate messages with the same PID + sequence are silently ignored.

### 2. Transactional Producer

Atomic writes across multiple partitions/topics.

```java
producer.initTransactions();

try {
    producer.beginTransaction();

    // Write to multiple topics atomically
    producer.send(new ProducerRecord<>("orders", orderId, orderEvent));
    producer.send(new ProducerRecord<>("audit-log", orderId, auditEvent));
    producer.send(new ProducerRecord<>("notifications", customerId, notifyEvent));

    // Commit consumer offsets within the same transaction (read-process-write)
    producer.sendOffsetsToTransaction(offsets, consumerGroupId);

    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
    throw e;
}
```

**Use case:** Exactly-once processing in read-process-write pipelines.

### 3. Partitioning Strategies

```java
// Custom partitioner for priority routing
public class PriorityPartitioner implements Partitioner {
    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                         Object value, byte[] valueBytes, Cluster cluster) {
        int numPartitions = cluster.partitionCountForTopic(topic);

        if (key instanceof String k && k.startsWith("PRIORITY-")) {
            return 0; // Priority messages always go to partition 0
        }
        // Default: hash-based distribution
        return Math.abs(Utils.murmur2(keyBytes)) % numPartitions;
    }
}
```

| Strategy | When to Use | Trade-off |
|----------|-------------|-----------|
| **Key-based (default)** | Need ordering per entity (e.g., per customer) | Hot partitions if key distribution skewed |
| **Round-robin** | No ordering needed, max throughput | No key-based ordering |
| **Custom** | Priority routing, tenant isolation | Complexity |
| **Sticky** | Batch efficiency (default since 2.4) | Slight ordering relaxation |

### 4. Outbox Pattern with Kafka

Guarantees event publication alongside database writes.

```
┌─────────────────────────────────┐
│         Order Service            │
│                                  │
│  1. BEGIN TRANSACTION            │
│  2. INSERT INTO orders (...)     │
│  3. INSERT INTO outbox (         │
│       event_type, payload,       │
│       created_at, published=false│
│     )                            │
│  4. COMMIT TRANSACTION           │
└──────────────┬──────────────────┘
               │
   ┌───────────▼───────────────┐
   │  Debezium CDC Connector    │   ← Reads WAL / binlog
   │  (or polling scheduler)    │
   └───────────┬───────────────┘
               │
        ┌──────▼──────┐
        │    Kafka     │
        │  "orders"    │
        └─────────────┘
```

**Implementation options:**
- **Debezium** — CDC from database WAL (recommended)
- **Polling** — Periodically query outbox table (simpler, higher latency)
- **Spring Integration** — `@Transactional` + `KafkaTemplate`

### 5. Batching & Compression

```java
// High-throughput producer configuration
props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65536);           // 64KB batches
props.put(ProducerConfig.LINGER_MS_CONFIG, 20);               // Wait up to 20ms to fill batch
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "zstd");    // Best compression ratio
props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 67108864);     // 64MB buffer
```

| Compression | Ratio | CPU | Best For |
|------------|-------|-----|----------|
| **none** | 1.0x | Lowest | Low-latency, small messages |
| **lz4** | ~2-3x | Low | General purpose, balanced |
| **snappy** | ~2x | Low | Legacy compatibility |
| **zstd** | ~3-5x | Medium | High throughput, large messages |
| **gzip** | ~3-4x | High | Max compression, less CPU available |

---

## Consumer Patterns

### 1. Manual Offset Management

```java
// At-least-once: commit after processing
consumer.subscribe(List.of("orders"));

while (true) {
    ConsumerRecords<String, Order> records = consumer.poll(Duration.ofMillis(100));

    for (ConsumerRecord<String, Order> record : records) {
        processOrder(record.value());  // Process first
    }

    consumer.commitSync();  // Then commit (if crash before commit → reprocess)
}
```

```java
// Fine-grained: commit per partition
for (TopicPartition partition : records.partitions()) {
    List<ConsumerRecord<String, Order>> partRecords = records.records(partition);

    for (ConsumerRecord<String, Order> record : partRecords) {
        processOrder(record.value());
    }

    long lastOffset = partRecords.get(partRecords.size() - 1).offset();
    consumer.commitSync(Map.of(partition, new OffsetAndMetadata(lastOffset + 1)));
}
```

### 2. Dead Letter Queue (DLQ) Pattern

Route failed messages to a separate topic for investigation.

```
Main Topic: "orders"
     │
     ▼
Consumer (attempt processing)
     │
     ├── Success → commit offset
     │
     └── Failure (after N retries)
              │
              ▼
         DLQ Topic: "orders.DLQ"
              │
              ▼
         Alert + Manual review / Reprocess
```

```java
// Spring Kafka DLQ configuration
@Bean
public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerFactory() {
    ConcurrentKafkaListenerContainerFactory<String, String> factory = new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(consumerFactory());

    // Retry 3 times with backoff, then send to DLQ
    factory.setCommonErrorHandler(new DefaultErrorHandler(
        new DeadLetterPublishingRecoverer(kafkaTemplate,
            (record, ex) -> new TopicPartition(record.topic() + ".DLQ", record.partition())),
        new FixedBackOff(1000L, 3)  // 1s interval, 3 attempts
    ));

    return factory;
}
```

### 3. Idempotent Consumer

Handle at-least-once delivery by deduplicating on the consumer side.

```java
@Service
public class OrderConsumer {

    @Autowired
    private ProcessedEventRepository processedEvents;

    @KafkaListener(topics = "orders")
    @Transactional
    public void consume(ConsumerRecord<String, OrderEvent> record) {
        String eventId = record.headers()
            .lastHeader("event-id").value().toString();

        // Check if already processed
        if (processedEvents.existsById(eventId)) {
            log.info("Duplicate event {}, skipping", eventId);
            return;
        }

        // Process the event
        orderService.processOrder(record.value());

        // Mark as processed (in same transaction as business logic)
        processedEvents.save(new ProcessedEvent(eventId, Instant.now()));
    }
}
```

### 4. Consumer Lag Monitoring

```
Consumer Group: order-processor
Topic: orders (3 partitions)

Partition 0:  Latest=1000  Committed=998   Lag=2    ✅
Partition 1:  Latest=1200  Committed=1195  Lag=5    ✅
Partition 2:  Latest=1500  Committed=800   Lag=700  ❌ Alert!
```

### 5. Parallel Consumer Pattern

Process messages concurrently while maintaining partition ordering.

```java
// Spring Kafka concurrent consumers
@KafkaListener(topics = "orders", concurrency = "6")  // 6 threads = 6 partitions
public void consume(ConsumerRecord<String, Order> record) {
    // Each thread processes one partition → ordering maintained per partition
    processOrder(record.value());
}
```

```java
// Custom thread pool for CPU-heavy processing
@KafkaListener(topics = "orders")
public void consume(ConsumerRecord<String, Order> record) {
    // Dispatch to thread pool but maintain partition ordering with per-key queues
    executorService.submit(() -> processOrder(record.value()));
}
```

---

## Stream Processing Patterns

### Kafka Streams Topology

```java
StreamsBuilder builder = new StreamsBuilder();

// Stream from input topic
KStream<String, Order> orders = builder.stream("orders");

// Filter, transform, branch
KStream<String, Order>[] branches = orders
    .filter((key, order) -> order.getTotal() > 0)
    .mapValues(order -> enrichOrder(order))
    .branch(
        (key, order) -> order.getTotal() > 1000,  // High-value
        (key, order) -> true                        // Standard
    );

// High-value orders → priority processing
branches[0].to("orders-priority");

// Standard orders → regular processing
branches[1].to("orders-standard");

// Aggregation: running totals per customer
KTable<String, Double> customerTotals = orders
    .groupBy((key, order) -> order.getCustomerId())
    .aggregate(
        () -> 0.0,
        (customerId, order, total) -> total + order.getTotal(),
        Materialized.as("customer-totals-store")
    );
```

### Common Stream Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **Filter** | Drop messages that don't match criteria | Remove test/internal events |
| **Map** | Transform message value or key | Data enrichment, format conversion |
| **FlatMap** | One input → zero or more outputs | Splitting composite events |
| **Branch** | Route to different streams by condition | Priority routing, type-based routing |
| **Aggregate** | Reduce grouped messages to a single value | Running totals, counters, min/max |
| **Join (Stream-Stream)** | Correlate two streams within a time window | Match orders with payments |
| **Join (Stream-Table)** | Enrich stream with reference data | Add customer details to orders |
| **Windowing** | Group by time windows | Tumbling, hopping, sliding, session |
| **Suppress** | Wait for window to close before emitting | Avoid partial window results |

### Windowing

```java
// Tumbling window: fixed, non-overlapping 5-minute windows
KTable<Windowed<String>, Long> clicksPerUser = clicks
    .groupByKey()
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
    .count();

// Session window: gap-based windows (30 min inactivity)
KTable<Windowed<String>, Long> sessionsPerUser = pageViews
    .groupByKey()
    .windowedBy(SessionWindows.ofInactivityGapWithNoGrace(Duration.ofMinutes(30)))
    .count();

// Hopping window: 5-min windows, advancing every 1 min
KTable<Windowed<String>, Long> rollingCount = events
    .groupByKey()
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5))
        .advanceBy(Duration.ofMinutes(1)))
    .count();
```

```
Tumbling (5 min):     |-------|-------|-------|
Hopping (5 min/1 min): |-------|
                         |-------|
                           |-------|
Session (30 min gap):  |---gap>30min---|---gap<30min-gap<30min---|
```

### Exactly-Once Stream Processing

```java
Properties props = new Properties();
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);
props.put(StreamsConfig.REPLICATION_FACTOR_CONFIG, 3);
```

---

## Event-Driven Architecture Patterns

### 1. Event Notification

Minimal event — tells consumers something happened.

```json
{
  "eventType": "OrderCreated",
  "orderId": "ORD-789",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

Consumer queries the source for full details. Low coupling, but requires callbacks.

### 2. Event-Carried State Transfer

Full event — contains all the data consumers need.

```json
{
  "eventType": "OrderCreated",
  "orderId": "ORD-789",
  "customerId": "CUST-123",
  "customerName": "Alice Smith",
  "items": [
    {"sku": "PROD-1", "name": "Widget", "price": 29.99, "qty": 2}
  ],
  "total": 59.98,
  "shippingAddress": { "street": "123 Main St", "city": "Portland" },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

No callbacks needed. Higher coupling to schema, larger messages.

### 3. Event Sourcing with Kafka

```
Command → Validate → Store Event → Apply to State → Publish Event

Event Log (Kafka topic: order-events, compacted):
  offset 0: OrderCreated    { orderId: "ORD-1", items: [...], total: 100 }
  offset 1: PaymentReceived { orderId: "ORD-1", amount: 100 }
  offset 2: ItemShipped     { orderId: "ORD-1", trackingId: "TRK-1" }
  offset 3: OrderCompleted  { orderId: "ORD-1" }

Current State (materialized view):
  { orderId: "ORD-1", status: "COMPLETED", total: 100, trackingId: "TRK-1" }
```

### 4. Saga Pattern (Choreography via Kafka)

```
order-events         payment-events       inventory-events      shipping-events
     │                    │                     │                     │
     │ OrderCreated       │                     │                     │
     │──────────────────→ │                     │                     │
     │                    │ PaymentProcessed     │                     │
     │                    │────────────────────→ │                     │
     │                    │                     │ InventoryReserved    │
     │                    │                     │───────────────────→  │
     │                    │                     │                     │ ShipmentCreated
     │                    │                     │                     │
     │                    │                     │                     │
     │ ← ← ← ← COMPENSATION (if any step fails) ← ← ← ← ← ← ← ← │
     │                    │                     │                     │
```

### 5. CQRS with Kafka

```
Write Side:                          Read Side:

Command → Service → DB (write)       Kafka → Projector → Read DB
              │                                            │
              └──→ Kafka topic ──→                         ▼
                   (domain events)               Optimized query views
                                                 (Elasticsearch, Redis,
                                                  materialized views)
```

### 6. Change Data Capture (CDC)

```
Database (PostgreSQL) → Debezium → Kafka → Consumers
         │                                    │
    Write operations                   Search indexing
    (normal CRUD)                      Analytics pipeline
                                       Cache invalidation
                                       Event-driven services
```

---

## Schema Management

### Schema Registry

```
Producer → Schema Registry (register/validate) → Kafka Broker
                    ↕
Consumer → Schema Registry (fetch schema)     ← Kafka Broker
```

### Avro Schema Example

```json
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.example.events",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "total", "type": "double"},
    {"name": "currency", "type": "string", "default": "USD"},
    {"name": "items", "type": {"type": "array", "items": {
      "type": "record",
      "name": "OrderItem",
      "fields": [
        {"name": "sku", "type": "string"},
        {"name": "quantity", "type": "int"},
        {"name": "price", "type": "double"}
      ]
    }}},
    {"name": "createdAt", "type": {"type": "long", "logicalType": "timestamp-millis"}}
  ]
}
```

### Schema Compatibility Modes

| Mode | Allowed Changes | Use Case |
|------|----------------|----------|
| **BACKWARD** | Delete fields, add optional fields | Consumers upgraded first |
| **FORWARD** | Add fields, delete optional fields | Producers upgraded first |
| **FULL** | Add/delete optional fields only | Independent upgrades |
| **NONE** | Any change | Development only |

**Best practice:** Use **FULL** compatibility for production topics. Always add new fields with defaults.

### Format Comparison

| Format | Schema | Size | Speed | Ecosystem |
|--------|--------|------|-------|-----------|
| **Avro** | Schema Registry | Small (binary) | Fast | Best Kafka integration |
| **Protobuf** | .proto files | Small (binary) | Fastest | gRPC interop |
| **JSON Schema** | Schema Registry | Large (text) | Slow | Human readable |
| **JSON (no schema)** | None | Large (text) | Slow | Simplest, risky |

---

## Spring Kafka Integration

### Producer Configuration

```java
@Configuration
public class KafkaProducerConfig {

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> config = Map.of(
            ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092",
            ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class,
            ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class,
            ProducerConfig.ACKS_CONFIG, "all",
            ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true,
            ProducerConfig.RETRIES_CONFIG, 3,
            ProducerConfig.COMPRESSION_TYPE_CONFIG, "zstd",
            ProducerConfig.LINGER_MS_CONFIG, 20
        );
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}
```

### Consumer Configuration

```java
@Configuration
@EnableKafka
public class KafkaConsumerConfig {

    @Bean
    public ConsumerFactory<String, Order> consumerFactory() {
        Map<String, Object> config = Map.of(
            ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092",
            ConsumerConfig.GROUP_ID_CONFIG, "order-service",
            ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class,
            ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class,
            ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest",
            ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false,
            ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500,
            JsonDeserializer.TRUSTED_PACKAGES, "com.example.events"
        );
        return new DefaultKafkaConsumerFactory<>(config);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Order> kafkaListenerFactory() {
        var factory = new ConcurrentKafkaListenerContainerFactory<String, Order>();
        factory.setConsumerFactory(consumerFactory());
        factory.setConcurrency(3);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
        return factory;
    }
}
```

### Listener with Error Handling

```java
@Service
@Slf4j
public class OrderEventListener {

    @KafkaListener(
        topics = "orders",
        groupId = "order-service",
        containerFactory = "kafkaListenerFactory"
    )
    public void handleOrder(
            @Payload Order order,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            @Header(KafkaHeaders.RECEIVED_TIMESTAMP) long timestamp,
            Acknowledgment ack) {

        try {
            log.info("Processing order {} from partition {} offset {}",
                order.getOrderId(), partition, offset);

            orderService.process(order);

            ack.acknowledge();  // Manual commit
        } catch (RetryableException e) {
            throw e;  // Let error handler retry
        } catch (Exception e) {
            log.error("Non-retryable error processing order {}", order.getOrderId(), e);
            ack.acknowledge();  // Skip poison pill (or send to DLQ)
        }
    }
}
```

### Testing with Embedded Kafka

```java
@SpringBootTest
@EmbeddedKafka(partitions = 3, topics = {"orders", "orders.DLQ"})
class OrderEventListenerTest {

    @Autowired
    private EmbeddedKafkaBroker embeddedKafka;

    @Autowired
    private KafkaTemplate<String, Order> kafkaTemplate;

    @Test
    void shouldProcessOrder() throws Exception {
        Order order = new Order("ORD-1", "CUST-1", BigDecimal.valueOf(99.99));

        kafkaTemplate.send("orders", order.getOrderId(), order).get();

        // Assert order was processed
        await().atMost(Duration.ofSeconds(10))
            .untilAsserted(() -> {
                Order saved = orderRepository.findById("ORD-1").orElseThrow();
                assertThat(saved.getStatus()).isEqualTo("PROCESSED");
            });
    }
}
```

### application.yml Best Practices

```yaml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BROKERS:localhost:9092}
    producer:
      acks: all
      retries: 3
      properties:
        enable.idempotence: true
        compression.type: zstd
        linger.ms: 20
        max.in.flight.requests.per.connection: 5
    consumer:
      group-id: ${spring.application.name}
      auto-offset-reset: earliest
      enable-auto-commit: false
      properties:
        max.poll.records: 500
        max.poll.interval.ms: 300000
        session.timeout.ms: 30000
        heartbeat.interval.ms: 10000
    listener:
      ack-mode: manual
      concurrency: 3
```

---

## Performance & Tuning

### Producer Tuning

| Parameter | Default | Recommendation | Impact |
|-----------|---------|---------------|--------|
| `batch.size` | 16KB | 64KB-256KB | Larger = higher throughput |
| `linger.ms` | 0 | 5-100ms | Higher = more batching |
| `compression.type` | none | zstd or lz4 | CPU vs network trade-off |
| `buffer.memory` | 32MB | 64-128MB | More buffering for bursts |
| `acks` | all | all (for durability) | Latency vs durability |
| `max.in.flight.requests` | 5 | 5 (with idempotence) | Ordering vs throughput |

### Consumer Tuning

| Parameter | Default | Recommendation | Impact |
|-----------|---------|---------------|--------|
| `fetch.min.bytes` | 1 | 1KB-1MB | Wait for more data per fetch |
| `fetch.max.wait.ms` | 500 | 500-2000ms | Max wait for fetch.min.bytes |
| `max.poll.records` | 500 | 100-1000 | Records per poll() call |
| `max.poll.interval.ms` | 300000 | Match processing time | Rebalance timeout |
| `session.timeout.ms` | 45000 | 10000-30000 | Failure detection speed |
| `heartbeat.interval.ms` | 3000 | session.timeout / 3 | Liveness signal frequency |

### Broker Tuning

| Parameter | Recommendation | Notes |
|-----------|---------------|-------|
| `num.partitions` | 3-12 per topic (default) | Scale with consumers, avoid over-partitioning |
| `default.replication.factor` | 3 | Minimum for production |
| `min.insync.replicas` | 2 | With `acks=all`, ensures 2 replicas before ack |
| `log.retention.hours` | 168 (7 days) | Adjust per use case |
| `log.segment.bytes` | 1GB | Smaller = faster cleanup |
| `num.io.threads` | 8 | Match disk count |
| `num.network.threads` | 3 | Match CPU cores / 2 |

### Throughput Benchmarks (Reference)

```
Single producer, single topic:
  - No compression:       ~100 MB/s
  - With zstd:           ~300 MB/s (wire), ~100 MB/s (uncompressed equivalent)

Single partition ordering: ~50K msgs/s (depends on message size)
Multi-partition:          ~500K-2M msgs/s (scales with partitions and producers)

LinkedIn production (2023): 7 trillion messages/day, 7 PB/day
```

---

## Monitoring & Observability

### Key Metrics to Monitor

#### Producer Metrics

| Metric | Alert Threshold | Meaning |
|--------|----------------|---------|
| `record-send-rate` | Drop > 50% | Messages being produced per second |
| `record-error-rate` | > 0 sustained | Failed sends |
| `request-latency-avg` | > 100ms | Time for broker acknowledgment |
| `batch-size-avg` | < 1KB | Batching not effective |
| `buffer-available-bytes` | < 10% of total | Producer buffer exhaustion risk |

#### Consumer Metrics

| Metric | Alert Threshold | Meaning |
|--------|----------------|---------|
| **`consumer-lag`** | > 10K (or growing) | Falling behind — most critical metric |
| `records-consumed-rate` | Drop > 50% | Processing throughput |
| `commit-latency-avg` | > 500ms | Slow offset commits |
| `rebalance-rate` | > 1/hour | Frequent consumer group disruptions |
| `poll-idle-ratio` | < 0.5 | Processing too slow between polls |

#### Broker Metrics

| Metric | Alert Threshold | Meaning |
|--------|----------------|---------|
| `UnderReplicatedPartitions` | > 0 | Replication falling behind |
| `ActiveControllerCount` | != 1 per cluster | Controller election issue |
| `OfflinePartitionsCount` | > 0 | Partitions without a leader |
| `IsrShrinksPerSec` | > 0 sustained | Replicas falling out of sync |
| `RequestQueueSize` | Growing | Broker overloaded |
| `NetworkProcessorIdlePercent` | < 30% | Network threads saturated |

### Monitoring Stack

```
Kafka Brokers → JMX Exporter → Prometheus → Grafana
                                                │
Kafka Consumers → Micrometer ─────────────────→ │
                                                │
Kafka Connect → JMX ──────────────────────────→ │
                                                ▼
                                          Dashboards & Alerts
```

**Tools:**
- **Confluent Control Center** — Commercial, full-featured
- **AKHQ** — Open-source Kafka GUI (topics, consumer groups, schema registry)
- **Kafdrop** — Lightweight Kafka web UI
- **Burrow** — LinkedIn's consumer lag monitoring
- **Cruise Control** — LinkedIn's cluster rebalancing

---

## Anti-Patterns

### ❌ 1. Using Kafka as a Database

**Symptom:** Querying Kafka topics by arbitrary fields, treating topics as tables, infinite retention with random access expectations.

**Why it fails:** Kafka is a commit log, not a database. No secondary indexes, no efficient point lookups, no SQL.

**Fix:** Use Kafka for event transport. Materialize views into appropriate databases (PostgreSQL, Elasticsearch, Redis) for querying.

---

### ❌ 2. Huge Messages

**Symptom:** Sending 10MB+ messages (PDFs, images, large payloads) through Kafka.

**Why it fails:** Increases memory pressure on brokers and consumers, slows replication, causes timeouts, increases GC pauses.

**Fix:** Store large payloads in object storage (S3, GCS). Send a reference (URL/path) in the Kafka message.

```json
// ❌ Bad
{ "orderId": "123", "invoice": "<10MB PDF base64>" }

// ✅ Good
{ "orderId": "123", "invoiceUrl": "s3://invoices/123.pdf" }
```

---

### ❌ 3. Too Many Partitions

**Symptom:** Topics with 100+ partitions "just in case."

**Why it fails:** More partitions = more file handles, more memory, slower leader elections, longer rebalances, more end-to-end latency.

**Fix:** Start with `max(throughput_needed / partition_throughput, consumer_count)`. Typical: 3-12 partitions per topic. You can always add more later (but can't reduce).

---

### ❌ 4. No Dead Letter Queue

**Symptom:** Poison pill messages block entire partitions. Consumer retries forever or silently drops messages.

**Why it fails:** One bad message stops all processing for that partition.

**Fix:** After N retries, route to DLQ topic. Alert on DLQ messages. Provide tooling to inspect and replay.

---

### ❌ 5. Auto-Commit in Production

**Symptom:** `enable.auto.commit=true` with default 5-second interval. Messages lost or duplicated during crashes.

**Why it fails:** Offsets committed before processing completes (data loss) or processing completes before commit (duplicates).

**Fix:** Manual offset management. Commit after successful processing.

---

### ❌ 6. No Schema Management

**Symptom:** JSON messages with no schema. Producers add/remove/rename fields freely. Consumers break on deserialization.

**Why it fails:** No contract between producers and consumers. Breaking changes are invisible until runtime.

**Fix:** Use Schema Registry with Avro/Protobuf. Enforce compatibility rules. Test schema changes in CI.

---

### ❌ 7. Shared Consumer Group Across Services

**Symptom:** Two different microservices using the same `group.id` to consume from a topic.

**Why it fails:** Kafka distributes partitions within a consumer group. Each message goes to only ONE consumer in the group. Both services get incomplete data.

**Fix:** Each service gets its own consumer group.

```
✅ Service A: group.id = "order-service"     → gets ALL messages
✅ Service B: group.id = "analytics-service"  → gets ALL messages

❌ Both using group.id = "shared" → each gets HALF the messages
```

---

### ❌ 8. Ignoring Consumer Lag

**Symptom:** Consumer lag grows silently. System appears to work but data is hours/days behind.

**Why it fails:** Consumers can't keep up with producer rate. No alerts, no visibility.

**Fix:** Monitor consumer lag continuously. Alert on lag growth. Scale consumers or optimize processing.

---

### ❌ 9. Topic-per-Entity

**Symptom:** Creating a separate topic per customer, per tenant, or per order (`orders-customer-123`).

**Why it fails:** Thousands of topics = massive metadata overhead, slow broker restarts, unmanageable.

**Fix:** Use one topic with message keys for partitioning. Use headers for routing.

---

### ❌ 10. Fire-and-Forget Without Callbacks

**Symptom:** `producer.send(record)` with no callback and no `.get()`. Failures silently ignored.

**Why it fails:** Network issues, broker unavailability, serialization errors — all silent.

**Fix:** Always handle the send result.

```java
// ✅ Async with callback
kafkaTemplate.send("orders", key, value)
    .whenComplete((result, ex) -> {
        if (ex != null) {
            log.error("Failed to send message", ex);
            metrics.increment("kafka.send.failure");
        } else {
            log.debug("Sent to partition {} offset {}",
                result.getRecordMetadata().partition(),
                result.getRecordMetadata().offset());
        }
    });
```

### Anti-Pattern Summary

| Anti-Pattern | Severity | Detection |
|-------------|----------|-----------|
| Kafka as database | High | Queries against topics, infinite retention |
| Huge messages | High | Broker memory spikes, slow replication |
| Too many partitions | Medium | Slow rebalances, high file handle count |
| No DLQ | Critical | Stuck consumers, lost messages |
| Auto-commit | High | Data loss or duplicate processing |
| No schema management | High | Deserialization errors in production |
| Shared consumer group | Critical | Missing data across services |
| Ignoring consumer lag | Critical | Stale data, growing lag |
| Topic-per-entity | High | Thousands of topics |
| Fire-and-forget | High | Silent message loss |

---

## Real-World Use Cases from Industry Leaders

### LinkedIn — Where Kafka Was Born

**Scale:** 7+ trillion messages/day, 7+ PB/day

**Use cases:**
- **Activity stream processing** — Every profile view, search, click, and connection request flows through Kafka
- **Metrics pipeline** — Operational metrics from 300+ services aggregated via Kafka
- **Change data capture** — Database changes streamed to search indexes and data warehouse
- **Newsfeed** — Real-time feed generation from Kafka event streams

**Key patterns used:**
- Tiered storage (hot/cold separation for cost optimization)
- Multi-datacenter replication with MirrorMaker 2
- Custom consumer lag monitoring (Burrow — open-sourced)
- Cruise Control for automated cluster rebalancing

**Engineering blog:** [LinkedIn Engineering — Kafka](https://engineering.linkedin.com/blog/topic/kafka)

---

### Netflix — Real-Time Data Infrastructure

**Scale:** 1+ trillion messages/day across multiple Kafka clusters

**Use cases:**
- **Real-time personalization** — Viewing history, ratings, and interactions stream through Kafka to recommendation engines
- **Data pipeline** — Event transport between microservices (700+ microservices)
- **A/B test analytics** — Real-time experiment results via Kafka Streams
- **Security monitoring** — Real-time anomaly detection from access logs
- **Studio content workflow** — Content encoding, localization, and delivery orchestration

**Key patterns used:**
- **Keystone pipeline** — Unified event streaming platform built on Kafka
- Multi-region Kafka with active-active replication
- Schema evolution with Avro and backward compatibility
- Consumer-side filtering to reduce processing load
- Tiered storage for cost optimization (PB-scale retention)

**Engineering blog:** [Netflix TechBlog — Kafka](https://netflixtechblog.com/)

---

### Uber — Real-Time Marketplace

**Scale:** Trillions of messages/day, hundreds of Kafka clusters

**Use cases:**
- **Surge pricing** — Real-time supply-demand calculation from driver/rider events
- **Trip processing** — Every GPS ping, ride request, and status change flows through Kafka
- **Marketplace matching** — Real-time driver-rider matching using Kafka Streams
- **Financial reconciliation** — Payments, tips, and refunds processed through event streams
- **Fraud detection** — Real-time transaction scoring from payment events
- **City-level analytics** — Per-city dashboards fed by Kafka aggregations

**Key patterns used:**
- **uReplicator** — Custom cross-datacenter replication (open-sourced)
- Dead letter queues with automated retry policies
- Schema registry with strict backward compatibility
- Exactly-once semantics for financial data
- Consumer-driven contract testing for event schemas
- Multi-tenant Kafka clusters with resource quotas

**Engineering blog:** [Uber Engineering](https://www.uber.com/blog/engineering/)

---

### Spotify — Personalization & Discovery

**Use cases:**
- **Listening history** — Every play, skip, and save feeds recommendation models via Kafka
- **Discover Weekly / Release Radar** — Batch + stream hybrid processing for playlist generation
- **Ad serving** — Real-time ad impressions and click tracking
- **A/B testing** — Feature flag events and experiment metrics

**Key patterns used:**
- Event sourcing for user listening state
- Cloud-native Kafka on GCP (GKE-hosted)
- Avro schemas with schema registry
- Kafka Connect for data pipeline integration

---

### Stripe — Financial Event Processing

**Use cases:**
- **Payment processing** — Every payment intent, charge, and refund is an event
- **Webhook delivery** — Customer webhooks sourced from Kafka topics
- **Fraud scoring** — Real-time transaction risk scoring pipeline
- **Ledger updates** — Double-entry bookkeeping from payment events

**Key patterns used:**
- Exactly-once semantics (financial data requires it)
- Idempotent consumers with deduplication keys
- Transactional outbox pattern for database + event consistency
- Schema registry with strict validation
- Multi-datacenter active-passive with automated failover

---

### Airbnb — Real-Time Event Platform

**Use cases:**
- **Search ranking** — Real-time signals (views, bookings, cancellations) feed search models
- **Trust & safety** — Real-time fraud detection from user behavior events
- **Pricing** — Dynamic pricing based on supply-demand streaming data
- **Messaging** — Host-guest messaging infrastructure

**Key patterns used:**
- Unified event bus — all microservices publish to Kafka
- Schema registry with automated compatibility checks in CI
- Change data capture (Debezium) for database sync
- Kafka Streams for real-time aggregations

---

### Walmart — E-Commerce at Scale

**Use cases:**
- **Inventory management** — Real-time stock updates across 10,000+ stores and online
- **Order processing** — Order lifecycle events (placed, picked, shipped, delivered)
- **Price updates** — Real-time price propagation to all channels
- **Customer 360** — Event-driven customer data platform

**Key patterns used:**
- Multi-datacenter Kafka with geo-replication
- Exactly-once for inventory accuracy
- Compacted topics for latest-value lookups (product catalog)
- Kafka Connect for legacy system integration

---

### Cloudflare — Network Edge Processing

**Use cases:**
- **DNS analytics** — Processing 30+ million requests/second
- **DDoS detection** — Real-time attack pattern detection from network events
- **Log pipeline** — Customer access logs streamed to analytics

**Key patterns used:**
- Kafka for high-throughput log aggregation
- Custom partitioning by customer ID for isolation
- Stream processing for real-time anomaly detection

---

### Common Patterns Across Industry Leaders

| Pattern | Who Uses It | Why |
|---------|------------|-----|
| **Exactly-once semantics** | Stripe, Uber, Walmart | Financial accuracy |
| **Schema Registry + Avro** | Netflix, Airbnb, LinkedIn | Contract-first, safe evolution |
| **Transactional outbox** | Stripe, Uber | DB + event atomicity |
| **Multi-datacenter replication** | LinkedIn, Netflix, Uber | Global availability |
| **Dead letter queues** | Uber, Netflix | Resilient error handling |
| **Consumer lag monitoring** | LinkedIn (Burrow), all | Operational health |
| **Tiered storage** | LinkedIn, Netflix | Cost optimization at PB scale |
| **CDC with Debezium** | Airbnb, Walmart | Legacy integration, sync |
| **Compacted topics** | Walmart, all | Latest-value state |
| **Kafka Streams** | Uber, Netflix | Real-time aggregations |

---

## Kafka vs Alternatives

| Feature | Apache Kafka | RabbitMQ | Apache Pulsar | AWS Kinesis | Google Pub/Sub |
|---------|-------------|----------|--------------|-------------|----------------|
| **Model** | Distributed log | Message broker | Distributed log | Managed stream | Managed pub/sub |
| **Ordering** | Per partition | Per queue | Per partition | Per shard | Per key (limited) |
| **Retention** | Configurable (time/size) | Until consumed | Tiered (native) | 7 days max | 7 days max |
| **Replay** | Yes (offset-based) | No (by default) | Yes (offset-based) | Yes (sequence) | Yes (seek) |
| **Throughput** | Very high (MB/s per partition) | Medium | Very high | Medium | Medium-high |
| **Latency** | Low (ms) | Very low (sub-ms) | Low (ms) | Medium | Medium |
| **Exactly-once** | Native | No | Native | No | No |
| **Stream processing** | Kafka Streams, ksqlDB | No | Pulsar Functions | Kinesis Analytics | Dataflow |
| **Managed** | Confluent Cloud, MSK, HDInsight | CloudAMQP, AmazonMQ | StreamNative | AWS native | GCP native |
| **Best for** | Event streaming, high throughput, replay | Task queues, low latency, routing | Multi-tenancy, tiered storage | AWS-native streaming | GCP-native pub/sub |

### When to Choose Kafka

✅ **Choose Kafka when:**
- You need message replay and event sourcing
- High throughput is required (100K+ msgs/s)
- Multiple consumers need the same data (pub/sub + replay)
- You need stream processing (Kafka Streams, ksqlDB)
- Event-driven microservices architecture
- Long-term event retention (days, weeks, months)

❌ **Consider alternatives when:**
- Simple task queue (use RabbitMQ or SQS)
- Fully managed with zero ops (use Pub/Sub or Kinesis)
- Sub-millisecond latency required (use RabbitMQ)
- Very small scale (< 1000 msgs/s) — Kafka overhead not justified

---

## Best Practices Checklist

### Design

- [ ] Events are immutable facts, not commands
- [ ] Topic naming convention established (e.g., `<domain>.<entity>.<event>`)
- [ ] Partition key chosen for ordering requirements
- [ ] Partition count planned based on throughput and consumer count
- [ ] Schema defined with Avro/Protobuf in Schema Registry
- [ ] Compatibility mode set (FULL recommended)
- [ ] Retention policy configured (time-based and/or size-based)

### Producer

- [ ] `acks=all` for durability
- [ ] Idempotence enabled (`enable.idempotence=true`)
- [ ] Compression enabled (zstd or lz4)
- [ ] Send callbacks or `.get()` — never fire-and-forget
- [ ] Key set for ordering (or null for round-robin)
- [ ] Headers include correlation-id, event-type, schema-version

### Consumer

- [ ] `enable.auto.commit=false` — manual offset management
- [ ] Dead letter queue configured
- [ ] Idempotent processing (deduplication by event ID)
- [ ] `max.poll.interval.ms` tuned to processing time
- [ ] Graceful shutdown implemented (commit offsets, close consumers)
- [ ] Each service has its own consumer group

### Operations

- [ ] Monitoring: consumer lag, throughput, error rates
- [ ] Alerting on lag growth, under-replicated partitions, offline partitions
- [ ] `min.insync.replicas=2` with `replication.factor=3`
- [ ] Log compaction enabled for state topics
- [ ] Cluster sizing: 3+ brokers, separate Zookeeper/KRaft controllers
- [ ] Upgrade plan: rolling upgrades with compatibility testing
- [ ] Disaster recovery: multi-datacenter replication or backup

### Security

- [ ] SASL/SCRAM or mTLS for authentication
- [ ] ACLs configured (per-topic, per-consumer-group)
- [ ] Encryption in transit (TLS)
- [ ] Encryption at rest (broker-level or volume encryption)
- [ ] Schema Registry access controlled

---

## Resources

### Books

- **"Kafka: The Definitive Guide"** — Gwen Shapira, Todd Palino, Rajini Sivaram, Krit Petty (2nd edition, O'Reilly)
- **"Designing Event-Driven Systems"** — Ben Stopford (free from Confluent)
- **"Kafka Streams in Action"** — Bill Bejeck (Manning)
- **"Event-Driven Microservices"** — Adam Bellemare (O'Reilly)
- **"Building Event-Driven Microservices"** — Adam Bellemare
- **"Streaming Systems"** — Akidau, Chernyak, Lax (Google — streaming fundamentals)

### Official Documentation

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Confluent Documentation](https://docs.confluent.io/)
- [Kafka Improvement Proposals (KIPs)](https://cwiki.apache.org/confluence/display/KAFKA/Kafka+Improvement+Proposals)
- [Spring for Apache Kafka](https://spring.io/projects/spring-kafka)
- [Kafka Streams Documentation](https://kafka.apache.org/documentation/streams/)

### Podcasts & YouTube

| Resource | Focus |
|----------|-------|
| [Streaming Audio (Confluent)](https://developer.confluent.io/podcast/) | Kafka deep dives, industry guests |
| [Confluent YouTube](https://www.youtube.com/@Confluent) | Kafka tutorials, conference talks |
| [Tim Berglund — Data Mesh / Kafka](https://www.youtube.com/@TimBerglundRealOne) | Distributed systems, Kafka |
| [Robin Moffatt](https://www.youtube.com/@rmoff) | Kafka Connect, ksqlDB, practical demos |
| [Kafka Summit talks](https://www.confluent.io/resources/kafka-summit-2024/) | Conference archive |

### Key Blogs

- [Confluent Blog](https://www.confluent.io/blog/) — Kafka patterns, releases, use cases
- [LinkedIn Engineering](https://engineering.linkedin.com/blog/topic/kafka) — Kafka at scale
- [Netflix TechBlog](https://netflixtechblog.com/) — Kafka in streaming infrastructure
- [Uber Engineering](https://www.uber.com/blog/engineering/) — Real-time data with Kafka
- [Martin Kleppmann's Blog](https://martin.kleppmann.com/) — Distributed systems theory

### GitHub Repositories

- [apache/kafka](https://github.com/apache/kafka) — Kafka source code
- [confluentinc/examples](https://github.com/confluentinc/examples) — Confluent examples
- [spring-kafka](https://github.com/spring-projects/spring-kafka) — Spring Kafka
- [debezium](https://github.com/debezium/debezium) — CDC platform
- [AKHQ](https://github.com/tchiotludo/akhq) — Kafka GUI

### Conferences

| Conference | Focus |
|-----------|-------|
| **Kafka Summit** | Dedicated Kafka conference (Confluent) |
| **Current (Confluent)** | Broader data streaming conference |
| **Devoxx** | JVM ecosystem (many Kafka talks) |
| **QCon** | Architecture (event-driven sessions) |
| **KubeCon** | Kafka on Kubernetes, Strimzi |

---

*"Kafka is not just a message broker — it's a distributed commit log that becomes the central nervous system of your data architecture. Treat it as infrastructure, not a library."*
