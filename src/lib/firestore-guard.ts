import {
  getDoc as firestoreGetDoc,
  getDocs as firestoreGetDocs,
  onSnapshot as firestoreOnSnapshot,
  addDoc as firestoreAddDoc,
  setDoc as firestoreSetDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  DocumentReference,
  DocumentSnapshot,
  Query,
  QuerySnapshot,
  SetOptions,
  UpdateData,
  FirestoreError
} from "firebase/firestore";

// Safety limits per browser session (tab)
// Increased to accommodate legitimate initial loading of large tables/dashboards
const MAX_READS_PER_MINUTE = 15000;
const MAX_TOTAL_READS_PER_SESSION = 150000;

const MAX_WRITES_PER_MINUTE = 200;
const MAX_TOTAL_WRITES_PER_SESSION = 2000;

interface GuardStats {
  readsLastMinute: number;
  writesLastMinute: number;
  windowStart: number;
  totalReads: number;
  totalWrites: number;
}

let memoryStats: GuardStats = {
  readsLastMinute: 0,
  writesLastMinute: 0,
  windowStart: typeof Date !== "undefined" ? Date.now() : 0,
  totalReads: 0,
  totalWrites: 0,
};

function getStats(): GuardStats {
  return memoryStats;
}

function saveStats(stats: GuardStats) {
  memoryStats = stats;
}

function checkLimits(type: "read" | "write", count: number = 1) {
  const stats = getStats();
  const now = Date.now();

  // Reset window if 60 seconds have passed
  if (now > stats.windowStart + 60000) {
    stats.readsLastMinute = 0;
    stats.writesLastMinute = 0;
    stats.windowStart = now;
  }

  if (type === "read") {
    if (stats.readsLastMinute + count > MAX_READS_PER_MINUTE) {
      const errMsg = `Suspicious activity: High read rate detected (${stats.readsLastMinute + count} reads/min). Database requests blocked to prevent overbilling.`;
      triggerAlert(errMsg);
      throw new Error(errMsg);
    }
    if (stats.totalReads + count > MAX_TOTAL_READS_PER_SESSION) {
      const errMsg = `Suspicious activity: Session read limit reached (${stats.totalReads + count} reads). Database requests blocked to prevent overbilling.`;
      triggerAlert(errMsg);
      throw new Error(errMsg);
    }
  } else {
    if (stats.writesLastMinute + count > MAX_WRITES_PER_MINUTE) {
      const errMsg = `Suspicious activity: High write rate detected (${stats.writesLastMinute + count} writes/min). Database writes blocked.`;
      triggerAlert(errMsg);
      throw new Error(errMsg);
    }
    if (stats.totalWrites + count > MAX_TOTAL_WRITES_PER_SESSION) {
      const errMsg = `Suspicious activity: Session write limit reached (${stats.totalWrites + count} writes). Database writes blocked.`;
      triggerAlert(errMsg);
      throw new Error(errMsg);
    }
  }
}

function recordUsage(type: "read" | "write", count: number = 1) {
  const stats = getStats();
  const now = Date.now();

  if (now > stats.windowStart + 60000) {
    stats.readsLastMinute = 0;
    stats.writesLastMinute = 0;
    stats.windowStart = now;
  }

  if (type === "read") {
    stats.readsLastMinute += count;
    stats.totalReads += count;
  } else {
    stats.writesLastMinute += count;
    stats.totalWrites += count;
  }
  saveStats(stats);
}

function triggerAlert(message: string) {
  console.error("FirestoreGuard Alert:", message);
  if (typeof window !== "undefined") {
    import("sonner").then(({ toast }) => {
      toast.error(message, {
        duration: 10000, // Show for 10 seconds so the user sees it
        id: "firestore-guard-alert", // prevent duplicate toasts
      });
    }).catch(() => {});
  }
}

// ─── Exported Wrapped Operations ─────────────────────────────────────────────

export async function getDoc<T>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  checkLimits("read", 1);
  const snap = await firestoreGetDoc(ref);
  recordUsage("read", 1);
  return snap;
}

export async function getDocs<T>(q: Query<T>): Promise<QuerySnapshot<T>> {
  checkLimits("read", 1);
  const snap = await firestoreGetDocs(q);
  recordUsage("read", snap.size || 1);
  return snap;
}

export function onSnapshot<T>(
  reference: DocumentReference<T>,
  observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): () => void;

export function onSnapshot<T>(
  reference: DocumentReference<T>,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): () => void;

export function onSnapshot<T>(
  query: Query<T>,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): () => void;

export function onSnapshot<T>(
  query: Query<T>,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): () => void;

export function onSnapshot<T>(
  refOrQuery: any,
  ...args: any[]
): () => void {
  let next: (snapshot: any) => void = () => {};
  let error: ((error: any) => void) | undefined = undefined;

  if (typeof args[0] === "function") {
    next = args[0];
    if (typeof args[1] === "function") {
      error = args[1];
    }
  } else if (args[0] && typeof args[0].next === "function") {
    next = args[0].next;
    error = args[0].error;
  }

  const wrappedNext = (snap: any) => {
    try {
      const readCount = ("size" in snap) ? (snap.size || 1) : 1;
      checkLimits("read", readCount);
      recordUsage("read", readCount);
      next(snap);
    } catch (err: any) {
      if (error) {
        error(err);
      } else {
        console.error("FirestoreGuard onSnapshot error:", err);
      }
    }
  };

  if (typeof args[0] === "function") {
    return firestoreOnSnapshot(refOrQuery, wrappedNext, error);
  } else {
    return firestoreOnSnapshot(refOrQuery, {
      ...args[0],
      next: wrappedNext,
      error: error
    });
  }
}

export async function addDoc<T>(ref: any, data: T): Promise<DocumentReference<T>> {
  checkLimits("write", 1);
  const docRef = await firestoreAddDoc(ref, data);
  recordUsage("write", 1);
  return docRef;
}

export async function setDoc<T>(ref: DocumentReference<T>, data: T, options?: SetOptions): Promise<void> {
  checkLimits("write", 1);
  const res = options ? await firestoreSetDoc(ref, data, options) : await firestoreSetDoc(ref, data);
  recordUsage("write", 1);
  return res;
}

export async function updateDoc(ref: DocumentReference<any>, data: UpdateData<any>): Promise<void> {
  checkLimits("write", 1);
  const res = await firestoreUpdateDoc(ref, data);
  recordUsage("write", 1);
  return res;
}

export async function deleteDoc(ref: DocumentReference<any>): Promise<void> {
  checkLimits("write", 1);
  const res = await firestoreDeleteDoc(ref);
  recordUsage("write", 1);
  return res;
}
