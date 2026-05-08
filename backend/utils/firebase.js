const admin = require("firebase-admin");
const path = require("path");

function initFirebase() {
  if (admin.apps.length) return;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccountPath) {
    try {
      const serviceAccount = require(path.resolve(serviceAccountPath));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
      console.log("✅ Firebase Admin initialized with service account.");
      return;
    } catch (error) {
      console.error("❌ Failed to initialize Firebase Admin with service account:", error.message);
    }
  }

  // Fallback: initialize with just the project ID (allows token verification via REST)
  if (projectId) {
    try {
      admin.initializeApp({
        projectId
      });
      console.log(`⚠️  Firebase Admin initialized with projectId only (${projectId}). Add FIREBASE_SERVICE_ACCOUNT_PATH to .env for full functionality.`);
    } catch (error) {
      console.error("❌ Firebase Admin fallback init failed:", error.message);
    }
  } else {
    console.warn(
      "⚠️  Neither FIREBASE_SERVICE_ACCOUNT_PATH nor FIREBASE_PROJECT_ID found in .env.\n" +
      "   Phone OTP verification will be disabled.\n" +
      "   See backend/.env for setup instructions."
    );
  }
}

/**
 * Verify a Firebase ID token from the client.
 * Returns decoded token payload or null on failure.
 */
async function verifyFirebaseToken(idToken) {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin is not initialized. Check FIREBASE_SERVICE_ACCOUNT_PATH in .env.");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    // Translate Firebase error codes to readable messages
    const code = error.code || "";
    if (code.includes("id-token-expired")) {
      const err = new Error("Firebase token has expired. Please request a new OTP.");
      err.status = 401;
      throw err;
    }
    if (code.includes("id-token-revoked")) {
      const err = new Error("Session has been revoked. Please log in again.");
      err.status = 401;
      throw err;
    }
    if (code.includes("argument-error") || code.includes("invalid-argument")) {
      const err = new Error("Invalid authentication token.");
      err.status = 400;
      throw err;
    }
    console.error("Firebase token verification failed:", error.message);
    return null;
  }
}

module.exports = { initFirebase, verifyFirebaseToken, admin };
