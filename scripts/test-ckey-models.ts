// ============================================================
// Test script — Verify all 4 Ckey.vn models are working
// Run: npx tsx scripts/test-ckey-models.ts
// ============================================================

const CKEY_API_URL = "https://ckey.vn/v1/chat/completions";
const CKEY_API_KEY = "sk-903a01895f8c5999c4ba9f082b540e9ad667520094658a3dbb830cf8cf47542c";

interface TestResult {
  model: string;
  role: string;
  status: "✅ PASS" | "❌ FAIL";
  responseTime: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: string;
  preview: string;
  error?: string;
}

const MODELS = [
  { model: "claude-haiku-4.5",   role: "reasoning",   inputRate: 0.0214,  outputRate: 0.107,   prompt: "Analyze this company: Stripe (stripe.com). Return JSON: {\"industry\": \"...\", \"growth_stage\": \"...\", \"pain_points\": [\"...\"]}" },
  { model: "gpt-5.4-mini",      role: "formatting",   inputRate: 0.0142,  outputRate: 0.0857,  prompt: "Format this as JSON: Company Notion, SaaS, Series C. Output: {\"name\": \"...\", \"type\": \"...\", \"funding\": \"...\"}" },
  { model: "deepseek-3.2",      role: "fast",         inputRate: 0.004,   outputRate: 0.006,   prompt: "List 3 tech stack items commonly used by fintech startups. Return JSON array: [\"tech1\", \"tech2\", \"tech3\"]" },
  { model: "qwen3-coder-next",  role: "default",      inputRate: 0.00214, outputRate: 0.0114,  prompt: "What growth signals indicate a SaaS company is ready to buy enterprise tools? Return JSON: {\"signals\": [\"signal1\", \"signal2\", \"signal3\"]}" },
];

async function testModel(config: typeof MODELS[0]): Promise<TestResult> {
  const start = Date.now();
  try {
    const res = await fetch(CKEY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CKEY_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: "You are a B2B sales intelligence AI. Always respond with valid JSON only. No markdown." },
          { role: "user", content: config.prompt },
        ],
        max_tokens: 500,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60000),
    });

    const elapsed = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      return {
        model: config.model,
        role: config.role,
        status: "❌ FAIL",
        responseTime: elapsed,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: "$0",
        preview: "",
        error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const inputTokens = data.usage?.prompt_tokens || data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || data.usage?.output_tokens || 0;

    const cost = (inputTokens / 1_000_000) * config.inputRate + (outputTokens / 1_000_000) * config.outputRate;

    return {
      model: config.model,
      role: config.role,
      status: "✅ PASS",
      responseTime: elapsed,
      inputTokens,
      outputTokens,
      estimatedCost: `$${cost.toFixed(6)}`,
      preview: content.slice(0, 150).replace(/\n/g, " "),
    };
  } catch (err: any) {
    return {
      model: config.model,
      role: config.role,
      status: "❌ FAIL",
      responseTime: Date.now() - start,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: "$0",
      preview: "",
      error: err.message,
    };
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║          Ckey.vn API — Testing All 4 Models                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const results: TestResult[] = [];

  for (const config of MODELS) {
    console.log(`⏳ Testing ${config.model} (${config.role})...`);
    const result = await testModel(config);
    results.push(result);

    if (result.status === "✅ PASS") {
      console.log(`   ${result.status} | ${result.responseTime}ms | ${result.inputTokens}+${result.outputTokens} tokens | ${result.estimatedCost}`);
      console.log(`   Response: ${result.preview}`);
    } else {
      console.log(`   ${result.status} | ${result.responseTime}ms | Error: ${result.error}`);
    }
    console.log();
  }

  // Summary
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`\n  Model                  │ Role        │ Status  │ Time     │ Cost`);
  console.log(`  ───────────────────────┼─────────────┼─────────┼──────────┼──────────`);
  for (const r of results) {
    const model = r.model.padEnd(23);
    const role = r.role.padEnd(11);
    const status = r.status;
    const time = `${r.responseTime}ms`.padEnd(8);
    console.log(`  ${model} │ ${role} │ ${status} │ ${time} │ ${r.estimatedCost}`);
  }

  const passed = results.filter(r => r.status === "✅ PASS").length;
  const totalCost = results.reduce((sum, r) => sum + parseFloat(r.estimatedCost.replace("$", "") || "0"), 0);
  console.log(`\n  Results: ${passed}/${results.length} passed | Total test cost: $${totalCost.toFixed(6)}`);

  if (passed === results.length) {
    console.log("\n  🎉 All models working! Browsey is ready to use Ckey.vn API.");
  } else {
    console.log("\n  ⚠️  Some models failed. Check the errors above.");
  }
}

main().catch(console.error);
