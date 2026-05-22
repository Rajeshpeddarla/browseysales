import dns from "node:dns";

// Fix Windows Node.js IPv6-first DNS resolution causing external API failures.
dns.setDefaultResultOrder("ipv4first");

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  responseFormatJson?: boolean;
  timeoutMs?: number;
  onLog?: (message: string) => void;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  provider: "nvidia" | "openrouter";
}

const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER;

const NVIDIA_MODEL =
  process.env.NVIDIA_MODEL || "qwen/qwen3-coder-480b-a35b-instruct";

const DEFAULT_OPENROUTER_MODELS = [
  "openai/gpt-oss-120b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
];

const OPENROUTER_MODELS = (
  process.env.OPENROUTER_MODELS ||
  process.env.OPENROUTER_MODEL ||
  DEFAULT_OPENROUTER_MODELS.join(",")
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

function buildBody(model: string, options: ChatCompletionOptions, includeJsonFormat: boolean) {
  return {
    model,
    messages: options.messages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.2,
    top_p: options.topP ?? 0.7,
    stream: false,
    ...(includeJsonFormat ? { response_format: { type: "json_object" } } : {}),
  };
}

async function parseCompletionResponse(response: Response, provider: string): Promise<string> {
  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    throw new Error(`${provider} HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error(`${provider} returned an empty completion`);
  }

  return content;
}

async function callNvidia(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY is not set");
  }

  options.onLog?.(`AI: trying NVIDIA NIM model ${NVIDIA_MODEL}`);

  const response = await fetch(NVIDIA_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(buildBody(NVIDIA_MODEL, options, Boolean(options.responseFormatJson))),
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs ?? 60000),
  });

  const result: ChatCompletionResult = {
    content: await parseCompletionResponse(response, "NVIDIA NIM"),
    model: NVIDIA_MODEL,
    provider: "nvidia",
  };

  options.onLog?.(`AI: NVIDIA NIM succeeded with ${NVIDIA_MODEL}`);
  return result;
}

async function callOpenRouterModel(
  model: string,
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const baseHeaders = {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
    "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "Browsey",
  };

  const includeJsonFormat = Boolean(options.responseFormatJson);

  try {
    options.onLog?.(`AI: trying OpenRouter model ${model}`);

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(buildBody(model, options, includeJsonFormat)),
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? 60000),
    });

    const result: ChatCompletionResult = {
      content: await parseCompletionResponse(response, `OpenRouter ${model}`),
      model,
      provider: "openrouter",
    };

    options.onLog?.(`AI: OpenRouter succeeded with ${model}`);
    return result;
  } catch (error: any) {
    const message = String(error?.message || "");
    const maybeUnsupportedJson =
      includeJsonFormat &&
      (message.includes("response_format") ||
        message.includes("json_object") ||
        message.includes("structured"));

    if (!maybeUnsupportedJson) {
      throw error;
    }

    options.onLog?.(`AI: ${model} rejected JSON response_format; retrying without it`);

    const retryResponse = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(buildBody(model, options, false)),
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? 60000),
    });

    const result: ChatCompletionResult = {
      content: await parseCompletionResponse(retryResponse, `OpenRouter ${model}`),
      model,
      provider: "openrouter",
    };

    options.onLog?.(`AI: OpenRouter succeeded with ${model} after JSON-format retry`);
    return result;
  }
}

export async function generateWithFallbacks(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const errors: string[] = [];

  if (NVIDIA_API_KEY) {
    try {
      return await callNvidia(options);
    } catch (error: any) {
      errors.push(`NVIDIA NIM: ${error?.message || "failed"}`);
      options.onLog?.(`AI: NVIDIA NIM failed: ${error?.message || "failed"}`);
    }
  }

  if (OPENROUTER_API_KEY) {
    for (const model of OPENROUTER_MODELS) {
      try {
        return await callOpenRouterModel(model, options);
      } catch (error: any) {
        errors.push(`OpenRouter ${model}: ${error?.message || "failed"}`);
        options.onLog?.(`AI: OpenRouter ${model} failed: ${error?.message || "failed"}`);
      }
    }
  }

  if (!NVIDIA_API_KEY && !OPENROUTER_API_KEY) {
    throw new Error("Set NVIDIA_API_KEY, OPENROUTER_API_KEY, or OPENROUTER to generate AI responses");
  }

  throw new Error(`All AI providers failed. ${errors.join(" | ")}`);
}
