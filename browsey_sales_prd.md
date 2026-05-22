# Browsey for Sales — Product Requirements Document (PRD)

Working name: **Browsey for Sales** (or rebrand: **SalesScope**, **ProspectLens**, **PitchPilot**).
Vertical browser-extension AI copilot built for SDRs, BDRs, and AEs. Visit any prospect's website or LinkedIn profile → side-drawer instantly extracts pain points, tech stack, recent news, decision-makers, and outreach hooks → one-click push to CRM.

---

## 0. Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem and Opportunity](#2-problem-and-opportunity)
3. [Target Users and Personas](#3-target-users-and-personas)
4. [Competitive Landscape](#4-competitive-landscape)
5. [Feature List (Free / Pro / Team / Enterprise)](#5-feature-list-free--pro--team--enterprise)
6. [User Stories](#6-user-stories)
7. [User Flows](#7-user-flows)
8. [System Architecture](#8-system-architecture)
9. [Repository Structure](#9-repository-structure)
10. [Extension — Detailed Behavior](#10-extension--detailed-behavior)
11. [Website + Marketing UI](#11-website--marketing-ui)
12. [Dashboard UI](#12-dashboard-ui)
13. [Admin Panel](#13-admin-panel)
14. [Database Schema](#14-database-schema)
15. [API Contracts](#15-api-contracts)
16. [AI Pipeline](#16-ai-pipeline)
17. [CRM Integrations](#17-crm-integrations)
18. [Authentication and Security](#18-authentication-and-security)
19. [Billing](#19-billing)
20. [Pricing](#20-pricing)
21. [Analytics and KPIs](#21-analytics-and-kpis)
22. [Go-To-Market](#22-go-to-market)
23. [Cost Model](#23-cost-model)
24. [Roadmap](#24-roadmap)
25. [Risks and Mitigations](#25-risks-and-mitigations)
26. [Day-1 Build Checklist](#26-day-1-build-checklist)

---

## 1. Product Overview

### 1.1 What

Browser extension that turns the active tab into a sales-research command center:

- Side drawer attached to any URL.
- On any company website, LinkedIn company page, LinkedIn profile, AngelList / Crunchbase / G2 / news article — instantly produce:
  - **One-paragraph company summary**
  - **Pain-point hypotheses** mapped to user's offer
  - **Detected tech stack** (BuiltWith-style)
  - **Recent news / funding / hiring signals**
  - **Decision-maker list** with roles and seniority
  - **3 personalized outreach openers** (email / LinkedIn DM / cold call)
- One-click push to **HubSpot, Salesforce, Pipedrive, Close, Outreach, Salesloft**.
- Export to CSV / Excel / DOCX prospect brief.
- Team-shared playbooks: standardize how reps research and reach out.

### 1.2 One-Sentence Pitch

> "Visit any company site, get a sales-ready prospect brief in 8 seconds, push it to your CRM in one click."

### 1.3 Why This Wins Over Existing Tools

- Legacy sales databases: directory-first ($99-499/mo, slow, stale, brittle UI).
- LinkedIn Sales Navigator: $99/mo, no AI synthesis, no CRM auto-push.
- Clay / Smartlead / Instantly: workflow tools, no in-context drawer.
- ChatGPT / Sider / generic AI: not sales-tuned, no CRM integration, no playbooks.

Browsey for Sales sits **inside the rep's actual workflow** (the browser tab they already have open) instead of forcing context switch to another tool.

---

## 2. Problem and Opportunity

### 2.1 Problem

- Reps spend **6+ hours/week** on manual prospect research (sales databases / LinkedIn / Google / company website / news).
- Findings live in scratch docs, sticky notes, half-finished CRM fields.
- Personalization is shallow because synthesis is slow → low reply rates (industry avg 1-3%).
- Tooling stack is fragmented (sales database + LinkedIn + Crunchbase + ChatGPT + Notion + CRM).
- Managers lack consistency: every rep researches differently.

### 2.2 Opportunity

- **Outbound sales is broken everywhere** — buyers ignore generic outreach.
- **AI personalization at scale** is the unlock.
- Browser extension is **non-disruptive** (no new tool to learn, just appears where reps already work).
- Selling to teams = $40-300/seat/mo = **high LTV**.
- B2B sales tools have low churn (5-7%/yr).

---

## 3. Target Users and Personas

| Persona | Title | Pain | Willingness to Pay |
|---|---|---|---|
| **Sara, SDR** | Sales Development Rep | Hits 60 dials + 80 emails/day; no time for research | $19-29/mo personal, $39/seat team |
| **Marco, AE** | Account Executive | Needs deep account research before discovery calls | $39-79/mo |
| **Priya, Sales Manager** | Team lead 5-15 reps | Wants consistent research playbooks + tracking | Champion for $39-79/seat/mo team plan |
| **Founder, B2B SaaS startup** | Solo seller-founder | Wants sales database replacement at fraction of price | $29-49/mo |
| **Agency owner** | Lead-gen agency | Sells leads to clients, needs scalable research | $99-299/mo agency plan |

ICP for v1: **SDR + Sales Manager at SaaS companies 10-200 employees, US/CA/UK/AU/EU**. Indian / SEA companies later (PPP pricing).

---

## 4. Competitive Landscape

| Tool | Pricing | Strength | Weakness vs Browsey-Sales |
|---|---|---|---|
| **Legacy sales database** | $49-149/mo | Massive contact DB | Slow, generic, no in-context AI, $99+ tier needed for usable AI |
| **ZoomInfo** | $15K+/yr | Enterprise data | $$$, no in-context, salesy UI |
| **Lusha** | $39-99/mo | Easy email finder | Just contacts, no synthesis |
| **Cognism** | enterprise | EU phone data | Heavy, slow |
| **Clay** | $149-800/mo | Powerful workflows | Steep learning curve, no in-tab UX |
| **LinkedIn Sales Navigator** | $99/mo | LinkedIn-native | No AI synthesis, no CRM push |
| **Crunchbase Pro** | $99/mo | Funding data | Read-only, no outreach generation |
| **Sider / Monica / ChatGPT ext** | $5-20/mo | Generic AI in browser | Not sales-tuned, no CRM, no playbooks |
| **Lavender / Regie.ai** | $29-99/mo | Email AI coach | Only email, no upstream research |
| **Browsey for Sales** | $19-79/seat | In-context AI + CRM push + playbooks | New; needs trust + data quality |

**Wedge**: in-context AI + CRM push + team playbooks at a competitive seat price. Nobody combines all three well.

---

## 5. Feature List (Free / Pro / Team / Enterprise)

### 5.1 Free Tier (Acquisition)

- 10 prospect briefs/month.
- Company summary + tech stack (no AI synthesis).
- Manual copy-paste to CRM.
- 1 device, no sync.
- BYOK Anthropic/OpenAI key for AI features.

### 5.2 Pro — $29/mo or $249/yr (Individual Reps + Founders)

Everything in Free, plus:

- **Unlimited prospect briefs**.
- **AI synthesis**: pain points, hooks, outreach drafts (3 channels: email / LinkedIn / cold call).
- **Tech stack detection** (BuiltWith-style, 1500+ technologies).
- **Recent news + funding feed** for each company.
- **Decision-maker enrichment** (top 5 contacts with title, seniority).
- **One-click CRM push**: HubSpot, Pipedrive (Salesforce in Team).
- **Email finder + verifier** (50 lookups/mo).
- **Saved briefs** (history of last 500).
- **DOCX / Excel export** of prospect brief.
- **Cross-device sync**.
- **Hosted LLM** (no BYOK needed) — $4 of LLM credit included; over-usage 2¢/brief.

### 5.3 Team — $49/seat/mo or $399/seat/yr (Sales Teams)

Everything in Pro, plus:

- **Shared playbooks**: standard research templates, ICP-fit scoring rubric.
- **Shared library** of saved briefs and notes.
- **Roles**: Owner / Manager / Rep.
- **Salesforce + Outreach + Salesloft + Close integrations**.
- **Activity push**: every brief and outreach draft logged to CRM activity timeline.
- **Team analytics**: top reps, brief counts, reply rates, CRM push counts.
- **Email finder + verifier** (500 lookups/seat/mo).
- **Audit log**.
- **Custom AI prompt templates** per team.
- **Slack / MS Teams notifications**.

### 5.4 Enterprise — Custom (200+ seats)

Everything in Team, plus:

- **SSO via SAML + Okta + Azure AD**.
- **SCIM provisioning**.
- **Private data routing** (EU residency, US-only routing).
- **SOC 2 Type II report**.
- **DPA + custom MSA**.
- **Dedicated CSM**.
- **Volume discounts**.
- **On-prem LLM option** (Azure OpenAI, AWS Bedrock).

---

## 6. User Stories

### 6.1 SDR

1. As an SDR I land on a prospect company's homepage and instantly see a 5-second brief in the side drawer.
2. As an SDR I click "Generate Outreach" and get 3 personalized email openers tied to the company's recent funding.
3. As an SDR I click "Push to HubSpot" → contact + company + note + activity log all sync.
4. As an SDR I export 25 saved briefs to a CSV for my Friday review.

### 6.2 AE

1. As an AE I open my discovery call prospect's LinkedIn → see decision-makers, tech stack, recent news in one view.
2. As an AE I save a brief to "Q2 Pipeline" folder and tag it with deal stage.
3. As an AE I get a Slack ping when one of my saved companies announces funding.

### 6.3 Sales Manager

1. As a manager I publish a "SaaS Q2 ICP" playbook so all reps research consistently.
2. As a manager I view a leaderboard of brief counts and reply rates per rep.
3. As a manager I see which prospects are being researched but not pushed to CRM.

### 6.4 Super Admin (You)

1. As super admin I see MRR by plan, by country, by source.
2. As super admin I refund or extend a Pro user.
3. As super admin I publish a curated playbook to the Team marketplace.

---

## 7. User Flows

### 7.1 Flow: First-Time Install

1. User installs from Chrome Web Store.
2. Onboarding new tab opens: 60-sec demo video + "Try now on this URL" button.
3. Choose plan: Free / Pro 7-day trial / Connect Team via invite link.
4. If Pro trial chosen → no card required first 7 days; Stripe email reminder on day 5.
5. CRM connect step (skippable).
6. Pin to toolbar → first guided brief on any URL.

### 7.2 Flow: Generating a Prospect Brief

1. User visits acme.com.
2. Side drawer toggle appears (small floating button bottom-right).
3. Click → drawer opens.
4. Loading: "Fetching company info..." (parallel fetch: page text + tech stack + LinkedIn search + news).
5. ~5-10 sec later: brief renders with sections.
6. User clicks "Generate Outreach" → 3 templates appear.
7. User clicks "Push to HubSpot" → contact upserted, note attached, activity logged.
8. Brief saved to history with timestamp.

### 7.3 Flow: Team Playbook

1. Manager opens dashboard → Playbooks → New.
2. Defines: ICP description, required fields, brief sections, outreach tone.
3. Saves → published to team.
4. Reps see playbook selector in drawer; selected playbook drives prompts.

---

## 8. System Architecture

### 8.1 High-Level

```
+--------------------------------------------------------+
|              Browser Extension (MV3)                   |
|                                                        |
|  content_script — drawer mount, page text grabber      |
|  background — auth, CRM proxy, sync                    |
|  popup — quick stats + recent briefs                   |
|  options — settings, CRM connections                   |
|                                                        |
|  chrome.storage.local + .sync                          |
+-------------|--------------|---------------------------+
              |              |
              | HTTPS        | HTTPS
              v              v
+-----------------------+   +-----------------------+
|  Cloudflare Workers   |   |  Stripe Webhooks      |
|  api.browseysales.app |   +-----------------------+
|                       |
|  /v1/brief            |
|  /v1/enrich/*         |
|  /v1/crm/*            |
|  /v1/billing/*        |
|  /v1/admin/*          |
+--|---------|-----|----+
   |         |     |
   v         v     v
+-------+ +-----+ +-------------+
| Neon  | | KV  | | Anthropic / |
| PG    | |cache| | OpenAI APIs |
+-------+ +-----+ +-------------+
                          |
                          v
                  +-----------------------+
                  | External Data Sources |
                  | - BuiltWith API       |
                  | - Hunter.io API       |
                  | - NewsAPI / NewsData  |
                  | - LinkedIn (via search API / public search fallback) |
                  | - Crunchbase Open Data|
                  +-----------------------+

+----------------------+
| Website + Dashboard  |
| Next.js on CF Pages  |
+----------------------+
```

### 8.2 Notes

- **All AI calls go through backend** so prompts can be versioned, rate-limited, and improved without re-shipping extension.
- **CRM credentials encrypted at rest** in Postgres.
- **External enrichment APIs** abstracted behind unified `/v1/enrich` so providers can swap (Hunter ↔ Snov ↔ FindyMail).
- **Caching**: every URL's brief cached for 24h in KV → repeat visits hit cache (cheap).

---

## 9. Repository Structure

```
browsey-sales/
├── apps/
│   ├── extension/                  # Plasmo / WXT MV3 extension
│   │   ├── src/
│   │   │   ├── background/
│   │   │   ├── content/
│   │   │   │   ├── index.ts
│   │   │   │   ├── drawer.tsx
│   │   │   │   └── extractors/
│   │   │   │       ├── homepage.ts
│   │   │   │       ├── linkedin-company.ts
│   │   │   │       ├── linkedin-profile.ts
│   │   │   │       ├── crunchbase.ts
│   │   │   │       └── generic.ts
│   │   │   ├── popup/
│   │   │   ├── options/
│   │   │   ├── lib/
│   │   │   │   ├── api.ts
│   │   │   │   ├── storage.ts
│   │   │   │   ├── playbooks.ts
│   │   │   │   └── exporters.ts   # docx, xlsx, csv
│   │   │   └── types/
│   │   ├── manifest.json
│   │   └── package.json
│   │
│   ├── api/                         # Cloudflare Workers
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── brief.ts
│   │   │   │   ├── enrich.ts
│   │   │   │   ├── crm/
│   │   │   │   │   ├── hubspot.ts
│   │   │   │   │   ├── salesforce.ts
│   │   │   │   │   ├── pipedrive.ts
│   │   │   │   │   ├── outreach.ts
│   │   │   │   │   └── close.ts
│   │   │   │   ├── playbook.ts
│   │   │   │   ├── billing.ts
│   │   │   │   ├── auth.ts
│   │   │   │   └── admin.ts
│   │   │   ├── services/
│   │   │   │   ├── ai.ts            # LLM provider wrapper
│   │   │   │   ├── enrichers/
│   │   │   │   │   ├── builtwith.ts
│   │   │   │   │   ├── hunter.ts
│   │   │   │   │   ├── news.ts
│   │   │   │   │   ├── linkedinSerp.ts
│   │   │   │   │   └── crunchbase.ts
│   │   │   │   ├── crm/
│   │   │   │   ├── cache.ts
│   │   │   │   └── stripe.ts
│   │   │   └── db/
│   │   ├── wrangler.toml
│   │   └── package.json
│   │
│   └── web/                          # Next.js marketing + dashboard + admin
│       ├── app/
│       │   ├── (marketing)/
│       │   ├── (dashboard)/
│       │   └── (admin)/
│       └── package.json
│
├── packages/
│   ├── shared-types/
│   ├── prompts/                      # versioned AI prompt templates
│   └── ui/
│
├── infra/
└── pnpm-workspace.yaml
```

---

## 10. Extension — Detailed Behavior

### 10.1 Surfaces

| Surface | Purpose |
|---|---|
| Floating toggle button | Always-visible 32x32 button bottom-right of any tab; click → drawer |
| Side drawer | 420px right-side panel, sliding |
| Popup | Toolbar icon → today's stats + recent 10 briefs + jump-to-tab |
| Options page | Full settings, CRM connect, playbook selector, BYOK key |
| New tab (opt-in) | Daily dashboard with pipeline stats and saved briefs |

### 10.2 Page Type Detection

```text
On every URL navigation, content script runs detectPageType(url, dom):
- linkedin.com/company/*       → linkedin-company extractor
- linkedin.com/in/*            → linkedin-profile extractor
- crunchbase.com/organization/*→ crunchbase extractor
- *.angel.co / *angellist.com  → angellist extractor
- news article (Schema.org)    → news extractor
- default                      → homepage extractor (any company site)
```

### 10.3 Brief Structure

```json
{
  "company": {
    "name": "Acme Inc",
    "domain": "acme.com",
    "summary_short": "B2B SaaS for X",
    "summary_long": "...",
    "industry": "SaaS / DevTools",
    "size_band": "11-50",
    "founded": 2019,
    "hq": "San Francisco, CA",
    "logo_url": "..."
  },
  "tech_stack": ["Stripe","Intercom","HubSpot","Segment","Next.js"],
  "signals": [
    {"type":"funding","title":"$8M Series A","date":"2026-02-10","source_url":"..."},
    {"type":"hiring","title":"Hiring 6 engineers","source":"LinkedIn Jobs"},
    {"type":"product","title":"Launched v3.0","source":"blog.acme.com"}
  ],
  "people": [
    {"name":"...","title":"VP of Sales","linkedin_url":"...","seniority":"vp","department":"sales","email_guess":"..."}
  ],
  "pain_hypotheses": ["Outbound deliverability dropping in 2026","Manual rep enablement"],
  "outreach": {
    "email": ["Subject: ...\nHi {{first_name}}, ..."],
    "linkedin_dm": ["..."],
    "cold_call_opener": "..."
  },
  "playbook_id": "uuid-or-null",
  "generated_at": "ISO",
  "ai_cost_usd": 0.018
}
```

### 10.4 Drawer UI Sections

1. **Header** — company name, logo, domain, "Push to CRM" buttons.
2. **Summary** — 2-3 sentences.
3. **Signals** — funding / hiring / product launches (most recent 5).
4. **Tech Stack** — chips, copy-all button.
5. **Decision Makers** — top 5 cards with title + LinkedIn link + email-find button.
6. **Pain Hypotheses** — bullet list.
7. **Outreach** — 3 tabs (Email / LinkedIn DM / Cold Call); regenerate, copy, send-to-CRM.
8. **Notes** — free-text note field.
9. **Footer** — playbook selector, export menu, save button.

### 10.5 Permissions (Manifest V3)

```json
{
  "permissions": ["storage","activeTab","scripting","identity","contextMenus"],
  "host_permissions": [
    "https://*/*",
    "https://api.browseysales.app/*"
  ]
}
```

Justify `<all_urls>`: needed to mount drawer on any company site user visits. Disclose clearly.

### 10.6 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+B` | Toggle drawer |
| `Ctrl+Shift+G` | Generate brief (skip cache) |
| `Ctrl+Shift+S` | Save brief |
| `Ctrl+Shift+P` | Push to CRM |
| `Esc` | Close drawer |

---

## 11. Website + Marketing UI

### 11.1 Pages

| Route | Purpose | Hero CTA |
|---|---|---|
| `/` | Landing | "Add to Chrome — Free" |
| `/sdrs` | Persona landing for SDRs | "Cut research time 80%" |
| `/aes` | Persona landing for AEs | "Pre-call prospect brief in 8 sec" |
| `/managers` | Persona for sales managers | "Standardize how reps research" |
| `/integrations` | CRM logos grid | "See your CRM" |
| `/integrations/hubspot` | HubSpot deep dive | "Connect HubSpot" |
| `/integrations/salesforce` | Salesforce deep dive | "Connect Salesforce" |
| `/pricing` | Plan compare | "Start Pro free 7 days" |
| `/playbooks` | Public playbook gallery | "Use this playbook" |
| `/blog` | SEO content (outbound, AI sales) | "Subscribe" |
| `/customers` | Logos + case studies | "Read case study" |
| `/security` | SOC 2, GDPR, DPA | "Download DPA" |
| `/changelog` | Versions | n/a |
| `/legal/privacy` `/legal/terms` `/legal/dpa` | Legal | n/a |
| `/login` `/signup` | Auth | Magic link |
| `/share/[id]` | Public brief share | "Try Browsey free" |

### 11.2 Style Guide

- Bold typography, sales-energy palette: deep navy + electric orange accent.
- Hero must include a 30-sec video showing: rep lands on company site → drawer opens → brief generates → CRM push.
- Social proof: rep titles + company logos.
- ROI calculator: "Hours saved per rep per week" slider → dollar value.

---

## 12. Dashboard UI

| Route | Purpose |
|---|---|
| `/dashboard` | Today: briefs generated, hours saved, CRM pushes |
| `/dashboard/briefs` | All saved briefs, filters by tag/company/date |
| `/dashboard/playbooks` | CRUD playbooks (Team only) |
| `/dashboard/team` | Members, roles, invite |
| `/dashboard/integrations` | CRM + Slack + Calendar connect |
| `/dashboard/analytics` | Brief counts, CRM push rate, reply rate (if connected) |
| `/dashboard/billing` | Plan + invoices |
| `/dashboard/settings` | Profile + BYOK + notifications |

---

## 13. Admin Panel

Lives at `/admin/*`, JWT role `super_admin` required.

### 13.1 Sections

| Section | Contents |
|---|---|
| Home | MRR, ARR, active users 7d/30d, new signups today, churn 30d, top install source |
| Users | Search, filter (plan, country, source), per-row: view briefs, refund, grant Pro, suspend, delete |
| Teams | List, member counts, MRR per team, transfer ownership, audit |
| Revenue | MRR chart, failed payments queue, refunds, Stripe sync status |
| Briefs | Aggregate: briefs generated, cost-per-brief, p50/p95 latency, error rate |
| AI Costs | LLM spend by day, by user; alerts on top spenders |
| Enrichment Costs | API spend (BuiltWith, Hunter, News, search API) by day |
| Playbook Marketplace | Curate public playbooks, feature on landing |
| Integrations Health | CRM webhook delivery success per provider |
| Feature Flags | Remote config (e.g. enable new prompt, kill expensive enrichment) |
| Audit Log | All admin actions + user account changes |
| Announcements | In-extension banners (segmented by plan / country) |
| Support Inbox | Resend inbound parsing |
| Health | Worker uptime, DB pool, KV hit rate, queue depth |
| Settings | Pricing edits, legal doc versions, admin user CRUD |

### 13.2 Admin Roles

| Role | Can |
|---|---|
| super_admin | Everything |
| support_admin | Read users + refund up to $200 + reply support |
| analyst | Read-only revenue and analytics |

---

## 14. Database Schema

Postgres on Neon.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  display_name TEXT,
  country TEXT,
  install_source TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  role TEXT NOT NULL DEFAULT 'user',
  stripe_customer_id TEXT,
  byok_provider TEXT,
  byok_key_enc BYTEA,
  monthly_brief_quota INT,
  monthly_brief_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  stripe_subscription_id TEXT,
  seats_purchased INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'rep',  -- owner | manager | rep
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain CITEXT UNIQUE NOT NULL,
  name TEXT,
  industry TEXT,
  size_band TEXT,
  hq TEXT,
  founded INT,
  logo_url TEXT,
  linkedin_url TEXT,
  enriched_at TIMESTAMPTZ
);

CREATE TABLE briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  company_id UUID REFERENCES companies(id),
  url TEXT NOT NULL,
  data JSONB NOT NULL,          -- full brief object
  playbook_id UUID,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  ai_cost_usd NUMERIC(10,6),
  enrichment_cost_usd NUMERIC(10,6),
  pushed_to JSONB DEFAULT '[]', -- ["hubspot","salesforce"]
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX briefs_user_created ON briefs(user_id, created_at DESC);
CREATE INDEX briefs_team_created ON briefs(team_id, created_at DESC);

CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  full_name TEXT,
  title TEXT,
  seniority TEXT,
  department TEXT,
  linkedin_url TEXT,
  email_guess TEXT,
  email_verified BOOLEAN,
  enriched_at TIMESTAMPTZ
);

CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icp_description TEXT,
  required_fields TEXT[],
  outreach_tone TEXT,
  prompt_overrides JSONB,
  created_by UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crm_connections (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,        -- hubspot|salesforce|pipedrive|outreach|salesloft|close
  account_id TEXT,
  access_token_enc BYTEA NOT NULL,
  refresh_token_enc BYTEA NOT NULL,
  expires_at TIMESTAMPTZ,
  config JSONB,
  PRIMARY KEY (user_id, provider)
);

CREATE TABLE crm_pushes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  brief_id UUID REFERENCES briefs(id),
  provider TEXT,
  external_ids JSONB,
  status TEXT,
  error TEXT,
  pushed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  team_id UUID,
  stripe_sub_id TEXT UNIQUE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false
);

CREATE TABLE usage_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  team_id UUID,
  event TEXT,
  meta JSONB,
  at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  actor_role TEXT,
  action TEXT,
  target_type TEXT,
  target_id UUID,
  meta JSONB,
  at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 15. API Contracts

All under `/v1`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/auth/magic-link` | `{email}` → email sent |
| GET | `/v1/auth/verify?token=` | Returns JWT |
| POST | `/v1/brief` | `{url, playbook_id?}` → returns brief (cached or generated) |
| GET | `/v1/brief/:id` | Fetch saved brief |
| PATCH | `/v1/brief/:id` | Update notes/tags |
| DELETE | `/v1/brief/:id` | Delete |
| GET | `/v1/briefs?since=...` | Delta sync |
| POST | `/v1/enrich/email-finder` | `{first,last,domain}` → email candidates + verification |
| POST | `/v1/enrich/news` | `{domain}` → recent news items |
| POST | `/v1/enrich/builtwith` | `{domain}` → tech stack |
| POST | `/v1/crm/:provider/connect` | OAuth start |
| POST | `/v1/crm/:provider/push` | `{brief_id}` → upsert + return external ids |
| GET | `/v1/playbooks` | List user's playbooks |
| POST | `/v1/playbooks` | Create |
| PATCH | `/v1/playbooks/:id` | Update |
| POST | `/v1/billing/checkout` | `{plan}` → Stripe URL |
| POST | `/v1/billing/portal` | Stripe portal URL |
| POST | `/v1/billing/webhook` | Stripe events |
| GET | `/v1/team/me` | Team members + plan |
| POST | `/v1/team/invite` | `{email, role}` |
| GET | `/v1/admin/*` | Admin endpoints (role-gated) |

All return `{ok:true, data}` or `{ok:false, error:{code,message}}`.

---

## 16. AI Pipeline

### 16.1 Per-Brief Flow

```
1. Receive POST /v1/brief {url, playbook_id?}
2. Cache check: KV key `brief:<sha256(domain)>:<playbook_id>` — return if < 24h
3. Parallel fetch:
   a. Crawl URL → extract title, meta, visible text (max 8KB)
   b. Enrich /builtwith
   c. Enrich /news (last 90 days)
   d. Enrich /linkedinSerp (decision makers)
   e. Enrich /hunter (top 5 emails)
4. Compose system prompt with:
   - Playbook tone + ICP
   - Page text
   - Enrichment data
5. Single LLM call (Claude Sonnet) returns JSON-structured brief
6. Store in `briefs` + cache 24h
7. Return JSON
```

Cost target: **< $0.025 per brief** (LLM ~$0.015 + enrichment ~$0.01 + free tiers).

### 16.2 LLM Provider

- Primary: **Anthropic Claude Sonnet** (best instruction following + structured output).
- Fallback: **OpenAI GPT-4o-mini** for cost-sensitive.
- BYOK option: user's own key (Pro free credit forever).

### 16.3 Prompt Versioning

- Prompts live in `packages/prompts/` with semver.
- Backend selects prompt version from feature flag `brief_prompt_version`.
- Enables A/B testing without redeploy.

---

## 17. CRM Integrations

### 17.1 OAuth Setup Per Provider

| Provider | Auth | Required Scopes |
|---|---|---|
| HubSpot | OAuth2 | `crm.objects.contacts.read/write`, `crm.objects.companies.read/write`, `crm.objects.deals.read`, `oauth` |
| Salesforce | OAuth2 (PKCE) | `api refresh_token` |
| Pipedrive | OAuth2 | `contacts:full`, `notes:full`, `deals:read` |
| Close | API key | direct token |
| Outreach | OAuth2 | `prospects.all` `accounts.all` `sequences.read` |
| Salesloft | OAuth2 | `people:read/write`, `accounts:read/write` |

### 17.2 Push Behavior

On "Push to CRM":

1. Upsert company by domain.
2. Upsert top 3 contacts by email.
3. Create note on company with brief summary.
4. Log activity (call/email task) per outreach draft if accepted.
5. Add tag/label `browsey-sales`.
6. Return external IDs → store in `crm_pushes`.

### 17.3 Token Refresh

Background worker refreshes any token with `expires_at < now + 5min`. Encrypted at rest with AES-256-GCM.

---

## 18. Authentication and Security

- Magic-link email via Resend.
- JWT HS256, 7-day, refreshed silently.
- All CRM tokens encrypted at rest.
- AI prompts logged WITHOUT email bodies (only URL + token counts).
- TLS-only, HSTS, strict CSP in extension.
- GDPR: `DELETE /v1/me` purges all rows + Stripe customer.
- CCPA do-not-sell notice.
- Sub-processor list: Anthropic, OpenAI, Stripe, Resend, Cloudflare, Neon, BuiltWith, Hunter, search API.
- SOC 2 Type II path starts at $5K MRR via Vanta or Drata.
- Chrome Web Store single-purpose statement: "Generate sales prospect briefs from any company website and push to CRM."

---

## 19. Billing

### 19.1 Stripe Products

| Product | Price ID | Amount | Interval |
|---|---|---|---|
| Pro Monthly | `price_pro_m` | $29 | month |
| Pro Annual | `price_pro_y` | $249 | year |
| Team Seat Monthly | `price_team_seat_m` | $49 | month, per seat |
| Team Seat Annual | `price_team_seat_y` | $399 | year, per seat |
| Enterprise | custom | invoice-based | annual |

### 19.2 Webhooks

Subscribed:
- `checkout.session.completed`
- `customer.subscription.created/updated/deleted`
- `invoice.paid`
- `invoice.payment_failed`

### 19.3 Quotas

- Free: 10 briefs/month, no AI synthesis (basic only), 5 email lookups/mo.
- Pro: unlimited briefs (soft cap 1500/mo, overage 2¢/brief), 50 email lookups/mo.
- Team: 500 email lookups/seat/mo.

---

## 20. Pricing

| Plan | Monthly | Annual | Trial |
|---|---|---|---|
| Free | $0 | — | n/a |
| Pro | $29 | $249 (save 28%) | 7-day Pro on signup, no card |
| Team | $49/seat | $399/seat/yr | 14-day team trial, no card |
| Enterprise | custom | custom | sales call |

PPP regional pricing (India): Pro ₹999/mo, Team ₹1,799/seat/mo.

---

## 21. Analytics and KPIs

### 21.1 Events

`extension_installed`, `brief_generated`, `brief_cached_hit`, `outreach_generated`, `crm_pushed`, `email_lookup`, `playbook_used`, `team_invite_sent`, `upgrade_modal_shown`, `checkout_started`, `checkout_completed`, `crm_disconnected`.

### 21.2 North Star

**CRM pushes per active rep per week.** If > 15, retention and expansion follow.

### 21.3 Secondary KPIs

- Brief generation latency p50/p95.
- Cost per brief.
- D7 / D30 retention by cohort.
- Free → Pro conversion (target 6%+).
- Pro → Team expansion (target 25% within 90 days).
- Monthly churn (target < 5% for Team).

---

## 22. Go-To-Market

### 22.1 Pre-Launch (Weeks 1-4)

- Build landing with email waitlist (Resend).
- Pre-seed Twitter / LinkedIn with "AI for outbound" content.
- Recruit 10 design partners (free Pro for life in exchange for daily feedback).
- Publish 3 SEO blog posts: "Browsey vs legacy prospecting tools", "How to research prospects in 5 min", "AI personalization that actually works".

### 22.2 Soft Launch (Week 5)

- Chrome Web Store + Edge Add-ons submission.
- Email waitlist with download + 30% lifetime discount.
- Post in:
  - r/sales, r/SalesOperations, r/Entrepreneur
  - Sales Hacker Slack
  - RevGenius Slack
  - PavilionHQ community

### 22.3 Public Launch (Week 6)

- Product Hunt Tuesday launch.
- Coordinated LinkedIn posts from 10 founders.
- Outbound to sales managers via LinkedIn Sales Navigator (eat your own dog food — use Browsey to research them).
- Free 14-day Pro for PH visitors.

### 22.4 Ongoing Growth

- Customer-generated playbook marketplace (incentivize publishing via creator badge).
- YouTube series: "AI Sales Tooling Weekly".
- Sales Hacker / Pavilion / OutboundIQ sponsorships once MRR > $5K.
- Affiliate program: 30% recurring for 12 months.

---

## 23. Cost Model

### 23.1 Fixed Monthly

| Item | Cost |
|---|---|
| Domain | $0.83 |
| Cloudflare (Workers, Pages, KV, Email) | $0 |
| Neon | $0 (free tier) → $19 at scale |
| Resend | $0 first 3K |
| PostHog | $0 first 1M events |
| Sentry | $0 first 5K errors |
| Better Stack | $0 |
| **Total fixed** | **< $2/mo at MVP** |

### 23.2 Variable

| Item | Cost / unit |
|---|---|
| LLM per brief | $0.012-$0.020 |
| BuiltWith API (pay-per-call) | $0.005 |
| Hunter email finder | $0.04 / verified email |
| Search API for public profile lookups | $0.005 / query |
| NewsAPI / NewsData | $0.001 / call |

### 23.3 Unit Economics

| Plan | Price | Avg cost/user/mo | Margin |
|---|---|---|---|
| Free | $0 | $0.50 (subsidized via Anthropic free trial credit + BYOK) | -$0.50 (acceptable for funnel) |
| Pro $29 | $29 | $2.00 | 93% |
| Team $49/seat | $49 | $5.00 | 90% |

Stripe takes 2.9% + 30¢ per transaction.

---

## 24. Roadmap

### v1.0 — MVP (Weeks 1-6)

- Drawer on any URL.
- Brief generation with company + tech stack + people + outreach.
- HubSpot + Pipedrive push.
- Stripe billing, Free + Pro.
- Landing + dashboard.

### v1.1 (Month 2)

- Salesforce integration.
- Email finder + verifier.
- DOCX / Excel exporter.
- Saved briefs library.

### v1.2 (Month 3)

- Team plan + playbooks.
- Outreach + Salesloft.
- Slack notifications.
- Team analytics.

### v2.0 (Quarter 2)

- AI cadence builder (multi-touch sequences).
- "Buying signal" alerts (funding, hiring, exec change).
- Bulk research (paste CSV of domains).
- Public playbook marketplace.

### v3.0 (Quarter 3+)

- Outlook / Gmail in-mail compose suggestions.
- Mobile companion (your Flutter advantage).
- API for power users + Zapier / Make integrations.
- SAML SSO.
- SOC 2 Type II.

---

## 25. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| LinkedIn TOS hostile to scraping | Use public search APIs; never scrape LI directly; or use official LI Sales Insights API once at scale |
| legacy sales databases undercut on price | Speed of UX + AI synthesis + lower learning curve are moats |
| LLM cost spike at scale | Cache aggressively (24h per domain), use Claude Haiku for non-critical sections, BYOK for power users |
| CRM API changes | Versioned per-provider adapter; weekly e2e tests |
| Email finder providers (Hunter) raise prices | Multi-provider strategy (Hunter → Snov → FindyMail) |
| Chrome Web Store rejection over broad permissions | Optional host_permissions + clear single-purpose statement |
| Customer-reported false data | "Report this brief" button + manual review queue + AI feedback loop |
| Microsoft Copilot in Outlook commoditizes | Browsey lives outside Outlook; cross-CRM + cross-LLM |

---

## 26. Day-1 Build Checklist

- [ ] Buy domain `browseysales.app` (or rebrand name).
- [ ] Cloudflare add site + Email Routing.
- [ ] Neon project + schema.sql.
- [ ] Resend domain verify + API key.
- [ ] Stripe account + 4 products + webhook endpoint.
- [ ] Anthropic + OpenAI API keys with $50 prepaid each.
- [ ] BuiltWith API account ($295/mo or pay-per-call alternative).
- [ ] Hunter.io API key (free 50/mo to start).
- [ ] Optional public search API account.
- [ ] HubSpot Developer app registration → OAuth credentials.
- [ ] Pipedrive Developer app → OAuth credentials.
- [ ] PostHog + Sentry + Better Stack signups.
- [ ] Chrome Web Store dev fee ($5).
- [ ] Microsoft Edge Add-ons signup.
- [ ] GitHub private repo + Actions secrets.
- [ ] Cloudflare Workers `wrangler deploy`.
- [ ] Cloudflare Pages for landing + dashboard + admin.
- [ ] Privacy policy + ToS + DPA drafted (Termly + Claude-generated).
- [ ] Single-purpose statement + permission justifications written for Chrome listing.

Once checked → start with `apps/extension` scaffolding using Plasmo, then `apps/api` with Hono on Workers, then `apps/web` with Next.js.

---

## 27. Success Targets

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Installs | 3,000 | 12,000 | 40,000 |
| Active weekly users | 800 | 3,500 | 12,000 |
| Pro subs | 80 | 350 | 1,200 |
| Team accounts | 5 | 30 | 120 |
| Team seats (avg 6) | 30 | 180 | 720 |
| MRR | $3,800 | $20,000 | $70,000 |
| Monthly churn | < 8% | < 6% | < 4% |
| NPS | 35+ | 45+ | 55+ |

If hit Month 6: full-time founder income range, hire 1 designer + 1 part-time growth marketer.

---

End of document.

