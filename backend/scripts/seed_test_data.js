import 'dotenv/config';
import { createClient } from "@libsql/client";

async function seedDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing in environment.");
    process.exit(1);
  }

  console.log("Connecting to Turso database to insert test data...");
  const client = createClient({ url, authToken });
  
  try {
    const now = Date.now();
    
    // Insert test category
    await client.execute({
      sql: "INSERT OR IGNORE INTO categories (id, name, description, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?)",
      args: ["test-category", "Test Category", "A temporary category for backend testing", "", now]
    });

    // Insert test prompt
    await client.execute({
      sql: "INSERT OR IGNORE INTO prompts (id, title, promptText, imageUrl, category, tags, isTrending, isNew, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["test-prompt", "Test Prompt", "This is temporary backend verification data.", "", "test-category", '["test","backend"]', 0, 1, now]
    });
    
    console.log("✅ Test data seeded successfully.");
  } catch (e) {
    console.error("❌ Failed to seed test data:", e);
    process.exit(1);
  }
}
seedDb();
