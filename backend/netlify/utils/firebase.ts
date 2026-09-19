import admin from 'firebase-admin';

/**
 * Normalizes and cleans a PEM private key string from process.env.
 * Handles surrounding quotes, escaped quotes, literal \n, CRLF, and extra whitespace.
 */
function formatPrivateKey(key: string): string {
  if (!key || typeof key !== 'string') return key;

  let sanitized = key.trim();

  // Remove surrounding single or double quotes if present
  while (
    (sanitized.startsWith('"') && sanitized.endsWith('"')) ||
    (sanitized.startsWith("'") && sanitized.endsWith("'"))
  ) {
    sanitized = sanitized.slice(1, -1).trim();
  }

  // Unescape double-escaped quotes if present
  sanitized = sanitized.replace(/\\"/g, '"').replace(/\\'/g, "'");

  // Convert literal '\n' and '\r\n' sequences to actual newline characters
  sanitized = sanitized
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\n/g, '\n');

  // Normalize actual Windows CRLF to standard LF
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip quotes again if unescaping revealed another quote wrapper
  while (
    (sanitized.startsWith('"') && sanitized.endsWith('"')) ||
    (sanitized.startsWith("'") && sanitized.endsWith("'"))
  ) {
    sanitized = sanitized.slice(1, -1).trim();
  }

  return sanitized;
}

/**
 * Logs non-secret diagnostic metadata for private key verification.
 * NEVER prints or exposes any key content.
 */
function logPrivateKeyDiagnostics(rawKey: string, formattedKey: string, label: string = 'FIREBASE_PRIVATE_KEY') {
  if (!rawKey) {
    console.log(`[Firebase Admin Diagnostics] ${label}: Not provided or empty.`);
    return;
  }

  console.log(`[Firebase Admin Diagnostics] ${label}:`, {
    rawLength: rawKey.length,
    formattedLength: formattedKey.length,
    rawStartsWithBegin: rawKey.trim().startsWith('-----BEGIN PRIVATE KEY-----'),
    formattedStartsWithBegin: formattedKey.startsWith('-----BEGIN PRIVATE KEY-----'),
    rawEndsWithEnd: rawKey.trim().endsWith('-----END PRIVATE KEY-----'),
    formattedEndsWithEnd: formattedKey.endsWith('-----END PRIVATE KEY-----'),
    hadLiteralSlashN: rawKey.includes('\\n'),
    hasActualNewline: formattedKey.includes('\n'),
    hadSurroundingQuotes:
      (rawKey.trim().startsWith('"') && rawKey.trim().endsWith('"')) ||
      (rawKey.trim().startsWith("'") && rawKey.trim().endsWith("'")),
  });
}

/**
 * Initializes and returns the Firebase Admin SDK instance.
 * Reads credentials ONLY from environment variables:
 * - FIREBASE_SERVICE_ACCOUNT (full service account JSON string)
 * OR
 * - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
export function getFirebaseAdmin() {
  if (admin.apps.length > 0 && admin.apps[0] != null) {
    return admin;
  }

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (serviceAccountEnv && serviceAccountEnv.trim() !== '') {
    try {
      const parsedServiceAccount = JSON.parse(serviceAccountEnv);
      if (parsedServiceAccount.private_key && typeof parsedServiceAccount.private_key === 'string') {
        const rawKey = parsedServiceAccount.private_key;
        parsedServiceAccount.private_key = formatPrivateKey(rawKey);
        logPrivateKeyDiagnostics(rawKey, parsedServiceAccount.private_key, 'FIREBASE_SERVICE_ACCOUNT.private_key');
      }
      admin.initializeApp({
        credential: admin.credential.cert(parsedServiceAccount),
      });
      return admin;
    } catch (e: any) {
      throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable: ${e.message}`);
    }
  }

  if (projectId && clientEmail && privateKey) {
    const formattedPrivateKey = formatPrivateKey(privateKey);
    logPrivateKeyDiagnostics(privateKey, formattedPrivateKey, 'FIREBASE_PRIVATE_KEY');

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId.trim(),
          clientEmail: clientEmail.trim(),
          privateKey: formattedPrivateKey,
        }),
      });
      return admin;
    } catch (e: any) {
      throw new Error(`Failed to initialize Firebase Admin SDK credential: ${e.message}`);
    }
  }

  throw new Error(
    "Missing Firebase Admin credentials. Please configure FIREBASE_SERVICE_ACCOUNT or " +
    "(FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) in environment variables."
  );
}

export function getMessaging() {
  const firebaseAdmin = getFirebaseAdmin();
  return firebaseAdmin.messaging();
}
