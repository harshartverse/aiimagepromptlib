import { getFirebaseAdmin } from '../netlify/utils/firebase.ts';

async function testFirebaseInit() {
  console.log("Testing Firebase Admin SDK initialization error handling when env variables are absent...");

  // Temporarily unset env vars for testing
  const savedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const savedProjectId = process.env.FIREBASE_PROJECT_ID;
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  delete process.env.FIREBASE_PROJECT_ID;

  try {
    getFirebaseAdmin();
    console.error("❌ Test failed: Expected getFirebaseAdmin to throw an error when missing credentials.");
  } catch (e) {
    console.log("✅ Safe failure verified:", e.message);
  } finally {
    if (savedServiceAccount) process.env.FIREBASE_SERVICE_ACCOUNT = savedServiceAccount;
    if (savedProjectId) process.env.FIREBASE_PROJECT_ID = savedProjectId;
  }
}

testFirebaseInit();
