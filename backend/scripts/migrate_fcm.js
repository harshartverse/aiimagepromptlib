import 'dotenv/config';
import { createClient } from "@libsql/client";

async function migrate() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing in environment");
    process.exit(1);
  }

  console.log("Connecting to Turso database for FCM devices table creation...");
  const client = createClient({ url, authToken });

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS fcm_devices (
          id TEXT PRIMARY KEY,
          installation_id TEXT NOT NULL UNIQUE,
          fcm_token TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_fcm_devices_installation_id ON fcm_devices(installation_id);
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_fcm_devices_fcm_token ON fcm_devices(fcm_token);
    `);

    console.log("✅ fcm_devices table & indexes verified successfully.");
  } catch (e) {
    console.error("❌ Failed to run FCM table migration:", e);
    process.exit(1);
  }
}

migrate();
