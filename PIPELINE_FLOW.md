# Browsey Enterprise Agentic Pipeline — Flow Architecture (v10.0)

This document describes the exact execution flow of the **Cloud-Powered Enterprise Browser Intelligence Platform**, powered by Ckey.vn API for AI reasoning.

---

## The Complete "Generate Brief" Flow

When a user initiates research, the pipeline executes through a specialized, deterministic semantic extraction process powered by cloud AI models via Ckey.vn.

### Phase 1: Initiation & Dual-Architecture Extraction
1. **User Action**: User types a URL in the dashboard or clicks "Research" in the extension.
2. **Chrome Extension (Frontend Crawler)**: Inherits the user's authenticated sessions to bypass bot protections. Automatically navigates to LinkedIn, Glassdoor, and X. Extracts text and profiles using client-side OCR and DOM parsing. Packages this into the `social_signals` payload.
3. **Crawlee (Backend Crawler)**: The Node.js orchestrator uses Apify's `crawlee` (`PlaywrightCrawler`) to perform stealthy, deep traversal of the public company website (pricing, docs, API, security). Generates human-like TLS fingerprints to evade Cloudflare.
4. **Queue Entry**: The combined extracted payloads are pushed to a Redis queue to prevent blocking frontend requests.

### Phase 2: Orchestration & Semantic Chunking (Node.js)
4. **Research Run Initialization**: Creates or finds the `companies` row and initializes an immutable `company_research_runs` record.
5. **Semantic Memory Chunking**: The Memory Agent receives the payload and chunks it by semantic type (e.g., `pricing`, `social`, `github`, `company_summary`).
6. **Embeddings Generation (Python Microservice)**: Node.js sends the chunks to the local Python AI Microservice (FastAPI). The Python service uses `BAAI/bge-m3` to generate `1024-d` vectors.
7. **Vector Storage**: Embeddings and chunk content are stored in the Supabase `pgvector` database (`research_memories` table).

### Phase 3: Multi-Pass Signal Extraction
DO NOT use one giant extraction prompt. Instead, the orchestrator triggers specialized extraction passes via Ckey.vn cloud API.
8. **Claude Haiku 4.5 Extraction (reasoning role)**:
   - **PASS 1**: Security Signals
   - **PASS 2**: Hiring Signals
   - **PASS 3**: Integrations
   - **PASS 4**: GTM Signals
   - **PASS 5**: AI/Product Signals
   - **PASS 6**: Pricing Signals
   - **PASS 7**: Enterprise Readiness
   
   Every signal is extracted with explicit *evidence*, *source*, and *confidence*.

### Phase 4: Validation & Reflection
9. **Zod Validation**: All extraction passes are validated strictly against Zod schemas. If they fail, a repair prompt is triggered.
10. **Reflection Agent (claude-haiku-4.5)**: Identifies missing evidence and weak claims. Requests retries if necessary.
11. **Critic Agent (claude-haiku-4.5)**: Validates evidence quality and detects unsupported reasoning.

### Phase 5: Semantic Retrieval & Reranking (Python)
When an agent needs historical context or deeper intelligence:
12. **Vector Search**: Fetch the top 20 relevant chunks from `pgvector` via cosine similarity.
13. **Reranking (BAAI/bge-reranker-v2-m3)**: The chunks are sent to the Python microservice reranker. The top 5 chunks are selected based on cross-encoder scoring.
14. **Context Injection**: The reranked chunks are provided to the reasoning model to ground its analysis.

### Phase 6: Confidence Engine & Formatting
15. **Confidence Engine**: Calculates a strict 0-100 score based on evidence count, source quality, freshness, contradiction penalty, and multi-source confirmation.
16. **Formatting (gpt-5.4-mini)**: Transforms the verified signals and confidence scores into a polished, personalized executive brief and outreach hooks.
17. **Persistence**: Saves the final brief to `briefs` and marks the `company_research_runs` as completed.

---

## AI Infrastructure Stack

The pipeline uses a hybrid cloud + local architecture: cloud API for reasoning, local Python for embeddings.

### Architecture Separation
- **Node.js (Next.js)**: Orchestrates, routes requests, manages queues, coordinates agents, validates JSON, handles APIs.
- **Python 3.11 (FastAPI)**: Generates embeddings, performs reranking, handles semantic retrieval.
- **Ckey.vn API**: Cloud AI provider — serves GPT, Claude, DeepSeek, and Qwen models at discounted rates.
- **Redis (BullMQ)**: Manages the asynchronous queue system.
- **Supabase (PostgreSQL)**: Persists all data and vectors.

### Model Routing Matrix
| Role | Model | Provider | Purpose |
|---|---|---|---|
| `reasoning` | claude-haiku-4.5 | Ckey.vn | Signal extraction, enterprise classification, agent logic. |
| `fast` | deepseek-3.2 | Ckey.vn | Quick extractions, tech stack detection, simple parsing. |
| `formatting` | gpt-5.4-mini | Ckey.vn | Executive summaries, personalization, outreach hooks. |
| `default` | qwen3-coder-next | Ckey.vn | General bulk tasks, multi-pass extraction. |
| `embeddings` | BAAI/bge-m3 | Local Python | 1024-d vectors for semantic chunking and retrieval. |
| `reranker` | BAAI/bge-reranker-v2-m3 | Local Python | Precision scoring for vector search results. |

---

## Database Architecture (VECTOR 1024)

The Supabase database has been optimized for the `bge-m3` model. All embedding columns MUST use `VECTOR(1024)`.

**Core Tables:**
- `companies`, `company_research_runs`
- `company_signals`, `evidence`, `screenshots`
- `reflection_reports`, `confidence_reports`
- `watches`, `watch_alerts`

**Vector Memory Tables (1024-d):**
- `research_memories`
- `action_memories`
- `website_patterns`
- `social_posts`
- `github_activity`
- `hiring_signals`

**Immutable Rule**: Research runs are never overwritten. Every execution creates a net-new record with its associated signals, evidence, and confidence scores to ensure historical tracking and auditability.
