import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

async function testCloudinary() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    console.error("❌ Cloudinary credentials missing in environment variables.");
    process.exit(1);
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });

  console.log(`Connecting to Cloudinary (Cloud Name: ${cloud_name})...`);
  
  try {
    const result = await cloudinary.api.ping();
    if (result.status === 'ok') {
      console.log("✅ Cloudinary connection successful!");
    } else {
      console.log("⚠️ Cloudinary returned unexpected status:", result);
    }
  } catch (e) {
    console.error("❌ Failed to connect to Cloudinary:", e.message || e);
    process.exit(1);
  }
}

testCloudinary();
