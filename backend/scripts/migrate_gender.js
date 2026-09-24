import 'dotenv/config';
import { createClient } from "@libsql/client";

async function migrate() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing in environment");
    process.exit(1);
  }

  console.log("Connecting to Turso database for adding 'gender' column...");
  const client = createClient({ url, authToken });

  try {
    await client.execute(`
      ALTER TABLE prompts ADD COLUMN gender TEXT NOT NULL DEFAULT 'Male';
    `);
    console.log("✅ Successfully added 'gender' column to prompts table.");
  } catch (e) {
    if (e.message && e.message.includes("duplicate column name")) {
      console.log("ℹ️ Column 'gender' already exists in prompts table.");
    } else {
      console.error("❌ Failed to add 'gender' column:", e.message);
    }
  }
}

migrate();
