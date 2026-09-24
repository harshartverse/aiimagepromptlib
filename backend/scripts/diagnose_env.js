import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from 'Not to upload/.env' if it exists, or standard .env
const notToUploadEnvPath = path.resolve('Not to upload/.env');
if (fs.existsSync(notToUploadEnvPath)) {
  dotenv.config({ path: notToUploadEnvPath });
} else {
  dotenv.config();
}

console.log("=== SAFE RUNTIME ENVIRONMENT DIAGNOSTICS ===");

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

// 1. Selected Source Verification
let selectedSource = "NONE";
if (serviceAccountEnv && serviceAccountEnv.trim() !== '') {
  selectedSource = "FIREBASE_SERVICE_ACCOUNT";
} else if (projectId && clientEmail && privateKey) {
  selectedSource = "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY";
}
console.log("1. Selected Credential Source:", selectedSource);

// 2. FIREBASE_SERVICE_ACCOUNT Diagnostics
console.log("\n2. FIREBASE_SERVICE_ACCOUNT Diagnostics:");
if (!serviceAccountEnv) {
  console.log("   exists: false");
} else {
  console.log("   exists: true");
  let parseSuccess = false;
  let hasProjectId = false;
  let hasClientEmail = false;
  let hasPrivateKey = false;
  let pkRawLength = 0;
  let pkStartsWithBegin = false;
  let pkContainsLiteralSlashN = false;
  let pkContainsActualNewline = false;

  try {
    const parsed = JSON.parse(serviceAccountEnv);
    parseSuccess = true;
    hasProjectId = Boolean(parsed.project_id);
    hasClientEmail = Boolean(parsed.client_email);
    if (parsed.private_key && typeof parsed.private_key === 'string') {
      hasPrivateKey = true;
      pkRawLength = parsed.private_key.length;
      pkStartsWithBegin = parsed.private_key.trim().startsWith("-----BEGIN PRIVATE KEY-----");
      pkContainsLiteralSlashN = parsed.private_key.includes("\\n");
      pkContainsActualNewline = parsed.private_key.includes("\n");
    }
  } catch (e) {
    parseSuccess = false;
  }

  console.log("   JSON parse success:", parseSuccess);
  console.log("   whether project_id exists:", hasProjectId);
  console.log("   whether client_email exists:", hasClientEmail);
  console.log("   whether private_key exists:", hasPrivateKey);
  console.log("   private_key rawLength:", pkRawLength);
  console.log("   whether private_key starts with PEM BEGIN marker:", pkStartsWithBegin);
  console.log("   whether private_key contains literal \\n:", pkContainsLiteralSlashN);
  console.log("   whether private_key contains actual newlines:", pkContainsActualNewline);
}

// 3. FIREBASE_PRIVATE_KEY Diagnostics
console.log("\n3. FIREBASE_PRIVATE_KEY Diagnostics:");
if (!privateKey) {
  console.log("   exists: false");
} else {
  const pk = privateKey;
  console.log("   exists: true");
  console.log("   rawLength:", pk.length);
  console.log("   firstCharacterCode:", pk.charCodeAt(0));
  console.log("   lastCharacterCode:", pk.charCodeAt(pk.length - 1));
  console.log("   startsWithBeginMarker:", pk.trim().startsWith("-----BEGIN PRIVATE KEY-----"));
  console.log("   endsWithEndMarker:", pk.trim().endsWith("-----END PRIVATE KEY-----"));
  console.log("   containsLiteralBackslashN:", pk.includes("\\n"));
  console.log("   containsActualNewline:", pk.includes("\n"));
  console.log("   containsCR:", pk.includes("\r"));
  console.log("   hasSurroundingDoubleQuotes:", pk.trim().startsWith('"') && pk.trim().endsWith('"'));
  console.log("   hasSurroundingSingleQuotes:", pk.trim().startsWith("'") && pk.trim().endsWith("'"));
}

console.log("\n=========================================");
