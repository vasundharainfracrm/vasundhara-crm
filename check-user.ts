import { adminDb, adminAuth } from "./src/lib/firebase-admin";

async function run() {
  const email = "yashika@test.com";
  try {
    const user = await adminAuth.getUserByEmail(email);
    console.log("Auth user found:", user.uid, "Role claim:", user.customClaims?.role);
    
    const doc = await adminDb.collection("users").doc(user.uid).get();
    if (!doc.exists) {
      console.log("No Firestore document found for:", user.uid);
    } else {
      console.log("Firestore doc:", doc.data());
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
