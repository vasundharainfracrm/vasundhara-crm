"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, Timestamp } from "firebase/firestore";

import { auth, db, getDoc, setDoc } from "@/lib/firebase";
import type { AppUser } from "@/types";

type AuthContextValue = {
  firebaseUser: User | null;
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AppUser | null>;
  register: (data: { email: string; password: string; fullName: string; mobileNumber: string; department: string }) => Promise<void>;
  logout: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchAppUser(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as AppUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) {
      setUser(null);
      return;
    }
    setUser(await fetchAppUser(auth.currentUser.uid));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      setUser(currentUser ? await fetchAppUser(currentUser.uid) : null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    import("@/lib/firestore-guard").then(({ setBypassRole }) => {
      setBypassRole(user?.role || null);
    }).catch((err) => console.error("Failed to set bypass role:", err));
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<AppUser | null> => {
    setLoading(true);
    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();

    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      await signOut(auth);
      throw new Error("Unable to create secure session.");
    }

    // Force client to refresh token to pick up any new custom claims (like role) set by the server
    await credential.user.getIdToken(true);

    const nextUser = await fetchAppUser(credential.user.uid);
    setFirebaseUser(credential.user);
    setUser(nextUser);
    setLoading(false);
    return nextUser;
  }, []);

  const register = useCallback(async (data: { email: string; password: string; fullName: string; mobileNumber: string; department: string }) => {
    setLoading(true);
    await setPersistence(auth, browserLocalPersistence);
    const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);

    try {
      const idToken = await credential.user.getIdToken();
      const now = Timestamp.now();
      const newUserDoc: AppUser = {
        uid: credential.user.uid,
        fullName: data.fullName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        department: data.department,
        role: "employee",
        status: "pending_approval",
        joiningDate: null,
        createdAt: now,
      };

      await setDoc(doc(db, "users", credential.user.uid), newUserDoc);

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error("Unable to create secure session.");
      }

      setFirebaseUser(credential.user);
      setUser(newUserDoc);
    } catch (err) {
      // If anything fails AFTER creating the Auth account, delete it
      // so the user can try again without hitting "email already in use"
      await credential.user.delete().catch(() => null);
      await signOut(auth).catch(() => null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const wasAdmin = user?.role === "admin" || user?.role === "super_admin";
    try {
      await fetch("/api/auth/logout", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: wasAdmin ? "admin" : "employee" }),
      });
    } catch (err) {
      console.warn("Failed to hit logout API, but clearing local session anyway.", err);
    }
    await signOut(auth);
    setFirebaseUser(null);
    setUser(null);
    window.location.href = wasAdmin ? "/admin/login" : "/login";
  }, [user]);

  const sendReset = useCallback((email: string) => sendPasswordResetEmail(auth, email), []);

  const value = useMemo(
    () => ({ firebaseUser, user, loading, login, register, logout, sendReset, refreshUser }),
    [firebaseUser, user, loading, login, register, logout, sendReset, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
