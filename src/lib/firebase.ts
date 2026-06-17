import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
};

const isClient = typeof window !== "undefined";
const appName = isClient && window.location.pathname.startsWith("/admin") ? "admin" : "employee";

const app = getApps().find((a) => a.name === appName) || initializeApp(firebaseConfig, appName);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline multi-tab persistence on the client side
if (isClient) {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn("Firestore persistence failed-precondition (multiple tabs):", err);
    } else if (err.code === "unimplemented") {
      // The current browser does not support all of the features required to enable persistence.
      console.warn("Firestore persistence unimplemented in this browser:", err);
    } else {
      console.error("Firestore persistence error:", err);
    }
  });
}
