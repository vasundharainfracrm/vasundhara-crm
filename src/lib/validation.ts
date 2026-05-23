import { z } from "zod";
import { leadStatuses } from "@/types";

const phoneSchema = z
  .string()
  .min(10, "Enter a 10 digit mobile number.")
  .regex(/^[0-9+\-\s()]+$/, "Use a valid mobile number.");

export const clientSchema = z.object({
  fullName: z.string().min(2, "Client name is required."),
  primaryMobile: phoneSchema,
  alternateMobile: z.string(),
  email: z.string().email("Enter a valid email.").or(z.literal("")),
  city: z.string().min(2, "City is required."),
  address: z.string().min(3, "Address is required."),
  propertyType: z.string().min(1, "Select property type."),
  budget: z.coerce.number().min(0, "Budget cannot be negative."),
  preferredLocation: z.string().min(2, "Preferred location is required."),
  bhkRequirement: z.string().min(1, "BHK requirement is required."),
  purpose: z.enum(["buy", "rent", "investment"]),
  leadSource: z.string().min(1, "Lead source is required."),
  leadStatus: z.enum(leadStatuses),
  priority: z.enum(["high", "medium", "low"]),
  notes: z.string(),
  followUpDate: z.string(),
});

export const employeeSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  email: z.string().email("Enter a valid email."),
  mobileNumber: phoneSchema,
  department: z.string().min(2, "Department is required."),
  role: z.enum(["admin", "employee", "super_admin"]),
  status: z.enum(["active", "inactive", "pending_approval", "rejected"]),
  password: z.string().min(8, "Use at least 8 characters.").optional().or(z.literal("")),
});

export const followUpSchema = z.object({
  note: z.string().min(3, "Add a useful follow-up note."),
  nextFollowUpDate: z.string(),
  status: z.enum(leadStatuses),
});
