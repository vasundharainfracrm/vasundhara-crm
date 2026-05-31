const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
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
