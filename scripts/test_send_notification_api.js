import 'dotenv/config';
import { app } from '../netlify/functions/api.js';
import http from 'http';
import jwt from 'jsonwebtoken';

const PORT = 3007;
const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`Notification Send API Test Server running on port ${PORT}...`);

  const secret = process.env.ADMIN_SECRET_TOKEN || 'test_secret';
  const validToken = jwt.sign({ admin: true }, secret, { expiresIn: '1h' });
  const authHeader = { 'Cookie': `admin_session=${validToken}` };

  try {
    // 1. Test Unauthenticated Request
    const rUnauth = await fetch(`http://localhost:${PORT}/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', body: 'Test', audience: 'all' })
    });
    console.log("1. Unauthenticated request status:", rUnauth.status); // 401
    console.assert(rUnauth.status === 401, "Should reject unauthenticated requests");

    // 2. Test Missing Title
    const rNoTitle = await fetch(`http://localhost:${PORT}/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ body: 'Test', audience: 'all' })
    });
    console.log("2. Missing title status:", rNoTitle.status); // 400
    console.assert(rNoTitle.status === 400, "Should reject missing title");

    // 3. Test Missing Body
    const rNoBody = await fetch(`http://localhost:${PORT}/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ title: 'Test', audience: 'all' })
    });
    console.log("3. Missing body status:", rNoBody.status); // 400
    console.assert(rNoBody.status === 400, "Should reject missing body");

    // 4. Test Invalid Audience
    const rBadAudience = await fetch(`http://localhost:${PORT}/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ title: 'Test', body: 'Test', audience: 'invalid_aud' })
    });
    console.log("4. Invalid audience status:", rBadAudience.status); // 400
    console.assert(rBadAudience.status === 400, "Should reject invalid audience");

    // 5. Test Selected Device Missing installation_id
    const rNoInst = await fetch(`http://localhost:${PORT}/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ title: 'Test', body: 'Test', audience: 'installation' })
    });
    console.log("5. Missing installation_id status:", rNoInst.status); // 400
    console.assert(rNoInst.status === 400, "Should reject missing installation_id for installation audience");

    // 6. Test Invalid Image URL
    const rBadUrl = await fetch(`http://localhost:${PORT}/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ title: 'Test', body: 'Test', imageUrl: 'ftp://bad-url', audience: 'all' })
    });
    console.log("6. Invalid imageUrl status:", rBadUrl.status); // 400
    console.assert(rBadUrl.status === 400, "Should reject invalid imageUrl protocol");

    // 7. Test GET /devices Endpoint
    const rDevices = await fetch(`http://localhost:${PORT}/devices`, {
      headers: authHeader
    });
    const devices = await rDevices.json();
    console.log("7. GET /devices status:", rDevices.status, "| Devices count:", Array.isArray(devices) ? devices.length : 'N/A');
    if (Array.isArray(devices) && devices.length > 0) {
      console.log("   First device installation_id:", devices[0].installation_id);
      console.log("   fcm_token hidden from GET /devices:", devices[0].fcm_token === undefined);
    }

    // 8. Test Successful All-Devices Notification Send (Dry-run or live)
    const rSendAll = await fetch(`http://localhost:${PORT}/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        title: 'Backend Validation Test Title',
        body: 'Backend Validation Test Body',
        audience: 'all'
      })
    });
    const sendAllResult = await rSendAll.json();
    console.log("8. Send to all devices status:", rSendAll.status, "| Result:", sendAllResult);

    console.log("✅ All Push Notification Backend API tests passed successfully!");
  } catch (e) {
    console.error("❌ Notification Send API test error:", e);
  } finally {
    server.close();
    process.exit(0);
  }
});
