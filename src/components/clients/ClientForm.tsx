"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DuplicateWarningModal } from "@/components/clients/DuplicateWarningModal";
import { useAuth } from "@/lib/auth-context";
import { clientSchema } from "@/lib/validation";
import { checkDuplicateClient, createClient, updateClient } from "@/services/clients";
import { leadStatusLabels, priorityLabels, type Client, type ClientFormValues } from "@/types";

function clientDefaults(client?: Client): ClientFormValues {
  return {
    fullName: client?.fullName || "",
    primaryMobile: client?.primaryMobile || "",
    alternateMobile: client?.alternateMobile || "",
    email: client?.email || "",
    city: client?.city || "",
    address: client?.address || "",
    propertyType: client?.propertyType || "Flat",
    budget: client?.budget || 0,
    preferredLocation: client?.preferredLocation || "",
    bhkRequirement: client?.bhkRequirement || "2 BHK",
    purpose: client?.purpose || "buy",
    leadSource: client?.leadSource || "Online",
    leadStatus: client?.leadStatus || "new_lead",
    priority: client?.priority || "medium",
    notes: client?.notes || "",
    followUpDate: client?.followUpDate?.toDate ? client.followUpDate.toDate().toISOString().slice(0, 10) : "",
  };
}

export function ClientForm({ client }: { client?: Client }) {
  const { user } = useAuth();
  const router = useRouter();
  const [duplicateOwner, setDuplicateOwner] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(client?.clientId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: clientDefaults(client),
  });

  async function onSubmit(values: ClientFormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      if (!isEdit) {
        const duplicate = await checkDuplicateClient(values);
        if (duplicate.isDuplicate) {
          setDuplicateOwner(duplicate.ownerName);
          return;
        }
        const id = await createClient(values, user);
        toast.success("Client created.");
        router.push(`/dashboard/clients/${id}`);
      } else if (client) {
        await updateClient(client.clientId, values, user);
        toast.success("Client updated.");
        router.push(user.role === "admin" ? `/admin/clients/${client.clientId}` : `/dashboard/clients/${client.clientId}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save client.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
            <CardDescription>Identity and contact details for duplicate-safe ownership.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Full name" error={errors.fullName?.message}>
              <Input {...register("fullName")} />
            </Field>
            <Field label="Primary mobile" error={errors.primaryMobile?.message}>
              <Input {...register("primaryMobile")} />
            </Field>
            <Field label="Alternate mobile" error={errors.alternateMobile?.message}>
              <Input {...register("alternateMobile")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </Field>
            <Field label="City" error={errors.city?.message}>
              <Input {...register("city")} />
            </Field>
            <Field label="Address" error={errors.address?.message}>
              <Input {...register("address")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property Requirements</CardTitle>
            <CardDescription>Capture what the client is looking for.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Property type" error={errors.propertyType?.message}>
              <Select {...register("propertyType")}>
                <option>Flat</option>
                <option>Villa</option>
                <option>Plot</option>
                <option>Commercial</option>
              </Select>
            </Field>
            <Field label="Budget" error={errors.budget?.message}>
              <Input type="number" min={0} {...register("budget")} />
            </Field>
            <Field label="Preferred location" error={errors.preferredLocation?.message}>
              <Input {...register("preferredLocation")} />
            </Field>
            <Field label="BHK requirement" error={errors.bhkRequirement?.message}>
              <Select {...register("bhkRequirement")}>
                <option>1 BHK</option>
                <option>2 BHK</option>
                <option>3 BHK</option>
                <option>4+ BHK</option>
                <option>Not applicable</option>
              </Select>
            </Field>
            <Field label="Purpose" error={errors.purpose?.message}>
              <Select {...register("purpose")}>
                <option value="buy">Buy</option>
                <option value="rent">Rent</option>
                <option value="investment">Investment</option>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Info</CardTitle>
            <CardDescription>Status, priority, and next action.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Lead source" error={errors.leadSource?.message}>
              <Select {...register("leadSource")}>
                <option>Walk-in</option>
                <option>Online</option>
                <option>Referral</option>
                <option>Social</option>
                <option>Other</option>
              </Select>
            </Field>
            <Field label="Lead status" error={errors.leadStatus?.message}>
              <Select {...register("leadStatus")}>
                {Object.entries(leadStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority" error={errors.priority?.message}>
              <Select {...register("priority")}>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Follow-up date" error={errors.followUpDate?.message}>
              <Input type="date" {...register("followUpDate")} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Notes" error={errors.notes?.message}>
                <Textarea {...register("notes")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : isEdit ? "Save changes" : "Add client"}
          </Button>
        </div>
      </form>

      <DuplicateWarningModal open={Boolean(duplicateOwner)} ownerName={duplicateOwner} onClose={() => setDuplicateOwner(undefined)} />
    </>
  );
}
