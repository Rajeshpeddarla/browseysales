import { pipeline, env } from '@xenova/transformers';

// Optimization for Next.js server environments:
// Don't use the cache directory in production if it's read-only, but local dev is fine.
// Allow local models if available, otherwise fetch from HuggingFace.
env.allowLocalModels = false;

// We use Xenova/bge-small-en-v1.5 which is 133MB and highly optimized for Node.js
// Note: This model produces 384-dimensional embeddings (not 1024 like bge-m3).
const MODEL_ID = 'Xenova/bge-small-en-v1.5';

// Singleton instance to prevent reloading the 133MB model on every API request
class EmbedderPipeline {
  static instance: any = null;

  static async getInstance(progressCallback: any = null) {
    if (this.instance === null) {
      console.log(`[AI Service] Loading model ${MODEL_ID} into memory...`);
      this.instance = await pipeline('feature-extraction', MODEL_ID, {
        progress_callback: progressCallback,
      });
      console.log(`[AI Service] Model ${MODEL_ID} loaded successfully.`);
    }
    return this.instance;
  }
}

/**
 * Generate semantic embeddings directly in Node.js using Transformers.js
 * Returns an array of 384-dimension vector arrays.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  
  try {
    const embedder = await EmbedderPipeline.getInstance();
    
    // We run them concurrently to maximize CPU usage
    const promises = texts.map(async (text) => {
      // pooling: 'mean' and normalize: true are standard for bge models
      const output = await embedder(text, {
        pooling: 'mean',
        normalize: true,
      });
      // The output is a Float32Array, convert to standard Array for JSON/DB
      return Array.from(output.data) as number[];
    });

    return await Promise.all(promises);
  } catch (err) {
    console.error('[AI Service] Failed to generate embeddings via Transformers.js:', err);
    // Return mock embeddings if it fails (384-d) to prevent pipeline crash
    return texts.map(() => Array.from({ length: 384 }, () => 0));
  }
}

/**
 * Mock rerank implementation since we removed the Python reranker.
 * In a pure Node.js environment, true cross-encoder reranking is very heavy.
 * For now, we simply return a default score of 1.0, effectively preserving 
 * the original vector search order.
 */
export async function rerankPairs(pairs: [string, string][]): Promise<number[]> {
  if (pairs.length === 0) return [];
  return pairs.map(() => 1.0);
}
