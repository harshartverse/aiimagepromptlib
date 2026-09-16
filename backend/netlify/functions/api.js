import express from 'express';
import serverless from 'serverless-http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

import { getDbClient } from '../utils/db.ts';
import { getCloudinary } from '../utils/cloudinary.ts';

const app = express();

// --- Path Rewrite Middleware for Netlify Functions ---
// Netlify passes the event path to serverless-http, which could be /.netlify/functions/api/prompts
// or /api/prompts. We strip these prefixes so Express sees exactly /prompts, /categories, etc.
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

// --- Category Routes ---
app.get('/categories', async (req, res) => {
  const db = getDbClient();
  try {
    const result = await db.execute("SELECT * FROM categories ORDER BY createdAt DESC");
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/categories', requireAuth, async (req, res) => {
  const { name, description, imageUrl } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  const id = uuidv4();
  const createdAt = Date.now();
  const db = getDbClient();
  
  try {
    await db.execute({
      sql: "INSERT INTO categories (id, name, description, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?)",
      args: [id, name, description || '', imageUrl || '', createdAt]
    });
    triggerBuildHook();
    res.status(201).json({ id, name, description, imageUrl, createdAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/categories/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, description, imageUrl } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  const db = getDbClient();
  try {
    const result = await db.execute({
      sql: "UPDATE categories SET name = ?, description = ?, imageUrl = ? WHERE id = ?",
      args: [name, description || '', imageUrl || '', id]
    });
    
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Category not found' });
    
    triggerBuildHook();
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/categories/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const db = getDbClient();
  
  try {
    // Check for existing prompts
    const check = await db.execute({
      sql: "SELECT count(*) as count FROM prompts WHERE category = ?",
      args: [id]
    });
    
    if (check.rows[0].count > 0) {
      return res.status(409).json({ error: 'Cannot delete category because it is in use by prompts.' });
    }
    
    const result = await db.execute({
      sql: "DELETE FROM categories WHERE id = ?",
      args: [id]
    });
    
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Category not found' });
    
    triggerBuildHook();
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// --- Prompt Routes ---
app.get('/prompts', async (req, res) => {
  const db = getDbClient();
  try {
    const result = await db.execute("SELECT * FROM prompts ORDER BY createdAt DESC");
    const prompts = result.rows.map(row => {
      let parsedTags = [];
      try { parsedTags = row.tags ? JSON.parse(row.tags) : []; } catch(e) {}
      return {
        ...row,
        tags: parsedTags,
        isTrending: row.isTrending === 1,
        isNew: row.isNew === 1
      };
    });
    res.json(prompts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

app.post('/prompts', requireAuth, async (req, res) => {
  const { title, promptText, imageUrl, category, tags, isTrending, isNew } = req.body;
  
  if (!title || !promptText || !category) {
    return res.status(400).json({ error: 'Title, promptText, and category are required' });
  }
  
  const id = uuidv4();
  const createdAt = Date.now();
  const db = getDbClient();
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  
  try {
    await db.execute({
      sql: "INSERT INTO prompts (id, title, promptText, imageUrl, category, tags, isTrending, isNew, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, title, promptText, imageUrl || '', category, tagsJson, isTrending ? 1 : 0, isNew ? 1 : 0, createdAt]
    });
    triggerBuildHook();
    res.status(201).json({ id, title, promptText, imageUrl, category, tags: Array.isArray(tags) ? tags : [], isTrending, isNew, createdAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create prompt. Ensure category exists.' });
  }
});

app.put('/prompts/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, promptText, imageUrl, category, tags, isTrending, isNew } = req.body;
  
  if (!title || !promptText || !category) {
    return res.status(400).json({ error: 'Title, promptText, and category are required' });
  }
  
  const db = getDbClient();
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  
  try {
    const result = await db.execute({
      sql: "UPDATE prompts SET title = ?, promptText = ?, imageUrl = ?, category = ?, tags = ?, isTrending = ?, isNew = ? WHERE id = ?",
      args: [title, promptText, imageUrl || '', category, tagsJson, isTrending ? 1 : 0, isNew ? 1 : 0, id]
    });
    
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Prompt not found' });
    
    triggerBuildHook();
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

app.delete('/prompts/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const db = getDbClient();
  
  try {
    const result = await db.execute({
      sql: "DELETE FROM prompts WHERE id = ?",
      args: [id]
    });
    
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Prompt not found' });
    
    triggerBuildHook();
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// --- Upload Route ---
app.post('/upload', requireAuth, async (req, res) => {
  const { imageBase64 } = req.body;
  
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 payload is required' });
  }
  
  // Basic validation for base64 data URI
  if (!imageBase64.startsWith('data:image/')) {
    return res.status(415).json({ error: 'Unsupported media type. Must be a data:image/... base64 string' });
  }
  
  // Basic size validation (~5MB base64 string length limit)
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
    console.error(e);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Express route matches without /api since netlify redirects /api/* to /api
export const handler = serverless(app);
export { app };
