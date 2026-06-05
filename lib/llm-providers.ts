import dns from "node:dns";

// Fix Windows Node.js IPv6-first DNS resolution causing external API failures.
dns.setDefaultResultOrder("ipv4first");

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  responseFormatJson?: boolean;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  agentRole?: 'reasoning' | 'fast' | 'formatting'; // Smart routing selector
  onLog?: (msg: string) => void;
  timeoutMs?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  provider: "ckey";
}

// ─── Ckey.vn Configuration ───────────────────────────────────────
// Vietnamese AI API proxy — OpenAI-compatible endpoint
// Supports GPT, Claude, DeepSeek, Qwen models at discounted prices

const CKEY_API_URL = process.env.CKEY_API_URL || "https://ckey.vn/v1/chat/completions";
const CKEY_API_KEY = process.env.CKEY_API_KEY || "";

// ─── Smart Model Routing ─────────────────────────────────────────
//
// Model assignment by task type (optimized for cost vs quality):
//
//  Role         │ Model              │ Why                                    │ Cost/1M (in→out)
//  ─────────────┼────────────────────┼────────────────────────────────────────┼──────────────────
//  reasoning    │ claude-haiku-4.5   │ Best structured JSON, low retry rate   │ $0.021 → $0.107
//  fast         │ deepseek-3.2       │ Ultra-cheap for simple extractions     │ $0.004 → $0.006
//  formatting   │ gpt-5.4-mini       │ Great at following output formats      │ $0.014 → $0.086
//  default      │ qwen3-coder-next   │ Cheapest quality model for bulk calls  │ $0.002 → $0.011
//

const MODEL_ROUTING: Record<string, string> = {
  reasoning:  "deepseek-3.2",         // Agents: planner, critic, reflection, multi-pass extraction
  fast:       "deepseek-3.2",         // Quick tasks: tech stack, news enrichment, simple parsing
  formatting: "deepseek-3.2",         // Output formatting: personalization, sales brief, contacts
};
const DEFAULT_MODEL = "deepseek-3.2"; // General/unspecified tasks

function selectModel(agentRole?: string): string {
  if (agentRole && agentRole in MODEL_ROUTING) {
    return MODEL_ROUTING[agentRole];
  }
  return DEFAULT_MODEL;
}

// ─── Ckey.vn API Call ────────────────────────────────────────────

async function callCkey(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  if (!CKEY_API_KEY) {
    throw new Error("CKEY_API_KEY not set in environment variables. Add it to .env.local");
  }

  const model = selectModel(options.agentRole);
  console.log(`[LLM] Calling Ckey.vn ${model} (role: ${options.agentRole || 'default'})...`);
  options.onLog?.(`AI: calling Ckey.vn ${model}`);

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.2,
  };

  if (options.topP !== undefined) {
    body.top_p = options.topP;
  }

  if (options.responseFormatJson) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(CKEY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CKEY_API_KEY}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs ?? 120000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Ckey.vn HTTP ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  const usedModel = data.model || model;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error(`Ckey.vn ${model} returned empty completion`);
  }

  // Log usage for cost tracking
  const usage = data.usage;
  if (usage) {
    const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
    const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
    console.log(`[LLM] Ckey.vn ${usedModel} succeeded (${content.length} chars, ${inputTokens}+${outputTokens} tokens)`);
  } else {
    console.log(`[LLM] Ckey.vn ${usedModel} succeeded (${content.length} chars)`);
  }

  options.onLog?.(`AI: Ckey.vn ${usedModel} succeeded`);
  return { content, model: usedModel, provider: "ckey" };
}

// ─── Main entry ─────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateWithFallbacks(
  options: ChatCompletionOptions,
  maxRetries = 3
): Promise<ChatCompletionResult> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await callCkey(options);
    } catch (err: any) {
      attempt++;
      const msg = err?.message || 'unknown error';
      console.warn(`[LLM] Ckey.vn attempt ${attempt} failed: ${msg}`);
      
      // If it's a 4xx error that IS NOT a 429 rate limit, don't retry (e.g. 401 Auth, 400 Bad Request)
      if (msg.includes('HTTP 4') && !msg.includes('HTTP 429')) {
        throw new Error(`Ckey.vn API call failed (unrecoverable): ${msg}. Check CKEY_API_KEY in .env.local`);
      }
      
      if (attempt >= maxRetries) {
        options.onLog?.(`AI: Ckey.vn failed after ${maxRetries} attempts`);
        throw new Error(`Ckey.vn API call failed after ${maxRetries} attempts: ${msg}.`);
      }
      
      // Exponential backoff: 3s, 9s, 27s
      const delay = Math.pow(3, attempt) * 1000;
      console.log(`[LLM] Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw new Error('Unexpected error in generateWithFallbacks');
}
