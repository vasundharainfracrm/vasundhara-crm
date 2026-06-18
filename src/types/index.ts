import type { Timestamp } from "firebase/firestore";

export const leadStatuses = [
  "new_lead",
  "contacted",
  "interested",
  "site_visit_scheduled",
  "negotiation",
  "closed",
  "not_interested",
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export const leadSources = [
  "Walk-in",
  "Online",
  "Referral",
  "Social",
  "Dealer",
  "Other",
] as const;

export type LeadSource = (typeof leadSources)[number];

export const propertyTypes = ["Flat", "Villa", "Plot", "Commercial"] as const;
export type PropertyType = (typeof propertyTypes)[number];

export type UserRole = "super_admin" | "admin" | "employee";
export type UserStatus = "pending_approval" | "active" | "inactive" | "rejected";
export type LeadPriority = "high" | "medium" | "low";
export type LeadPurpose = "buy" | "rent" | "investment";

export type AppUser = {
  uid: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  role: UserRole;
  adminPermissions?: string[];
  department: string;
  status: UserStatus;
  joiningDate: Timestamp | null;
  createdAt: Timestamp;
  isGhost?: boolean;
};

export type Client = {
  clientId: string;
  fullName: string;
  primaryMobile: string;
  alternateMobile: string;
  email: string;
  city: string;
  address: string;
  propertyType: string;
  budget: number;
  preferredLocation: string;
  bhkRequirement: string;
  purpose: LeadPurpose;
  leadSource: string;
  /** Populated when leadSource === "Dealer". One or more dealer names. */
  dealers?: string[];
  leadStatus: LeadStatus;
  priority: LeadPriority;
  notes: string;
  followUpDate: Timestamp | null;
  assignedUserId: string;
  assignedUserName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null;
  deletedById?: string | null;
  deletedByName?: string | null;
  isGhost?: boolean;
};

export type FollowUp = {
  followupId: string;
  clientId: string;
  clientName: string;
  note: string;
  nextFollowUpDate: Timestamp | null;
  status: LeadStatus;
  priority?: LeadPriority;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  isGhost?: boolean;
};

export type AuditLog = {
  logId: string;
  action: string;
  performedBy: string;
  performedByName: string;
  targetId: string;
  details: string;
  timestamp: Timestamp;
  isGhost?: boolean;
};

export type ClientFormValues = {
  fullName: string;
  primaryMobile: string;
  alternateMobile: string;
  email: string;
  city: string;
  address: string;
  propertyType: string;
  budget: number;
  preferredLocation: string;
  bhkRequirement: string;
  purpose: LeadPurpose;
  leadSource: string;
  /** Names of dealers attached to this lead (populated when leadSource === "Dealer"). */
  dealers: string[];
  leadStatus: LeadStatus;
  priority: LeadPriority;
  notes: string;
  followUpDate: string;
  createdAt: string;
};

export type EmployeeFormValues = {
  fullName: string;
  email: string;
  mobileNumber: string;
  department: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
};

export type SignupFormValues = {
  fullName: string;
  email: string;
  mobileNumber: string;
  department: string;
  password: string;
};

export type AdminFormValues = {
  fullName: string;
  email: string;
  mobileNumber: string;
  department: string;
  adminPermissions?: string[];
  password?: string;
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  interested: "Interested",
  site_visit_scheduled: "Site Visit",
  negotiation: "Negotiation",
  closed: "Closed",
  not_interested: "Not Interested",
};

export const priorityLabels: Record<LeadPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};
