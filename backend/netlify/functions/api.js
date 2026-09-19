import express from 'express';
import serverless from 'serverless-http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import { getDbClient } from '../utils/db.ts';
import { getCloudinary } from '../utils/cloudinary.ts';
import { getMessaging } from '../utils/firebase.ts';

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
  if (hookUrl && typeof hookUrl === 'string' && hookUrl.trim().startsWith('http')) {
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
const ALLOWED_GENDERS = ['Male', 'Female', 'Boy', 'Girl', 'Baby Boy', 'Baby Girl', 'Couple'];

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

// --- FCM Device Registration Endpoint ---
app.post('/devices/fcm', async (req, res) => {
  const { installation_id, fcm_token } = req.body || {};

  if (!installation_id || typeof installation_id !== 'string' || installation_id.trim() === '') {
    return res.status(400).json({ error: 'installation_id is required' });
  }

  if (!fcm_token || typeof fcm_token !== 'string' || fcm_token.trim() === '') {
    return res.status(400).json({ error: 'fcm_token is required' });
  }

  const cleanInstallationId = installation_id.trim();
  const cleanFcmToken = fcm_token.trim();

  if (cleanInstallationId.length > 256) {
    return res.status(400).json({ error: 'installation_id exceeds maximum allowed length' });
  }

  if (cleanFcmToken.length > 4096) {
    return res.status(400).json({ error: 'fcm_token exceeds maximum allowed length' });
  }

  const db = getDbClient();
  const id = randomUUID();
  const now = Date.now();

  try {
    await db.execute({
      sql: `
        INSERT INTO fcm_devices (id, installation_id, fcm_token, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(installation_id) DO UPDATE SET
          fcm_token = excluded.fcm_token,
          updated_at = excluded.updated_at
      `,
      args: [id, cleanInstallationId, cleanFcmToken, now, now]
    });

    res.json({ success: true });
  } catch (e) {
    console.error('FCM device registration error:', e);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// --- Test Notification Endpoint (Protected) ---
app.post('/notifications/test', requireAuth, async (req, res) => {
  const { installation_id, title, body, imageUrl } = req.body || {};

  if (!installation_id || typeof installation_id !== 'string' || installation_id.trim() === '') {
    return res.status(400).json({ error: 'installation_id is required' });
  }

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title is required' });
  }

  if (!body || typeof body !== 'string' || body.trim() === '') {
    return res.status(400).json({ error: 'body is required' });
  }

  const cleanInstallationId = installation_id.trim();
  const cleanTitle = title.trim();
  const cleanBody = body.trim();
  const cleanImageUrl = typeof imageUrl === 'string' && imageUrl.trim() !== '' ? imageUrl.trim() : null;

  const db = getDbClient();

  try {
    const result = await db.execute({
      sql: "SELECT fcm_token FROM fcm_devices WHERE installation_id = ?",
      args: [cleanInstallationId]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device registration not found for the given installation_id' });
    }

    const fcmToken = String(result.rows[0].fcm_token || '').trim();

    if (!fcmToken) {
      return res.status(404).json({ error: 'FCM token missing for the given installation_id' });
    }

    const messaging = getMessaging();

    const message = {
      token: fcmToken,
      notification: {
        title: cleanTitle,
        body: cleanBody,
        ...(cleanImageUrl ? { image: cleanImageUrl } : {})
      },
      android: {
        priority: 'high',
        notification: {
          title: cleanTitle,
          body: cleanBody,
          ...(cleanImageUrl ? { imageUrl: cleanImageUrl } : {})
        }
      }
    };

    const messageId = await messaging.send(message);

    res.json({
      success: true,
      messageId
    });
  } catch (e) {
    console.error('Test notification send error:', e);
    const errorMessage = e.message || 'Failed to send notification via FCM';
    res.status(500).json({
      error: 'Failed to send notification',
      details: errorMessage
    });
  }
});

// --- GET /devices (Protected) - Returns registered devices (excluding fcm_token) ---
app.get('/devices', requireAuth, async (req, res) => {
  const db = getDbClient();
  try {
    const result = await db.execute("SELECT id, installation_id, created_at, updated_at FROM fcm_devices ORDER BY updated_at DESC");
    res.json(result.rows);
  } catch (e) {
    console.error('Fetch devices error:', e);
    res.status(500).json({ error: 'Failed to fetch registered devices' });
  }
});

// --- POST /notifications/send (Protected) - Send FCM Push Notification to All or Selected Device ---
app.post('/notifications/send', requireAuth, async (req, res) => {
  const { title, body, imageUrl, deepLink, audience, installation_id } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Notification title is required' });
  }

  if (!body || typeof body !== 'string' || body.trim() === '') {
    return res.status(400).json({ error: 'Notification message body is required' });
  }

  if (!audience || (audience !== 'all' && audience !== 'installation')) {
    return res.status(400).json({ error: 'Invalid audience. Must be "all" or "installation"' });
  }

  if (audience === 'installation' && (!installation_id || typeof installation_id !== 'string' || installation_id.trim() === '')) {
    return res.status(400).json({ error: 'installation_id is required when audience is "installation"' });
  }

  const cleanTitle = title.trim();
  const cleanBody = body.trim();
  const cleanImageUrl = typeof imageUrl === 'string' && imageUrl.trim() !== '' ? imageUrl.trim() : null;
  const cleanDeepLink = typeof deepLink === 'string' && deepLink.trim() !== '' ? deepLink.trim() : null;

  if (cleanImageUrl && !cleanImageUrl.startsWith('http://') && !cleanImageUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'imageUrl must be a valid HTTP or HTTPS URL' });
  }

  const db = getDbClient();
  let messaging;
  try {
    messaging = getMessaging();
  } catch (firebaseErr) {
    console.error('Firebase Admin SDK initialization error:', firebaseErr.message);
    return res.status(500).json({
      error: 'Push notification service unavailable',
      details: firebaseErr.message || 'Firebase Admin SDK credentials not configured on server'
    });
  }

  try {
    if (audience === 'installation') {
      const cleanInstallationId = installation_id.trim();
      const devRes = await db.execute({
        sql: "SELECT fcm_token FROM fcm_devices WHERE installation_id = ?",
        args: [cleanInstallationId]
      });

      if (devRes.rows.length === 0) {
        return res.status(404).json({ error: 'Selected device registration not found' });
      }

      const token = String(devRes.rows[0].fcm_token || '').trim();
      if (!token) {
        return res.status(404).json({ error: 'FCM token missing for selected device' });
      }

      const message = {
        token,
        notification: {
          title: cleanTitle,
          body: cleanBody,
          ...(cleanImageUrl ? { image: cleanImageUrl } : {})
        },
        android: {
          priority: 'high',
          notification: {
            title: cleanTitle,
            body: cleanBody,
            ...(cleanImageUrl ? { imageUrl: cleanImageUrl } : {})
          }
        },
        data: {
          ...(cleanDeepLink ? { deepLink: cleanDeepLink } : {})
        }
      };

      try {
        const messageId = await messaging.send(message);
        console.log(`[FCM Single Send Success] Message ID: ${messageId}`);
        return res.json({ success: true, sent: 1, failed: 0 });
      } catch (fcmErr) {
        const errCode = fcmErr.code || 'unknown';
        const errMsg = fcmErr.message || 'Unknown FCM error';
        console.error(`[FCM Single Send Error] Code: ${errCode} | Message: ${errMsg}`);

        if (
          errCode === 'messaging/registration-token-not-registered' ||
          errCode === 'messaging/invalid-registration-token'
        ) {
          await db.execute({
            sql: "DELETE FROM fcm_devices WHERE installation_id = ?",
            args: [cleanInstallationId]
          });
        }
        return res.json({
          success: true,
          sent: 0,
          failed: 1,
          error: errMsg,
          errorCode: errCode
        });
      }
    } else {
      // audience === 'all'
      const devRes = await db.execute("SELECT installation_id, fcm_token FROM fcm_devices");
      const devices = devRes.rows;

      if (devices.length === 0) {
        return res.json({ success: true, sent: 0, failed: 0, message: 'No registered devices found' });
      }

      let sentCount = 0;
      let failedCount = 0;
      const invalidInstallationIds = [];
      const errorDetailsMap = {};

      const BATCH_SIZE = 500; // Firebase Admin SDK multicast limit
      for (let i = 0; i < devices.length; i += BATCH_SIZE) {
        const batch = devices.slice(i, i + BATCH_SIZE);
        const tokens = batch.map(d => String(d.fcm_token).trim()).filter(Boolean);

        if (tokens.length === 0) continue;

        const multicastMessage = {
          tokens,
          notification: {
            title: cleanTitle,
            body: cleanBody,
            ...(cleanImageUrl ? { image: cleanImageUrl } : {})
          },
          android: {
            priority: 'high',
            notification: {
              title: cleanTitle,
              body: cleanBody,
              ...(cleanImageUrl ? { imageUrl: cleanImageUrl } : {})
            }
          },
          data: {
            ...(cleanDeepLink ? { deepLink: cleanDeepLink } : {})
          }
        };

        const batchRes = await messaging.sendEachForMulticast(multicastMessage);
        sentCount += batchRes.successCount;
        failedCount += batchRes.failureCount;

        batchRes.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const code = resp.error.code || 'unknown';
            const message = resp.error.message || 'Unknown FCM error';

            // Log safe diagnostic metadata only (NO tokens)
            console.error(`[FCM Multicast Failure] Index: ${idx} | Code: ${code} | Message: ${message}`);

            if (!errorDetailsMap[code]) {
              errorDetailsMap[code] = { code, message, count: 0 };
            }
            errorDetailsMap[code].count++;

            if (
              code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token'
            ) {
              invalidInstallationIds.push(batch[idx].installation_id);
            }
          }
        });
      }

      // Safely delete invalid tokens
      if (invalidInstallationIds.length > 0) {
        for (const instId of invalidInstallationIds) {
          try {
            await db.execute({
              sql: "DELETE FROM fcm_devices WHERE installation_id = ?",
              args: [instId]
            });
          } catch (e) {}
        }
      }

      const failureDetails = Object.values(errorDetailsMap);
      console.log(`[FCM Send Summary] Total Registered Devices: ${devices.length} | Sent: ${sentCount} | Failed: ${failedCount}`, {
        failureDetails
      });

      return res.json({
        success: true,
        sent: sentCount,
        failed: failedCount,
        ...(failureDetails.length > 0 ? { errors: failureDetails } : {})
      });
    }
  } catch (e) {
    console.error('Send notification error:', e);
    res.status(500).json({ error: 'Failed to send push notification', details: e.message });
  }
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
    const result = await db.execute("SELECT * FROM categories ORDER BY displayOrder ASC, createdAt ASC");
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
    const maxRes = await db.execute("SELECT MAX(displayOrder) as maxOrder FROM categories");
    const maxOrderVal = maxRes.rows[0]?.maxOrder;
    const nextDisplayOrder = maxOrderVal === null || maxOrderVal === undefined ? 0 : Number(maxOrderVal) + 1;

    await db.execute({
      sql: "INSERT INTO categories (id, name, description, imageUrl, displayOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, name.trim(), description || '', imageUrl || '', nextDisplayOrder, createdAt]
    });
    triggerBuildHook();
    res.status(201).json({
      id,
      name: name.trim(),
      description: description || '',
      imageUrl: imageUrl || '',
      displayOrder: nextDisplayOrder,
      createdAt
    });
  } catch (e) {
    console.error('Create category error:', e);
    if (e.message && e.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: `A category with the name "${name.trim()}" already exists.` });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Reorder Categories Endpoint (Protected)
app.put('/categories/reorder', requireAuth, async (req, res) => {
  const { categoryIds } = req.body || {};

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return res.status(400).json({ error: 'categoryIds must be a non-empty array' });
  }

  // Check for duplicates
  const uniqueIds = new Set(categoryIds);
  if (uniqueIds.size !== categoryIds.length) {
    return res.status(400).json({ error: 'categoryIds contains duplicate IDs' });
  }

  const db = getDbClient();

  try {
    // Validate all IDs exist in DB
    const existingRes = await db.execute("SELECT id FROM categories");
    const existingIds = new Set(existingRes.rows.map(r => String(r.id)));

    for (const cid of categoryIds) {
      if (!existingIds.has(String(cid))) {
        return res.status(400).json({ error: `Category ID not found: ${cid}` });
      }
    }

    // Update displayOrder sequentially
    for (let index = 0; index < categoryIds.length; index++) {
      await db.execute({
        sql: "UPDATE categories SET displayOrder = ? WHERE id = ?",
        args: [index, categoryIds[index]]
      });
    }

    triggerBuildHook();

    const updatedRes = await db.execute("SELECT * FROM categories ORDER BY displayOrder ASC, createdAt ASC");
    res.json(updatedRes.rows);
  } catch (e) {
    console.error('Reorder categories error:', e);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

app.put('/categories/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, description, imageUrl, displayOrder } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  const db = getDbClient();
  try {
    let result;
    if (typeof displayOrder === 'number') {
      result = await db.execute({
        sql: "UPDATE categories SET name = ?, description = ?, imageUrl = ?, displayOrder = ? WHERE id = ?",
        args: [name.trim(), description || '', imageUrl || '', displayOrder, id]
      });
    } else {
      result = await db.execute({
        sql: "UPDATE categories SET name = ?, description = ?, imageUrl = ? WHERE id = ?",
        args: [name.trim(), description || '', imageUrl || '', id]
      });
    }
    
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

// GET /prompts/trending - Top 10 prompts ranked by likes in the last 30 days
app.get('/prompts/trending', async (req, res) => {
  const { user_id } = req.query;
  const userId = typeof user_id === 'string' && user_id.trim() !== '' ? user_id.trim() : null;
  const db = getDbClient();

  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  try {
    const sql = userId
      ? `
        SELECT
          p.id, p.title, p.promptText, p.imageUrl, p.category_id, p.tags,
          p.isTrending, p.isNew, p.outputType, p.aiModel, p.gender, p.createdAt,
          c.name AS categoryName,
          (SELECT COUNT(*) FROM prompt_likes pl WHERE pl.prompt_id = p.id) AS likeCount,
          (SELECT COUNT(*) FROM prompt_likes pl WHERE pl.prompt_id = p.id AND pl.created_at >= ?) AS recentLikeCount,
          EXISTS(SELECT 1 FROM prompt_likes pl WHERE pl.prompt_id = p.id AND pl.user_id = ?) AS isLiked
        FROM prompts p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE (SELECT COUNT(*) FROM prompt_likes pl WHERE pl.prompt_id = p.id AND pl.created_at >= ?) > 0
        ORDER BY recentLikeCount DESC, p.createdAt DESC
        LIMIT 10
      `
      : `
        SELECT
          p.id, p.title, p.promptText, p.imageUrl, p.category_id, p.tags,
          p.isTrending, p.isNew, p.outputType, p.aiModel, p.gender, p.createdAt,
          c.name AS categoryName,
          (SELECT COUNT(*) FROM prompt_likes pl WHERE pl.prompt_id = p.id) AS likeCount,
          (SELECT COUNT(*) FROM prompt_likes pl WHERE pl.prompt_id = p.id AND pl.created_at >= ?) AS recentLikeCount,
          0 AS isLiked
        FROM prompts p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE (SELECT COUNT(*) FROM prompt_likes pl WHERE pl.prompt_id = p.id AND pl.created_at >= ?) > 0
        ORDER BY recentLikeCount DESC, p.createdAt DESC
        LIMIT 10
      `;

    const args = userId ? [thirtyDaysAgo, userId, thirtyDaysAgo] : [thirtyDaysAgo, thirtyDaysAgo];
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
        gender: row.gender || 'Male',
        createdAt: Number(row.createdAt),
        likeCount: Number(row.likeCount || 0),
        isLiked: row.isLiked === 1 || row.isLiked === true
      };
    });

    res.json(prompts);
  } catch (e) {
    console.error('Fetch trending prompts error:', e);
    res.status(500).json({ error: 'Failed to fetch trending prompts' });
  }
});

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
          p.isTrending, p.isNew, p.outputType, p.aiModel, p.gender, p.createdAt,
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
          p.isTrending, p.isNew, p.outputType, p.aiModel, p.gender, p.createdAt,
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
        gender: row.gender || 'Male',
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
          p.isTrending, p.isNew, p.outputType, p.aiModel, p.gender, p.createdAt,
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
          p.isTrending, p.isNew, p.outputType, p.aiModel, p.gender, p.createdAt,
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
      gender: row.gender || 'Male',
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
  const { title, promptText, imageUrl, category_id, tags, isTrending, isNew, outputType, aiModel, gender } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
    return res.status(400).json({ error: 'Prompt text is required' });
  }
  if (!category_id || typeof category_id !== 'string' || category_id.trim() === '') {
    return res.status(400).json({ error: 'Category selection is required' });
  }
  if (!gender || typeof gender !== 'string' || !ALLOWED_GENDERS.includes(gender.trim())) {
    return res.status(400).json({ error: `Invalid gender. Allowed values: ${ALLOWED_GENDERS.join(', ')}` });
  }

  const cleanGender = gender.trim();
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
      sql: `INSERT INTO prompts (id, title, promptText, imageUrl, category_id, tags, isTrending, isNew, outputType, aiModel, gender, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        cleanGender,
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
      gender: cleanGender,
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
  const { title, promptText, imageUrl, category_id, tags, isTrending, isNew, outputType, aiModel, gender } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
    return res.status(400).json({ error: 'Prompt text is required' });
  }
  if (!category_id || typeof category_id !== 'string' || category_id.trim() === '') {
    return res.status(400).json({ error: 'Category selection is required' });
  }
  if (!gender || typeof gender !== 'string' || !ALLOWED_GENDERS.includes(gender.trim())) {
    return res.status(400).json({ error: `Invalid gender. Allowed values: ${ALLOWED_GENDERS.join(', ')}` });
  }

  const cleanGender = gender.trim();
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
            SET title = ?, promptText = ?, imageUrl = ?, category_id = ?, tags = ?, isTrending = ?, isNew = ?, outputType = ?, aiModel = ?, gender = ?
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
        cleanGender,
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
