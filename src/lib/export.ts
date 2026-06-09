import type { Client } from "@/types";
import { leadStatusLabels, priorityLabels } from "@/types";

function formatDate(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleDateString("en-IN");
}

function escapeCsv(value: string | number | undefined | null): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportClientsCSV(clients: Client[], filename = "clients.csv") {
  const headers = [
    "Name",
    "Primary Mobile",
    "Alternate Mobile",
    "Email",
    "City",
    "Address",
    "Property Type",
    "BHK",
    "Budget",
    "Preferred Location",
    "Purpose",
    "Lead Source",
    "Dealers",
    "Lead Status",
    "Priority",
    "Follow-up Date",
    "Owner",
    "Notes",
    "Created At",
  ];

  const rows = clients.map((c) => [
    c.fullName,
    c.primaryMobile,
    c.alternateMobile,
    c.email,
    c.city,
    c.address,
    c.propertyType,
    c.bhkRequirement,
    c.budget,
    c.preferredLocation,
    c.purpose,
    c.leadSource,
    (c.dealers ?? []).join("; "),
    leadStatusLabels[c.leadStatus],
    priorityLabels[c.priority],
    formatDate(c.followUpDate),
    c.assignedUserName,
    c.notes,
    formatDate(c.createdAt),
  ]);

  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
