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
const { getFirestore, Timestamp } = await import("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();

async function run() {
  console.log("Fetching active users...");
  const usersSnap = await db.collection("users").get();
  const activeUserIds = new Set();
  const userMap = {};
  
  usersSnap.docs.forEach(doc => {
    const data = doc.data();
    userMap[doc.id] = data;
    if (data.status === "active" && !data.isGhost) {
      activeUserIds.add(doc.id);
    }
  });

  console.log(`Found ${activeUserIds.size} active users.`);

  console.log("Fetching all active (non-deleted) clients...");
  const clientsSnap = await db.collection("clients").get();
  let fixCount = 0;
  
  const batch = db.batch();
  const now = Timestamp.now();

  for (const doc of clientsSnap.docs) {
    const data = doc.data();
    
    // Ignore deleted clients
    if (data.deletedAt) continue;

    const assignedUserId = data.assignedUserId;
    const isOrphan = data.isOrphan;

    // Check if the assigned user is missing or inactive
    if (assignedUserId && !activeUserIds.has(assignedUserId) && !isOrphan) {
      const userDoc = userMap[assignedUserId];
      const userName = userDoc ? userDoc.fullName : (data.assignedUserName || "Unknown");
      
      console.log(`Fixing Client: ${data.fullName} (ID: ${doc.id})`);
      console.log(`  Assigned Employee: ${userName} (ID: ${assignedUserId}) - Status: ${userDoc ? userDoc.status : "Deleted"}`);
      
      batch.update(doc.ref, {
        isOrphan: true,
        orphanedAt: now,
        originalAssignedUserName: userName,
        updatedAt: now
      });
      
      fixCount++;
    }
  }

  if (fixCount > 0) {
    await batch.commit();
    console.log(`Successfully fixed and flagged ${fixCount} client(s) as orphaned!`);
  } else {
    console.log("No orphaned clients found that needed fixing.");
  }
}

run().catch(console.error);
