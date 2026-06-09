"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
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
    dealers: client?.dealers ?? [],
    leadStatus: client?.leadStatus || "new_lead",
    priority: client?.priority || "medium",
    notes: client?.notes || "",
    followUpDate: client?.followUpDate?.toDate
      ? client.followUpDate.toDate().toISOString().slice(0, 10)
      : "",
  };
}

type ClientFormProps = {
  client?: Client;
  /**
   * When true the form renders without its own submit/cancel buttons.
   * The parent controls submission via the returned `submitRef`.
   * Dirty state is reported via `onDirtyChange`.
   */
  inline?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  /** Attach this ref to trigger form submission from outside */
  submitRef?: React.RefObject<(() => void) | null>;
  /** Attach this ref to trigger form reset (discard) from outside */
  resetRef?: React.RefObject<(() => void) | null>;
  /**
   * When provided the client is assigned to this user instead of the
   * currently logged-in user. Used by the admin "Add client" flow so
   * admins can keep the client or assign it to an employee.
   */
  assignedTo?: { uid: string; fullName: string };
  /** When true, successful create redirects to /admin/clients/{id} */
  adminMode?: boolean;
};

export function ClientForm({ client, inline = false, onDirtyChange, submitRef, resetRef, assignedTo, adminMode = false }: ClientFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [duplicateOwner, setDuplicateOwner] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(client?.clientId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: clientDefaults(client),
  });

  // Watch the dealers array and lead source directly for the multi-input UI
  const dealers = watch("dealers") ?? [];
  const leadSource = watch("leadSource");

  function addDealer() {
    setValue("dealers", [...dealers, ""], { shouldDirty: true });
  }

  function removeDealer(index: number) {
    setValue(
      "dealers",
      dealers.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  }

  // When the user switches away from "Dealer", clear any typed dealer names
  const prevLeadSourceRef = useRef(leadSource);
  useEffect(() => {
    if (prevLeadSourceRef.current === "Dealer" && leadSource !== "Dealer") {
      setValue("dealers", [], { shouldDirty: true });
    }
    prevLeadSourceRef.current = leadSource;
  }, [leadSource, setValue]);

  // Report dirty state to parent
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Re-seed form when client data changes from Firestore (real-time updates)
  // but only if the form is currently pristine so we don't stomp in-progress edits
  const prevClientRef = useRef<Client | undefined>(client);
  useEffect(() => {
    if (client && prevClientRef.current !== client && !isDirty) {
      reset(clientDefaults(client));
      prevClientRef.current = client;
    }
  }, [client, isDirty, reset]);

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
        const id = await createClient(values, user, assignedTo);
        toast.success("Client created.");
        router.push(adminMode ? `/admin/clients/${id}` : `/dashboard/clients/${id}`);
      } else if (client) {
        await updateClient(client.clientId, values, user);
        toast.success("Client updated.");
        // Reset dirty state after successful save
        reset(values);
        if (!inline) {
          router.push(
            user.role === "admin"
              ? `/admin/clients/${client.clientId}`
              : `/dashboard/clients/${client.clientId}`,
          );
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save client.");
    } finally {
      setSubmitting(false);
    }
  }

  // Expose submit trigger to parent via ref
  useEffect(() => {
    if (submitRef) {
      submitRef.current = handleSubmit(onSubmit);
    }
    if (resetRef) {
      resetRef.current = () => reset(clientDefaults(client));
    }
  });

  return (
    <>
      <form id="client-form" className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
            <Field label="Budget (₹)" error={errors.budget?.message}>
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
                <option>Dealer</option>
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
              <Controller
                control={control}
                name="followUpDate"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>

            {/* ── Dealer multi-input — visible only when Lead Source = "Dealer" ── */}
            {leadSource === "Dealer" && (
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Dealers
                    <span className="ml-1 text-xs text-muted-foreground">(at least one required)</span>
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addDealer}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Dealer
                  </Button>
                </div>

                {dealers.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border bg-surface/40 py-4 text-center text-sm text-muted-foreground">
                    No dealers added yet. Click &ldquo;Add Dealer&rdquo; to attach one.
                  </p>
                )}

                <div className="space-y-2">
                  {dealers.map((dealerName, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        id={`dealer-input-${index}`}
                        placeholder={`Dealer name ${index + 1}`}
                        value={dealerName}
                        onChange={(e) => {
                          const updated = [...dealers];
                          updated[index] = e.target.value;
                          setValue("dealers", updated, { shouldDirty: true });
                        }}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        title="Remove dealer"
                        onClick={() => removeDealer(index)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Show per-dealer validation errors */}
                {Array.isArray(errors.dealers) &&
                  (errors.dealers as { message?: string }[]).map((err, i) =>
                    err?.message ? (
                      <p key={i} className="text-xs text-destructive">
                        Dealer {i + 1}: {err.message}
                      </p>
                    ) : null,
                  )}
              </div>
            )}

            <div className="md:col-span-2 min-w-0">
              <Field label="Notes" error={errors.notes?.message}>
                <Textarea {...register("notes")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Only render own buttons when NOT in inline (embedded) mode */}
        {!inline && (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add client"}
            </Button>
          </div>
        )}
      </form>

      <DuplicateWarningModal
        open={Boolean(duplicateOwner)}
        ownerName={duplicateOwner}
        onClose={() => setDuplicateOwner(undefined)}
      />
    </>
  );
}
