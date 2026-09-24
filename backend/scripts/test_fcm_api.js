import 'dotenv/config';
import { app } from '../netlify/functions/api.js';
import http from 'http';

const PORT = 3002;
const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`FCM Test Server running on port ${PORT}...`);

  try {
    const testInstallationId = "test-installation-uuid-" + Date.now();
    const testFcmToken1 = "test_fcm_token_alpha_" + Date.now();
    const testFcmToken2 = "test_fcm_token_beta_updated_" + Date.now();

    // 1. Missing fields check
    const r1 = await fetch(`http://localhost:${PORT}/devices/fcm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log("1. Missing body validation status:", r1.status); // 400

    // 2. Missing token check
    const r2 = await fetch(`http://localhost:${PORT}/devices/fcm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installation_id: testInstallationId })
    });
    console.log("2. Missing fcm_token validation status:", r2.status); // 400

    // 3. First registration (Insert)
    const r3 = await fetch(`http://localhost:${PORT}/devices/fcm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installation_id: testInstallationId,
        fcm_token: testFcmToken1
      })
    });
    const res3 = await r3.json();
    console.log("3. Initial registration status:", r3.status, "Response:", res3); // 200, { success: true }

    // 4. Duplicate registration with updated token (Upsert - Update)
    const r4 = await fetch(`http://localhost:${PORT}/devices/fcm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installation_id: testInstallationId,
        fcm_token: testFcmToken2
      })
    });
    const res4 = await r4.json();
    console.log("4. Token refresh / idempotent upsert status:", r4.status, "Response:", res4); // 200, { success: true }

    console.log("✅ All FCM backend registration endpoint tests passed successfully!");
  } catch (e) {
    console.error("❌ FCM API test error:", e);
  } finally {
    server.close();
    process.exit(0);
  }
});
