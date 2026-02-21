# System Design — Complete Reference

> Everything you need to design large-scale distributed systems — from fundamentals to real-world architectures

## Table of Contents

- [Fundamentals](#fundamentals)
- [Scalability](#scalability)
- [Database Design](#database-design)
- [Caching](#caching)
- [Message Queues & Streaming](#message-queues--streaming)
- [Networking & Protocols](#networking--protocols)
- [Load Balancing](#load-balancing)
- [API Design](#api-design)
- [Consistency & Consensus](#consistency--consensus)
- [Storage Systems](#storage-systems)
- [Security Architecture](#security-architecture)
- [Reliability & Fault Tolerance](#reliability--fault-tolerance)
- [Observability](#observability)
- [Real-World System Designs](#real-world-system-designs)
- [System Design Interview Framework](#system-design-interview-framework)
- [Resources](#resources)

---

## Fundamentals

### Key Theorems & Trade-offs

| Concept | Description |
|---------|-------------|
| **CAP Theorem** | Distributed systems can guarantee only 2 of 3: Consistency, Availability, Partition tolerance |
| **PACELC** | Extension of CAP: if Partition → choose A or C; Else → choose Latency or Consistency |
| **BASE** | Basically Available, Soft state, Eventually consistent — alternative to ACID for distributed systems |
| **ACID** | Atomicity, Consistency, Isolation, Durability — traditional database guarantees |
| **Amdahl's Law** | Speedup limited by the serial fraction of a task |

### CAP Trade-offs in Practice

```
         Consistency
            /\
           /  \
          /    \
         / CP   \
        /  systems\
       /    (HBase,\
      /   Zookeeper)\
     /________________\
    /\      /\        /\
   /  \ CA /  \ AP   /  \
  / (RDBMS, /  \(Cassandra,\
 / single   /    \DynamoDB,  \
/ node)    /      \  Couchbase)\
Availability ——— Partition Tolerance
```

| System | CAP Choice | Trade-off |
|--------|-----------|-----------|
| **PostgreSQL (single)** | CA | No partition tolerance (single node) |
| **Cassandra** | AP | Eventually consistent reads |
| **MongoDB** | CP | Unavailable during leader election |
| **DynamoDB** | AP (default) | Eventually consistent; CP with strong reads |
| **Zookeeper** | CP | Unavailable during leader election |
| **Redis Cluster** | AP | May lose writes during partition |

### Latency Numbers Every Engineer Should Know

```
L1 cache reference:                    1 ns
L2 cache reference:                    4 ns
Main memory reference:                100 ns
SSD random read:                   16,000 ns  (16 μs)
HDD seek:                      2,000,000 ns  (2 ms)
Round trip within same datacenter:   500,000 ns  (0.5 ms)
Round trip CA → Netherlands:     150,000,000 ns  (150 ms)

Key takeaways:
  - Memory is 160x faster than SSD
  - SSD is 125x faster than HDD
  - Network within DC adds 0.5ms per hop
  - Cross-continent adds 150ms per hop
```

### Back-of-Envelope Estimation

```
Traffic estimation:
  DAU × actions/day × data/action = daily data volume
  Example: 10M DAU × 10 reads/day × 1KB = 100GB reads/day
                                         = ~1.2K reads/sec

Storage estimation:
  Daily new data × retention period = total storage
  Example: 5GB/day × 365 days × 3 replicas = 5.5TB

Bandwidth estimation:
  Peak QPS × average response size = peak bandwidth
  Example: 10K QPS × 5KB = 50MB/s = 400Mbps
```

---

## Scalability

### Horizontal vs Vertical Scaling

```
Vertical Scaling (Scale Up):           Horizontal Scaling (Scale Out):
┌─────────────────┐                   ┌──────┐ ┌──────┐ ┌──────┐
│                 │                   │ Node │ │ Node │ │ Node │
│   BIGGER        │                   │  1   │ │  2   │ │  3   │
│   MACHINE       │                   └──┬───┘ └──┬───┘ └──┬───┘
│                 │                      │        │        │
│  More CPU       │                      └────────┼────────┘
│  More RAM       │                            Load Balancer
│  Bigger SSD     │
└─────────────────┘
  Limit: hardware max                   Limit: theoretically unlimited
  Simple                                Complex (state, coordination)
```

### Scaling Strategies by Component

| Component | Scaling Strategy |
|-----------|-----------------|
| **Web servers** | Horizontal + load balancer (stateless) |
| **Application servers** | Horizontal (stateless), sticky sessions if needed |
| **Databases (read)** | Read replicas, caching |
| **Databases (write)** | Vertical first, then sharding |
| **Cache** | Consistent hashing, cluster mode |
| **Message queues** | Add partitions (Kafka), more queues |
| **File storage** | Object storage (S3, GCS) — scales automatically |
| **Search** | Sharding + replicas (Elasticsearch) |

### Database Sharding

```
Shard by user_id:
  Shard 0: user_id % 4 == 0  → DB Server A
  Shard 1: user_id % 4 == 1  → DB Server B
  Shard 2: user_id % 4 == 2  → DB Server C
  Shard 3: user_id % 4 == 3  → DB Server D

Challenges:
  ✗ Cross-shard queries (JOINs across shards)
  ✗ Resharding when adding nodes
  ✗ Celebrity/hotspot problem (uneven distribution)
  ✗ Referential integrity across shards
```

| Sharding Strategy | How It Works | Best For |
|-------------------|-------------|----------|
| **Range-based** | user_id 1-1M → Shard A, 1M-2M → Shard B | Sequential access, range queries |
| **Hash-based** | hash(user_id) % N | Even distribution |
| **Directory-based** | Lookup table maps key → shard | Flexible, complex |
| **Geographic** | region → shard | Multi-region, data locality |

### Consistent Hashing

```
Hash Ring (0 to 2^32):

         Node A (position 100)
        ↙
  ───●──────────●──────────●──────────●───
     0      Node B(400)  Node C(700)  1023

  key "user-1" hashes to 250 → goes to Node B (next clockwise)
  key "user-2" hashes to 500 → goes to Node C
  key "user-3" hashes to 800 → goes to Node A (wraps around)

  Adding Node D at position 550:
    Only keys between 400-550 move (from C to D)
    Minimal redistribution!
```

Used by: DynamoDB, Cassandra, Redis Cluster, Memcached, CDNs

---

## Database Design

### SQL vs NoSQL Decision Matrix

| Criteria | SQL (PostgreSQL, MySQL) | NoSQL (DynamoDB, MongoDB, Cassandra) |
|----------|------------------------|--------------------------------------|
| **Schema** | Fixed, relational | Flexible, denormalized |
| **Transactions** | Full ACID | Limited (per-partition or eventual) |
| **Joins** | Native, efficient | Application-level or none |
| **Scaling writes** | Vertical (hard to shard) | Horizontal (designed for sharding) |
| **Consistency** | Strong by default | Configurable (eventual to strong) |
| **Best for** | Complex queries, relationships, transactions | High throughput, simple access patterns, scale |

### Database Selection Guide

| Use Case | Best Database | Why |
|----------|--------------|-----|
| **Transactions, complex queries** | PostgreSQL | ACID, JSON support, extensions |
| **High-write throughput** | Cassandra, ScyllaDB | Distributed, tunable consistency |
| **Key-value with TTL** | Redis, DynamoDB | Sub-ms latency, built-in expiry |
| **Document store** | MongoDB | Flexible schema, rich queries |
| **Full-text search** | Elasticsearch, OpenSearch | Inverted index, relevance scoring |
| **Graph relationships** | Neo4j, Neptune | Traversal queries, pattern matching |
| **Time series** | InfluxDB, TimescaleDB | Time-based partitioning, aggregation |
| **Wide column** | Cassandra, HBase | High write throughput, columnar |
| **Analytics/OLAP** | BigQuery, Redshift, ClickHouse | Columnar, MPP, SQL analytics |
| **Global distribution** | CockroachDB, Spanner | Serializable + global consistency |

### Indexing Strategies

```
B-Tree Index (default):
  ✅ Range queries, equality, sorting
  ❌ Full-text search, high-cardinality writes

Hash Index:
  ✅ Equality lookups (O(1))
  ❌ Range queries, sorting

Inverted Index (Elasticsearch):
  ✅ Full-text search, tokenized queries
  ❌ Exact match, range on numbers

Bloom Filter:
  ✅ "Definitely not in set" (fast negative lookup)
  ❌ False positives possible

LSM Tree (Cassandra, RocksDB):
  ✅ High write throughput
  ❌ Read amplification (compaction needed)
```

### Read/Write Patterns

```
Read-Heavy (100:1 read:write):
  Write → Primary DB → Replication → Read Replicas
  Read  → Cache → Read Replicas (if cache miss)

Write-Heavy (1:100 read:write):
  Write → Message Queue → Batch Writer → DB
  Read  → Materialized View / Pre-computed Cache

Mixed with Consistency:
  Write → Primary DB (sync)
  Read  → Primary DB (for strong consistency)
  Read  → Replica (for eventual consistency, lower latency)
```

---

## Caching

### Caching Strategies

```
Cache-Aside (Lazy Loading):
  Read:  App → Cache? Hit → Return | Miss → DB → Write Cache → Return
  Write: App → DB → Invalidate Cache

Read-Through:
  Read:  App → Cache (cache fetches from DB on miss)
  Write: App → DB → Invalidate Cache

Write-Through:
  Write: App → Cache → DB (synchronous)
  Read:  App → Cache (always fresh)

Write-Behind (Write-Back):
  Write: App → Cache → (async batch) → DB
  Read:  App → Cache
  Risk:  Data loss if cache crashes before DB write

Refresh-Ahead:
  Cache proactively refreshes before TTL expires
  Reduces cache miss latency for hot keys
```

### Cache Invalidation

```
1. TTL-based:        Set expiry time (simple, eventual staleness)
2. Event-driven:     Invalidate on write events (Kafka, CDC)
3. Write-through:    Update cache on every write
4. Versioned keys:   cache:user:v3 (no invalidation needed)
```

### Multi-Level Caching

```
Client → CDN Cache → API Gateway Cache → App-Level Cache → DB Cache → DB
         (static)    (response cache)    (Redis/Caffeine)  (query cache)

L1: In-process (Caffeine)     — ~1μs, limited by heap
L2: Distributed (Redis)       — ~1ms, shared across instances
L3: CDN (CloudFront)          — ~10ms, edge-cached, static/semi-static
```

### Cache Stampede Prevention

```
Problem: Cache expires → 1000 concurrent requests → all hit DB

Solutions:
  1. Locking: First request acquires lock, others wait
  2. Refresh-ahead: Proactively refresh before expiry
  3. Probabilistic expiry: Add jitter to TTL
  4. Request coalescing: Deduplicate concurrent cache-miss requests
```

---

## Message Queues & Streaming

### When to Use What

| Pattern | Tool | Use Case |
|---------|------|----------|
| **Task queue** | SQS, RabbitMQ | Job processing, work distribution |
| **Pub/sub** | SNS, Google Pub/Sub | Fan-out notifications |
| **Event streaming** | Kafka, Kinesis | Event sourcing, CDC, real-time pipelines |
| **Delayed/scheduled** | SQS (delay), Redis (sorted set) | Scheduled tasks, reminders |
| **Priority queue** | RabbitMQ (priority) | VIP processing |

For comprehensive Kafka patterns, see [Kafka Guide](../java/kafka.md).

---

## Networking & Protocols

### Protocol Comparison

| Protocol | Use Case | Latency | Throughput |
|----------|----------|---------|------------|
| **HTTP/1.1** | REST APIs, web | Medium | Medium |
| **HTTP/2** | Multiplexed APIs | Lower | Higher |
| **HTTP/3 (QUIC)** | Mobile, lossy networks | Lowest | Highest |
| **gRPC** | Service-to-service | Low | High (binary, streaming) |
| **WebSocket** | Real-time bidirectional | Very low | Medium |
| **SSE** | Server push (one-way) | Low | Low-medium |
| **GraphQL** | Flexible queries | Medium | Medium |

### DNS & CDN

```
User → DNS Resolver → Authoritative DNS → IP Address
                         ↓
                    GeoDNS: Route to nearest PoP

CDN Architecture:
  User (Tokyo) → Tokyo PoP (cache hit) → Response (5ms)
  User (Tokyo) → Tokyo PoP (cache miss) → Origin (San Francisco) → Response (200ms)
                                                                   → Cache at Tokyo PoP
```

---

## Load Balancing

### Algorithms

| Algorithm | Description | Best For |
|-----------|-------------|----------|
| **Round Robin** | Rotate through servers sequentially | Equal-capacity servers |
| **Weighted Round Robin** | Higher weight = more traffic | Mixed-capacity servers |
| **Least Connections** | Route to server with fewest active connections | Varying request duration |
| **IP Hash** | Hash client IP to server | Session stickiness |
| **Consistent Hash** | Minimal redistribution on add/remove | Caching proxies |
| **Random** | Pick random server | Simple, surprisingly effective |

### Load Balancing Layers

```
Layer 4 (Transport — TCP/UDP):
  - Routes based on IP and port
  - Very fast (no content inspection)
  - Tools: AWS NLB, HAProxy (TCP mode), IPVS

Layer 7 (Application — HTTP):
  - Routes based on URL, headers, cookies
  - Content-aware routing (path-based, host-based)
  - Tools: AWS ALB, Nginx, Envoy, HAProxy (HTTP mode)

Global (DNS-based):
  - Routes based on geography, latency
  - Tools: Route 53, Cloudflare, Azure Front Door
```

---

## API Design

### REST Best Practices

```
GET    /users              → List users
GET    /users/{id}         → Get user by ID
POST   /users              → Create user
PUT    /users/{id}         → Replace user
PATCH  /users/{id}         → Partial update
DELETE /users/{id}         → Delete user

GET    /users/{id}/orders  → User's orders (sub-resource)

Pagination: GET /users?page=2&size=20
Filtering:  GET /users?status=active&role=admin
Sorting:    GET /users?sort=created_at:desc
Fields:     GET /users?fields=id,name,email
```

### Rate Limiting

```
Token Bucket:
  Bucket: 100 tokens, refill rate: 10 tokens/second
  Each request costs 1 token
  No tokens → HTTP 429 Too Many Requests

Sliding Window Log:
  Track timestamp of every request in window
  Count requests in [now - window_size, now]
  More accurate than fixed window

Headers:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 45
  X-RateLimit-Reset: 1708531260
  Retry-After: 30
```

### API Versioning

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URL path** | `/v2/users` | Clear, easy to route | URL pollution |
| **Query param** | `/users?version=2` | Optional | Easy to miss |
| **Header** | `Accept: application/vnd.api+json;version=2` | Clean URL | Hidden |
| **Content negotiation** | `Accept: application/vnd.company.v2+json` | RESTful | Complex |

---

## Consistency & Consensus

### Consistency Models

```
Strong Consistency:
  Write → All replicas acknowledge → Read sees latest write
  Latency: HIGH   Availability: LOWER

Eventual Consistency:
  Write → Primary acknowledges → Replicas async catch up
  Read may see stale data (eventually consistent)
  Latency: LOW    Availability: HIGHER

Causal Consistency:
  Operations causally related are seen in order
  Concurrent operations may be seen in any order

Read-Your-Writes:
  A client always sees their own writes
  Others may see stale data
```

### Consensus Algorithms

| Algorithm | Used By | Notes |
|-----------|---------|-------|
| **Paxos** | Google Chubby, Spanner | Foundational, hard to implement |
| **Raft** | etcd, CockroachDB, Consul | Easier than Paxos, understandable |
| **ZAB** | ZooKeeper | Atomic broadcast |
| **Viewstamped Replication** | Academic | Less common in practice |

### Distributed Locks

```
Redis-based (Redlock):
  1. Acquire lock on N/2+1 Redis nodes
  2. Set TTL to prevent deadlocks
  3. Release on all nodes when done

ZooKeeper-based:
  1. Create ephemeral sequential znode
  2. Watch previous znode
  3. If you're lowest → you have the lock
  4. Node dies → ephemeral znode deleted → next in line gets lock
```

---

## Storage Systems

### Object Storage vs Block vs File

| Type | Service | Use Case | Access Pattern |
|------|---------|----------|---------------|
| **Object** | S3, GCS, Azure Blob | Images, videos, backups, data lake | HTTP API, eventual consistent |
| **Block** | EBS, Persistent Disk | Databases, OS volumes | Mounted as disk, low latency |
| **File** | EFS, Filestore, Azure Files | Shared storage, NFS | POSIX file system, concurrent |

### Data Lake Architecture

```
Bronze (Raw):          Silver (Cleaned):        Gold (Business):
┌──────────────┐      ┌──────────────┐         ┌──────────────┐
│ Raw ingestion│ ───→ │ Validated,   │ ───→    │ Aggregated,  │
│ (JSON, CSV,  │      │ deduplicated,│         │ business-    │
│  Parquet)    │      │ typed        │         │ ready views  │
└──────────────┘      └──────────────┘         └──────────────┘

Format: Parquet (columnar, compressed, schema-embedded)
Table format: Delta Lake, Apache Iceberg, Apache Hudi
Query engines: Spark, Trino, BigQuery, Athena
```

---

## Security Architecture

### Defense in Depth

```
Layer 1: Edge (CDN, WAF, DDoS protection)
Layer 2: Network (VPC, security groups, NACLs)
Layer 3: Transport (TLS 1.3, mTLS)
Layer 4: Authentication (OAuth 2.0, OIDC, JWT)
Layer 5: Authorization (RBAC, ABAC, policies)
Layer 6: Application (input validation, output encoding)
Layer 7: Data (encryption at rest, field-level encryption)
Layer 8: Audit (logging all access, anomaly detection)
```

### Authentication Patterns

```
OAuth 2.0 + OIDC:
  User → Login → Identity Provider (Keycloak, Auth0, Okta)
                        ↓
                   Access Token (JWT) + Refresh Token
                        ↓
  User → API Gateway (validate JWT) → Microservice

API-to-API (Machine-to-Machine):
  Service A → Client Credentials Grant → Token → Service B
  OR: mTLS with client certificates
```

---

## Reliability & Fault Tolerance

### Failure Modes

| Failure | Detection | Mitigation |
|---------|-----------|------------|
| **Server crash** | Health checks | Auto-restart, replicas |
| **Network partition** | Timeout, unreachable | Circuit breaker, retry |
| **Slow dependency** | Latency increase | Timeout, bulkhead |
| **Data corruption** | Checksums, validation | Backups, replication |
| **Cascading failure** | Error rate spread | Circuit breaker, load shedding |
| **Region outage** | DNS health checks | Multi-region failover |

### Disaster Recovery

| Strategy | RPO | RTO | Cost |
|----------|-----|-----|------|
| **Backup & Restore** | Hours | Hours | Low |
| **Pilot Light** | Minutes | 10-30 min | Medium |
| **Warm Standby** | Seconds | Minutes | High |
| **Active-Active** | Zero | Zero | Highest |

```
RPO = Recovery Point Objective (max acceptable data loss)
RTO = Recovery Time Objective (max acceptable downtime)
```

---

## Observability

For detailed monitoring and dashboards, see [Dynatrace Guide](../java/dynatrace.md).

### The Three Pillars

```
Metrics: "What is happening?" (counters, gauges, histograms)
Logs:    "Why did it happen?" (structured events with context)
Traces:  "Where did it happen?" (request flow across services)
```

### RED Method (for services)

- **R**ate — requests per second
- **E**rrors — error rate (% of failed requests)
- **D**uration — latency distribution (P50, P95, P99)

### USE Method (for resources)

- **U**tilization — % of resource in use (CPU, memory, disk)
- **S**aturation — queue depth, wait time
- **E**rrors — hardware/software error count

---

## Real-World System Designs

### 1. URL Shortener (bitly)

```
Write: POST /shorten { url: "https://long-url.com" }
  → Generate short ID (base62 encoding of counter or hash)
  → Store: short_id → long_url in DB
  → Return: https://short.url/abc123

Read: GET /abc123
  → Cache lookup (Redis)
  → Cache miss → DB lookup
  → HTTP 301 Redirect to long URL
  → Increment click counter (async, Kafka)

Scale: 100M URLs, 10B reads/month
  Storage: 100M × 500B = 50GB (fits in one DB + cache)
  QPS: 10B / 30 / 86400 ≈ 3,800 reads/sec (one machine handles this)
  Cache: Hot URLs in Redis (80% hit rate → 800 DB reads/sec)
```

### 2. News Feed (Twitter/X Timeline)

```
Fan-Out on Write (Push model):
  User posts tweet
  → Get follower list (1,000 followers)
  → Write tweet to each follower's timeline cache
  → 1,000 Redis LPUSH operations (async via Kafka)

  Read: GET /timeline
  → Read from pre-built timeline (Redis list)
  → Fast: O(1) per read

Fan-Out on Read (Pull model):
  User posts tweet
  → Store in user's tweet list only

  Read: GET /timeline
  → Get follow list → Fetch recent tweets from each → Merge & sort
  → Slow: O(N) per read where N = following count

Hybrid (Twitter's actual approach):
  - Fan-out on write for users with < 5,000 followers
  - Fan-out on read for celebrities (> 5M followers)
  - Merge at read time
```

### 3. Chat System (WhatsApp/Slack)

```
Architecture:
  Client → WebSocket → Chat Server → Message Queue → Recipient's Chat Server → Client

Components:
  - WebSocket servers (persistent connections, stateful)
  - Presence service (online/offline status, heartbeats)
  - Message store (Cassandra — write-heavy, partitioned by chat_id)
  - Media store (S3 — images, videos, files)
  - Push notification service (for offline users)
  - Group service (member list, permissions)

Message flow:
  1. Sender → WebSocket → Chat server
  2. Chat server → check recipient online?
     - Online → route to recipient's WebSocket server
     - Offline → store for later + push notification
  3. Store message in DB (async)
  4. Deliver to recipient
  5. Recipient ACKs → mark delivered/read

Scale: 100B messages/day (WhatsApp)
  Message size: ~100 bytes avg
  Storage: 100B × 100B = 10TB/day
  Connections: 2B users × 10% concurrent = 200M WebSocket connections
```

### 4. Distributed Cache (Redis Cluster)

```
Architecture:
  ┌─────────┐  ┌─────────┐  ┌─────────┐
  │ Master A│  │ Master B│  │ Master C│
  │ (0-5460)│  │(5461-   │  │(10923-  │
  │         │  │ 10922)  │  │ 16383)  │
  └────┬────┘  └────┬────┘  └────┬────┘
       │            │            │
  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
  │Replica A│  │Replica B│  │Replica C│
  └─────────┘  └─────────┘  └─────────┘

16,384 hash slots distributed across masters
CRC16(key) % 16384 → slot → master node
```

### 5. Rate Limiter

```
Sliding Window Counter:
  Window: 1 minute
  Limit: 100 requests

  Redis implementation:
    Key: rate_limit:{user_id}:{minute_bucket}
    INCR key
    EXPIRE key 60
    If count > 100 → reject (HTTP 429)

  Distributed rate limiting:
    Option A: Centralized Redis (simple, single point)
    Option B: Local counters + sync (approximate, resilient)
    Option C: Token bucket in Redis (Lua script for atomicity)
```

### 6. Search Autocomplete (Typeahead)

```
Architecture:
  User types "sof" → Frontend debounce (300ms) → API → Trie Service

  Trie data structure:
       (root)
      /     \
     s       ...
     |
     o
     |
     f
    / \
   t   ...
   |
   w
   |
   a
   |
   r
   |
   e     → ["software", "software engineer", "software design"]

  Ranking: frequency-weighted trie
  Update: periodic batch job (hourly/daily)
  Storage: Redis (in-memory trie) or Elasticsearch (prefix queries)
  Scale: Partition by prefix first 2 chars (26² = 676 shards)
```

### 7. Notification System

```
                    ┌──────────────────────┐
Event Source ───→   │  Event Bus (Kafka)    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Notification Service │
                    │  - Deduplicate        │
                    │  - Rate limit         │
                    │  - Preference check   │
                    │  - Template render    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
       ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
       │    Email     │ │   Push     │ │    SMS      │
       │   (SES)     │ │  (FCM/APNs)│ │  (Twilio)   │
       └─────────────┘ └────────────┘ └─────────────┘
```

### 8. Distributed Job Scheduler

```
Architecture:
  Job Definition → Scheduler → Job Queue → Workers → Result Store

  Scheduler:
    - Cron-like scheduling (next execution time)
    - Priority queue (sorted by next_run_time)
    - Leader election (only one scheduler runs jobs)

  Job Queue:
    - Redis sorted set (score = next_run_time)
    - OR: SQS with delay

  Workers:
    - Pull from queue
    - Execute job
    - Report result
    - Handle failures (retry with backoff)

  Challenges:
    - Exactly-once execution (idempotency + locking)
    - Clock skew across nodes
    - Worker failure mid-execution
    - Job dependencies (DAG execution)

  Tools: Apache Airflow, Temporal, Celery, Quartz
```

### 9. E-Commerce Platform

```
┌────────────────────────────────────────────────────────────┐
│                      CDN + WAF                              │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│                   API Gateway                               │
│              (Auth, Rate Limiting, Routing)                  │
└───┬──────┬──────┬──────┬──────┬──────┬──────┬─────────────┘
    │      │      │      │      │      │      │
 ┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐
 │User ││Prod-││Cart ││Order││Pay- ││Inven-││Notif│
 │Svc  ││uct  ││Svc  ││ Svc ││ment ││tory  ││ Svc │
 └──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘
    │      │      │      │      │      │      │
 ┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──────▼──┐┌──▼──┐  │
 │User ││Prod ││Cart ││  Order DB  ││Inv  │  │
 │ DB  ││ DB  ││Redis││  (sharded) ││ DB  │  │
 └─────┘└─────┘└─────┘└────────────┘└─────┘  │
                                               │
         ┌─────────────────┐              ┌────▼────┐
         │   Kafka         │              │  Email  │
         │   (order events,│              │  SMS    │
         │    inventory,   │              │  Push   │
         │    analytics)   │              └─────────┘
         └─────────────────┘
```

### 10. Video Streaming (Netflix-style)

```
Upload Pipeline:
  Creator → Upload Service → Object Storage (raw)
         → Transcoding Service (multiple resolutions/codecs)
         → CDN Distribution (edge caches worldwide)
         → Metadata Service (title, thumbnails, manifest)

Playback Pipeline:
  Client → API (auth, DRM license) → Manifest URL
  Client → CDN Edge → Video Chunks (adaptive bitrate)

  Adaptive Bitrate Streaming (ABR):
    1080p → client bandwidth good → serve 1080p
    480p  → bandwidth drops → switch to 480p
    Protocol: HLS (Apple) or DASH (standard)

Scale:
  - 200M subscribers, 100M daily active
  - 15% of global internet traffic
  - CDN: Open Connect (Netflix's own CDN, ISP-embedded servers)
```

---

## System Design Interview Framework

### Step-by-Step Approach

```
1. CLARIFY (3-5 min)
   - Functional requirements (what does it do?)
   - Non-functional requirements (scale, latency, availability)
   - Constraints and assumptions
   - Back-of-envelope estimation (DAU, QPS, storage)

2. HIGH-LEVEL DESIGN (10-15 min)
   - Draw the main components
   - Define API contracts
   - Choose database type
   - Identify data flow

3. DEEP DIVE (15-20 min)
   - Scale bottlenecks
   - Database schema and sharding
   - Caching strategy
   - Consistency model
   - Failure handling

4. WRAP UP (5 min)
   - Trade-offs discussed
   - What would you do differently with more time?
   - Monitoring and alerting
```

### Non-Functional Requirements Checklist

| Dimension | Questions to Ask |
|-----------|-----------------|
| **Scale** | DAU? QPS? Data volume? Growth rate? |
| **Latency** | P50? P99? Acceptable for user? |
| **Availability** | 99.9%? 99.99%? (affects architecture significantly) |
| **Consistency** | Strong? Eventual? Per feature? |
| **Durability** | Can we lose data? RPO? |
| **Security** | Auth? Encryption? Compliance? |
| **Cost** | Budget constraints? Cost optimization? |
| **Geo** | Single region? Multi-region? Global? |

---

## Resources

### Books

- **"Designing Data-Intensive Applications"** — Martin Kleppmann (the system design bible)
- **"System Design Interview Vol 1 & 2"** — Alex Xu (practical interview prep)
- **"Building Microservices"** — Sam Newman (microservices architecture)
- **"Software Architecture: The Hard Parts"** — Richards, Ford, Dehghani, Sadalage
- **"Database Internals"** — Alex Petrov (storage engine deep dive)
- **"Understanding Distributed Systems"** — Roberto Vitillo (concise, practical)
- **"Web Scalability for Startup Engineers"** — Artur Ejsmont

### Online Resources

- [System Design Primer](https://github.com/donnemartin/system-design-primer) — GitHub (280K+ stars)
- [ByteByteGo](https://bytebytego.com/) — Alex Xu's platform
- [Grokking System Design](https://www.designgurus.io/course/grokking-the-system-design-interview) — Interview prep
- [High Scalability Blog](http://highscalability.com/) — Real-world architecture case studies
- [InfoQ Architecture](https://www.infoq.com/architecture-design/) — Architecture articles and talks

### YouTube

| Channel | Content |
|---------|---------|
| [ByteByteGo](https://www.youtube.com/@ByteByteGo) | Visual system design |
| [System Design Interview](https://www.youtube.com/@SystemDesignInterview) | Interview walkthroughs |
| [Hussein Nasser](https://www.youtube.com/@hnasr) | Backend deep dives |
| [Gaurav Sen](https://www.youtube.com/@gaborenrsen) | System design explanations |
| [CodeKarle](https://www.youtube.com/@codekarle) | Design case studies |
| [Jordan Has No Life](https://www.youtube.com/@JordanHasNoLife) | Distributed systems papers |
| [Martin Kleppmann](https://www.youtube.com/@klaborenmann) | DDIA author's lectures |

### Company Engineering Blogs (Architecture)

| Company | Notable Articles |
|---------|-----------------|
| [Netflix](https://netflixtechblog.com/) | Microservices, resilience, Kafka |
| [Uber](https://www.uber.com/blog/engineering/) | Real-time marketplace, Kafka |
| [Airbnb](https://medium.com/airbnb-engineering) | Search, ML, event-driven |
| [Stripe](https://stripe.com/blog/engineering) | Payments, API design, idempotency |
| [Discord](https://discord.com/blog/engineering) | Real-time at scale, Rust, Elixir |
| [Shopify](https://shopify.engineering/) | Flash sales, scaling Rails |
| [Cloudflare](https://blog.cloudflare.com/) | Edge computing, networking |
| [LinkedIn](https://engineering.linkedin.com/) | Kafka, search, feeds |

---

*"There are no perfect system designs — only trade-offs. The art is in understanding which trade-offs matter for your specific requirements."*
