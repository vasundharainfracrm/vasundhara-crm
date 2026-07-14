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
  console.log("--- Users named Mansi ---");
  const usersSnap = await db.collection("users").get();
  let mansiUser = null;
  usersSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.fullName?.toLowerCase().includes("mansi") || doc.id.includes("mansi")) {
      console.log(`User ID: ${doc.id}`);
      console.log(JSON.stringify(data, null, 2));
      mansiUser = { id: doc.id, ...data };
    }
  });

  console.log("\n--- Restored leads for Mansi (by assignedUserId or name) ---");
  const clientsSnap = await db.collection("clients").get();
  clientsSnap.docs.forEach(doc => {
    const data = doc.data();
    const matchesName = data.assignedUserName?.toLowerCase().includes("mansi") || data.originalAssignedUserName?.toLowerCase().includes("mansi");
    const matchesId = mansiUser ? data.assignedUserId === mansiUser.id : false;
    
    if (matchesName || matchesId) {
      console.log(`Lead ID: ${doc.id}`);
      console.log(`  Name: ${data.fullName}`);
      console.log(`  assignedUserId: ${data.assignedUserId}`);
      console.log(`  assignedUserName: ${data.assignedUserName}`);
      console.log(`  originalAssignedUserName: ${data.originalAssignedUserName}`);
      console.log(`  deletedAt: ${data.deletedAt ? data.deletedAt.toDate().toISOString() : "null"}`);
      console.log(`  isOrphan: ${data.isOrphan}`);
      console.log(`  isGhost: ${data.isGhost}`);
    }
  });
}

run().catch(console.error);
