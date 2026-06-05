# Browsey SocialAgent + HiringAgent Enterprise Intelligence Specification

Version: 5.0
Target: Enterprise Behavioral Intelligence + Hiring Intelligence + Relationship Intelligence

This document defines how Browsey should professionally gather, analyze, prioritize, and reason about:

* people
* developers
* executives
* hiring
* product launches
* social signals
* developer ecosystem activity
* engagement behavior
* relationship intelligence
* enterprise expansion indicators

The goal is NOT scraping.

The goal is:

* behavioral intelligence
* strategic intelligence
* relationship intelligence
* enterprise GTM intelligence
* ecosystem intelligence

---

# 1. Core Philosophy

The agents should behave like:

* senior sales intelligence analysts
* enterprise recruiters
* GTM strategists
* technical market researchers
* DevRel intelligence teams
* competitive intelligence analysts

The system should think:

"What would an elite sales + hiring + GTM research team want to know?"

NOT:

"How do we scrape more text?"

---

# 2. Core System Responsibilities

## SocialAgent

Responsible for:

* executive intelligence
* developer intelligence
* product launch intelligence
* ecosystem intelligence
* sentiment analysis
* influence analysis
* engagement analysis
* social momentum
* relationship mapping
* technical discussion extraction

---

## HiringAgent

Responsible for:

* hiring intelligence
* org expansion detection
* role analysis
* GTM expansion signals
* technical maturity inference
* org structure analysis
* department growth patterns
* enterprise movement indicators
* staffing urgency analysis

---

# 3. Core Intelligence Principle

DO NOT extract:

* random text dumps
* generic summaries
* noisy content

Extract:

* strategic signals
* behavioral patterns
* organizational movement
* technical priorities
* enterprise readiness indicators
* decision-maker intelligence
* ecosystem relationships

---

# 4. Social Platforms To Process

Priority platforms:

| Platform        | Purpose                          |
| --------------- | -------------------------------- |
| LinkedIn        | hiring + executives + GTM        |
| GitHub          | developer + roadmap intelligence |
| X/Twitter       | launches + sentiment + influence |
| Reddit          | pain points + user frustration   |
| HackerNews      | technical sentiment              |
| Discord         | ecosystem adoption               |
| YouTube         | demos + launch intelligence      |
| Product Hunt    | launch momentum                  |
| Dev.to          | developer positioning            |
| Medium/Substack | leadership thinking              |

---

# 5. Crawlee Architecture

Use:

* Crawlee
* PlaywrightCrawler
* Playwright
* persistent browser contexts

Reason:

* session persistence
* retries
* queueing
* anti-bot resilience
* scalable orchestration
* browser pooling
* human-like navigation

Required:

* PlaywrightCrawler
* session pools
* request queues
* retry logic
* persistent storage

DO NOT:

* build raw Playwright chaos manually

---

# 6. Extension Responsibilities

The Chrome extension acts as:

* authenticated browser operator
* session inheritor
* interaction engine
* visual collector
* workflow explorer

The extension should:

* inherit user sessions
* open authenticated pages
* scroll feeds
* click tabs
* expand comments
* open profiles
* reveal hidden sections
* capture screenshots
* extract semantic DOM sections

The extension should NOT:

* run heavy AI
* run embeddings
* run reranking
* perform large reasoning

---

# 7. Social Intelligence Flow

```text
Open Company Profile
↓
Extract Executives
↓
Open Executive Profiles
↓
Extract Posts + Engagement
↓
Open Mentioned Technologies
↓
Open Linked GitHub Profiles
↓
Analyze Technical Discussions
↓
Build Relationship Graph
↓
Store Behavioral Intelligence
```

---

# 8. Executive Intelligence Extraction

Extract:

* name
* role
* department
* seniority
* technical focus
* business focus
* hiring focus
* recent discussions
* engagement quality
* launch involvement
* speaking activity
* partnerships
* enterprise focus
* GTM language

Infer:

* influence level
* decision-making authority
* technical authority
* enterprise maturity
* strategic priorities

---

# 9. Developer Intelligence Extraction

Extract:

* GitHub activity
* repositories
* commit frequency
* PR discussions
* architecture discussions
* issue discussions
* scaling pain points
* infra conversations
* deployment patterns
* AI stack mentions
* cloud discussions
* DevOps tooling
* SDK/API discussions

Infer:

* architecture maturity
* scaling pressure
* enterprise movement
* product roadmap direction
* technical debt pressure

---

# 10. Hiring Intelligence Extraction

Extract:

* job titles
* seniority
* locations
* compensation
* required skills
* urgency language
* enterprise language
* infrastructure hiring
* platform hiring
* security hiring
* DevRel hiring
* RevOps hiring
* AE/SDR hiring

Infer:

* GTM expansion
* enterprise motion
* scaling phase
* infrastructure pressure
* product expansion
* geographic expansion
* operational maturity

---

# 11. High-Value Hiring Signals

Strong enterprise indicators:

* Enterprise AE hiring
* RevOps hiring
* Security engineer hiring
* Platform engineer hiring
* SRE hiring
* Compliance hiring
* Customer success expansion
* DevRel hiring
* Integration engineer hiring

These signals should receive:

* high weighting
* strong confidence boosts

---

# 12. Social Engagement Intelligence

Extract:

* likes
* comments
* reposts
* discussion quality
* developer engagement
* founder engagement
* investor engagement
* enterprise customer engagement

Infer:

* launch momentum
* community trust
* technical credibility
* ecosystem adoption
* market interest

---

# 13. Comment Intelligence

Comments are EXTREMELY valuable.

Extract:

* complaints
* feature requests
* scaling pain
* onboarding friction
* integration requests
* enterprise blockers
* reliability issues
* pricing frustration
* migration pain

Comments often reveal:

* real customer pain
* hidden roadmap direction
* enterprise demand pressure

---

# 14. Temporal Intelligence

Track changes over time.

Examples:

Month 1:

* 2 platform engineers

Month 3:

* 8 platform engineers

Month 4:

* SOC2 launch

Month 5:

* enterprise pricing

Infer:

* enterprise expansion underway

Temporal intelligence is CRITICAL.

---

# 15. Relationship Intelligence

Build identity relationships.

Example:

```text
LinkedIn Executive
↓
GitHub User
↓
Twitter Profile
↓
Conference Speaker
↓
Open Source Maintainer
```

This creates:

* influence graphs
* ecosystem intelligence
* relationship intelligence

---

# 16. Screenshot Conditions

DO NOT take screenshots randomly.

Take screenshots ONLY when:

* dashboards detected
* pricing tables detected
* workflow builders detected
* analytics screens detected
* admin panels detected
* onboarding flows detected
* integrations pages detected
* enterprise/security pages detected
* AI interfaces detected
* feature comparison tables detected

Screenshots become:

* visual evidence objects

---

# 17. Page Interaction Intelligence

The extension should:

* click hidden tabs
* expand accordions
* open modals
* reveal hidden pricing
* inspect onboarding flows
* trigger workflows
* inspect dashboards
* inspect settings pages

Most crawlers never see these areas.

This is a major Browsey advantage.

---

# 18. Semantic Extraction Rules

DO NOT:

* dump raw HTML
* dump giant DOM trees
* dump full pages blindly

Instead extract:

* semantic sections
* structured blocks
* visible intelligence
* meaningful UI sections

---

# 19. Semantic Chunking

Chunk by:

* pricing
* hiring
* GitHub
* executive posts
* comments
* integrations
* onboarding
* enterprise/security
* AI capabilities

NEVER use random token chunking.

---

# 20. Social Memory Architecture

Store:

* people
* posts
* comments
* hiring changes
* relationship graphs
* technology mentions
* influence scores
* engagement trends
* ecosystem relationships

This becomes:

* institutional intelligence memory

---

# 21. Retrieval Architecture

Correct architecture:

```text
Social Data
↓
Semantic Chunking
↓
Embeddings
↓
pgvector
↓
Retrieval
↓
Reranking
↓
Qwen Reasoning
```

NEVER:

* send giant social dumps directly to LLM

---

# 22. Confidence Architecture

Confidence should depend on:

* source quality
* engagement quality
* multi-source confirmation
* temporal consistency
* role authority
* evidence count

DO NOT hallucinate confidence.

---

# 23. Entity Prioritization

Highest priority people:

* Founders
* CTO
* VP Engineering
* VP Product
* Head of Platform
* DevRel
* Security Leaders
* RevOps
* Enterprise Sales Leaders

DO NOT waste resources on:

* low-value random employees

---

# 24. Workflow Intelligence (CRITICAL)

Most valuable future intelligence:

* onboarding flows
* admin workflows
* integrations UX
* permissions systems
* analytics dashboards
* workflow builders
* enterprise controls

This is extremely difficult for traditional crawlers.

Authenticated extension access becomes a massive moat.

---

# 25. Final Intelligence Goal

The agents should eventually answer:

* Is this company moving upmarket?
* Are they under infrastructure pressure?
* Are enterprise customers influencing roadmap?
* Is GTM expanding aggressively?
* Are integrations becoming strategic?
* Is hiring signaling operational strain?
* Which executives actually influence decisions?
* Which technologies are becoming core?
* What pain points are emerging?
* What timing signals exist for outreach?

The goal is NOT scraping.

The goal is:

* strategic intelligence
* behavioral intelligence
* enterprise intelligence
* relationship intelligence
* temporal intelligence
* ecosystem intelligence
