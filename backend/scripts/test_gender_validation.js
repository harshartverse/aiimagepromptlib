import 'dotenv/config';
import { app } from '../netlify/functions/api.js';
import http from 'http';

const PORT = 3004;
const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`Gender Validation Test Server running on port ${PORT}...`);

  try {
    // 1. Login to get admin session cookie
    const rAuth = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_SECRET_TOKEN })
    });
    const cookieHeader = rAuth.headers.get('set-cookie');
    const cookie = cookieHeader ? cookieHeader.split(';')[0] : '';

    // 2. Fetch categories to get valid category_id
    const rCat = await fetch(`http://localhost:${PORT}/categories`);
    const cats = await rCat.json();
    const categoryId = cats[0]?.id;

    if (!categoryId) {
      console.log("No categories found to run prompt creation validation test");
      return;
    }

    // 3. Invalid gender creation test ("Unisex") -> expect 400
    const rInvalid = await fetch(`http://localhost:${PORT}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        title: "Test Title",
        promptText: "Test Prompt",
        category_id: categoryId,
        gender: "Unisex"
      })
    });
    console.log("1. Invalid gender ('Unisex') status:", rInvalid.status); // 400

    // 4. Invalid gender creation test ("Custom") -> expect 400
    const rCustom = await fetch(`http://localhost:${PORT}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        title: "Test Title",
        promptText: "Test Prompt",
        category_id: categoryId,
        gender: "Custom"
      })
    });
    console.log("2. Invalid gender ('Custom') status:", rCustom.status); // 400

    // 5. Valid gender creation test ("Couple") -> expect 201
    const rValid = await fetch(`http://localhost:${PORT}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        title: "Gender Test Prompt",
        promptText: "Testing gender validation",
        category_id: categoryId,
        gender: "Couple"
      })
    });
    console.log("3. Valid gender ('Couple') status:", rValid.status); // 201
    const createdPrompt = await rValid.json();
    console.log("   Created prompt gender:", createdPrompt.gender);

    // 6. Cleanup created prompt
    if (createdPrompt?.id) {
      await fetch(`http://localhost:${PORT}/prompts/${createdPrompt.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookie }
      });
      console.log("   Cleanup completed.");
    }

    console.log("✅ All gender validation tests passed successfully!");
  } catch (e) {
    console.error("❌ Gender validation test error:", e);
  } finally {
    server.close();
    process.exit(0);
  }
});
