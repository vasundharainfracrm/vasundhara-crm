import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env.local manually
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
  console.error("❌ Missing FIREBASE_ADMIN_* env vars");
  process.exit(1);
}

const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore, Timestamp } = await import("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();

async function run() {
  const today = new Date();
  // Today start in IST timezone
  const todayStartIST = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // In UTC, this is equivalent to yesterday 6:30 PM (18:30:00)
  const todayStartUTC = Timestamp.fromDate(todayStartIST);

  console.log(`Checking leads created on or after (IST): ${todayStartIST.toLocaleString()}`);
  console.log(`Equivalent Firestore timestamp (UTC): ${todayStartUTC.toDate().toISOString()}\n`);

  const snapshot = await db.collection("clients")
    .where("createdAt", ">=", todayStartUTC)
    .get();

  if (snapshot.empty) {
    console.log("No leads found created today.");
    return;
  }

  console.log(`Found ${snapshot.size} leads created today:\n`);
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const createdDate = data.createdAt ? data.createdAt.toDate().toLocaleString() : "no date";
    console.log(`- ID: ${doc.id}`);
    console.log(`  Name: ${data.fullName}`);
    console.log(`  Owner: ${data.assignedUserName}`);
    console.log(`  Created At: ${createdDate}`);
    console.log(`  Lead Status: ${data.leadStatus}`);
    console.log(`  isGhost: ${data.isGhost}`);
    console.log("------------------------");
  });
}

run().catch(console.error);
