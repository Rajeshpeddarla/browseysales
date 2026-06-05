import { pipeline, env } from '@xenova/transformers';

// Optimization for Next.js server environments
env.allowLocalModels = false;

const MODEL_ID = 'Xenova/bge-small-en-v1.5';

async function main() {
  console.log(`Testing local Node.js embeddings (Transformers.js) with model: ${MODEL_ID}...`);
  
  const texts = [
    "Stripe provides APIs for online payment processing.",
    "GitHub is a code hosting platform for version control and collaboration."
  ];

  console.log('\nInput texts:');
  console.log(texts);

  console.log('\nLoading model (this takes a few seconds on first run to download the 133MB weights)...');
  const startLoad = Date.now();
  const embedder = await pipeline('feature-extraction', MODEL_ID);
  console.log(`Model loaded in ${Date.now() - startLoad}ms.`);

  const startEmbed = Date.now();
  const promises = texts.map(async (text) => {
    const output = await embedder(text, {
      pooling: 'mean',
      normalize: true,
    });
    return Array.from(output.data);
  });

  const embeddings = await Promise.all(promises);
  const elapsed = Date.now() - startEmbed;

  console.log(`\n✅ Generated ${embeddings.length} embeddings in ${elapsed}ms.`);
  console.log(`Dimensions: ${embeddings[0]?.length} (should be 384)`);
  
  console.log(`\nSample of first vector:`);
  console.log(embeddings[0]?.slice(0, 5).map((n: number) => n.toFixed(4)) + ' ...');
}

main().catch(console.error);
