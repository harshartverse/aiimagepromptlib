import 'dotenv/config';
import { createClient } from "@libsql/client";

async function inspect() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  try {
    const res = await client.execute("SELECT * FROM categories ORDER BY displayOrder ASC, createdAt ASC");
    console.log(`Current Categories Count: ${res.rows.length}\n`);

    for (const cat of res.rows) {
      const promptCountRes = await client.execute({
        sql: "SELECT COUNT(*) as count FROM prompts WHERE category_id = ?",
        args: [cat.id]
      });
      const promptCount = Number(promptCountRes.rows[0]?.count || 0);
      console.log(`ID: ${cat.id} | Name: "${cat.name}" | displayOrder: ${cat.displayOrder} | Prompts: ${promptCount}`);
    }
  } catch (e) {
    console.error("Error inspecting categories:", e);
  }
}

inspect();
