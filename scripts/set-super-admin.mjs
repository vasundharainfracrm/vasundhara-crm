/**
 * One-off script: Set Firebase Auth custom claim role="super_admin"
 * for admin@vasundharainfra.com (or any UID you pass).
 *
 * Usage (from the project root):
 *   node scripts/set-super-admin.mjs <UID>
 *
 * The UID is the Document ID of the user in Firestore → users collection.
 * You can find it in the Firebase Console.
 *
 * This script reads credentials directly from your .env.local file —
 * no Firebase CLI login needed.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.local manually (no dotenv dependency needed) ──────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

const envContent = readFileSync(envPath, "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, "$1");
  env[key] = value;
}

const projectId   = env["FIREBASE_ADMIN_PROJECT_ID"];
const clientEmail = env["FIREBASE_ADMIN_CLIENT_EMAIL"];
const privateKey  = env["FIREBASE_ADMIN_PRIVATE_KEY"].replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌  Missing FIREBASE_ADMIN_* env vars in .env.local");
  process.exit(1);
}

// ── Import firebase-admin (already installed in this project) ────────────────
const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const auth = getAuth();

// ── Get UID from CLI arg ─────────────────────────────────────────────────────
const targetUid = process.argv[2];
if (!targetUid) {
  console.error("❌  Usage: node scripts/set-super-admin.mjs <UID>");
  console.error("    Find the UID in Firebase Console → Firestore → users collection → Document ID");
  process.exit(1);
}

// ── Verify user exists ───────────────────────────────────────────────────────
let userRecord;
try {
  userRecord = await auth.getUser(targetUid);
} catch {
  console.error(`❌  No Firebase Auth user found with UID: ${targetUid}`);
  process.exit(1);
}

// ── Set the custom claim ─────────────────────────────────────────────────────
await auth.setCustomUserClaims(targetUid, { role: "super_admin" });

// ── Verify it was set ────────────────────────────────────────────────────────
const updated = await auth.getUser(targetUid);
const claims = updated.customClaims;

if (claims?.role === "super_admin") {
  console.log(`✅  Custom claim set successfully!`);
  console.log(`    User:  ${userRecord.email ?? userRecord.uid}`);
  console.log(`    Role:  ${claims.role}`);
  console.log(`\n⚠️   The user must log out and log back in for the new claim`);
  console.log(`    to be reflected in their Firebase Auth ID token.`);
  console.log(`    (Your session API already handles this automatically on login.)`);
} else {
  console.error("❌  Claim was not set correctly. Got:", claims);
  process.exit(1);
}
