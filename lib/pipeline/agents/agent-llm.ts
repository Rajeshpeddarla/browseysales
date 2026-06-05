// ============================================================
// Agent LLM Helper — Structured output via Ckey.vn providers
// Replaces @ai-sdk/openai's generateObject() for all agents.
// Uses the existing generateWithFallbacks() with smart model routing.
// ============================================================

import { generateWithFallbacks } from '@/lib/llm-providers';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';

interface GenerateStructuredOptions<Schema extends z.ZodTypeAny> {
  schema: Schema;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  agentRole?: 'reasoning' | 'fast' | 'formatting';
}

/**
 * Extract JSON from a potentially wrapped LLM response
 */
function extractJSON(raw: string): string {
  let str = raw.trim();

  // Remove markdown fences
  if (str.startsWith('```')) {
    str = str.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // Find first { and last }
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    str = str.substring(firstBrace, lastBrace + 1);
  }

  return str;
}

/**
 * Convert a Zod schema to a human-readable schema description for the LLM prompt.
 * This gives the LLM enough information to produce conformant JSON.
 */
function zodSchemaToPromptDescription<Schema extends z.ZodTypeAny>(schema: Schema): string {
  try {
    // Zod v4 and v3 both support _def
    const def = (schema as any)._def;
    const typeName = def?.typeName || def?.type;
    if (def?.shape || typeName === 'ZodObject' || typeName === 'object') {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
      return JSON.stringify(describeShape(shape), null, 2);
    }
  } catch {
    // Fallback: just tell the LLM to output valid JSON
  }
  return '(valid JSON matching the described structure)';
}

function describeShape(shape: Record<string, any>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(shape)) {
    result[key] = describeZodType(value);
  }
  return result;
}

function describeZodType(schema: any): unknown {
  const def = schema?._def;
  if (!def) return 'unknown';

  // Zod v4 uses _def.type as string; Zod v3 uses _def.typeName
  const typeName = def.typeName || def.type;

  switch (typeName) {
    case 'ZodString':
    case 'string':
      return 'string';
    case 'ZodNumber':
    case 'number': {
      // Include range hints for the LLM
      const checks = def.checks || [];
      let hint = 'number';
      for (const check of checks) {
        const zodDef = check?._zod?.def;
        if (zodDef) {
          if (zodDef.check === 'greater_than' || zodDef.check === 'min') hint += ` (min: ${zodDef.value})`;
          if (zodDef.check === 'less_than' || zodDef.check === 'max') hint += ` (max: ${zodDef.value})`;
        }
        if (check.kind === 'min') hint += ` (min: ${check.value})`;
        if (check.kind === 'max') hint += ` (max: ${check.value})`;
      }
      return hint;
    }
    case 'ZodBoolean':
    case 'boolean':
      return 'boolean';
    case 'ZodArray':
    case 'array': {
      // Zod v4: _def.element; Zod v3: _def.type
      const inner = describeZodType(def.element || def.type);
      return [inner];
    }
    case 'ZodObject':
    case 'object': {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
      return describeShape(shape);
    }
    case 'ZodEnum':
    case 'enum': {
      // Zod v4: _def.entries = { a: 'a', b: 'b' }; Zod v3: _def.values = ['a', 'b']
      const enumSource = def.entries || def.values;
      const valuesArr = Array.isArray(enumSource) ? enumSource : Object.values(enumSource || {});
      return valuesArr.join(' | ') || 'enum';
    }
    case 'ZodOptional':
    case 'optional':
      return `${describeZodType(def.innerType)} (optional)`;
    case 'ZodDefault':
    case 'default':
      return describeZodType(def.innerType);
    default:
      // For descriptions, try .description
      if (schema.description) return schema.description;
      return 'any';
  }
}

/**
 * Generate structured output from the LLM using the Ckey.vn provider
 * with smart model routing. Validates the response against
 * the provided Zod schema.
 *
 * This replaces `generateObject({ model: openai('gpt-4o'), schema, prompt })`
 * from the Vercel AI SDK.
 */
export async function generateStructuredOutput<Schema extends z.ZodTypeAny>(
  options: GenerateStructuredOptions<Schema>
): Promise<{ object: z.infer<Schema> }> {
  const { schema, prompt, systemPrompt, maxTokens = 2000, temperature = 0.2, agentRole } = options;

  const schemaDescription = zodSchemaToPromptDescription(schema);

  const fullPrompt = `${prompt}

OUTPUT FORMAT: Respond with ONLY a raw JSON object matching this schema (no markdown fences, no commentary):
${schemaDescription}`;

  const schemaObj: any = zodToJsonSchema(schema as any);
  delete schemaObj.$schema;

  const callFn = () =>
    generateWithFallbacks({
      messages: [
        ...(systemPrompt
          ? [{ role: 'system' as const, content: systemPrompt }]
          : []),
        { role: 'user' as const, content: fullPrompt },
      ],
      responseFormatJson: true,
      maxTokens,
      temperature,
      agentRole,
      timeoutMs: 300000, // 5 minutes to prevent timeout on slow hardware
    });

  // Attempt 1
  let raw = await callFn();
  let parsed = tryParseAndValidate(raw.content, schema);
  if (parsed.success) return { object: parsed.data };

  // Attempt 2 — retry with error feedback
  console.warn('[agent-llm] First parse failed, retrying with error feedback...');
  const callFnRetry = () =>
    generateWithFallbacks({
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: fullPrompt },
        { role: 'assistant' as const, content: raw.content },
        { role: 'user' as const, content: `Your previous response failed validation with this error:\n${(parsed as any).error}\n\nPlease fix the JSON and try again. Respond ONLY with valid JSON matching the schema perfectly.` },
      ],
      responseFormatJson: true,
      maxTokens,
      temperature,
      agentRole,
      timeoutMs: 300000,
    });

  raw = await callFnRetry();
  parsed = tryParseAndValidate(raw.content, schema);
  if (parsed.success) return { object: parsed.data };

  throw new Error('[agent-llm] Failed to parse structured output after 2 attempts. Last error: ' + (parsed as any).error);
}

/**
 * Coerce common LLM output mistakes to match the Zod schema.
 * Small local models (8B) systematically make these errors:
 *   - Scores on 0-100 scale instead of 0-1
 *   - Non-string values where string is expected (objects, arrays, numbers)
 *   - null values where arrays are expected
 *
 * Compatible with Zod v4 internals:
 *   - _def.type is a string like "string", "number", "object" (not "ZodString")
 *   - Array element schema is _def.element (not _def.type)
 *   - Enum values is an object { a: 'a', b: 'b' } (not an array)
 *   - Checks use _zod.def.check ("greater_than"/"less_than") not kind ("min"/"max")
 */
function coerceLlmOutput(data: any, schema: any): any {
  const def = schema?._def;
  if (!def) return data;

  // Zod v4 uses _def.type as a string; Zod v3 uses _def.typeName
  const typeName = def.typeName || def.type;

  // Handle null/undefined per type — small LLMs (8B) frequently return null
  // for fields they consider optional. We coerce to sensible defaults.
  const isNullish = data === null || data === undefined;

  switch (typeName) {
    case 'ZodObject':
    case 'object': {
      if (isNullish) return {};
      if (typeof data !== 'object' || Array.isArray(data)) return data;
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
      if (!shape) return data;
      const result: Record<string, unknown> = { ...data };
      for (const [key, fieldSchema] of Object.entries(shape)) {
        if (key in result) {
          result[key] = coerceLlmOutput(result[key], fieldSchema);
        }
      }
      return result;
    }

    case 'ZodArray':
    case 'array': {
      if (isNullish) return [];
      if (!Array.isArray(data)) return [data]; // wrap single item
      // Zod v4: _def.element; Zod v3: _def.type
      const innerSchema = def.element || def.type;
      return data.map((item: any) => coerceLlmOutput(item, innerSchema));
    }

    case 'ZodString':
    case 'string': {
      // LLM sometimes returns null/objects/arrays/numbers where strings are expected
      if (isNullish) return '';
      if (typeof data === 'string') return data;
      if (typeof data === 'number' || typeof data === 'boolean') return String(data);
      if (typeof data === 'object') return JSON.stringify(data);
      return String(data);
    }

    case 'ZodNumber':
    case 'number': {
      if (isNullish) return 0;
      // Coerce string numbers
      if (typeof data === 'string') {
        const num = Number(data);
        if (!isNaN(num)) return normalizeScore(num, def);
        return data;
      }
      if (typeof data === 'number') return normalizeScore(data, def);
      return data;
    }

    case 'ZodBoolean':
    case 'boolean': {
      if (isNullish) return false;
      if (typeof data === 'string') {
        const lower = data.toLowerCase().trim();
        if (lower === 'true' || lower === '1' || lower === 'yes') return true;
        if (lower === 'false' || lower === '0' || lower === 'no') return false;
      }
      return Boolean(data);
    }

    case 'ZodEnum':
    case 'enum': {
      // Zod v4: _def.entries = { a: 'a', b: 'b' }; Zod v3: _def.values = ['a', 'b']
      const enumSource = def.entries || def.values;
      const valuesArr: string[] = Array.isArray(enumSource)
        ? enumSource
        : Object.values(enumSource || {});
      // For null/undefined, fall back to the first enum value
      if (isNullish) {
        return valuesArr.length > 0 ? valuesArr[0] : data;
      }
      // Case-insensitive match for enums
      if (typeof data === 'string') {
        const lower = data.toLowerCase().trim();
        const match = valuesArr.find((v: any) => String(v).toLowerCase() === lower);
        if (match) return match;
        // Fuzzy: check if the string contains any enum value (e.g. "Positive sentiment" → "positive")
        const partial = valuesArr.find((v: any) => lower.includes(String(v).toLowerCase()));
        if (partial) return partial;
        // No match — return first value as fallback so Zod doesn't reject
        return valuesArr.length > 0 ? valuesArr[0] : data;
      }
      return valuesArr.length > 0 ? valuesArr[0] : data;
    }

    case 'ZodOptional':
    case 'optional':
      // For optional fields, null/undefined is genuinely fine
      if (isNullish) return data;
      return coerceLlmOutput(data, def.innerType);

    case 'ZodDefault':
    case 'default':
      return coerceLlmOutput(data, def.innerType);

    default:
      return data;
  }
}

/**
 * If a schema has min(0).max(1) but the LLM returned a value > 1,
 * it's almost certainly on a 0-100 scale. Normalize it.
 * Supports both Zod v3 (check.kind/check.value) and Zod v4 (check._zod.def).
 */
function normalizeScore(value: number, def: any): number {
  const checks = def.checks || [];
  let hasMax1 = false;
  let hasMin0 = false;
  for (const check of checks) {
    // Zod v3 format
    if (check.kind === 'max' && check.value === 1) hasMax1 = true;
    if (check.kind === 'min' && check.value === 0) hasMin0 = true;
    // Zod v4 format: checks are objects with _zod.def
    const zodDef = check?._zod?.def;
    if (zodDef) {
      if ((zodDef.check === 'less_than' || zodDef.check === 'max') && zodDef.value === 1) hasMax1 = true;
      if ((zodDef.check === 'greater_than' || zodDef.check === 'min') && zodDef.value === 0) hasMin0 = true;
    }
  }
  if (hasMax1 && hasMin0 && value > 1) {
    // LLM used 0-100 scale, normalize
    return Math.min(1, value / 100);
  }
  return value;
}

function tryParseAndValidate<Schema extends z.ZodTypeAny>(
  rawContent: string,
  schema: Schema
): { success: true; data: z.infer<Schema> } | { success: false; error: string } {
  try {
    const jsonStr = extractJSON(rawContent);
    const data = JSON.parse(jsonStr);

    // First try raw parse
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }

    // Try with coercion — fix common LLM mistakes
    console.warn('[agent-llm] Raw validation failed, attempting coercion...');
    const coerced = coerceLlmOutput(data, schema);
    const coercedResult = schema.safeParse(coerced);
    if (coercedResult.success) {
      console.log('[agent-llm] Coercion succeeded!');
      return { success: true, data: coercedResult.data };
    }

    const errStr = (coercedResult as any).error?.message || 'unknown';
    console.warn('[agent-llm] Zod validation failed after coercion:', errStr);
    return { success: false, error: errStr };
  } catch (e) {
    const errStr = (e as Error).message;
    console.warn('[agent-llm] JSON parse failed:', errStr);
    return { success: false, error: errStr };
  }
}
