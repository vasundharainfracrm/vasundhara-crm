/**
 * Utility functions for billing date and status tracking.
 * Timezone: Asia/Kolkata (IST, UTC+5:30) as pricing and usage are in INR.
 */

export function getISTDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

export function getISTMonthString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  return `${year}-${month}`;
}

export interface BillingConfig {
  monthlyLimitExceeded: boolean;
  dailyLimitExceeded: boolean;
  lastDailyAlertDate: string; // YYYY-MM-DD
  lastMonthlyAlertDate: string; // YYYY-MM
  dailySpend?: number;
  monthlySpend?: number;
  updatedAt?: string;
  bypassUsers?: string[]; // Array of UIDs that bypass limits
}

/**
 * Returns true if the billing limit is currently active (exceeded) and has not expired.
 */
export function isBillingLimitActive(data: BillingConfig | null | undefined): boolean {
  if (!data) return false;

  const today = getISTDateString();
  const thisMonth = getISTMonthString();

  const monthlyBlocked = !!data.monthlyLimitExceeded && data.lastMonthlyAlertDate === thisMonth;
  const dailyBlocked = !!data.dailyLimitExceeded && data.lastDailyAlertDate === today;

  return monthlyBlocked || dailyBlocked;
}
