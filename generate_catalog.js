import fs from 'fs/promises';
import path from 'path';
import { createClient } from "@libsql/client";

async function generateCatalog() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.warn("Skipping catalog generation: Turso credentials missing.");
    return;
  }

  const client = createClient({ url, authToken });
  
  try {
    // 1. Fetch Categories
    const categoriesResult = await client.execute("SELECT * FROM categories ORDER BY createdAt DESC");
    const categories = categoriesResult.rows;

    // 2. Fetch Prompts
    const promptsResult = await client.execute("SELECT * FROM prompts ORDER BY createdAt DESC");
    const prompts = promptsResult.rows.map(row => {
      // Parse JSON tags
      let parsedTags = [];
      try {
         parsedTags = row.tags ? JSON.parse(row.tags) : [];
      } catch(e) {
         parsedTags = [];
      }

      return {
        ...row,
        tags: parsedTags,
        isTrending: row.isTrending === 1,
        isNew: row.isNew === 1
      };
    });

    // 3. Write to public data folder
    const dataDir = path.join(process.cwd(), 'admin', 'src', 'data');
    await fs.mkdir(dataDir, { recursive: true });

    await fs.writeFile(
      path.join(dataDir, 'categories.json'),
      JSON.stringify(categories, null, 2)
    );

    await fs.writeFile(
      path.join(dataDir, 'prompts.json'),
      JSON.stringify(prompts, null, 2)
    );

    console.log("Successfully generated public JSON catalogs.");
  } catch (error) {
    console.error("Error generating catalog:", error);
    process.exit(1);
  }
}

generateCatalog();
