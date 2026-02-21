# Cloud Native Architecture — AWS, Azure, GCP

> Building resilient, scalable, observable systems across the major cloud platforms

## Table of Contents

- [Cloud Native Principles](#cloud-native-principles)
- [Multi-Cloud Service Mapping](#multi-cloud-service-mapping)
- [Architecture Patterns](#architecture-patterns)
- [Compute Patterns](#compute-patterns)
- [Data Patterns](#data-patterns)
- [Networking & Security](#networking--security)
- [Observability & Operations](#observability--operations)
- [Infrastructure as Code](#infrastructure-as-code)
- [Anti-Patterns](#anti-patterns)
- [Resources](#resources)

---

## Cloud Native Principles

### The Twelve-Factor App (Extended)

| Factor | Principle | Modern Interpretation |
|--------|-----------|----------------------|
| 1. Codebase | One codebase, many deploys | Git monorepo or multi-repo per service |
| 2. Dependencies | Explicitly declare and isolate | Container images, lockfiles |
| 3. Config | Store config in the environment | Secrets managers, ConfigMaps |
| 4. Backing Services | Treat as attached resources | Managed services, connection strings |
| 5. Build, Release, Run | Strictly separate stages | CI/CD pipelines, GitOps |
| 6. Processes | Execute as stateless processes | Containers, serverless functions |
| 7. Port Binding | Export services via port binding | Container networking, service mesh |
| 8. Concurrency | Scale out via the process model | Horizontal pod autoscaler, auto-scaling groups |
| 9. Disposability | Fast startup and graceful shutdown | Health checks, preStop hooks |
| 10. Dev/Prod Parity | Keep environments similar | IaC, containers, feature flags |
| 11. Logs | Treat logs as event streams | Structured JSON, log aggregation |
| 12. Admin Processes | Run admin tasks as one-off processes | K8s Jobs, Lambda, Cloud Run Jobs |

### CNCF Cloud Native Definition

> Cloud native technologies empower organizations to build and run scalable applications in modern, dynamic environments such as public, private, and hybrid clouds.

**Key pillars:**
- **Containers** — Packaged, portable workloads
- **Service meshes** — Network-level observability and security
- **Microservices** — Independently deployable services
- **Immutable infrastructure** — Replace, don't patch
- **Declarative APIs** — Desired state, not imperative steps

## Multi-Cloud Service Mapping

### Compute

| Capability | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| **VMs** | EC2 | Virtual Machines | Compute Engine |
| **Containers (managed)** | ECS, Fargate | Container Instances | Cloud Run |
| **Kubernetes** | EKS | AKS | GKE |
| **Serverless Functions** | Lambda | Functions | Cloud Functions |
| **Serverless Containers** | Fargate, App Runner | Container Apps | Cloud Run |
| **Batch Processing** | Batch | Batch | Batch |

### Storage & Database

| Capability | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| **Object Storage** | S3 | Blob Storage | Cloud Storage |
| **Block Storage** | EBS | Managed Disks | Persistent Disk |
| **File Storage** | EFS | Azure Files | Filestore |
| **Relational DB** | RDS, Aurora | SQL Database, Cosmos DB (Postgres) | Cloud SQL, AlloyDB |
| **NoSQL Document** | DynamoDB | Cosmos DB | Firestore, Bigtable |
| **In-Memory Cache** | ElastiCache | Cache for Redis | Memorystore |
| **Data Warehouse** | Redshift | Synapse Analytics | BigQuery |
| **Time Series** | Timestream | Time Series Insights | Bigtable |
| **Graph DB** | Neptune | Cosmos DB (Gremlin) | N/A (use Neo4j on GCE) |

### Networking

| Capability | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| **CDN** | CloudFront | Front Door / CDN | Cloud CDN |
| **DNS** | Route 53 | Azure DNS | Cloud DNS |
| **Load Balancer** | ALB, NLB | Load Balancer | Cloud Load Balancing |
| **API Gateway** | API Gateway | API Management | Apigee, API Gateway |
| **Service Mesh** | App Mesh | Open Service Mesh | Anthos Service Mesh |
| **VPN** | VPN Gateway | VPN Gateway | Cloud VPN |

### Messaging & Events

| Capability | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| **Message Queue** | SQS | Service Bus Queue | Cloud Tasks |
| **Pub/Sub** | SNS | Service Bus Topics | Pub/Sub |
| **Event Streaming** | Kinesis, MSK (Kafka) | Event Hubs | Pub/Sub, Dataflow |
| **Event Bus** | EventBridge | Event Grid | Eventarc |

### Security & Identity

| Capability | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| **IAM** | IAM | Entra ID (Azure AD) | IAM |
| **Secrets** | Secrets Manager | Key Vault | Secret Manager |
| **Certificates** | ACM | Key Vault | Certificate Authority |
| **WAF** | WAF | Web Application Firewall | Cloud Armor |
| **DDoS Protection** | Shield | DDoS Protection | Cloud Armor |

### AI/ML

| Capability | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| **ML Platform** | SageMaker | Azure ML | Vertex AI |
| **GenAI APIs** | Bedrock | Azure OpenAI Service | Vertex AI (Gemini) |
| **Vision** | Rekognition | Computer Vision | Vision AI |
| **NLP** | Comprehend | Language | Natural Language AI |
| **Speech** | Transcribe / Polly | Speech Services | Speech-to-Text / Text-to-Speech |

### Observability

| Capability | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| **Monitoring** | CloudWatch | Monitor | Cloud Monitoring |
| **Logging** | CloudWatch Logs | Log Analytics | Cloud Logging |
| **Tracing** | X-Ray | Application Insights | Cloud Trace |
| **Dashboards** | CloudWatch Dashboards | Azure Dashboards | Cloud Monitoring Dashboards |

## Architecture Patterns

### 1. Event-Driven Architecture

```
                    ┌─────────────┐
Producer ──event──→ │  Event Bus  │ ──event──→ Consumer A
                    │ (EventBridge│ ──event──→ Consumer B
                    │  / Pub/Sub) │ ──event──→ Consumer C
                    └─────────────┘
```

**Best practices:**
- Use schema registry for event contracts
- Implement dead letter queues for failed events
- Design events as immutable facts
- Use event versioning for backward compatibility

### 2. Serverless Architecture

```
API Gateway → Lambda/Function → DynamoDB/Cosmos
           → SQS/Queue → Lambda → S3/Blob
           → EventBridge → Step Functions → Multiple Lambdas
```

**When to use:** Variable workloads, event-driven, < 15 min execution, cost-sensitive

**When to avoid:** Long-running processes, consistent high load, cold start sensitivity

### 3. Container-First Architecture

```
                    ┌─────────────────────────────┐
                    │      Kubernetes Cluster       │
Client → Ingress → │  ┌─────┐ ┌─────┐ ┌─────┐   │
                    │  │Svc A│ │Svc B│ │Svc C│   │
                    │  └──┬──┘ └──┬──┘ └──┬──┘   │
                    │     │      │       │        │
                    │  ┌──┴──────┴───────┴──┐     │
                    │  │    Service Mesh     │     │
                    │  └────────────────────┘     │
                    └─────────────────────────────┘
```

### 4. Multi-Region / Global Architecture

```
Region A (Primary)          Region B (Secondary)
┌─────────────────┐        ┌─────────────────┐
│ Load Balancer   │        │ Load Balancer   │
│ App Cluster     │←─sync─→│ App Cluster     │
│ Database (RW)   │───rep──→│ Database (RO)   │
└─────────────────┘        └─────────────────┘
         ↑                          ↑
         └────── Global LB ─────────┘
```

### 5. Data Lake / Lakehouse

```
Sources → Ingestion → Raw Zone → Curated Zone → Serving Zone
  (APIs,   (Kinesis,   (S3/GCS    (Spark/       (BigQuery/
   DBs,     Pub/Sub,    parquet)    dbt)          Redshift/
   files)   Dataflow)                              Synapse)
```

## Compute Patterns

### Kubernetes Best Practices

```yaml
# Production-ready deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 3
  strategy:
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
        securityContext:
          runAsNonRoot: true
          readOnlyRootFilesystem: true
```

### Serverless Decision Matrix

| Criteria | Serverless | Containers | VMs |
|----------|-----------|------------|-----|
| **Startup time** | Cold starts (100ms-10s) | Fast (seconds) | Slow (minutes) |
| **Max execution** | 15 min (Lambda) | Unlimited | Unlimited |
| **Scaling** | Automatic, per-request | HPA, manual | Auto-scaling groups |
| **Cost model** | Per invocation | Per resource-time | Per resource-time |
| **Best for** | Event-driven, variable load | Microservices, steady load | Legacy, specific OS needs |

## Data Patterns

### Choosing the Right Database

| Data Shape | Best Fit | Cloud Options |
|-----------|----------|---------------|
| **Structured, relational** | RDBMS | RDS, Cloud SQL, Azure SQL |
| **Key-value, high throughput** | NoSQL | DynamoDB, Firestore, Cosmos DB |
| **Time series** | TSDB | Timestream, Bigtable, InfluxDB |
| **Full-text search** | Search engine | OpenSearch, Elastic Cloud |
| **Graph relationships** | Graph DB | Neptune, Cosmos (Gremlin), Neo4j |
| **Analytical queries** | Columnar | BigQuery, Redshift, Synapse |
| **Caching** | In-memory | ElastiCache, Memorystore, Azure Cache |

### Multi-Cloud Data Strategies

**Active-Active:** Write to multiple clouds simultaneously (complex, expensive)

**Active-Passive:** Primary cloud + replication to secondary (disaster recovery)

**Cloud-Agnostic:** Use open-source databases (PostgreSQL, Redis, Kafka) on any cloud

**Hybrid:** On-premises for sensitive data + cloud for compute (common in banking)

## Networking & Security

### Zero Trust Architecture

```
Every request must be:
  1. Authenticated (who are you?)
  2. Authorized (are you allowed?)
  3. Encrypted (TLS everywhere)
  4. Logged (what did you do?)

Trust nothing. Verify everything. Assume breach.
```

### Cloud Security Best Practices

| Category | Practice |
|----------|---------|
| **Identity** | Use managed identity / workload identity (not long-lived keys) |
| **Network** | VPC/VNet isolation, private endpoints, no public databases |
| **Secrets** | Use secrets manager, rotate regularly, never in code |
| **Encryption** | Encrypt at rest (KMS) and in transit (TLS 1.3) |
| **Access** | Least privilege IAM, just-in-time access, MFA |
| **Compliance** | Cloud-native policy engines (AWS Config, Azure Policy, GCP Org Policy) |
| **Containers** | Scan images, non-root, read-only filesystem, signed images |
| **Supply Chain** | SBOM, dependency scanning, signed artifacts |

## Observability & Operations

### Cloud-Native Observability Stack

**Open Source (Cloud-Agnostic):**
```
Metrics:  Prometheus → Grafana
Logs:     Fluentd/Fluent Bit → Loki → Grafana
Traces:   OpenTelemetry → Tempo → Grafana
Alerts:   Alertmanager / Grafana Alerting
```

**Managed Alternatives:**
| | AWS | Azure | GCP |
|--|-----|-------|-----|
| **Metrics** | CloudWatch Metrics | Azure Monitor Metrics | Cloud Monitoring |
| **Logs** | CloudWatch Logs | Log Analytics | Cloud Logging |
| **Traces** | X-Ray | Application Insights | Cloud Trace |
| **All-in-one** | CloudWatch | Azure Monitor | Cloud Operations Suite |

### GitOps

```
Developer → Git Push → CI Pipeline → Container Image
                                          ↓
ArgoCD / Flux watches Git repo → Syncs desired state to K8s cluster
```

**Tools:** ArgoCD, Flux, Jenkins X

## Infrastructure as Code

### Tool Comparison

| Tool | Language | Cloud Support | State | Best For |
|------|----------|--------------|-------|----------|
| **Terraform** | HCL | All clouds | Remote state | Multi-cloud |
| **Pulumi** | Python, TS, Go, C# | All clouds | Remote state | Developers who prefer real languages |
| **CloudFormation** | YAML/JSON | AWS only | AWS-managed | AWS-only shops |
| **Bicep** | Bicep DSL | Azure only | Azure-managed | Azure-only shops |
| **CDK** | TS, Python, Java | AWS (primary) | CloudFormation | AWS developers |
| **Crossplane** | YAML (K8s CRDs) | All clouds | Kubernetes | K8s-centric teams |

### Terraform Best Practices

```hcl
# Module structure
modules/
├── networking/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── compute/
└── database/

environments/
├── dev/
│   └── main.tf      # Uses modules with dev config
├── staging/
└── production/
```

- Use **remote state** (S3, GCS, Azure Blob)
- **Lock state** (DynamoDB, GCS, Azure Blob lock)
- Use **modules** for reusability
- Tag all resources for cost allocation
- Use **Terraform plan** in CI, **apply** with approval

## Anti-Patterns

### ❌ Cloud Lock-in Without Awareness

**Symptom:** Deeply coupled to proprietary services without understanding trade-offs.

**Fix:** Make lock-in a deliberate decision. Use managed services when they add value, but abstract at the right level. Keep data portable.

### ❌ Lift-and-Shift Without Modernization

**Symptom:** VMs in the cloud running the same monolith — paying more for the same architecture.

**Fix:** Refactor for cloud-native patterns. At minimum: containerize, use managed databases, add auto-scaling.

### ❌ Over-Engineering for Multi-Cloud

**Symptom:** Abstracting everything to support three clouds when you only use one.

**Fix:** Pick one primary cloud. Design for portability at the data and API layer, not the infrastructure layer.

### ❌ No Cost Management

**Symptom:** $50k/month surprise cloud bills.

**Fix:** Set budgets and alerts, use spot/preemptible instances, right-size resources, use FinOps practices.

### ❌ Manual Infrastructure

**Symptom:** ClickOps — creating resources through console.

**Fix:** Everything as code (IaC). If it's not in Git, it doesn't exist.

### ❌ Ignoring Cold Starts

**Symptom:** Serverless functions taking 5+ seconds on first invocation.

**Fix:** Provisioned concurrency, keep-warm strategies, or use containers for latency-sensitive paths.

### ❌ Public-Everything

**Symptom:** Databases, storage buckets, and APIs exposed to the internet.

**Fix:** Private subnets, VPC endpoints, private links, WAF, zero trust.

---

## Resources

### Certifications

| Certification | Cloud | Level |
|--------------|-------|-------|
| AWS Solutions Architect Associate | AWS | Intermediate |
| AWS Solutions Architect Professional | AWS | Advanced |
| Azure Solutions Architect Expert (AZ-305) | Azure | Advanced |
| Google Professional Cloud Architect | GCP | Advanced |
| CKA (Certified Kubernetes Administrator) | Multi | Advanced |
| CKAD (Certified Kubernetes App Developer) | Multi | Intermediate |
| Terraform Associate | Multi | Intermediate |

### Books

- **"Cloud Native Patterns"** — Cornelia Davis
- **"Kubernetes in Action"** — Marko Luksa (2nd edition)
- **"Terraform: Up & Running"** — Yevgeniy Brikman (3rd edition)
- **"Cloud Strategy"** — Gregor Hohpe
- **"The Phoenix Project"** — Gene Kim (DevOps novel)

### Essential Links

- [CNCF Landscape](https://landscape.cncf.io/) — Cloud-native ecosystem map
- [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/) — AWS best practices
- [Azure Well-Architected](https://learn.microsoft.com/azure/well-architected/) — Azure best practices
- [Google Cloud Architecture Framework](https://cloud.google.com/architecture/framework) — GCP best practices
- [12factor.net](https://12factor.net/) — Cloud-native app methodology
- [The Kubernetes Book](https://github.com/nigelpoulton/TheK8sBook) — Free K8s guide

### Podcasts

| Podcast | Focus |
|---------|-------|
| [Kubernetes Podcast](https://kubernetespodcast.com/) | Kubernetes ecosystem |
| [AWS Podcast](https://aws.amazon.com/podcasts/aws-podcast/) | AWS services and architecture |
| [Azure Friday](https://learn.microsoft.com/shows/azure-friday/) | Azure features |
| [Google Cloud Podcast](https://cloud.google.com/podcasts) | GCP ecosystem |
| [Cloud Native Podcast](https://podcast.curiefense.io/) | CNCF and cloud-native |
| [Screaming in the Cloud](https://www.lastweekinaws.com/podcast/) | AWS with humor |
| [The Cloud Cast](https://www.thecloudcast.net/) | Multi-cloud analysis |

---

*"The cloud is not a destination — it's a way of operating." — Choose managed services wisely, automate everything, and design for failure.*
