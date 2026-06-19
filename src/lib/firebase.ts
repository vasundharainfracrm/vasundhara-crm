import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

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

// Initialize Firestore with settings
export const db = isClient
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : getFirestore(app);

// Export wrapped Firestore operations for client-side loop protection
export { getDoc, getDocs, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc } from "./firestore-guard";
import { initBillingListener } from "./firestore-guard";

// Initialize soft billing limit listener on the client side
if (isClient) {
  initBillingListener(db);
}
