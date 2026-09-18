import 'dotenv/config';
import { app } from '../netlify/functions/api.js';
import http from 'http';

const PORT = 3001;

const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);
  
  try {
    // 1. Unauthenticated request
    const r1 = await fetch(`http://localhost:${PORT}/auth/session`);
    console.log("1. Unauthenticated session:", r1.status); // Expect 401
    
    // 2. Wrong password
    const r2 = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' })
    });
    console.log("2. Wrong password:", r2.status); // Expect 401
    
    // 3. Correct password
    const r3 = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_SECRET_TOKEN })
    });
    console.log("3. Correct password:", r3.status); // Expect 200
    
    // Extract cookie
    const cookieHeader = r3.headers.get('set-cookie');
    const token = cookieHeader ? cookieHeader.split(';')[0] : '';
    console.log("   Session Token obtained.");
    
    // 4. Authenticated session
    const r4 = await fetch(`http://localhost:${PORT}/auth/session`, {
      headers: { 'Cookie': token }
    });
    console.log("4. Authenticated session:", r4.status); // Expect 200
    
    // 5. Invalid prompt payload
    const r5 = await fetch(`http://localhost:${PORT}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': token },
      body: JSON.stringify({ title: "No category" })
    });
    console.log("5. Invalid prompt payload:", r5.status); // Expect 400
    
    // 6. Valid category creation (Needed for prompt creation)
    const r6 = await fetch(`http://localhost:${PORT}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': token },
      body: JSON.stringify({ name: "API Test Category" })
    });
    console.log("6. Category creation:", r6.status); // Expect 201
    const category = await r6.json();
    
    // 7. Valid prompt creation
    const r7 = await fetch(`http://localhost:${PORT}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': token },
      body: JSON.stringify({
        title: "API Test Prompt",
        promptText: "Testing API prompt creation",
        category: category.id,
        tags: ["test", "api"]
      })
    });
    console.log("7. Prompt creation:", r7.status); // Expect 201
    const prompt = await r7.json();
    
    // 8. Invalid category deletion (Has prompts)
    const r8 = await fetch(`http://localhost:${PORT}/categories/${category.id}`, {
      method: 'DELETE',
      headers: { 'Cookie': token }
    });
    console.log("8. Invalid category deletion:", r8.status); // Expect 409
    
    // 9. Prompt deletion
    const r9 = await fetch(`http://localhost:${PORT}/prompts/${prompt.id}`, {
      method: 'DELETE',
      headers: { 'Cookie': token }
    });
    console.log("9. Prompt deletion:", r9.status); // Expect 204
    
    // 10. Valid category deletion
    const r10 = await fetch(`http://localhost:${PORT}/categories/${category.id}`, {
      method: 'DELETE',
      headers: { 'Cookie': token }
    });
    console.log("10. Valid category deletion:", r10.status); // Expect 204

    // 11. Invalid Image Type
    const r11 = await fetch(`http://localhost:${PORT}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': token },
      body: JSON.stringify({ imageBase64: 'not-an-image' })
    });
    console.log("11. Invalid image format:", r11.status); // Expect 415

    console.log("✅ All API tests executed successfully.");
  } catch (e) {
    console.error(e);
  } finally {
    server.close();
    process.exit(0);
  }
});
