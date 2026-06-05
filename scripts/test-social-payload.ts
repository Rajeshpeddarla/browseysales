
async function testPipeline() {
  console.log("🚀 Starting Pipeline Test with Mocked Extension Payload...\n");

  const testPayload = {
    domain: "commandcode.ai", // Target company
    force_refresh: true,
    extracted_payload: {
      social_signals: {
        linkedin_scraped_posts: [
          "Just launched our new enterprise pricing tier! So excited to see the adoption from large teams. #B2B #SaaS",
          "We are aggressively hiring Platform Engineers! If you love Kubernetes and scaling infrastructure, DM me."
        ],
        native_contacts: [
          {
            full_name: "Jane Doe",
            title: "VP of Engineering",
            linkedin_url: "https://linkedin.com/in/janedoe",
            source: "linkedin_native",
            snippet: "Passionate about scaling teams and AI infrastructure. Currently leading engineering at CommandCode."
          }
        ],
        glassdoor_signals: {
          rating: "4.8",
          pros: ["Great culture", "Working on cutting edge AI"],
          cons: ["Fast paced", "Sometimes requires long hours during product launches"],
          culture_snippet: "The team is very engineering-driven but sales is starting to scale up quickly."
        },
        github: {
          org_name: "CommandCode",
          public_repos: 45,
          followers: 1200,
          recent_repos: [
            { name: "commandcode-cli", stars: 450, language: "TypeScript" },
            { name: "core-ai-engine", stars: 120, language: "Python" }
          ]
        }
      }
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api/pipeline/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Assuming we need a session or it bypasses auth in dev. If it requires auth, we might get 401.
        // Let's see how the API handles it.
      },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      console.error("❌ API Error:", response.status, await response.text());
      return;
    }

    const data = await response.json();
    console.log("✅ Pipeline completed successfully!");
    console.log("Brief ID:", data.data.brief_id);
    console.log("Is Degraded:", data.data.is_degraded);
    console.log("\nCheck your dashboard to see the newly generated brief!");

  } catch (err) {
    console.error("Failed to run pipeline:", err);
  }
}

testPipeline();
