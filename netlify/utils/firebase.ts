import admin from 'firebase-admin';

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
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (serviceAccountEnv && serviceAccountEnv.trim() !== '') {
    try {
      const parsedServiceAccount = JSON.parse(serviceAccountEnv);
      admin.initializeApp({
        credential: admin.credential.cert(parsedServiceAccount),
      });
      return admin;
    } catch (e: any) {
      throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable: ${e.message}`);
    }
  }

  if (projectId && clientEmail && privateKey) {
    // Replace escaped newlines with actual newlines if stored in single-line env var
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId.trim(),
        clientEmail: clientEmail.trim(),
        privateKey: formattedPrivateKey,
      }),
    });
    return admin;
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
