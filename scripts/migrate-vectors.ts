import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('===============================================================');
  console.log('⚠️ DATABASE MIGRATION REQUIRED: 1024-d -> 384-d');
  console.log('===============================================================');
  console.log('Because we moved from BAAI/bge-m3 (Python) to Xenova/bge-small-en-v1.5 (Node.js),');
  console.log('you must run the following SQL commands in your Supabase SQL Editor:');
  console.log('\n');
  
  const queries = [
    `ALTER TABLE research_memories ALTER COLUMN embedding TYPE VECTOR(384) USING NULL::vector(384);`,
    `ALTER TABLE action_memories ALTER COLUMN embedding TYPE VECTOR(384) USING NULL::vector(384);`,
    `ALTER TABLE website_patterns ALTER COLUMN embedding TYPE VECTOR(384) USING NULL::vector(384);`,
    `ALTER TABLE social_posts ALTER COLUMN embedding TYPE VECTOR(384) USING NULL::vector(384);`,
    `ALTER TABLE github_activity ALTER COLUMN embedding TYPE VECTOR(384) USING NULL::vector(384);`,
    `ALTER TABLE hiring_signals ALTER COLUMN embedding TYPE VECTOR(384) USING NULL::vector(384);`
  ];

  for (const q of queries) {
    console.log(q);
  }
  
  console.log('\n');
  console.log('NOTE: Running this will clear existing vector embeddings since they were 1024-d.');
  console.log('Please copy the above SQL queries and run them in your Supabase SQL Editor.');
}

run();
