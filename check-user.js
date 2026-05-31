const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function run() {
  const email = "yashika@test.com";
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log("Auth user found:", user.uid, "Role claim:", user.customClaims?.role);
    
    const doc = await admin.firestore().collection("users").doc(user.uid).get();
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
