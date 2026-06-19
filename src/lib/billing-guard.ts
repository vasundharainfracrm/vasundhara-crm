import "server-only";

import { adminDb } from "@/lib/firebase-admin";
import { getISTDateString, getISTMonthString, isBillingLimitActive, type BillingConfig } from "./billing-utils";

// Cache the billing status for 60 seconds to avoid reading Firestore on every single API request.
let cachedStatus: { isBlocked: boolean; expiresAt: number } | null = null;

export async function checkServerBillingLimit() {
  const now = Date.now();

  // Return cached status if it's still valid
  if (cachedStatus && now < cachedStatus.expiresAt) {
    if (cachedStatus.isBlocked) {
      throw new Error("Resource Exhausted: Billing limit exceeded. Non-admin operations are suspended.");
    }
    return;
  }

  try {
    const docRef = adminDb.collection("system").doc("billing");
    const doc = await docRef.get();

    if (!doc.exists) {
      // If billing config doesn't exist, we default to unrestricted
      cachedStatus = { isBlocked: false, expiresAt: now + 60000 };
      return;
    }

    const data = doc.data() as BillingConfig;
    const today = getISTDateString();
    const thisMonth = getISTMonthString();

    let needsReset = false;
    const updateData: Partial<BillingConfig> = {};

    // Daily self-healing rollover
    if (data.dailyLimitExceeded && data.lastDailyAlertDate !== today) {
      needsReset = true;
      updateData.dailyLimitExceeded = false;
      updateData.dailySpend = 0;
    }

    // Monthly self-healing rollover
    if (data.monthlyLimitExceeded && data.lastMonthlyAlertDate !== thisMonth) {
      needsReset = true;
      updateData.monthlyLimitExceeded = false;
      updateData.monthlySpend = 0;
    }

    if (needsReset) {
      updateData.updatedAt = new Date().toISOString();
      await docRef.update(updateData);
      
      const updatedData = { ...data, ...updateData };
      const isBlocked = isBillingLimitActive(updatedData);
      cachedStatus = { isBlocked, expiresAt: now + 60000 };
    } else {
      const isBlocked = isBillingLimitActive(data);
      cachedStatus = { isBlocked, expiresAt: now + 60000 };
    }

    if (cachedStatus.isBlocked) {
      throw new Error("Resource Exhausted: Billing limit exceeded. Non-admin operations are suspended.");
    }
  } catch (err: any) {
    if (err.message?.includes("Resource Exhausted")) {
      throw err;
    }
    // Log and allow request if it is a transient error connecting to Firestore (to avoid locking out users on random connection drops)
    console.error("Failed to verify billing limits, allowing request:", err);
  }
}

/**
 * Directly check if a user is bypassed.
 */
export async function isUserBypassed(uid: string): Promise<boolean> {
  try {
    const doc = await adminDb.collection("system").doc("billing").get();
    if (!doc.exists) return false;
    const data = doc.data() as BillingConfig;
    return data.bypassUsers?.includes(uid) || false;
  } catch {
    return false;
  }
}
