"use client";

import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightLeft, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { TransferOwnershipModal } from "@/components/admin/TransferOwnershipModal";
import { ClientForm } from "@/components/clients/ClientForm";
import { FollowUpForm } from "@/components/clients/FollowUpForm";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployees } from "@/hooks/useEmployees";
import { useClientFollowUps } from "@/hooks/useFollowUps";
import { useAuth } from "@/lib/auth-context";
import { deleteClient, subscribeClient } from "@/services/clients";
import { leadStatusLabels, type Client } from "@/types";

export default function AdminClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const { employees } = useEmployees();
  const followUps = useClientFollowUps(params.clientId);

  const submitRef = useRef<(() => void) | null>(null);
  const resetRef = useRef<(() => void) | null>(null);

  useEffect(() => subscribeClient(params.clientId, setClient), [params.clientId]);

  const handleDirtyChange = useCallback((dirty: boolean) => setIsDirty(dirty), []);

  async function handleSave() {
    if (!submitRef.current) return;
    setSaving(true);
    try {
      await submitRef.current();
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    resetRef.current?.();
  }

  async function handleDelete() {
    if (!client || !user) return;
    setDeleting(true);
    try {
      await deleteClient(client.clientId, client.fullName, user);
      toast.success("Client deleted.");
      router.push("/admin/clients");
    } catch {
      toast.error("Unable to delete client.");
      setDeleting(false);
    }
  }

  if (!client) {
    return (
      <>
        <TopBar title="Client" mode="admin" backHref="/admin/clients" />
        <PageBreadcrumb
          crumbs={[
            { label: "Clients", href: "/admin/clients" },
            { label: "Loading..." },
          ]}
        />
        <div className="p-8 text-sm text-muted-foreground">Loading client...</div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title={client.fullName}
        description={`${client.city} · owned by ${client.assignedUserName}`}
        mode="admin"
        backHref="/admin/clients"
      />
      <PageBreadcrumb
        crumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: client.fullName },
        ]}
      />

      <div className="space-y-5 p-4 lg:p-8">
        {/* ── Sticky action bar ──────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 text-danger" />
              Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft className="h-4 w-4" />
              Transfer
            </Button>
          </div>

          {isDirty && (
            <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-1.5">
              <span className="text-xs font-medium text-accent">Unsaved changes</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                disabled={saving}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="h-7">
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </div>

        {/* ── Full inline form ───────────────────────────────── */}
        <ClientForm
          client={client}
          inline
          onDirtyChange={handleDirtyChange}
          submitRef={submitRef}
          resetRef={resetRef}
        />

        {/* ── Follow-up panel ────────────────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <CardTitle>Follow-up History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followUps.map((item) => (
                    <TableRow key={item.followupId}>
                      <TableCell>
                        {item.nextFollowUpDate?.toDate
                          ? format(item.nextFollowUpDate.toDate(), "dd MMM yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>{leadStatusLabels[item.status]}</TableCell>
                      <TableCell>{item.note}</TableCell>
                      <TableCell>{item.createdByName}</TableCell>
                    </TableRow>
                  ))}
                  {!followUps.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No follow-ups added yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin Follow-up</CardTitle>
            </CardHeader>
            <CardContent>
              <FollowUpForm client={client} />
            </CardContent>
          </Card>
        </div>
      </div>

      <TransferOwnershipModal
        client={client}
        employees={employees}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete client?</DialogTitle>
            <DialogDescription>
              This will permanently remove <strong>{client.fullName}</strong> from the pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
