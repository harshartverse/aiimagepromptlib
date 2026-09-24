import 'dotenv/config';
import { createClient } from "@libsql/client";

async function cleanupDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing in environment.");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  
  try {
    await client.execute("DELETE FROM prompts WHERE id = 'test-prompt'");
    await client.execute("DELETE FROM categories WHERE id = 'test-category'");
    console.log("✅ Cleanup successful. Test data removed.");
  } catch (e) {
    console.error("❌ Failed to cleanup test data:", e);
    process.exit(1);
  }
}
cleanupDb();
