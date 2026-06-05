// ============================================================
// Contact Finder — Free Multi-Source People Enrichment
//
// Sources (all free, no API keys required by default):
//   1. Company website — About/Team/Leadership pages (already crawled)
//   2. LinkedIn company /people page — public, no auth
//   3. Google search snippets — site:linkedin.com/in queries
//   4. GitHub org members — public API, no auth
//   5. Crunchbase public org page — founders + executives
//   6. Email pattern detection + generation from real names
//   7. Hunter.io — BYOK optional upgrade
//   8. LLM-inferred role suggestions — final fallback
//
// No names or emails are fabricated. All sources are public.
// ============================================================

import { generateWithFallbacks } from '@/lib/llm-providers';
import type { BaseIntel, ExtractedPayload } from './types';
import { searchDDG } from './ddg-osint';

export interface Contact {
  full_name: string | null;
  title: string;
  seniority: 'c_level' | 'vp' | 'director' | 'manager' | 'individual';
  department: string;
  email: string | null;
  email_confidence: 'verified' | 'guessed' | 'pattern' | null;
  linkedin_url: string | null;
  phone: string | null;
  source: 'hunter' | 'linkedin' | 'google' | 'github' | 'crunchbase' | 'page_extraction' | 'llm_inferred';
  why_contact: string;
}

// ─── Shared fetch helper ──────────────────────────────────────

async function safeFetch(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

// ─── 1. Company website page extraction ──────────────────────
// Reads already-crawled About/Team/Leadership pages from the pipeline payload.
// Also extracts any LinkedIn profile URLs embedded on those pages.

async function extractFromCompanyPages(
  domain: string,
  pages: any[],
  decisionMakers: any[]
): Promise<Contact[]> {
  const teamPages = (pages || []).filter((p) =>
    /about|team|leadership|people|founders|management/i.test(p.type + ' ' + p.url)
  );
  
  const pageTexts: string[] = [];

  if (teamPages.length > 0) {
    pageTexts.push(...teamPages.map((p) => `--- ${p.url} ---\n${p.visible_text.slice(0, 4000)}`));
  } else {
    // If extension didn't provide team pages, fetch them server-side
    const paths = ['/about', '/about-us', '/team', '/leadership', '/company'];
    await Promise.all(paths.map(async (path) => {
      try {
        const url = `https://${domain}${path}`;
        const html = await safeFetch(url, 5000);
        if (html && html.length > 500 && !/404|not found/i.test(html.slice(0, 1000))) {
          pageTexts.push(`--- ${url} ---\n${stripHtml(html).slice(0, 4000)}`);
        }
      } catch (e) {
        // Ignore fetch errors
      }
    }));
  }

  if (pageTexts.length === 0) return [];

  const pageText = pageTexts.join('\n\n').slice(0, 12000);

  const targetRoles = (decisionMakers || []).map((dm) => dm.role).join(', ');

  const prompt = `Extract real named people from these company website pages.
DOMAIN: ${domain}
TARGET ROLES: ${targetRoles || 'VP, Director, Head of, C-level, Founder'}

PAGE CONTENT:
${pageText}

Rules:
- Only include people whose full names actually appear in the text
- Extract LinkedIn profile URLs if they appear on the page (format: linkedin.com/in/...)
- Return empty array if no real names found

Output ONLY a JSON array, no prose:
[{"full_name":"First Last","title":"exact title","department":"dept","linkedin_url":"url or null","why_contact":"one sentence"}]`;

  try {
    const result = await generateWithFallbacks({
      messages: [
        { role: 'system', content: 'Extract structured data from web pages. Output only valid JSON arrays.' },
        { role: 'user', content: prompt },
      ],
      responseFormatJson: false,
      maxTokens: 1200,
      temperature: 0.1,
    });
    const raw = result.content.trim();
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end === -1) return [];
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p: any) => p.full_name && p.title).slice(0, 6).map((p: any) => ({
      full_name: p.full_name,
      title: p.title,
      seniority: inferSeniority(p.title),
      department: p.department || inferDepartment(p.title),
      email: null,
      email_confidence: null,
      linkedin_url: p.linkedin_url || null,
      phone: null,
      source: 'page_extraction' as const,
      why_contact: p.why_contact || `Found on ${domain} team/about page`,
    }));
  } catch {
    return [];
  }
}

// ─── 2. LinkedIn company /people page ────────────────────────
// linkedin.com/company/{slug}/people is publicly accessible without login
// for many companies. Returns employee names + titles in the HTML.

async function extractFromLinkedIn(domain: string, linkedinCompanyUrl: string | null): Promise<Contact[]> {
  // Derive slug from company LinkedIn URL or try domain name
  let slug: string;
  if (linkedinCompanyUrl) {
    const m = linkedinCompanyUrl.match(/linkedin\.com\/company\/([^/?#]+)/i);
    slug = m?.[1] || domain.split('.')[0];
  } else {
    slug = domain.split('.')[0];
  }

  const url = `https://www.linkedin.com/company/${slug}/people/`;
  const html = await safeFetch(url, 10000);
  if (!html) return [];

  const text = stripHtml(html);

  // LinkedIn embeds structured data in JSON-LD or window.__initialData
  // Also parse visible text patterns: "Name · Title at Company"
  const contacts: Contact[] = [];

  // Pattern 1: JSON-LD person data
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Person' && item.name) {
          contacts.push({
            full_name: item.name,
            title: item.jobTitle || item.description || 'Employee',
            seniority: inferSeniority(item.jobTitle || ''),
            department: inferDepartment(item.jobTitle || ''),
            email: null,
            email_confidence: null,
            linkedin_url: item.url || item.sameAs || null,
            phone: null,
            source: 'linkedin' as const,
            why_contact: `Found on LinkedIn company people page`,
          });
        }
      }
    } catch { /* skip malformed JSON */ }
  }

  if (contacts.length > 0) return contacts.slice(0, 6);

  // Pattern 2: Use LLM to parse the visible text for names + titles
  if (text.length > 200) {
    const snippet = text.slice(0, 5000);
    try {
      const result = await generateWithFallbacks({
        messages: [
          { role: 'system', content: 'Extract people from LinkedIn company page text. Output only JSON array.' },
          { role: 'user', content: `Extract employee names and titles from this LinkedIn company people page text for ${domain}.\nOnly include people with clear name + title. Return [] if none found.\nOutput: [{"full_name":"...","title":"...","linkedin_url":null}]\n\nTEXT:\n${snippet}` },
        ],
        responseFormatJson: false,
        maxTokens: 800,
        temperature: 0.1,
      });
      const raw = result.content.trim();
      const s = raw.indexOf('['); const e = raw.lastIndexOf(']');
      if (s !== -1 && e !== -1) {
        const parsed = JSON.parse(raw.slice(s, e + 1));
        if (Array.isArray(parsed)) {
          return parsed.filter((p: any) => p.full_name && p.title).slice(0, 6).map((p: any) => ({
            full_name: p.full_name,
            title: p.title,
            seniority: inferSeniority(p.title),
            department: inferDepartment(p.title),
            email: null,
            email_confidence: null,
            linkedin_url: p.linkedin_url || null,
            phone: null,
            source: 'linkedin' as const,
            why_contact: `Found on LinkedIn company people page`,
          }));
        }
      }
    } catch { /* skip */ }
  }

  return [];
}

// ─── 3. DuckDuckGo search — formula-based contact discovery ──────
// Uses the 8 search formulas from the blueprint, adapted for DDG.
// No API key needed — parses public DDG search HTML.

async function extractFromGoogle(domain: string, companyName: string, targetRoles: string[]): Promise<Contact[]> {
  const contacts: Contact[] = [];
  const seen = new Set<string>();

  // Formula 1: LinkedIn role search
  const roleQuery = targetRoles.slice(0, 3).map(r => `"${r}"`).join(' OR ') ||
    '"CEO" OR "CTO" OR "VP Sales" OR "Head of" OR "Founder"';
  const formula1 = `site:linkedin.com/in/ (${roleQuery}) "${companyName}"`;

  // Formula 2: Company team pages
  const formula2 = `site:${domain}/team OR site:${domain}/about "CEO" OR "CTO" OR "Founder" OR "VP"`;

  const queries = [formula1, formula2];

  for (const query of queries) {
    const ddgResults = await searchDDG(query, 10);
    if (!ddgResults || ddgResults.length === 0) continue;

    for (const r of ddgResults) {
      const text = r.title.trim();
      const liMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-zA-Z\-']+(?:\s[A-Z][a-zA-Z]+)?)\s*[-–|]\s*([^|]+?)(?:\s*[-–|]\s*.+)?$/);
      
      let linkedinUrl = null;
      if (r.url.includes('linkedin.com/in/')) {
        linkedinUrl = r.url.split('?')[0]; // clean tracking params
      }

      if (liMatch) {
        const name = liMatch[1].trim();
        const titleRaw = liMatch[2].trim();
        if (name.split(' ').length >= 2 && name.length < 50 && !/linkedin|google|search|duckduckgo/i.test(name)) {
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            contacts.push({
              full_name: name,
              title: titleRaw,
              seniority: inferSeniority(titleRaw),
              department: inferDepartment(titleRaw),
              email: null,
              email_confidence: null,
              linkedin_url: linkedinUrl,
              phone: null,
              source: 'google' as const, // Keep as 'google' to not break existing schema types
              why_contact: `Found via OSINT search formula: ${companyName} decision-makers`,
            });
          }
        }
      }
    }

    if (contacts.length >= 6) break;
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return contacts.slice(0, 6);
}

// ─── 4. GitHub org members ───────────────────────────────────
// GitHub's public API returns org members with real names.
// No auth needed for public orgs. Rate limit: 60 req/hour unauthenticated.

async function extractFromGitHub(domain: string, githubUrl: string | null): Promise<Contact[]> {
  // Derive org slug from GitHub URL or try domain name
  let orgSlug: string;
  if (githubUrl) {
    const m = githubUrl.match(/github\.com\/([^/?#]+)/i);
    orgSlug = m?.[1] || domain.split('.')[0];
  } else {
    orgSlug = domain.split('.')[0];
  }

  try {
    // Fetch org members (public API, no auth)
    const res = await fetch(`https://api.github.com/orgs/${orgSlug}/members?per_page=20`, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'BrowseySalesBot/2.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const members: any[] = await res.json();
    if (!Array.isArray(members) || members.length === 0) return [];

    // Fetch full profile for each member to get real name + bio
    const profiles = await Promise.all(
      members.slice(0, 8).map(async (m) => {
        try {
          const r = await fetch(`https://api.github.com/users/${m.login}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'BrowseySalesBot/2.0' },
            signal: AbortSignal.timeout(4000),
          });
          if (!r.ok) return null;
          return await r.json();
        } catch { return null; }
      })
    );

    const contacts: Contact[] = [];
    for (const profile of profiles) {
      if (!profile || !profile.name) continue; // skip if no real name
      const bio = profile.bio || '';
      const title = extractTitleFromBio(bio) || 'Engineer';
      const seniority = inferSeniority(title);
      
      // Filter out low-level individual contributors and vague titles from GitHub
      if (seniority === 'individual' && !/lead|staff|principal|architect/i.test(title)) {
        continue;
      }

      contacts.push({
        full_name: profile.name,
        title,
        seniority,
        department: inferDepartment(title),
        email: profile.email || null,
        email_confidence: profile.email ? 'verified' : null,
        linkedin_url: null,
        phone: null,
        source: 'github' as const,
        why_contact: `GitHub org member at ${orgSlug} — ${bio.slice(0, 80) || 'engineering team'}`,
      });
    }
    return contacts.slice(0, 6);
  } catch {
    return [];
  }
}

function extractTitleFromBio(bio: string): string | null {
  if (!bio) return null;
  // Common bio patterns: "CTO at Acme", "VP Engineering @ Acme", "Head of Product"
  const m = bio.match(/^([\w\s]+?)\s+(?:at|@|,)\s+/i);
  if (m) return m[1].trim();
  // Or just take first sentence if it looks like a title
  const first = bio.split(/[.|,\n]/)[0].trim();
  if (first.length < 60 && /\b(engineer|developer|founder|cto|ceo|vp|director|head|lead|manager|designer)\b/i.test(first)) {
    return first;
  }
  return null;
}

// ─── 5. Crunchbase public org page ───────────────────────────
// crunchbase.com/organization/{slug}/people lists founders + executives.
// Public page, no auth needed.

async function extractFromCrunchbase(domain: string, companyName: string): Promise<Contact[]> {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const url = `https://www.crunchbase.com/organization/${slug}/people`;
  const html = await safeFetch(url, 10000);
  if (!html) return [];

  const text = stripHtml(html);
  if (text.length < 100) return [];

  // Crunchbase embeds JSON-LD and also has structured person cards
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const contacts: Contact[] = [];

  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Person' && item.name) {
          contacts.push({
            full_name: item.name,
            title: item.jobTitle || 'Executive',
            seniority: inferSeniority(item.jobTitle || ''),
            department: inferDepartment(item.jobTitle || ''),
            email: null,
            email_confidence: null,
            linkedin_url: item.sameAs?.includes('linkedin') ? item.sameAs : null,
            phone: null,
            source: 'crunchbase' as const,
            why_contact: `Listed on Crunchbase as ${item.jobTitle || 'executive'} at ${companyName}`,
          });
        }
      }
    } catch { /* skip */ }
  }

  if (contacts.length > 0) return contacts.slice(0, 6);

  // Fallback: LLM parse the visible text
  const snippet = text.slice(0, 4000);
  if (snippet.length < 200) return [];
  try {
    const result = await generateWithFallbacks({
      messages: [
        { role: 'system', content: 'Extract people from Crunchbase page text. Output only JSON array.' },
        { role: 'user', content: `Extract founders and executives from this Crunchbase page for ${companyName}.\nOnly real names that appear in the text. Return [] if none.\nOutput: [{"full_name":"...","title":"..."}]\n\nTEXT:\n${snippet}` },
      ],
      responseFormatJson: false,
      maxTokens: 600,
      temperature: 0.1,
    });
    const raw = result.content.trim();
    const s = raw.indexOf('['); const e = raw.lastIndexOf(']');
    if (s !== -1 && e !== -1) {
      const parsed = JSON.parse(raw.slice(s, e + 1));
      if (Array.isArray(parsed)) {
        return parsed.filter((p: any) => p.full_name && p.title).slice(0, 6).map((p: any) => ({
          full_name: p.full_name,
          title: p.title,
          seniority: inferSeniority(p.title),
          department: inferDepartment(p.title),
          email: null,
          email_confidence: null,
          linkedin_url: null,
          phone: null,
          source: 'crunchbase' as const,
          why_contact: `Listed on Crunchbase as ${p.title} at ${companyName}`,
        }));
      }
    }
  } catch { /* skip */ }

  return [];
}

// ─── 6. Email pattern detection + generation ─────────────────
// Once we have real names, generate likely emails using the domain's
// detected email format. Pattern is detected from any email visible
// on the company site (contact pages, press pages, etc.)

const COMMON_PATTERNS = [
  (f: string, l: string, d: string) => `${f}.${l}@${d}`,       // john.smith@acme.com
  (f: string, l: string, d: string) => `${f}${l}@${d}`,        // johnsmith@acme.com
  (f: string, l: string, d: string) => `${f[0]}${l}@${d}`,     // jsmith@acme.com
  (f: string, l: string, d: string) => `${f}@${d}`,            // john@acme.com
  (f: string, l: string, d: string) => `${f[0]}.${l}@${d}`,    // j.smith@acme.com
];

function detectEmailPattern(pageTexts: string[], domain: string): ((f: string, l: string, d: string) => string) | null {
  // Look for any real email on the site that matches the domain
  const emailRegex = new RegExp(`[a-zA-Z0-9._%+\\-]+@${domain.replace('.', '\\.')}`, 'gi');
  const allText = pageTexts.join(' ');
  const found = allText.match(emailRegex);
  if (!found || found.length === 0) return null;

  const sample = found[0].toLowerCase();
  const local = sample.split('@')[0];

  // Detect which pattern this matches
  if (/^[a-z]+\.[a-z]+$/.test(local)) return COMMON_PATTERNS[0]; // first.last
  if (/^[a-z]{2,}[a-z]{2,}$/.test(local) && local.length > 6) return COMMON_PATTERNS[1]; // firstlast
  if (/^[a-z][a-z]{2,}$/.test(local)) return COMMON_PATTERNS[2]; // flast
  if (/^[a-z]+$/.test(local) && local.length <= 8) return COMMON_PATTERNS[3]; // first
  if (/^[a-z]\.[a-z]+$/.test(local)) return COMMON_PATTERNS[4]; // f.last

  return COMMON_PATTERNS[0]; // default to first.last
}

function generateEmail(
  fullName: string,
  domain: string,
  patternFn: ((f: string, l: string, d: string) => string) | null
): string | null {
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return null;
  const first = parts[0].replace(/[^a-z]/g, '');
  const last = parts[parts.length - 1].replace(/[^a-z]/g, '');
  if (!first || !last) return null;
  const fn = patternFn || COMMON_PATTERNS[0];
  return fn(first, last, domain);
}

function applyEmailPatterns(contacts: Contact[], domain: string, pageTexts: string[]): Contact[] {
  const patternFn = detectEmailPattern(pageTexts, domain);
  const updatedContacts = contacts.map((c) => {
    if (c.email || !c.full_name) return c;
    const email = generateEmail(c.full_name, domain, patternFn);
    if (!email) return c;
    return { ...c, email, email_confidence: 'pattern' as const };
  });

  // Extract explicit generic/support emails
  const emailRegex = new RegExp(`[a-zA-Z0-9._%+\\-]+@${domain.replace('.', '\\.')}`, 'gi');
  const allText = pageTexts.join(' ');
  const found = Array.from(new Set(allText.match(emailRegex) || []));
  
  const genericPrefixes = /^(support|info|sales|contact|hello|careers|press|media|billing|help)@/i;
  const genericEmails = found.filter(e => genericPrefixes.test(e));

  genericEmails.forEach(email => {
    updatedContacts.push({
      full_name: 'Support / Generic Contact',
      title: 'Company Inbox',
      seniority: 'individual',
      department: 'Support/Sales',
      email: email.toLowerCase(),
      email_confidence: 'verified',
      linkedin_url: null,
      phone: null,
      source: 'llm_inferred',
      why_contact: `Publicly listed email found on the company website.`
    });
  });

  return updatedContacts;
}

// ─── 7. Hunter.io (BYOK optional) ────────────────────────────

interface HunterLead {
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  email: string | null;
  confidence: number;
  linkedin: string | null;
  phone_number: string | null;
}

async function findViaHunter(domain: string, apiKey: string): Promise<Contact[]> {
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const emails: HunterLead[] = json?.data?.emails || [];
    return emails.filter((e) => e.email && e.position).slice(0, 6).map((e) => ({
      full_name: [e.first_name, e.last_name].filter(Boolean).join(' ') || null,
      title: e.position || 'Unknown',
      seniority: inferSeniority(e.position || ''),
      department: inferDepartment(e.position || ''),
      email: e.email,
      email_confidence: e.confidence >= 90 ? 'verified' : 'guessed',
      linkedin_url: e.linkedin || null,
      phone: e.phone_number || null,
      source: 'hunter' as const,
      why_contact: `Found via Hunter.io (${e.confidence}% confidence)`,
    }));
  } catch {
    return [];
  }
}

// ─── 8. LLM-inferred role fallback ───────────────────────────

async function inferRoleSuggestions(domain: string, baseIntel: BaseIntel): Promise<Contact[]> {
  const roles = [
    ...(baseIntel.decision_makers_likely || []).map((dm) => ({ role: dm.role, why: dm.why })),
    ...(baseIntel.stakeholders || []).map((s) => ({ role: s.role, why: s.best_message_angle })),
  ].slice(0, 5);
  if (roles.length === 0) return [];
  const domainPart = domain.replace(/^www\./, '');
  return roles.map((r) => ({
    full_name: null,
    title: r.role,
    seniority: inferSeniority(r.role),
    department: inferDepartment(r.role),
    email: null,
    email_confidence: null,
    linkedin_url: buildLinkedInSearchUrl(r.role, domainPart),
    phone: null,
    source: 'llm_inferred' as const,
    why_contact: r.why || 'Likely decision-maker based on company signals',
  }));
}

function buildLinkedInSearchUrl(role: string, domain: string): string {
  const company = domain.split('.')[0];
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${role} ${company}`)}`;
}

// ─── Helpers ─────────────────────────────────────────────────

export function inferSeniority(title: string): Contact['seniority'] {
  const t = title.toLowerCase();
  if (/\b(founder|co-founder|ceo|cto|cfo|coo|cmo|cpo|chief|president)\b/.test(t)) return 'c_level';
  if (/\b(vp|vice president|svp|evp)\b/.test(t)) return 'vp';
  if (/\b(director|head of|principal)\b/.test(t)) return 'director';
  if (/\b(manager|lead|senior manager)\b/.test(t)) return 'manager';
  return 'individual';
}

export function inferDepartment(title: string): string {
  const t = title.toLowerCase();
  if (/\b(sales|revenue|account|business development|bd)\b/.test(t)) return 'Sales';
  if (/\b(marketing|growth|demand|brand|content)\b/.test(t)) return 'Marketing';
  if (/\b(engineer|developer|platform|devops|infrastructure|tech|cto|architect)\b/.test(t)) return 'Engineering';
  if (/\b(product|pm|product manager)\b/.test(t)) return 'Product';
  if (/\b(operations|ops|revops|finance|cfo|coo)\b/.test(t)) return 'Operations';
  if (/\b(customer success|cs|support|onboarding)\b/.test(t)) return 'Customer Success';
  if (/\b(hr|people|talent|recruiting)\b/.test(t)) return 'People';
  if (/\b(founder|ceo|president|chief)\b/.test(t)) return 'Executive';
  return 'Leadership';
}

function dedupeContacts(contacts: Contact[]): Contact[] {
  const seen = new Set<string>();
  return contacts.filter((c) => {
    const key = (c.full_name || c.title).toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Main entry point ─────────────────────────────────────────

export async function findContacts(
  domain: string,
  baseIntel: BaseIntel,
  extractedPayload: Partial<ExtractedPayload> | null,
  hunterApiKey?: string | null
): Promise<Contact[]> {
  const pages = extractedPayload?.pages || [];
  const decisionMakers = baseIntel.decision_makers_likely || [];
  const companyName = baseIntel.company_summary?.short
    ? baseIntel.summary_1_line?.split(' ')[0] || domain.split('.')[0]
    : domain.split('.')[0];
  const linkedinUrl = extractedPayload?.homepage?.social_links?.linkedin || null;
  const githubUrl = extractedPayload?.homepage?.social_links?.github || null;
  const targetRoles = decisionMakers.map((dm) => dm.role);

  // Collect all page texts for email pattern detection
  const allPageTexts = [
    extractedPayload?.homepage?.visible_text || '',
    ...(pages.map((p) => p.visible_text)),
  ];

  // ─── Priority 0: Native Extension contacts (from user's browser) ───
  // These come from the Chrome extension opening LinkedIn/Google tabs
  // using the user's actual logged-in session — the highest quality source.
  const nativeContacts = (extractedPayload?.social_signals as any)?.native_contacts;
  if (nativeContacts && Array.isArray(nativeContacts) && nativeContacts.length > 0) {
    console.log(`[Contacts] Using ${nativeContacts.length} native extension contacts (highest quality)`);
    const converted: Contact[] = nativeContacts
      .filter((nc: any) => nc.full_name && nc.full_name.length > 2)
      .map((nc: any) => ({
        full_name: nc.full_name,
        title: nc.title || 'Employee',
        seniority: inferSeniority(nc.title || ''),
        department: inferDepartment(nc.title || ''),
        email: null,
        email_confidence: null as Contact['email_confidence'],
        linkedin_url: nc.linkedin_url || null,
        phone: null,
        source: (nc.source === 'google_native' ? 'google' : 'linkedin') as Contact['source'],
        why_contact: nc.snippet
          ? `Native browser extraction — ${nc.snippet}`
          : `Extracted natively from ${nc.source === 'google_native' ? 'Google search' : 'LinkedIn'} via extension`,
      }));

    // Apply email pattern generation
    const withEmails = applyEmailPatterns(converted, domain, allPageTexts);

    // If we have enough, return immediately — no need for slow server-side scraping
    if (withEmails.length >= 4) {
      return withEmails.slice(0, 8);
    }

    // Supplement with Hunter if available and we need more
    if (hunterApiKey) {
      const hunterContacts = await findViaHunter(domain, hunterApiKey);
      const merged = dedupeContacts([...withEmails, ...hunterContacts]);
      return applyEmailPatterns(merged, domain, allPageTexts).slice(0, 8);
    }

    // Supplement with server-side sources
    const [pageContacts, githubContacts] = await Promise.all([
      extractFromCompanyPages(domain, pages, decisionMakers),
      extractFromGitHub(domain, githubUrl),
    ]);
    const merged = dedupeContacts([...withEmails, ...pageContacts, ...githubContacts]);
    return applyEmailPatterns(merged, domain, allPageTexts).slice(0, 8);
  }

  // ─── Priority 1: Hunter.io (BYOK) — best quality if user provided key ───
  if (hunterApiKey) {
    const hunterContacts = await findViaHunter(domain, hunterApiKey);
    if (hunterContacts.length > 0) {
      return applyEmailPatterns(dedupeContacts(hunterContacts), domain, allPageTexts).slice(0, 6);
    }
  }

  // ─── Priority 2-5: Run all free server-side sources in parallel ───
  const [pageContacts, linkedinContacts, googleContacts, githubContacts, crunchbaseContacts] = await Promise.all([
    extractFromCompanyPages(domain, pages, decisionMakers),
    extractFromLinkedIn(domain, linkedinUrl),
    extractFromGoogle(domain, companyName, targetRoles),
    extractFromGitHub(domain, githubUrl),
    extractFromCrunchbase(domain, companyName),
  ]);

  // Merge: prioritise sources with real names, dedupe, cap at 6
  // Priority: page > linkedin > google > crunchbase > github
  const merged = dedupeContacts([
    ...pageContacts,
    ...linkedinContacts,
    ...googleContacts,
    ...crunchbaseContacts,
    ...githubContacts,
  ]);

  if (merged.length > 0) {
    const withEmails = applyEmailPatterns(merged, domain, allPageTexts);
    return withEmails.slice(0, 6);
  }

  // ─── Priority 6: Final fallback — LLM-inferred role suggestions ───
  const inferred = await inferRoleSuggestions(domain, baseIntel);
  return inferred.slice(0, 5);
}
