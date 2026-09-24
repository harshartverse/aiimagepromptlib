import 'dotenv/config';
import { createClient } from "@libsql/client";
import { randomUUID } from 'node:crypto';

const TARGET_CATEGORIES = [
  "Cinematic & Film",
  "Superhuman & Fantasy",
  "Casual & Lifestyle",
  "Luxury & Royal",
  "Fashion & Editorial",
  "Traditional & Ethnic",
  "Festivals & Celebrations",
  "Indian Culture & Regions",
  "International Culture",
  "Professional & Corporate",
  "Travel & Adventure",
  "Nature & Outdoors",
  "Urban & Street",
  "Wedding & Romance",
  "Seasonal & Weather",
  "Historical & Vintage",
  "Sports & Action",
  "Creative & Artistic",
  "Education & Youth",
  "Occupations & Characters"
];

// Mapping existing categories to target production category names to preserve prompt relationships
const EXISTING_MAPPINGS = {
  "Superhuman": "Superhuman & Fantasy",
  "Girl": "Fashion & Editorial",
  "Devotion": "Traditional & Ethnic",
  "Nature": "Nature & Outdoors"
};

async function setup() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
    process.exit(1);
  }

  console.log("Connecting to Turso database for Final Production Category Setup...");
  const client = createClient({ url, authToken });

  try {
    // 1. Fetch current categories
    const currentRes = await client.execute("SELECT * FROM categories");
    const existingCats = currentRes.rows;
    console.log(`Current category count: ${existingCats.length}`);

    // Map of name -> row
    const catByName = new Map();
    for (const cat of existingCats) {
      catByName.set(String(cat.name).trim(), cat);
    }

    // 2. Process each target category
    const now = Date.now();
    for (let index = 0; index < TARGET_CATEGORIES.length; index++) {
      const targetName = TARGET_CATEGORIES[index];

      // Check if target category already exists by exact name
      let match = catByName.get(targetName);

      // If not exact match, check if an existing category maps to this target name
      if (!match) {
        for (const [oldName, mappedName] of Object.entries(EXISTING_MAPPINGS)) {
          if (mappedName === targetName && catByName.has(oldName)) {
            match = catByName.get(oldName);
            break;
          }
        }
      }

      if (match) {
        // Update existing category name & displayOrder
        await client.execute({
          sql: "UPDATE categories SET name = ?, displayOrder = ? WHERE id = ?",
          args: [targetName, index, match.id]
        });
        console.log(`Updated existing category ID ${match.id}: "${match.name}" -> "${targetName}" (displayOrder = ${index})`);
      } else {
        // Insert new category
        const newId = randomUUID();
        await client.execute({
          sql: "INSERT INTO categories (id, name, description, imageUrl, displayOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
          args: [newId, targetName, "", "", index, now + index]
        });
        console.log(`Created new category ID ${newId}: "${targetName}" (displayOrder = ${index})`);
      }
    }

    // 3. Remove any unused category that is NOT in the target list AND has 0 prompts
    const finalRes = await client.execute("SELECT * FROM categories ORDER BY displayOrder ASC");
    for (const cat of finalRes.rows) {
      if (!TARGET_CATEGORIES.includes(String(cat.name))) {
        const pCountRes = await client.execute({
          sql: "SELECT COUNT(*) as count FROM prompts WHERE category_id = ?",
          args: [cat.id]
        });
        const pCount = Number(pCountRes.rows[0]?.count || 0);
        if (pCount === 0) {
          await client.execute({
            sql: "DELETE FROM categories WHERE id = ?",
            args: [cat.id]
          });
          console.log(`Deleted extra empty category ID ${cat.id}: "${cat.name}"`);
        } else {
          console.warn(`⚠️ Retained category ID ${cat.id}: "${cat.name}" because it has ${pCount} prompt(s).`);
        }
      }
    }

    // 4. Verify final categories
    const verifyRes = await client.execute("SELECT id, name, displayOrder FROM categories ORDER BY displayOrder ASC");
    console.log(`\n✅ Final Production Categories Setup Complete! Total: ${verifyRes.rows.length}`);
    verifyRes.rows.forEach((c, i) => {
      console.log(` [${i}] displayOrder=${c.displayOrder} | ID=${c.id} | Name="${c.name}"`);
    });

  } catch (e) {
    console.error("❌ Category setup error:", e);
  }
}

setup();
