import 'dotenv/config';
import { createClient } from "@libsql/client";

async function migrate() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing in environment");
    process.exit(1);
  }

  console.log("Connecting to Turso database for adding 'displayOrder' column to categories...");
  const client = createClient({ url, authToken });

  try {
    await client.execute(`
      ALTER TABLE categories ADD COLUMN displayOrder INTEGER NOT NULL DEFAULT 0;
    `);
    console.log("✅ Successfully added 'displayOrder' column to categories table.");
  } catch (e) {
    if (e.message && e.message.includes("duplicate column name")) {
      console.log("ℹ️ Column 'displayOrder' already exists in categories table.");
    } else {
      console.error("❌ Failed to add 'displayOrder' column:", e.message);
    }
  }

  try {
    // Assign deterministic initial order to existing categories based on createdAt ASC
    const res = await client.execute("SELECT id FROM categories ORDER BY createdAt ASC");
    for (let i = 0; i < res.rows.length; i++) {
      await client.execute({
        sql: "UPDATE categories SET displayOrder = ? WHERE id = ?",
        args: [i, res.rows[i].id]
      });
    }
    console.log(`✅ Assigned deterministic displayOrder (0..${res.rows.length - 1}) to existing categories.`);
  } catch (e) {
    console.error("❌ Failed to set initial displayOrder for existing categories:", e);
  }
}

migrate();
