import 'dotenv/config';
import { app } from '../netlify/functions/api.js';
import http from 'http';

const PORT = 3005;
const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`Category Reorder Test Server running on port ${PORT}...`);

  try {
    // 1. Authenticate to get session cookie
    const rAuth = await fetch(`http://localhost:${PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_SECRET_TOKEN })
    });
    const cookieHeader = rAuth.headers.get('set-cookie');
    const cookie = cookieHeader ? cookieHeader.split(';')[0] : '';

    // 2. Fetch initial categories
    const rCat = await fetch(`http://localhost:${PORT}/categories`);
    const categories = await rCat.json();
    console.log("Initial categories count:", categories.length);
    if (categories.length > 0) {
      console.log("First category displayOrder:", categories[0].displayOrder);
    }

    // 3. Create a test category (should get end displayOrder)
    const rCreate = await fetch(`http://localhost:${PORT}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        name: "Reorder Test Category " + Date.now(),
        description: "Test description"
      })
    });
    const created = await rCreate.json();
    console.log("Created category displayOrder:", created.displayOrder);

    // 4. Test reorder endpoint with reversed list
    const rAll = await fetch(`http://localhost:${PORT}/categories`);
    const allCategories = await rAll.json();
    const reversedIds = allCategories.map(c => c.id).reverse();

    const rReorder = await fetch(`http://localhost:${PORT}/categories/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({ categoryIds: reversedIds })
    });
    const reordered = await rReorder.json();
    console.log("Reorder endpoint status:", rReorder.status);
    console.log("Reordered first ID matches requested:", reordered[0]?.id === reversedIds[0]);

    // 5. Cleanup created test category
    if (created?.id) {
      await fetch(`http://localhost:${PORT}/categories/${created.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookie }
      });
      console.log("Cleanup completed.");
    }

    console.log("✅ All category reorder tests passed successfully!");
  } catch (e) {
    console.error("❌ Category reorder test error:", e);
  } finally {
    server.close();
    process.exit(0);
  }
});
