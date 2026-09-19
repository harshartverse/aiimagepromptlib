import admin from 'firebase-admin';

/**
 * Normalizes and cleans a PEM private key string from process.env.
 * Extracts the raw Base64 payload between PEM markers, strips all non-base64 characters
 * (including spaces, quotes, BOM, and escaped newlines), wraps in 64-character lines,
 * and reconstructs standard PKCS#8 PEM format.
 */
function formatPrivateKey(key: string): string {
  if (!key || typeof key !== 'string') return key;

  let sanitized = key.trim();

  // 1. Unescape escaped double quotes / single quotes / backslashes / newlines
  sanitized = sanitized
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");

  // 2. Remove surrounding outer single or double quotes if present
  while (
    (sanitized.startsWith('"') && sanitized.endsWith('"')) ||
    (sanitized.startsWith("'") && sanitized.endsWith("'"))
  ) {
    sanitized = sanitized.slice(1, -1).trim();
  }

  const beginMarker = '-----BEGIN PRIVATE KEY-----';
  const endMarker = '-----END PRIVATE KEY-----';

  // 3. Robust PEM reconstruction: if BEGIN and KEY/END markers exist in the key string
  if (sanitized.includes('BEGIN') && sanitized.includes('KEY')) {
    const beginIdx = sanitized.indexOf('-----BEGIN');
    const endIdx = sanitized.lastIndexOf('KEY-----');

    if (beginIdx !== -1 && endIdx !== -1) {
      const headerEnd = sanitized.indexOf('-----', beginIdx + 10) + 5;
      const footerStart = sanitized.lastIndexOf('-----', endIdx);

      if (headerEnd > beginIdx && footerStart > headerEnd) {
        // Isolate Base64 body between header and footer
        const rawBody = sanitized.slice(headerEnd, footerStart);
        // Remove ALL spaces, quotes, newlines, escaped backslashes, BOM, and non-base64 characters
        const base64Body = rawBody.replace(/[^A-Za-z0-9+/=]/g, '');

        if (base64Body.length > 0) {
          // Wrap base64 into standard 64-character PEM lines
          const lines = base64Body.match(/.{1,64}/g) || [base64Body];
          return `${beginMarker}\n${lines.join('\n')}\n${endMarker}\n`;
        }
      }
    }
  }

  // Fallback if markers were missing: standard newline & CRLF replacement
  return sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Logs non-secret diagnostic metadata for private key verification.
 * NEVER prints or exposes any key content or secret values.
 */
function logPrivateKeyDiagnostics(
  rawKey: string,
  formattedKey: string,
  selectedSource: string
) {
  if (!rawKey) {
    console.log(`[Firebase Admin Diagnostics] Source: ${selectedSource} - Key is empty or undefined.`);
    return;
  }

  const beginMarkerDetected = formattedKey.includes('-----BEGIN');
  const endMarkerDetected = formattedKey.includes('-----END');

  // Extract base64 body for validation
  const beginIdx = formattedKey.indexOf('-----BEGIN');
  const endIdx = formattedKey.lastIndexOf('KEY-----');
  let base64Body = '';
  if (beginIdx !== -1 && endIdx !== -1) {
    const headerEnd = formattedKey.indexOf('-----', beginIdx + 10) + 5;
    const footerStart = formattedKey.lastIndexOf('-----', endIdx);
    if (headerEnd > beginIdx && footerStart > headerEnd) {
      base64Body = formattedKey.slice(headerEnd, footerStart).replace(/[^A-Za-z0-9+/=]/g, '');
    }
  }

  const isValidBase64Body =
    base64Body.length > 0 &&
    base64Body.length % 4 === 0 &&
    /^[A-Za-z0-9+/=]+$/.test(base64Body);

  console.log(`[Firebase Admin Diagnostics] Selected Credential Source: ${selectedSource}`, {
    rawLength: rawKey.length,
    normalizedLength: formattedKey.length,
    beginMarkerDetected,
    endMarkerDetected,
    containsActualNewline: formattedKey.includes('\n'),
    firstCharCode: rawKey.charCodeAt(0),
    lastCharCode: rawKey.charCodeAt(rawKey.length - 1),
    isValidBase64Body,
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
        logPrivateKeyDiagnostics(rawKey, parsedServiceAccount.private_key, 'FIREBASE_SERVICE_ACCOUNT');
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
    logPrivateKeyDiagnostics(privateKey, formattedPrivateKey, 'FIREBASE_PRIVATE_KEY_TRIO');

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
