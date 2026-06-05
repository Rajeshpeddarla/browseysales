// Test all 4 Ckey.vn models
// Run: node scripts/test-ckey-models.mjs

const CKEY_API_URL = "https://ckey.vn/v1/chat/completions";
const CKEY_API_KEY = "sk-903a01895f8c5999c4ba9f082b540e9ad667520094658a3dbb830cf8cf47542c";

const MODELS = [
  { model: "claude-haiku-4.5",  role: "reasoning",  inputRate: 0.0214,  outputRate: 0.107,   prompt: "Analyze Stripe (stripe.com). Return JSON with keys: industry, stage, signal" },
  { model: "gpt-5.4-mini",     role: "formatting",  inputRate: 0.0142,  outputRate: 0.0857,  prompt: "Format as JSON: Company Notion, SaaS, Series C. Keys: name, type, funding" },
  { model: "deepseek-3.2",     role: "fast",        inputRate: 0.004,   outputRate: 0.006,   prompt: "List 3 fintech tech stack items as JSON array" },
  { model: "qwen3-coder-next", role: "default",     inputRate: 0.00214, outputRate: 0.0114,  prompt: "What 3 growth signals show SaaS buying intent? Return JSON with key: signals" },
];

async function testModel(cfg) {
  const start = Date.now();
  try {
    const res = await fetch(CKEY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CKEY_API_KEY}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: "system", content: "You are a B2B sales AI. Respond with valid JSON only. No markdown." },
          { role: "user", content: cfg.prompt },
        ],
        max_tokens: 300,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(60000),
    });

    const elapsed = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      console.log(`  ${cfg.model} | ❌ FAIL | HTTP ${res.status}: ${errText.slice(0, 200)}`);
      return false;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const inp = data.usage?.prompt_tokens || data.usage?.input_tokens || 0;
    const out = data.usage?.completion_tokens || data.usage?.output_tokens || 0;
    const cost = (inp / 1_000_000) * cfg.inputRate + (out / 1_000_000) * cfg.outputRate;

    console.log(`  ${cfg.model} | ✅ PASS | ${elapsed}ms | ${inp}+${out} tokens | $${cost.toFixed(6)}`);
    console.log(`    Response: ${content.slice(0, 180).replace(/\n/g, " ")}`);
    return true;
  } catch (e) {
    console.log(`  ${cfg.model} | ❌ FAIL | ${e.message}`);
    return false;
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║          Ckey.vn API — Testing All 4 Models                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  let passed = 0;
  for (const m of MODELS) {
    const ok = await testModel(m);
    if (ok) passed++;
    console.log();
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Results: ${passed}/${MODELS.length} passed`);
  if (passed === MODELS.length) {
    console.log("  🎉 All models working! Browsey is ready to use Ckey.vn API.");
  } else {
    console.log("  ⚠️  Some models failed. Check errors above.");
  }
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(console.error);
