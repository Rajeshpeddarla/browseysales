# Browsey Enterprise Intelligence System — Final Implementation Instructions
Version: 10.0
Status: Production Architecture (Cloud AI via Ckey.vn)
Target: Cloud-Powered Enterprise Browser Intelligence Platform

This document defines the final architecture direction for Browsey.

The system is transitioning from:
- external API summarization
- generic AI outputs
- one-shot reasoning

into:
- enterprise-grade intelligence infrastructure
- semantic memory architecture
- evidence-first signal extraction
- retrieval-augmented reasoning
- confidence-driven intelligence

---

# 1. Core System Philosophy

Browsey is NOT:
- a chatbot
- a simple RAG app
- an HTML summarizer
- a generic AI wrapper

Browsey IS:
- enterprise intelligence engine
- browser intelligence platform
- signal extraction system
- memory-driven research architecture
- confidence-based investigative engine

The system should prioritize:
- deterministic extraction
- structured JSON
- evidence quality
- semantic retrieval
- confidence scoring
- historical memory
- signal normalization
- enterprise reliability

NOT:
- autonomous hype
- random agent conversations
- giant prompts
- excessive orchestration complexity

---

# 2. Current AI Stack

## Cloud AI Models (via Ckey.vn API)

| Model | Role | Purpose |
|---|---|---|
| claude-haiku-4.5 | reasoning | Main reasoning + extraction + agents |
| deepseek-3.2 | fast | Quick extractions, tech stack, simple parsing |
| gpt-5.4-mini | formatting | Summaries, personalization, outreach hooks |
| qwen3-coder-next | default | Bulk tasks, multi-pass extraction |

Provider: Ckey.vn (https://ckey.vn) — OpenAI-compatible API

---

## Embeddings + Reranking

| Model | Purpose |
|---|---|
| BAAI/bge-m3 | Embeddings |
| BAAI/bge-reranker-v2-m3 | Reranking |

Installed through:
- sentence-transformers
- transformers
- torch

---

# 3. Final Enterprise Architecture

```text
Browser Extension
    ↓
Client Extraction Layer
    ↓
Structured Payload API
    ↓
Research Orchestrator
    ↓
Signal Extraction Layer
    ↓
Semantic Memory Layer
    ↓
Retrieval + Reranking
    ↓
Reasoning Layer
    ↓
Confidence Engine
    ↓
Formatting Layer
    ↓
Dashboard + Watch Mode
```

---

# 4. Architecture Separation Rules

## Node.js Responsibilities
Node.js should:
- orchestrate
- route requests
- manage queues
- coordinate agents
- persist data
- handle APIs
- run workflows

Node.js should NOT:
- run embeddings directly
- run rerankers directly
- handle ML pipelines
- handle heavy inference

---

## Python Responsibilities
Python should:
- run embeddings
- run reranking
- manage semantic retrieval
- manage future ML pipelines
- manage OCR
- manage future vision systems

This separation is CRITICAL.

Enterprise Rule:
- Node orchestrates
- Python handles ML

---

# 5. Required Services

| Service | Purpose |
|---|---|
| Next.js | Frontend + API |
| Ckey.vn API | Cloud AI reasoning (GPT, Claude, DeepSeek, Qwen) |
| Python AI Service | Embeddings + reranking |
| Redis | Queue system |
| Supabase/Postgres | Persistence |
| pgvector | Vector search |

---

# 6. Python Environment

DO NOT use Python 3.14 in production.

Use:
- Python 3.11

Reason:
- PyTorch stability
- CUDA compatibility
- transformer ecosystem stability
- sentence-transformers reliability

---

# 7. Python AI Microservice

Create dedicated Python microservice.

Responsibilities:
- embeddings generation
- reranking
- semantic retrieval
- future OCR
- future Qwen-VL
- future clustering
- future ML classification

Recommended Framework:
- FastAPI

Example Structure:

```text
/python-ai
    /app
        embeddings.py
        reranker.py
        retrieval.py
        chunking.py
        main.py
```

---

# 8. Docker Architecture

Use Docker Compose EVEN during local development.

Required containers:

| Container | Purpose |
|---|---|
| nextjs-app | frontend/api |
| python-ai | embeddings/rerank |
| redis | queue |

Note: LLM reasoning is handled by Ckey.vn cloud API — no local LLM container needed.

Benefits:
- easier deployment
- easier scaling
- no GPU dependency for reasoning
- cleaner architecture
- service isolation

---

# 9. Browser-Side Responsibilities

The browser extension should handle:
- DOM extraction
- visible text extraction
- semantic section extraction
- screenshots
- metadata extraction
- framework detection
- user-context browsing

The browser should NOT:
- run heavy reasoning
- run embeddings
- run reranking
- run semantic retrieval

---

# 10. Browser Payload Structure

DO NOT send:
- giant HTML dumps
- scripts
- entire DOM trees

Instead send:
- semantic sections

Recommended payload:

```json
{
  "url": "",
  "domain": "",
  "title": "",
  "metaDescription": "",
  "headings": [],
  "pricingText": "",
  "securityText": "",
  "integrationsText": "",
  "careersText": "",
  "socialLinks": [],
  "buttons": [],
  "screenshots": [],
  "visibleText": "",
  "detectedFrameworks": [],
  "metadata": {}
}
```

---

# 11. Multi-Pass Extraction Architecture

DO NOT use:
- one giant extraction prompt

Instead use:
- specialized extraction passes

Required passes:

PASS 1:
- security signals

PASS 2:
- hiring signals

PASS 3:
- integrations

PASS 4:
- GTM signals

PASS 5:
- AI/product signals

PASS 6:
- pricing signals

PASS 7:
- enterprise readiness

Then merge outputs.

This dramatically improves:
- signal completeness
- consistency
- reliability

---

# 12. Reasoning Model (claude-haiku-4.5) Responsibilities

PRIMARY MODEL for complex tasks.

Use for:
- signal extraction
- reasoning
- synthesis
- planner logic
- enterprise classification
- company classification
- confidence reasoning
- structured JSON generation
- GTM analysis
- security analysis
- hiring analysis
- integrations analysis

Required settings:

```ts
temperature: 0.2
response_format: { type: "json_object" }
```

Global Rules:
- STRICT JSON ONLY
- NEVER hallucinate
- NEVER invent signals
- NEVER summarize multiple signals into vague outputs
- extract ALL explicit signals individually

---

# 13. Fast Model (deepseek-3.2) Responsibilities

Use for:
- quick tech stack detection
- news enrichment
- simple data parsing
- lightweight classification
- extraction verification

This should remain lightweight and cheap ($0.004/$0.006 per 1M tokens).

---

# 14. Formatting Model (gpt-5.4-mini) Responsibilities

Use for:
- polished summaries
- executive brief formatting
- outreach personalization
- dashboard summaries
- final readable output

DO NOT use for:
- extraction
- classification
- confidence scoring

---

# 15. Embeddings Architecture

Model:
- BAAI/bge-m3

Output Size:
- 1024 dimensions

Database schema MUST use:

```sql
vector(1024)
```

NOT:
```sql
vector(1536)
```

Embeddings are used for:
- semantic memory
- historical retrieval
- company similarity
- signal similarity
- RAG
- enterprise intelligence retrieval

---

# 16. Reranking Architecture

Model:
- BAAI/bge-reranker-v2-m3

Purpose:
- evidence quality scoring
- retrieval filtering
- semantic prioritization
- context optimization

Required retrieval pattern:

```text
Vector Search
↓
Top 20 Chunks
↓
Reranker
↓
Best 5 Chunks
↓
Send To Qwen
```

NEVER send raw vector search results directly to LLM.

Always rerank.

---

# 17. Semantic Memory Architecture

Core flow:

```text
Signals
↓
Chunking
↓
Embeddings
↓
pgvector
↓
Semantic Retrieval
↓
Reranking
↓
Reasoning
```

Memory should store:
- signals
- evidence
- screenshots
- confidence reports
- summaries
- historical runs
- pricing intelligence
- hiring intelligence
- integrations
- relationships

---

# 18. Enterprise Chunking Rules

Chunk semantically by:
- pricing
- security
- integrations
- careers
- documentation
- APIs
- GitHub activity
- social posts

DO NOT:
- chunk randomly
- chunk by arbitrary token count only

Semantic chunking is critical.

---

# 19. Signal Taxonomy System

Signals MUST be normalized.

Example:

```ts
export const ENTERPRISE_SIGNALS = [
  "SOC2",
  "HIPAA",
  "ISO27001",
  "SSO",
  "SCIM",
  "RBAC",
  "Audit Logs",
  "Enterprise Pricing",
  "Salesforce Integration",
  "HubSpot Integration",
  "Enterprise Hiring"
];
```

Never rely entirely on free-form outputs.

---

# 20. Evidence-First Intelligence Pattern

Every signal MUST store:
- signal
- evidence
- source
- confidence

Example:

```json
{
  "signal": "SOC2",
  "evidence": "SOC2 mentioned on security page",
  "source_url": "",
  "confidence": 88
}
```

This creates:
- explainable intelligence
- trustable outputs
- enterprise-grade reasoning

---

# 21. Confidence Engine

Confidence should depend on:
- evidence count
- source quality
- freshness
- contradictions
- multi-source confirmation
- historical consistency

Example:

```json
{
  "confidence_score": 87,
  "reasoning": "",
  "evidence_strength": "strong"
}
```

DO NOT generate fake confidence.

---

# 22. Reflection + Critic Pattern

Reflection Agent:
- identifies missing evidence
- identifies weak claims
- requests retries

Critic Agent:
- challenges assumptions
- validates evidence
- detects unsupported reasoning

Model:
- claude-haiku-4.5 (reasoning role via Ckey.vn)

---

# 23. Immutable Research Runs

CRITICAL ENTERPRISE PATTERN.

NEVER overwrite research.

Every execution creates:

```text
Research Run
↓
Signals
↓
Evidence
↓
Confidence
↓
Embeddings
↓
Brief
```

Benefits:
- historical tracking
- trend analysis
- auditability
- monitoring
- trust

---

# 24. Enterprise Queue Architecture

Use:
- Redis
- BullMQ

Required pattern:

```text
Research Request
↓
Queue
↓
Workers
↓
Agents
↓
Persistence
```

DO NOT block frontend requests with full synchronous pipelines.

---

# 25. Validation Architecture

ALL extraction must pass:

```text
LLM Output
↓
Zod Validation
↓
Repair Prompt
↓
Retry
↓
Validated Object
```

Never trust raw LLM output directly.

---

# 26. Enterprise Retrieval Architecture

BAD:

```text
Huge Payload
↓
Directly To LLM
```

GOOD:

```text
Chunk
↓
Embed
↓
Store
↓
Retrieve
↓
Rerank
↓
Reason
```

This is enterprise-grade RAG.

---

# 27. Enterprise Observability

Track:
- token usage
- latency
- extraction failures
- confidence trends
- hallucination frequency
- retrieval quality
- reranking scores
- retries
- validation failures

Persist all metrics.

---

# 28. Enterprise Database Architecture

Primary DB:
- Supabase PostgreSQL

Extensions:
- pgvector

Future:
- Neo4j graph memory

Core Tables:
- companies
- research_runs
- company_signals
- evidence
- embeddings
- screenshots
- confidence_reports
- reflection_reports
- watches
- alerts

---

# 29. Future Upgrade Path

Current:
- Ckey.vn API (claude-haiku-4.5, gpt-5.4-mini, deepseek-3.2, qwen3-coder-next)

Next:
- Upgrade to gpt-5.5 or claude-sonnet-4-6 for higher quality reasoning

Future:
- Qwen-VL for visual intelligence
- distributed workers
- hybrid retrieval
- Neo4j knowledge graph
- autonomous monitoring

---

# 30. Most Important Product Principle

Browsey's moat will NOT be:
- bigger models
- autonomous hype
- giant prompts

Browsey's moat becomes:
- signal datasets
- semantic memory
- confidence systems
- evidence quality
- historical intelligence
- retrieval quality
- enterprise signal normalization
- browser intelligence
- institutional memory

Architecture quality matters more than model size.

---

# 31. Highest Priority Implementation Order

PRIORITIZE THESE FIRST:

1. deterministic extraction
2. semantic chunking
3. embeddings pipeline
4. reranking
5. evidence normalization
6. confidence engine
7. immutable research runs
8. retrieval quality
9. memory architecture

DO NOT prioritize:
- autonomous agents
- self-improving loops
- giant orchestration complexity
- multi-agent chaos

Reliability and intelligence quality come first.