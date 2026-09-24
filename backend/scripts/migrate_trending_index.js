import 'dotenv/config';
import { createClient } from "@libsql/client";

async function migrate() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing in environment");
    process.exit(1);
  }

  console.log("Connecting to Turso database for creating 'idx_prompt_likes_created_at' index...");
  const client = createClient({ url, authToken });

  try {
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_prompt_likes_created_at ON prompt_likes(created_at);
    `);
    console.log("✅ Successfully created 'idx_prompt_likes_created_at' index on prompt_likes.");
  } catch (e) {
    console.error("❌ Failed to create index:", e.message);
  }
}

migrate();
