import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();

async function run() {
  const clientsSnap = await db.collection("clients")
    .where("assignedUserId", "==", "Z1JB1ve7FzPjM6fQ3gc6r74oGI03")
    .get();
    
  console.log(`Found ${clientsSnap.size} leads total for Mansi.`);
  clientsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (!data.deletedAt) {
      console.log(`ACTIVE LEAD ID: ${doc.id}`);
      console.log(JSON.stringify(data, null, 2));
    }
  });
}

run().catch(console.error);
