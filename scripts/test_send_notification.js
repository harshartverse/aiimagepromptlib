import 'dotenv/config';
import { app } from '../netlify/functions/api.js';
import http from 'http';

const PORT = 3003;
const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`Notification Test Server running on port ${PORT}...`);

  try {
    // 1. Unauthenticated request -> expect 401
    const r1 = await fetch(`http://localhost:${PORT}/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installation_id: 'test_inst_123',
        title: 'Test',
        body: 'Test'
      })
    });
    console.log("1. Unauthenticated notification request status:", r1.status); // 401

    // 2. Login to get admin session cookie
    const rAuth = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_SECRET_TOKEN })
    });
    const cookieHeader = rAuth.headers.get('set-cookie');
    const cookie = cookieHeader ? cookieHeader.split(';')[0] : '';
    console.log("2. Admin login status:", rAuth.status);

    // 3. Authenticated request with missing installation_id -> expect 400
    const r2 = await fetch(`http://localhost:${PORT}/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({ title: 'Test', body: 'Test' })
    });
    console.log("3. Missing installation_id validation status:", r2.status); // 400

    // 4. Authenticated request with non-existent installation_id -> expect 404
    const r3 = await fetch(`http://localhost:${PORT}/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        installation_id: 'non_existent_installation_id_99999',
        title: 'Promptorios Test',
        body: 'Testing Notification'
      })
    });
    console.log("4. Non-existent installation_id status:", r3.status); // 404

    console.log("✅ All test_send_notification validation & security tests passed!");
  } catch (e) {
    console.error("❌ Test error:", e);
  } finally {
    server.close();
    process.exit(0);
  }
});
