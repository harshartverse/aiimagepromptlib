import 'dotenv/config';
import { createClient } from "@libsql/client";

async function testDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing in environment.");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  
  try {
    console.log("🔍 Fetching test category...");
    const cats = await client.execute("SELECT * FROM categories WHERE id = 'test-category'");
    console.log("Categories found:", cats.rows);

    console.log("🔍 Fetching test prompt...");
    const prompts = await client.execute("SELECT * FROM prompts WHERE id = 'test-prompt'");
    console.log("Prompts found:", prompts.rows);

    if (cats.rows.length > 0 && prompts.rows.length > 0) {
      console.log("✅ Read/Write test successful! WRITE → TURSO → READ works correctly.");
    } else {
      console.log("⚠️ Test data not found. Did you run the seed script?");
    }
  } catch (e) {
    console.error("❌ Failed to read test data:", e);
    process.exit(1);
  }
}
testDb();
