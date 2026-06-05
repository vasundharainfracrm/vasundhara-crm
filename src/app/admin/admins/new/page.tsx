"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
const adminSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  department: z.string().min(2, "Department is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  adminPermissions: z.array(z.string()),
});

type FormValues = z.infer<typeof adminSchema>;

const AVAILABLE_PERMISSIONS = [
  { id: "analytics", label: "Analytics & Reports" },
  { id: "support", label: "Customer Support" },
  { id: "billing", label: "Billing Management" },
  { id: "employees", label: "Employee Management" },
];

export default function CreateAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobileNumber: "",
      department: "",
      password: "",
      adminPermissions: [],
    },
  });

  useEffect(() => {
    if (user && user.role !== "super_admin") {
      router.replace("/admin");
    }
  }, [user, router]);

  if (!user || user.role !== "super_admin") return null;

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/superadmin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create admin");

      toast.success("Admin created successfully!");
      router.push("/admin/admins");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Sub-Admin</h1>
        <p className="text-muted-foreground">Provision a new admin account and assign modular access permissions.</p>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...form.register("fullName")} placeholder="Amit Sharma" />
              {form.formState.errors.fullName && <p className="text-sm text-red-500">{form.formState.errors.fullName.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} placeholder="amit@example.com" />
              {form.formState.errors.email && <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input id="mobileNumber" {...form.register("mobileNumber")} placeholder="+91 9876543210" />
              {form.formState.errors.mobileNumber && <p className="text-sm text-red-500">{form.formState.errors.mobileNumber.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" {...form.register("department")} placeholder="Operations" />
              {form.formState.errors.department && <p className="text-sm text-red-500">{form.formState.errors.department.message}</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="password">Initial Password (Optional)</Label>
              <Input id="password" type="password" {...form.register("password")} placeholder="Leave blank to auto-generate" />
              {form.formState.errors.password && <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium leading-none mb-4">Access Permissions</h3>
              <p className="text-sm text-muted-foreground mb-4">Select the specific modules this admin will be allowed to access.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <div key={perm.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={perm.id} 
                    checked={form.watch("adminPermissions").includes(perm.id)}
                    onCheckedChange={(checked) => {
                      const current = form.watch("adminPermissions");
                      if (checked) {
                        form.setValue("adminPermissions", [...current, perm.id], { shouldValidate: true });
                      } else {
                        form.setValue("adminPermissions", current.filter((p) => p !== perm.id), { shouldValidate: true });
                      }
                    }}
                  />
                  <Label htmlFor={perm.id} className="text-sm font-normal cursor-pointer">{perm.label}</Label>
                </div>
              ))}
            </div>
            {form.formState.errors.adminPermissions && <p className="text-sm text-red-500">{form.formState.errors.adminPermissions.message}</p>}
          </div>

          <div className="pt-4 border-t flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Admin"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
