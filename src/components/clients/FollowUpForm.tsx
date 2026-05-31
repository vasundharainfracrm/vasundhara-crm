"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { useAuth } from "@/lib/auth-context";
import { followUpSchema } from "@/lib/validation";
import { createFollowUp } from "@/services/followups";
import { leadStatusLabels, type Client, type LeadStatus } from "@/types";

type FollowUpValues = {
  note: string;
  nextFollowUpDate: string;
  status: LeadStatus;
};

export function FollowUpForm({ client }: { client: Client }) {
  const { user } = useAuth();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FollowUpValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      note: "",
      nextFollowUpDate: "",
      status: client.leadStatus,
    },
  });

  async function onSubmit(values: FollowUpValues) {
    if (!user) return;
    try {
      await createFollowUp(values, client, user);
      reset({ note: "", nextFollowUpDate: "", status: values.status });
      toast.success("Follow-up added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add follow-up.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Note" error={errors.note?.message}>
        <Textarea {...register("note")} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Next follow-up" error={errors.nextFollowUpDate?.message}>
          <Controller
            control={control}
            name="nextFollowUpDate"
            render={({ field }) => (
              <DatePicker value={field.value} onChange={field.onChange} placeholder="Select Date" />
            )}
          />
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <Select {...register("status")}>
            {Object.entries(leadStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add follow-up"}
      </Button>
    </form>
  );
}
