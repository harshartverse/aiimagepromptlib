import express from 'express';
import serverless from 'serverless-http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import { getDbClient } from '../utils/db.ts';
import { getCloudinary } from '../utils/cloudinary.ts';

const app = express();

// --- Path Rewrite Middleware for Netlify Functions ---
app.use((req, res, next) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '');
  } else if (req.url.startsWith('/api')) {
    req.url = req.url.replace('/api', '');
  }
  
  if (!req.url || req.url === '') {
    req.url = '/';
  }
  next();
});

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// --- Authentication Middleware ---
const requireAuth = (req, res, next) => {
  const token = req.cookies.admin_session;
  if (!token) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  
  try {
    jwt.verify(token, process.env.ADMIN_SECRET_TOKEN);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid session' });
  }
};

// --- Build Webhook Trigger ---
async function triggerBuildHook() {
  const hookUrl = process.env.NETLIFY_BUILD_HOOK_URL;
  if (hookUrl) {
    try {
      await fetch(hookUrl, { method: 'POST' });
    } catch (e) {
      console.error("Failed to trigger build hook:", e);
    }
  }
}

// --- Allowed Enums for Validation ---
const ALLOWED_OUTPUT_TYPES = ['RAW 4:5', 'HQ 1:1'];
const ALLOWED_AI_MODELS = ['Gemini Imagen 3', 'Gemini 2.0 Flash'];

// --- Auth Routes ---
app.post('/auth/login', (req, res) => {
  const { password } = req.body;
  
  if (!password || password !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ admin: true }, process.env.ADMIN_SECRET_TOKEN, { expiresIn: '12h' });
  
  res.cookie('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 12 * 60 * 60 * 1000 // 12 hours
  });
  
  res.json({ success: true });
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('admin_session');
  res.json({ success: true });
});

app.get('/auth/session', requireAuth, (req, res) => {
  res.json({ authenticated: true });
});

// --- Stats Endpoint ---
app.get('/stats', async (req, res) => {
  const db = getDbClient();
  try {
    const result = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM prompts) AS totalPrompts,
        (SELECT COUNT(*) FROM categories) AS totalCategories,
        (SELECT COUNT(*) FROM prompt_likes) AS totalLikes
    `);
    const row = result.rows[0] || {};
    res.json({
      totalPrompts: Number(row.totalPrompts || 0),
      totalCategories: Number(row.totalCategories || 0),
      totalLikes: Number(row.totalLikes || 0)
    });
  } catch (e) {
    console.error('Stats fetch error:', e);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// --- Category Routes ---
app.get('/categories', async (req, res) => {
  const db = getDbClient();
  try {
    const result = await db.execute("SELECT * FROM categories ORDER BY createdAt DESC");
    res.json(result.rows);
  } catch (e) {
    console.error('Fetch categories error:', e);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/categories', requireAuth, async (req, res) => {
  const { name, description, imageUrl } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  const id = randomUUID();
  const createdAt = Date.now();
  const db = getDbClient();
  
  try {
    await db.execute({
      sql: "INSERT INTO categories (id, name, description, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?)",
      args: [id, name.trim(), description || '', imageUrl || '', createdAt]
    });
    triggerBuildHook();
    res.status(201).json({ id, name: name.trim(), description: description || '', imageUrl: imageUrl || '', createdAt });
  } catch (e) {
    console.error('Create category error:', e);
    if (e.message && e.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: `A category with the name "${name.trim()}" already exists.` });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/categories/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, description, imageUrl } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  const db = getDbClient();
  try {
    const result = await db.execute({
      sql: "UPDATE categories SET name = ?, description = ?, imageUrl = ? WHERE id = ?",
      args: [name.trim(), description || '', imageUrl || '', id]
    });
    
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Category not found' });
    
    triggerBuildHook();
    res.json({ success: true });
  } catch (e) {
    console.error('Update category error:', e);
    if (e.message && e.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: `A category with the name "${name.trim()}" already exists.` });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/categories/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const db = getDbClient();
  
  try {
    // Check for existing prompts using this category_id
    const check = await db.execute({
      sql: "SELECT count(*) as count FROM prompts WHERE category_id = ?",
      args: [id]
    });
    
    const count = Number(check.rows[0]?.count || 0);
    if (count > 0) {
      return res.status(409).json({
        error: `Cannot delete category because it is currently assigned to ${count} prompt(s). Please reassign or delete those prompts first.`
      });
    }
    
    const result = await db.execute({
      sql: "DELETE FROM categories WHERE id = ?",
      args: [id]
    });
    
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Category not found' });
    
    triggerBuildHook();
    res.status(204).send();
  } catch (e) {
    console.error('Delete category error:', e);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// --- Prompt Routes ---

// GET /prompts - Accepts optional ?user_id=... query parameter
app.get('/prompts', async (req, res) => {
  const { user_id } = req.query;
  const userId = typeof user_id === 'string' && user_id.trim() !== '' ? user_id.trim() : null;
  const db = getDbClient();

  try {
    const sql = userId
      ? `
        SELECT
          p.id, p.title, p.promptText, p.imageUrl, p.category_id, p.tags,
          p.isTrending, p.isNew, p.outputType, p.aiModel, p.createdAt,
          c.name AS categoryName,
          (SELECT COUNT(*) FROM prompt_likes pl WHERE pl.prompt_id = p.id) AS likeCount,
          EXISTS(SELECT 1 FROM prompt_likes pl WHERE pl.prompt_id = p.id AND pl.user_id = ?) AS isLiked
        FROM prompts p
        LEFT JOIN categories c ON c.id = p.category_id
        ORDER BY p.createdAt DESC
      `
      : `
        SELECT
          p.id, p.title, p.promptText, p.imageUrl, p.category_id, p.tags,
          p.isTrending, p.isNew, p.outputType, p.aiModel, p.createdAt,
          c.name AS categoryName,
          (SELECT COUNT(*) FROM prompt_likes pl WHERE pl.prompt_id = p.id) AS likeCount,
          0 AS isLiked
        FROM prompts p
        LEFT JOIN categories c ON c.id = p.category_id
        ORDER BY p.createdAt DESC
      `;

    const args = userId ? [userId] : [];
    const result = await db.execute({ sql, args });

    const prompts = result.rows.map(row => {
      let parsedTags = [];
      if (typeof row.tags === 'string') {
        try { parsedTags = JSON.parse(row.tags); } catch(e) {}
      } else if (Array.isArray(row.tags)) {
        parsedTags = row.tags;
      }
      return {
        id: row.id,
        title: row.title,
        promptText: row.promptText,
        imageUrl: row.imageUrl || '',
        category_id: row.category_id,
        categoryName: row.categoryName || 'Uncategorized',
        tags: parsedTags,
        isTrending: row.isTrending === 1,
        isNew: row.isNew === 1,
        outputType: row.outputType || 'HQ 1:1',
        aiModel: row.aiModel || 'Gemini 2.0 Flash',
        createdAt: Number(row.createdAt),
        likeCount: Number(row.likeCount || 0),
        isLiked: row.isLiked === 1 || row.isLiked === true
      };
    });

    res.json(prompts);
  } catch (e) {
    console.error('Fetch prompts error:', e);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// GET /prompts/:id - Single Prompt Detail, accepts optional ?user_id=... query parameter
app.get('/prompts/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.query;
  const userId = typeof user_id === 'string' && user_id.trim() !== '' ? user_id.trim() : null;
  const db = getDbClient();

  try {
    const sql = userId
      ? `
        SELECT
          p.id, p.title, p.promptText, p.imageUrl, p.category_id, p.tags,
          p.isTrending, p.isNew, p.outputType, p.aiModel, p.createdAt,
          c.name AS categoryName,
          (SELECT COUNT(*) FROM prompt_likes pl WHERE pl.prompt_id = p.id) AS likeCount,
          EXISTS(SELECT 1 FROM prompt_likes pl WHERE pl.prompt_id = p.id AND pl.user_id = ?) AS isLiked
        FROM prompts p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
      `
      : `
        SELECT
          p.id, p.title, p.promptText, p.imageUrl, p.category_id, p.tags,
          p.isTrending, p.isNew, p.outputType, p.aiModel, p.createdAt,
          c.name AS categoryName,
          (SELECT COUNT(*) FROM prompt_likes pl WHERE pl.prompt_id = p.id) AS likeCount,
          0 AS isLiked
        FROM prompts p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
      `;

    const args = userId ? [userId, id] : [id];
    const result = await db.execute({ sql, args });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const row = result.rows[0];
    let parsedTags = [];
    if (typeof row.tags === 'string') {
      try { parsedTags = JSON.parse(row.tags); } catch(e) {}
    } else if (Array.isArray(row.tags)) {
      parsedTags = row.tags;
    }

    res.json({
      id: row.id,
      title: row.title,
      promptText: row.promptText,
      imageUrl: row.imageUrl || '',
      category_id: row.category_id,
      categoryName: row.categoryName || 'Uncategorized',
      tags: parsedTags,
      isTrending: row.isTrending === 1,
      isNew: row.isNew === 1,
      outputType: row.outputType || 'HQ 1:1',
      aiModel: row.aiModel || 'Gemini 2.0 Flash',
      createdAt: Number(row.createdAt),
      likeCount: Number(row.likeCount || 0),
      isLiked: row.isLiked === 1 || row.isLiked === true
    });
  } catch (e) {
    console.error('Fetch prompt detail error:', e);
    res.status(500).json({ error: 'Failed to fetch prompt detail' });
  }
});

app.post('/prompts', requireAuth, async (req, res) => {
  const { title, promptText, imageUrl, category_id, tags, isTrending, isNew, outputType, aiModel } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
    return res.status(400).json({ error: 'Prompt text is required' });
  }
  if (!category_id || typeof category_id !== 'string' || category_id.trim() === '') {
    return res.status(400).json({ error: 'Category selection is required' });
  }

  const db = getDbClient();

  // Verify category_id exists
  try {
    const catCheck = await db.execute({
      sql: "SELECT id FROM categories WHERE id = ?",
      args: [category_id.trim()]
    });
    if (catCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid category_id. The selected category does not exist.' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to validate category' });
  }

  // Validate outputType and aiModel
  const finalOutputType = ALLOWED_OUTPUT_TYPES.includes(outputType) ? outputType : 'HQ 1:1';
  const finalAiModel = ALLOWED_AI_MODELS.includes(aiModel) ? aiModel : 'Gemini 2.0 Flash';

  // Process tags
  let tagsArray = [];
  if (Array.isArray(tags)) {
    tagsArray = tags;
  } else if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) tagsArray = parsed;
    } catch(e) {}
  }
  const tagsJson = JSON.stringify(tagsArray);

  const id = randomUUID();
  const createdAt = Date.now();

  try {
    await db.execute({
      sql: `INSERT INTO prompts (id, title, promptText, imageUrl, category_id, tags, isTrending, isNew, outputType, aiModel, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        title.trim(),
        promptText.trim(),
        imageUrl || '',
        category_id.trim(),
        tagsJson,
        isTrending ? 1 : 0,
        isNew ? 1 : 0,
        finalOutputType,
        finalAiModel,
        createdAt
      ]
    });

    triggerBuildHook();
    res.status(201).json({
      id,
      title: title.trim(),
      promptText: promptText.trim(),
      imageUrl: imageUrl || '',
      category_id: category_id.trim(),
      tags: tagsArray,
      isTrending: Boolean(isTrending),
      isNew: Boolean(isNew),
      outputType: finalOutputType,
      aiModel: finalAiModel,
      createdAt,
      likeCount: 0,
      isLiked: false
    });
  } catch (e) {
    console.error('Create prompt error:', e);
    res.status(500).json({ error: 'Failed to create prompt' });
  }
});

app.put('/prompts/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, promptText, imageUrl, category_id, tags, isTrending, isNew, outputType, aiModel } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
    return res.status(400).json({ error: 'Prompt text is required' });
  }
  if (!category_id || typeof category_id !== 'string' || category_id.trim() === '') {
    return res.status(400).json({ error: 'Category selection is required' });
  }
  
  const db = getDbClient();

  // Verify category_id exists
  try {
    const catCheck = await db.execute({
      sql: "SELECT id FROM categories WHERE id = ?",
      args: [category_id.trim()]
    });
    if (catCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid category_id. The selected category does not exist.' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to validate category' });
  }

  const finalOutputType = ALLOWED_OUTPUT_TYPES.includes(outputType) ? outputType : 'HQ 1:1';
  const finalAiModel = ALLOWED_AI_MODELS.includes(aiModel) ? aiModel : 'Gemini 2.0 Flash';

  let tagsArray = [];
  if (Array.isArray(tags)) {
    tagsArray = tags;
  } else if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) tagsArray = parsed;
    } catch(e) {}
  }
  const tagsJson = JSON.stringify(tagsArray);
  
  try {
    const result = await db.execute({
      sql: `UPDATE prompts
            SET title = ?, promptText = ?, imageUrl = ?, category_id = ?, tags = ?, isTrending = ?, isNew = ?, outputType = ?, aiModel = ?
            WHERE id = ?`,
      args: [
        title.trim(),
        promptText.trim(),
        imageUrl || '',
        category_id.trim(),
        tagsJson,
        isTrending ? 1 : 0,
        isNew ? 1 : 0,
        finalOutputType,
        finalAiModel,
        id
      ]
    });
    
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Prompt not found' });
    
    triggerBuildHook();
    res.json({ success: true });
  } catch (e) {
    console.error('Update prompt error:', e);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

app.delete('/prompts/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const db = getDbClient();
  
  try {
    // Delete associated prompt_likes records to ensure zero orphaned records
    await db.execute({
      sql: "DELETE FROM prompt_likes WHERE prompt_id = ?",
      args: [id]
    });

    const result = await db.execute({
      sql: "DELETE FROM prompts WHERE id = ?",
      args: [id]
    });
    
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Prompt not found' });
    
    triggerBuildHook();
    res.status(204).send();
  } catch (e) {
    console.error('Delete prompt error:', e);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// --- Public Like System Endpoints ---
app.post('/prompts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const userId = user_id.trim();
  const db = getDbClient();
  const likeId = randomUUID();
  const createdAt = Date.now();

  try {
    await db.execute({
      sql: "INSERT OR IGNORE INTO prompt_likes (id, prompt_id, user_id, created_at) VALUES (?, ?, ?, ?)",
      args: [likeId, id, userId, createdAt]
    });

    const countResult = await db.execute({
      sql: "SELECT COUNT(*) as count FROM prompt_likes WHERE prompt_id = ?",
      args: [id]
    });

    res.json({ prompt_id: id, likeCount: Number(countResult.rows[0]?.count || 0), isLiked: true });
  } catch (e) {
    console.error('Like prompt error:', e);
    res.status(500).json({ error: 'Failed to like prompt' });
  }
});

app.delete('/prompts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const userId = user_id.trim();
  const db = getDbClient();

  try {
    await db.execute({
      sql: "DELETE FROM prompt_likes WHERE prompt_id = ? AND user_id = ?",
      args: [id, userId]
    });

    const countResult = await db.execute({
      sql: "SELECT COUNT(*) as count FROM prompt_likes WHERE prompt_id = ?",
      args: [id]
    });

    res.json({ prompt_id: id, likeCount: Number(countResult.rows[0]?.count || 0), isLiked: false });
  } catch (e) {
    console.error('Unlike prompt error:', e);
    res.status(500).json({ error: 'Failed to unlike prompt' });
  }
});

// --- Upload Route ---
app.post('/upload', requireAuth, async (req, res) => {
  const { imageBase64 } = req.body;
  
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 payload is required' });
  }
  
  if (!imageBase64.startsWith('data:image/')) {
    return res.status(415).json({ error: 'Unsupported media type. Must be a data:image/... base64 string' });
  }
  
  if (imageBase64.length > 7000000) {
    return res.status(413).json({ error: 'Payload too large. Limit is approx 5MB.' });
  }
  
  try {
    const cloudinary = getCloudinary();
    const result = await cloudinary.uploader.upload(imageBase64, {
      folder: 'ai-image-prompt-library/prompts'
    });
    
    res.json({
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export const handler = serverless(app);
export { app };
