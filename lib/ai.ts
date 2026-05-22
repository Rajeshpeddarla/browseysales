import { generateWithFallbacks, type ChatMessage } from "@/lib/llm-providers";
import type { BriefData, Signal, Person } from "@/lib/types";

export type Message = ChatMessage;

export async function generateChatCompletion(messages: Message[], debugLog?: string[]) {
  let retries = 3;
  const log = (message: string) => debugLog?.push(message);

  while (retries > 0) {
    try {
      const result = await generateWithFallbacks({
        messages,
        maxTokens: 4096,
        temperature: 0.2,
        topP: 0.7,
        timeoutMs: 30000,
        onLog: log,
      });

      return result.content;
    } catch (error: any) {
      const isNetworkError =
        error.name === "TimeoutError" ||
        error.cause?.code === "ENOTFOUND" ||
        error.cause?.code === "ECONNREFUSED" ||
        error.cause?.code === "ETIMEDOUT" ||
        error.cause?.code === "ECONNRESET" ||
        error.message?.includes("getaddrinfo") ||
        error.message?.includes("fetch failed");

      console.error("AI provider error:", error.cause?.code || error.message);

      if (isNetworkError && retries > 1) {
        log(`AI: network timeout/unreachable, retrying in 3s (${retries - 1} left)`);
        console.log(`AI provider unreachable. Retrying in 3s... (${retries - 1} left)`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        retries--;
        continue;
      }

      // Non-network error or out of retries
      throw new Error(
        `AI generation error: ${error.message || "Generation failed"}`
      );
    }
  }
  throw new Error("Failed to generate AI response after retries");
}

// ============================================================
// SALES BRIEF AI PIPELINE
// ============================================================

const SALES_BRIEF_SYSTEM_PROMPT = `You are Browsey Sales AI — an expert, senior B2B enterprise sales research analyst.
Given a company URL and page content, produce a deeply researched, hyper-specific sales prospect brief.

You MUST respond with valid JSON only. No markdown, no code fences, no extra text.

Response JSON schema:
{
  "company": {
    "name": "string",
    "domain": "string",
    "summary_short": "1 sentence",
    "summary_long": "2-3 paragraphs",
    "industry": "string",
    "size_band": "1-10 | 11-50 | 51-200 | 201-500 | 501-1000 | 1000+",
    "founded": number_or_null,
    "hq": "City, State/Country",
    "logo_url": ""
  },
  "tech_stack": ["React", "AWS", "Kafka"],
  "signals": [
    {"type": "funding", "title": "string", "date": "YYYY-MM-DD", "source": "string"}
  ],
  "people": [
    {"full_name": "string", "title": "string", "seniority": "c_level|vp|director|manager|individual", "department": "string", "linkedin_url": "", "email_guess": ""}
  ],
  "pain_hypotheses": ["pain1", "pain2", "pain3"],
  "outreach": {
    "email": ["Subject: ...\\nHi {{first_name}}, ..."],
    "linkedin_dm": ["message1"],
    "cold_call_opener": "opener text"
  }
}

CRITICAL RULES:
1. TECH STACK: List only specific real technologies (e.g. "React", "PostgreSQL", "Kubernetes"). Never generic terms like "Cloud Computing".
2. SIGNALS: "type" MUST be exactly one of: "funding", "hiring", "product", "partnership", "award".
3. SIZE BAND: Use the LOWEST plausible band. Never invent a range — pick from the schema values only.
4. OUTREACH: Personalize based on the page content. Reference specific things you found.
5. PEOPLE: Infer likely decision makers from the company's industry and scale if not found on the page.
6. PAIN POINTS: Be specific and enterprise-grade. Avoid generic statements.`;

const VALID_SIZE_BANDS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

function normalizeSizeBand(raw: unknown): string {
  if (typeof raw !== "string") return "11-50";
  const s = raw.trim();
  if (VALID_SIZE_BANDS.includes(s)) return s;
  const nums = s.match(/\d+/g);
  if (!nums) return "11-50";
  const lower = parseInt(nums[0], 10);
  if (lower <= 10) return "1-10";
  if (lower <= 50) return "11-50";
  if (lower <= 200) return "51-200";
  if (lower <= 500) return "201-500";
  if (lower <= 1000) return "501-1000";
  return "1000+";
}

export async function generateSalesBrief(
  url: string,
  pageContent: string,
  playbookContext?: string,
  debugLog?: string[]
): Promise<BriefData> {
  const systemPrompt = playbookContext
    ? `${SALES_BRIEF_SYSTEM_PROMPT}\n\nPLAYBOOK CONTEXT:\n${playbookContext}`
    : SALES_BRIEF_SYSTEM_PROMPT;

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Analyze this company and generate a full sales prospect brief.\n\nURL: ${url}\n\nPAGE CONTENT:\n${pageContent.slice(0, 8000)}`,
    },
  ];

  const raw = await generateChatCompletion(messages, debugLog);

  // Extract JSON from potential markdown wrapping or conversational padding
  let jsonStr = raw.trim();
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.company) {
      parsed.company.size_band = normalizeSizeBand(parsed.company.size_band);
    }
    return {
      ...parsed,
      playbook_id: null,
      generated_at: new Date().toISOString(),
      ai_cost_usd: 0.018,
    };
  } catch {
    return createFallbackBrief(url, raw);
  }
}

export async function enrichTechStack(
  domain: string,
  pageContent: string
): Promise<string[]> {
  const messages: Message[] = [
    {
      role: "system",
      content: `You are a tech stack detection expert. Analyze the given website content and identify all technologies, frameworks, tools, and services being used. Return ONLY a JSON array of technology names. Example: ["React", "Next.js", "Stripe", "AWS"]. No other text.`,
    },
    {
      role: "user",
      content: `Domain: ${domain}\n\nPage content:\n${pageContent.slice(0, 4000)}`,
    },
  ];

  const raw = await generateChatCompletion(messages);
  try {
    let jsonStr = raw.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}

export async function enrichNews(
  domain: string,
  companyName: string
): Promise<Signal[]> {
  const messages: Message[] = [
    {
      role: "system",
      content: `You are a business news analyst. Generate recent plausible news signals for the given company. Return ONLY a JSON array. Each item: {"type": "funding|hiring|product|partnership|award", "title": "headline", "date": "YYYY-MM-DD", "source": "source name"}. Generate 3-5 signals. No other text.`,
    },
    {
      role: "user",
      content: `Company: ${companyName}\nDomain: ${domain}`,
    },
  ];

  const raw = await generateChatCompletion(messages);
  try {
    let jsonStr = raw.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}

export async function enrichPeople(
  domain: string,
  companyName: string,
  industry: string
): Promise<Omit<Person, "id" | "company_id">[]> {
  const messages: Message[] = [
    {
      role: "system",
      content: `You are a B2B contact research expert. Generate plausible decision makers for the given company. Return ONLY a JSON array. Each item: {"full_name": "Name", "title": "Job Title", "seniority": "c_level|vp|director|manager|individual", "department": "sales|marketing|engineering|operations|finance|hr", "linkedin_url": "", "email_guess": "first@domain.com", "email_verified": false}. Generate 5 contacts. No other text.`,
    },
    {
      role: "user",
      content: `Company: ${companyName}\nDomain: ${domain}\nIndustry: ${industry}`,
    },
  ];

  const raw = await generateChatCompletion(messages);
  try {
    let jsonStr = raw.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}

function createFallbackBrief(url: string, rawText: string): BriefData {
  let domain = url;
  try { domain = new URL(url).hostname.replace("www.", ""); } catch {}
  const name = domain.split(".")[0];
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

  return {
    company: {
      name: capitalizedName,
      domain,
      summary_short: `${capitalizedName} is a company operating at ${domain}.`,
      summary_long: rawText.slice(0, 500),
      industry: "Technology",
      size_band: "11-50",
      founded: null,
      hq: "United States",
      logo_url: `https://logo.clearbit.com/${domain}`,
    },
    tech_stack: [],
    signals: [],
    people: [],
    pain_hypotheses: [
      "Manual processes reducing team productivity",
      "Difficulty scaling operations efficiently",
      "Need for better data-driven decision making",
    ],
    outreach: {
      email: [
        `Subject: Quick question about ${capitalizedName}\n\nHi {{first_name}},\n\nI noticed ${capitalizedName} is growing — I'd love to share how we help similar companies. Worth a 15-min chat?\n\nBest`,
      ],
      linkedin_dm: [
        `Hi {{first_name}}, I came across ${capitalizedName} and was impressed by what you're building. Would love to connect.`,
      ],
      cold_call_opener: `Hi {{first_name}}, this is [Your Name] from [Company]. I work with companies like ${capitalizedName} to help them scale. Do you have 30 seconds?`,
    },
    playbook_id: null,
    generated_at: new Date().toISOString(),
    ai_cost_usd: 0.018,
  };
}
