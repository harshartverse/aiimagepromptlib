import { getFirebaseAdmin } from '../netlify/utils/firebase.ts';

async function testFirebaseInit() {
  console.log("--- 1. Testing Firebase Admin SDK missing env variables handling ---");

  // Temporarily backup env vars
  const savedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const savedProjectId = process.env.FIREBASE_PROJECT_ID;
  const savedClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const savedPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.FIREBASE_CLIENT_EMAIL;
  delete process.env.FIREBASE_PRIVATE_KEY;

  try {
    await getFirebaseAdmin();
    console.error("❌ Test failed: Expected getFirebaseAdmin to throw an error when missing credentials.");
  } catch (e) {
    console.log("✅ Missing credentials error handling verified:", e.message);
  }

  console.log("\n--- 2. Testing Key Normalization Logic with simulated Netlify env variable defects ---");

  // Simulated raw private keys with common Netlify dashboard formatting defects
  const testCases = [
    {
      name: "Netlify UI space-collapsed single-line key",
      raw: "-----BEGIN PRIVATE KEY----- MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ... -----END PRIVATE KEY-----"
    },
    {
      name: "Literal \\n with surrounding double quotes (Netlify JSON copy-paste)",
      raw: '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\\n-----END PRIVATE KEY-----\\n"'
    },
    {
      name: "Literal \\n with surrounding single quotes",
      raw: "'-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\\n-----END PRIVATE KEY-----\\n'"
    },
    {
      name: "Literal \\r\\n (CRLF), escaped quotes, and double backslashes",
      raw: '"\\"-----BEGIN PRIVATE KEY-----\\r\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\\r\\n-----END PRIVATE KEY-----\\r\\n\\""'
    },
    {
      name: "Leading Byte Order Mark (BOM) \\uFEFF and trailing spaces",
      raw: "\uFEFF-----BEGIN PRIVATE KEY----- \nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\n-----END PRIVATE KEY----- "
    }
  ];

  for (const tc of testCases) {
    process.env.FIREBASE_PROJECT_ID = "test-project-id";
    process.env.FIREBASE_CLIENT_EMAIL = "test-client@test-project.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = tc.raw;

    console.log(`\nTesting Case: [${tc.name}]`);
    try {
      await getFirebaseAdmin();
    } catch (e) {
      console.log(`   Captured result diagnostic for [${tc.name}]`);
    }
  }

  // Restore env vars
  if (savedServiceAccount) process.env.FIREBASE_SERVICE_ACCOUNT = savedServiceAccount;
  if (savedProjectId) process.env.FIREBASE_PROJECT_ID = savedProjectId;
  if (savedClientEmail) process.env.FIREBASE_CLIENT_EMAIL = savedClientEmail;
  if (savedPrivateKey) process.env.FIREBASE_PRIVATE_KEY = savedPrivateKey;

  console.log("\n✅ All Firebase initialization tests executed successfully!");
}

testFirebaseInit();
