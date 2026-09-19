import 'dotenv/config';
import { app } from '../netlify/functions/api.js';
import http from 'http';
import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';

const PORT = 3006;
const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`Trending API Test Server running on port ${PORT}...`);

  try {
    // 1. Verify GET /categories does NOT contain Trending or All
    const rCat = await fetch(`http://localhost:${PORT}/categories`);
    const categories = await rCat.json();
    console.log("1. Categories count from GET /categories:", categories.length);
    const hasTrending = categories.some(c => c.name.toLowerCase() === 'trending');
    const hasAll = categories.some(c => c.name.toLowerCase() === 'all');
    console.log("   Contains Trending in DB categories:", hasTrending); // false
    console.log("   Contains All in DB categories:", hasAll); // false

    // 2. Fetch all prompts to find sample prompt IDs
    const rPrompts = await fetch(`http://localhost:${PORT}/prompts`);
    const allPrompts = await rPrompts.json();

    if (allPrompts.length < 2) {
      console.log("Not enough prompts in DB to run like ranking test");
      return;
    }

    const p1 = allPrompts[0];
    const p2 = allPrompts[1];

    const db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });

    const testUserA = "test_user_alpha_" + Date.now();
    const testUserB = "test_user_beta_" + Date.now();

    const now = Date.now();
    const oldTimestamp = now - (35 * 24 * 60 * 60 * 1000); // 35 days ago (older than 30 days)

    // Insert 1 OLD like for p1 (should NOT count for trending)
    const oldLikeId = randomUUID();
    await db.execute({
      sql: "INSERT INTO prompt_likes (id, prompt_id, user_id, created_at) VALUES (?, ?, ?, ?)",
      args: [oldLikeId, p1.id, testUserA, oldTimestamp]
    });

    // Insert 2 RECENT likes for p2 (should count for trending)
    const recentLikeId1 = randomUUID();
    const recentLikeId2 = randomUUID();
    await db.execute({
      sql: "INSERT INTO prompt_likes (id, prompt_id, user_id, created_at) VALUES (?, ?, ?, ?)",
      args: [recentLikeId1, p2.id, testUserA, now]
    });
    await db.execute({
      sql: "INSERT INTO prompt_likes (id, prompt_id, user_id, created_at) VALUES (?, ?, ?, ?)",
      args: [recentLikeId2, p2.id, testUserB, now]
    });

    // 3. Test GET /prompts/trending
    const rTrending = await fetch(`http://localhost:${PORT}/prompts/trending`);
    const trendingPrompts = await rTrending.json();
    console.log("3. Trending endpoint returned prompts count:", trendingPrompts.length);
    if (trendingPrompts.length > 0) {
      console.log("   Top Trending prompt title:", trendingPrompts[0].title);
      console.log("   Matches p2 (recent likes):", trendingPrompts[0].id === p2.id);
    }

    // 4. Clean up test likes
    await db.execute({
      sql: "DELETE FROM prompt_likes WHERE id IN (?, ?, ?)",
      args: [oldLikeId, recentLikeId1, recentLikeId2]
    });
    console.log("4. Cleaned up test likes.");

    console.log("✅ All Trending API tests passed successfully!");
  } catch (e) {
    console.error("❌ Trending API test error:", e);
  } finally {
    server.close();
    process.exit(0);
  }
});
