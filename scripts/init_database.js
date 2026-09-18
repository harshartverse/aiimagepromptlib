import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from "@libsql/client";

async function initDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing in environment.");
    process.exit(1);
  }

  console.log("Connecting to Turso database...");
  const client = createClient({ url, authToken });
  
  try {
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    
    await client.executeMultiple(schemaSql);
    console.log("✅ Database schema initialized successfully.");
  } catch (e) {
    console.error("❌ Failed to initialize database:", e);
    process.exit(1);
  }
}
initDb();
