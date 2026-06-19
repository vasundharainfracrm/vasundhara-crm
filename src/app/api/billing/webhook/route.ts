import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getISTDateString, getISTMonthString } from "@/lib/billing-utils";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const configuredSecret = process.env.BILLING_WEBHOOK_SECRET;

  // Verify the custom secret to protect the endpoint
  if (!configuredSecret || secret !== configuredSecret) {
    console.warn("Billing webhook received unauthorized request or secret is not configured.");
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json();
    let payload = body;

    // Handle Google Cloud Pub/Sub Push subscription wrapper if present
    if (body.message?.data) {
      try {
        const decodedData = Buffer.from(body.message.data, "base64").toString("utf-8");
        payload = JSON.parse(decodedData);
      } catch (err) {
        console.error("Failed to parse Pub/Sub base64 payload:", err);
        return NextResponse.json({ error: "Invalid Pub/Sub encoding." }, { status: 400 });
      }
    }

    const { budgetDisplayName, costAmount } = payload;

    if (!budgetDisplayName) {
      console.warn("Billing webhook payload missing budgetDisplayName:", payload);
      return NextResponse.json({ error: "Missing budgetDisplayName." }, { status: 400 });
    }

    const today = getISTDateString();
    const thisMonth = getISTMonthString();
    const spend = costAmount ? parseFloat(costAmount) : 0;

    const docRef = adminDb.collection("system").doc("billing");
    const doc = await docRef.get();
    const currentData = doc.exists ? doc.data() : {};

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    const isDaily = budgetDisplayName.toLowerCase().includes("daily");
    const isMonthly = budgetDisplayName.toLowerCase().includes("monthly");

    if (isDaily) {
      updateData.dailyLimitExceeded = true;
      updateData.lastDailyAlertDate = today;
      updateData.dailySpend = spend;
      console.log(`Billing Webhook: Daily budget exceeded. Spend: ${spend} INR. Setting dailyLimitExceeded=true.`);
    }

    if (isMonthly) {
      updateData.monthlyLimitExceeded = true;
      updateData.lastMonthlyAlertDate = thisMonth;
      updateData.monthlySpend = spend;
      console.log(`Billing Webhook: Monthly budget exceeded. Spend: ${spend} INR. Setting monthlyLimitExceeded=true.`);
    }

    if (!isDaily && !isMonthly) {
      console.warn(`Billing Webhook: Unknown budget name: ${budgetDisplayName}. Defaulting to daily block.`);
      updateData.dailyLimitExceeded = true;
      updateData.lastDailyAlertDate = today;
    }

    // Perform merge update in Firestore
    await docRef.set(updateData, { merge: true });

    // Log the billing entry to the historical collection for visualization
    try {
      const historyData = {
        timestamp: new Date().toISOString(),
        date: today,
        month: thisMonth,
        dailySpend: updateData.dailySpend ?? currentData?.dailySpend ?? 0,
        monthlySpend: updateData.monthlySpend ?? currentData?.monthlySpend ?? 0,
        budgetDisplayName,
      };
      await docRef.collection("history").add(historyData);
      console.log("Logged billing history entry:", historyData);
    } catch (historyErr) {
      console.error("Failed to log billing history entry:", historyErr);
    }

    // Log the billing alert in the auditLogs collection for security auditing
    try {
      await adminDb.collection("auditLogs").add({
        action: "BILLING_BUDGET_EXCEEDED",
        details: `Budget alert triggered: ${budgetDisplayName}. Cost: ${spend} INR. System access suspended.`,
        performedBy: "system_webhook",
        performedByName: "Google Cloud Billing Webhook",
        timestamp: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.error("Failed to log billing alert to audit log:", auditErr);
    }

    return NextResponse.json({ success: true, updated: updateData });
  } catch (err: any) {
    console.error("Error processing billing webhook:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}
