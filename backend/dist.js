var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/api.js
var api_exports = {};
__export(api_exports, {
  app: () => app,
  handler: () => handler
});
module.exports = __toCommonJS(api_exports);
var import_express = __toESM(require("express"), 1);
var import_serverless_http = __toESM(require("serverless-http"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_uuid = require("uuid");
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);

// netlify/utils/db.ts
var import_client = require("@libsql/client");
function getDbClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("Missing Turso database credentials in environment variables.");
  }
  return (0, import_client.createClient)({
    url,
    authToken
  });
}

// netlify/utils/cloudinary.ts
var import_cloudinary = require("cloudinary");
function getCloudinary() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Missing Cloudinary credentials in environment variables.");
  }
  import_cloudinary.v2.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true
  });
  return import_cloudinary.v2;
}

// netlify/functions/api.js
var app = (0, import_express.default)();
app.use((req, res, next) => {
  if (req.url.startsWith("/.netlify/functions/api")) {
    req.url = req.url.replace("/.netlify/functions/api", "");
  } else if (req.url.startsWith("/api")) {
    req.url = req.url.replace("/api", "");
  }
  if (!req.url || req.url === "") {
    req.url = "/";
  }
  next();
});
app.use(import_express.default.json({ limit: "10mb" }));
app.use((0, import_cookie_parser.default)());
var requireAuth = (req, res, next) => {
  const token = req.cookies.admin_session;
  if (!token) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  try {
    import_jsonwebtoken.default.verify(token, process.env.ADMIN_SECRET_TOKEN);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid session" });
  }
};
async function triggerBuildHook() {
  const hookUrl = process.env.NETLIFY_BUILD_HOOK_URL;
  if (hookUrl) {
    try {
      await fetch(hookUrl, { method: "POST" });
    } catch (e) {
      console.error("Failed to trigger build hook:", e);
    }
  }
}
app.post("/auth/login", (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = import_jsonwebtoken.default.sign({ admin: true }, process.env.ADMIN_SECRET_TOKEN, { expiresIn: "12h" });
  res.cookie("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 12 * 60 * 60 * 1e3
    // 12 hours
  });
  res.json({ success: true });
});
app.post("/auth/logout", (req, res) => {
  res.clearCookie("admin_session");
  res.json({ success: true });
});
app.get("/auth/session", requireAuth, (req, res) => {
  res.json({ authenticated: true });
});
app.get("/categories", async (req, res) => {
  const db = getDbClient();
  try {
    const result = await db.execute("SELECT * FROM categories ORDER BY createdAt DESC");
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});
app.post("/categories", requireAuth, async (req, res) => {
  const { name, description, imageUrl } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const id = (0, import_uuid.v4)();
  const createdAt = Date.now();
  const db = getDbClient();
  try {
    await db.execute({
      sql: "INSERT INTO categories (id, name, description, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?)",
      args: [id, name, description || "", imageUrl || "", createdAt]
    });
    triggerBuildHook();
    res.status(201).json({ id, name, description, imageUrl, createdAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create category" });
  }
});
app.put("/categories/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, description, imageUrl } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const db = getDbClient();
  try {
    const result = await db.execute({
      sql: "UPDATE categories SET name = ?, description = ?, imageUrl = ? WHERE id = ?",
      args: [name, description || "", imageUrl || "", id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: "Category not found" });
    triggerBuildHook();
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update category" });
  }
});
app.delete("/categories/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const db = getDbClient();
  try {
    const check = await db.execute({
      sql: "SELECT count(*) as count FROM prompts WHERE category = ?",
      args: [id]
    });
    if (check.rows[0].count > 0) {
      return res.status(409).json({ error: "Cannot delete category because it is in use by prompts." });
    }
    const result = await db.execute({
      sql: "DELETE FROM categories WHERE id = ?",
      args: [id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: "Category not found" });
    triggerBuildHook();
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete category" });
  }
});
app.get("/prompts", async (req, res) => {
  const db = getDbClient();
  try {
    const result = await db.execute("SELECT * FROM prompts ORDER BY createdAt DESC");
    const prompts = result.rows.map((row) => {
      let parsedTags = [];
      try {
        parsedTags = row.tags ? JSON.parse(row.tags) : [];
      } catch (e) {
      }
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
    res.status(500).json({ error: "Failed to fetch prompts" });
  }
});
app.post("/prompts", requireAuth, async (req, res) => {
  const { title, promptText, imageUrl, category, tags, isTrending, isNew } = req.body;
  if (!title || !promptText || !category) {
    return res.status(400).json({ error: "Title, promptText, and category are required" });
  }
  const id = (0, import_uuid.v4)();
  const createdAt = Date.now();
  const db = getDbClient();
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  try {
    await db.execute({
      sql: "INSERT INTO prompts (id, title, promptText, imageUrl, category, tags, isTrending, isNew, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, title, promptText, imageUrl || "", category, tagsJson, isTrending ? 1 : 0, isNew ? 1 : 0, createdAt]
    });
    triggerBuildHook();
    res.status(201).json({ id, title, promptText, imageUrl, category, tags: Array.isArray(tags) ? tags : [], isTrending, isNew, createdAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create prompt. Ensure category exists." });
  }
});
app.put("/prompts/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, promptText, imageUrl, category, tags, isTrending, isNew } = req.body;
  if (!title || !promptText || !category) {
    return res.status(400).json({ error: "Title, promptText, and category are required" });
  }
  const db = getDbClient();
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  try {
    const result = await db.execute({
      sql: "UPDATE prompts SET title = ?, promptText = ?, imageUrl = ?, category = ?, tags = ?, isTrending = ?, isNew = ? WHERE id = ?",
      args: [title, promptText, imageUrl || "", category, tagsJson, isTrending ? 1 : 0, isNew ? 1 : 0, id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: "Prompt not found" });
    triggerBuildHook();
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update prompt" });
  }
});
app.delete("/prompts/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const db = getDbClient();
  try {
    const result = await db.execute({
      sql: "DELETE FROM prompts WHERE id = ?",
      args: [id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: "Prompt not found" });
    triggerBuildHook();
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete prompt" });
  }
});
app.post("/upload", requireAuth, async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ error: "imageBase64 payload is required" });
  }
  if (!imageBase64.startsWith("data:image/")) {
    return res.status(415).json({ error: "Unsupported media type. Must be a data:image/... base64 string" });
  }
  if (imageBase64.length > 7e6) {
    return res.status(413).json({ error: "Payload too large. Limit is approx 5MB." });
  }
  try {
    const cloudinary2 = getCloudinary();
    const result = await cloudinary2.uploader.upload(imageBase64, {
      folder: "ai-image-prompt-library/prompts"
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
    res.status(500).json({ error: "Failed to upload image" });
  }
});
var handler = (0, import_serverless_http.default)(app);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app,
  handler
});
