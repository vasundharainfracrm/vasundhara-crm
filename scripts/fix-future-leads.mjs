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
  const cutoffDate = new Date("2026-06-19T00:00:00+05:30"); // Start of June 19 IST
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  const targetDate = new Date("2026-06-18T12:00:00+05:30"); // Target: June 18 12:00 PM IST
  const targetTimestamp = Timestamp.fromDate(targetDate);

  console.log(`Searching for leads with createdAt >= ${cutoffDate.toLocaleString()}`);
  console.log(`Setting their createdAt to: ${targetDate.toLocaleString()}\n`);

  const snapshot = await db.collection("clients")
    .where("createdAt", ">=", cutoffTimestamp)
    .get();

  if (snapshot.empty) {
    console.log("No future-dated leads found to update.");
    return;
  }

  console.log(`Found ${snapshot.size} future-dated leads. Starting migration...\n`);

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    console.log(`- Queueing update for: ${doc.data().fullName} (ID: ${doc.id})`);
    batch.update(doc.ref, {
      createdAt: targetTimestamp,
      updatedAt: Timestamp.now()
    });
  });

  await batch.commit();
  console.log(`\n✅ Successfully updated ${snapshot.size} future-dated leads to June 18, 2026!`);
}

run().catch(console.error);
