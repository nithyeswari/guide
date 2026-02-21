# AI-Native Architecture — Patterns & Anti-Patterns

> Designing systems that integrate AI/ML and GenAI as first-class architectural components

## Table of Contents

- [What is AI-Native Architecture](#what-is-ai-native-architecture)
- [AI Integration Patterns](#ai-integration-patterns)
- [GenAI / LLM Patterns](#genai--llm-patterns)
- [MLOps & Infrastructure](#mlops--infrastructure)
- [Data Architecture for AI](#data-architecture-for-ai)
- [Evaluation & Testing](#evaluation--testing)
- [Anti-Patterns](#anti-patterns)
- [Responsible AI](#responsible-ai)
- [Resources](#resources)

---

## What is AI-Native Architecture

AI-native architecture treats AI/ML models and intelligent capabilities as **core components**, not afterthoughts:

```
Traditional:    App → Database → Response
AI-Enhanced:    App → Database + ML Model → Enriched Response
AI-Native:      App → AI Orchestration → Multiple Models + Tools + Data → Intelligent Response
```

### AI-Native vs AI-Enhanced

| Aspect | AI-Enhanced | AI-Native |
|--------|------------|-----------|
| **AI Role** | Feature add-on | Core of the product |
| **Architecture** | Existing system + ML endpoint | Designed around AI capabilities |
| **Data Flow** | ML model called occasionally | Continuous learning and inference |
| **User Experience** | Fixed UI with ML features | Adaptive, personalized |
| **Example** | E-commerce + recommendation widget | ChatGPT, GitHub Copilot, Cursor |

## AI Integration Patterns

### 1. Model-as-a-Service

The simplest pattern — call an external AI API.

```
Application → REST/gRPC → Model Service (API)
                              ↓
                         Model (hosted)
```

**Implementations:**
- OpenAI API, Anthropic API, Google Gemini API
- AWS Bedrock, Azure OpenAI Service, Vertex AI
- Self-hosted: vLLM, TGI, Ollama

**Best practices:**
- Implement retry with exponential backoff
- Cache responses for identical inputs
- Set timeout limits (LLMs can be slow)
- Monitor token usage and costs
- Use streaming for long responses

### 2. Retrieval-Augmented Generation (RAG)

Ground LLM responses in your own data.

```
User Query
    ↓
[1] Embed query → Vector DB → Retrieve relevant documents
    ↓
[2] Construct prompt = System instruction + Retrieved context + User query
    ↓
[3] LLM generates response grounded in retrieved data
    ↓
Response to user
```

**Components:**
| Component | Options |
|-----------|---------|
| **Embedding Model** | OpenAI text-embedding-3, Cohere embed, BGE, E5 |
| **Vector Database** | Pinecone, Weaviate, Qdrant, Milvus, pgvector, ChromaDB |
| **Chunking** | Recursive text splitter, semantic chunking, sentence-based |
| **Orchestration** | LangChain, LlamaIndex, Haystack, custom |
| **LLM** | GPT-4o, Claude, Gemini, Llama, Mistral |

**RAG Best Practices:**
- Chunk documents intelligently (not just fixed-size)
- Use hybrid search (vector + keyword) for better retrieval
- Implement re-ranking for retrieved documents
- Include metadata filtering (date, source, category)
- Evaluate retrieval quality separately from generation quality
- Version your knowledge base

### 3. AI Agent Pattern

Autonomous agents that plan, use tools, and iterate.

```
User Goal
    ↓
Agent (LLM as reasoning engine)
    ├── Plan: Break goal into steps
    ├── Execute: Use tools (APIs, databases, code execution)
    ├── Observe: Evaluate tool results
    └── Iterate: Refine until goal is met
    ↓
Final Result
```

**Frameworks:**
- **LangGraph** — Stateful agent workflows
- **CrewAI** — Multi-agent collaboration
- **AutoGen** — Microsoft's multi-agent framework
- **Claude Code / Anthropic Agents** — Tool-using agents
- **OpenAI Assistants API** — Managed agent runtime

**Agent Design Principles:**
- Give agents clear, bounded tool sets
- Implement guardrails (max iterations, cost limits)
- Log all agent actions for debugging and auditing
- Use human-in-the-loop for high-stakes decisions
- Test agents with diverse scenarios

### 4. AI Gateway Pattern

Centralized proxy for all AI model calls (like API Gateway for AI).

```
App A ─┐                        ┌→ OpenAI
App B ─┼→ AI Gateway ──────────┼→ Anthropic
App C ─┘  (routing, caching,    ├→ Self-hosted Model
          rate limiting,        └→ Fallback Model
          cost tracking,
          guardrails)
```

**Benefits:**
- Unified cost tracking across teams
- Model fallback and load balancing
- Centralized prompt guardrails
- Response caching
- A/B testing across models

**Tools:** LiteLLM, Portkey, Helicone, Braintrust

### 5. Prompt Pipeline Pattern

Structured prompt engineering with reusable, testable components.

```
Input → Pre-processing → Prompt Template → LLM → Post-processing → Output
                              ↓
                    System Prompt + Few-shot Examples
                    + Retrieval Context + User Input
```

**Best practices:**
- Version control prompts (treat as code)
- Separate system prompts from user input
- Use structured output (JSON mode)
- Implement prompt injection defenses
- A/B test prompt variations

### 6. Fine-Tuning Pattern

Customize a base model for your specific domain.

```
Base Model + Training Data → Fine-Tuning → Custom Model → Deployment
                                               ↓
                                    Evaluation & Monitoring
```

**When to fine-tune vs RAG:**

| Criteria | RAG | Fine-Tuning |
|----------|-----|-------------|
| **Data changes frequently** | ✅ Better | ❌ Need to retrain |
| **Need factual grounding** | ✅ Better | ❌ Can hallucinate |
| **Need style/tone change** | ❌ Limited | ✅ Better |
| **Need new task behavior** | ❌ Limited | ✅ Better |
| **Budget** | ✅ Cheaper to start | ❌ Training costs |
| **Latency** | ❌ Retrieval adds latency | ✅ Direct inference |

### 7. Multimodal Pipeline Pattern

Process multiple input types (text, image, audio, video).

```
Image  → Vision Model  ──┐
Text   → Text Model    ──┼→ Fusion Layer → Response
Audio  → Speech-to-Text──┘
```

## GenAI / LLM Patterns

### Structured Output

Force LLMs to return structured data:

```python
# Using function calling / tool use
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Extract entities from: ..."}],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "entities",
            "schema": {
                "type": "object",
                "properties": {
                    "people": {"type": "array", "items": {"type": "string"}},
                    "locations": {"type": "array", "items": {"type": "string"}}
                }
            }
        }
    }
)
```

### Chain-of-Thought (CoT)

Break complex reasoning into steps:

```
Prompt: "Think step by step. First analyze X, then evaluate Y, finally decide Z."
```

### Map-Reduce for Large Documents

```
Large Document → Split into chunks
                    ↓
              [Map] Summarize each chunk independently
                    ↓
              [Reduce] Combine summaries into final answer
```

### Guardrails Pattern

```
User Input → Input Guardrails → LLM → Output Guardrails → Response
              (PII detection,          (hallucination check,
               prompt injection,        toxicity filter,
               topic filter)            format validation)
```

**Tools:** Guardrails AI, NeMo Guardrails (NVIDIA), Lakera Guard, custom validators

## MLOps & Infrastructure

### ML Pipeline

```
Data Collection → Data Processing → Feature Engineering → Training → Evaluation → Deployment → Monitoring
      ↑                                                                                          │
      └──────────────────── Feedback Loop ──────────────────────────────────────────────────────┘
```

### MLOps Tool Landscape

| Stage | Tools |
|-------|-------|
| **Experiment Tracking** | MLflow, Weights & Biases, Neptune |
| **Feature Store** | Feast, Tecton, SageMaker Feature Store |
| **Training** | SageMaker, Vertex AI, Azure ML, Ray |
| **Model Registry** | MLflow, SageMaker Model Registry |
| **Serving** | vLLM, TGI, Triton, TorchServe, BentoML |
| **Monitoring** | Evidently, WhyLabs, Arize, Fiddler |
| **Orchestration** | Airflow, Kubeflow, Prefect, Dagster |
| **Vector DB** | Pinecone, Weaviate, Qdrant, Milvus, pgvector |

### GPU Infrastructure

| Provider | Service | Notes |
|----------|---------|-------|
| **AWS** | SageMaker, EC2 (P5, Inf2) | Inferentia chips for inference |
| **Azure** | Azure ML, ND-series VMs | A100/H100 instances |
| **GCP** | Vertex AI, Cloud TPU | TPU v5 for training |
| **Replicate** | Managed inference | Easy model deployment |
| **Modal** | Serverless GPU | Pay-per-second GPU |
| **Together AI** | Inference API | Open-source model hosting |

### Model Serving Patterns

**Online Serving:** Low-latency, real-time predictions
```
Request → Load Balancer → Model Server (GPU) → Response
                              ↓
                     Model in GPU memory
```

**Batch Inference:** High-throughput, periodic processing
```
Data Lake → Spark/Ray Job → Model → Results → Data Warehouse
```

**Streaming Inference:** Real-time on event streams
```
Kafka → Stream Processor → Model → Kafka → Consumer
```

## Data Architecture for AI

### Feature Store Pattern

```
Raw Data → Feature Pipeline → Feature Store → Training Pipeline
                                     ↓
                              Serving Pipeline → Online Predictions
```

### Data Flywheel

```
Users → Product → Data → Model Training → Better Product → More Users
  ↑                                                           │
  └───────────────────────────────────────────────────────────┘
```

**The competitive moat:** More users → more data → better models → better product → more users.

### Embedding Pipeline

```
Documents → Chunking → Embedding Model → Vector Store
                                              ↓
                                    Query Embedding → Similarity Search → Results
```

## Evaluation & Testing

### LLM Evaluation

| What to Evaluate | Metrics | Tools |
|-----------------|---------|-------|
| **Accuracy** | Exact match, F1, BLEU, ROUGE | Custom eval scripts |
| **Relevance** | Human eval, LLM-as-judge | Braintrust, RAGAS |
| **Faithfulness** | Grounded in context? | RAGAS, DeepEval |
| **Safety** | Toxicity, bias, PII leakage | Guardrails AI, custom |
| **Latency** | Time to first token, total time | Load testing |
| **Cost** | Tokens per request, $/query | Provider dashboards, Helicone |

### Testing AI Systems

```
Unit Tests        → Test individual components (prompts, parsers, retrieval)
Integration Tests → Test full pipeline (query → retrieval → LLM → response)
Eval Sets         → Curated Q&A pairs with expected outputs
Red Teaming       → Adversarial testing for safety and robustness
A/B Tests         → Compare model versions in production
```

### LLM-as-Judge

Use a strong LLM to evaluate a weaker one:

```
Given:
  - Question: {question}
  - Expected Answer: {expected}
  - Actual Answer: {actual}

Judge: Rate the actual answer from 1-5 on accuracy, relevance, and completeness.
```

## Anti-Patterns

### ❌ LLM-for-Everything

**Symptom:** Using GPT-4 for tasks that a regex, rule engine, or SQL query would handle.

**Fix:** Use AI where it adds value (ambiguity, reasoning, generation). Use deterministic code for everything else.

### ❌ No Evaluation Framework

**Symptom:** "The model seems to work" — no metrics, no test sets, no monitoring.

**Fix:** Build eval sets before deploying. Track quality metrics over time. Regression-test on every model change.

### ❌ Prompt-and-Pray

**Symptom:** Complex business logic encoded entirely in fragile prompts.

**Fix:** Structured output, validation layers, fallback logic. Prompts should instruct, not implement.

### ❌ RAG Without Retrieval Quality

**Symptom:** LLM generates confident but wrong answers from irrelevant retrieved chunks.

**Fix:** Evaluate retrieval separately. Use re-ranking, hybrid search, metadata filtering. Measure recall@k.

### ❌ Ignoring Latency and Cost

**Symptom:** 10-second response times, $10k/day API costs.

**Fix:** Cache aggressively, use smaller models for simple tasks, batch where possible, monitor costs per query.

### ❌ No Guardrails

**Symptom:** Model returns PII, toxic content, or executes prompt injections.

**Fix:** Input validation, output filtering, prompt injection detection, PII scrubbing, content moderation.

### ❌ Synchronous-Only AI

**Symptom:** Users stare at a spinner for 30 seconds while the LLM processes.

**Fix:** Streaming responses, async processing with status updates, background jobs for heavy tasks.

### ❌ Training Data in Production Logs

**Symptom:** Sending sensitive user data to third-party AI providers.

**Fix:** Anonymize data, use on-premise models for sensitive data, review data processing agreements.

### Anti-Pattern Summary

| Anti-Pattern | Risk Level | Impact |
|-------------|-----------|--------|
| LLM-for-Everything | Medium | Wasted cost, over-engineering |
| No Evaluation | Critical | Silent quality degradation |
| Prompt-and-Pray | High | Fragile, unreliable outputs |
| RAG Without Quality | High | Confidently wrong answers |
| Ignoring Cost | High | Budget overruns |
| No Guardrails | Critical | Security, compliance risks |
| Synchronous-Only | Medium | Poor user experience |
| Data in Logs | Critical | Privacy violations |

## Responsible AI

### AI Ethics Checklist

- [ ] **Fairness** — Test for bias across demographics
- [ ] **Transparency** — Users know when AI is involved
- [ ] **Privacy** — No PII in training data or logs
- [ ] **Safety** — Content moderation, harmful output prevention
- [ ] **Accountability** — Clear ownership of AI decisions
- [ ] **Explainability** — Can you explain why the model made a decision?
- [ ] **Human oversight** — Human-in-the-loop for high-stakes decisions

### AI Governance

```
Policy → Model Cards → Evaluation → Deployment Gate → Monitoring → Audit
```

---

## Resources

### Books

- **"Designing Machine Learning Systems"** — Chip Huyen
- **"Building LLM Apps"** — Valentina Alto
- **"AI Engineering"** — Chip Huyen (2025)
- **"Hands-On Large Language Models"** — Jay Alammar & Maarten Grootendorst
- **"Machine Learning Design Patterns"** — Lakshmanan, Robinson, Munn (Google)

### Courses

- [DeepLearning.AI — LLM courses](https://www.deeplearning.ai/) — Andrew Ng's courses
- [Full Stack LLM Bootcamp](https://fullstackdeeplearning.com/) — Practical LLM engineering
- [Hugging Face NLP Course](https://huggingface.co/learn/nlp-course) — Free NLP/LLM course
- [fast.ai](https://www.fast.ai/) — Practical deep learning

### Essential Links

- [Hugging Face](https://huggingface.co/) — Models, datasets, spaces
- [LangChain Docs](https://python.langchain.com/) — LLM orchestration
- [LlamaIndex Docs](https://docs.llamaindex.ai/) — Data framework for LLMs
- [Anthropic Docs](https://docs.anthropic.com/) — Claude API and best practices
- [OpenAI Cookbook](https://cookbook.openai.com/) — Practical examples
- [LMSYS Chatbot Arena](https://chat.lmsys.org/) — Model leaderboard

### Podcasts

| Podcast | Focus |
|---------|-------|
| [Latent Space](https://www.latent.space/) | AI engineering deep dives |
| [Practical AI](https://changelog.com/practicalai) | Applied AI/ML |
| [The TWIML AI Podcast](https://twimlai.com/) | ML research and practice |
| [Gradient Dissent](https://wandb.ai/podcast) | ML engineering (Weights & Biases) |
| [Last Week in AI](https://lastweekinai.com/) | AI news roundup |
| [AI Engineering Podcast](https://www.youtube.com/@aiaborern) | AI systems design |

### YouTube Channels

| Channel | Content |
|---------|---------|
| [Andrej Karpathy](https://www.youtube.com/@AndrejKarpathy) | Neural nets from scratch |
| [3Blue1Brown](https://www.youtube.com/@3blue1brown) | Visual ML/math explanations |
| [Yannic Kilcher](https://www.youtube.com/@YannicKilcher) | Paper reviews |
| [Two Minute Papers](https://www.youtube.com/@TwoMinutePapers) | Research highlights |
| [AI Jason](https://www.youtube.com/@AIJasonZ) | Practical AI engineering |
| [Matt Williams](https://www.youtube.com/@techaborern) | Ollama and local AI |
| [Sam Witteveen](https://www.youtube.com/@samwitteveen) | LLM applications |

### Conferences

| Conference | Focus |
|-----------|-------|
| **NeurIPS** | AI/ML research (premier) |
| **ICML** | Machine learning research |
| **AI Engineer Summit** | Applied AI engineering |
| **MLOps Community Events** | MLOps practices |
| **AI4** | Enterprise AI |
| **Google I/O** | Gemini, Vertex AI |
| **AWS re:Invent** | Bedrock, SageMaker |
| **Microsoft Build** | Azure OpenAI, Copilot |

---

*"AI is not a feature — it's an architectural decision that affects data, infrastructure, security, and user experience. Design for it from the start."*
