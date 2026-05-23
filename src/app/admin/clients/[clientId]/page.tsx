"use client";

import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightLeft, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TransferOwnershipModal } from "@/components/admin/TransferOwnershipModal";
import { FollowUpForm } from "@/components/clients/FollowUpForm";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployees } from "@/hooks/useEmployees";
import { useClientFollowUps } from "@/hooks/useFollowUps";
import { useAuth } from "@/lib/auth-context";
import { cn, formatCurrency } from "@/lib/utils";
import { deleteClient, subscribeClient } from "@/services/clients";
import { leadStatusLabels, priorityLabels, type Client } from "@/types";

export default function AdminClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { employees } = useEmployees();
  const followUps = useClientFollowUps(params.clientId);

  useEffect(() => subscribeClient(params.clientId, setClient), [params.clientId]);

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
      <TopBar title={client.fullName} description={`${client.city} · owned by ${client.assignedUserName}`} mode="admin" backHref="/admin/clients" />
      <PageBreadcrumb
        crumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: client.fullName },
        ]}
      />
      <div className="space-y-5 p-4 lg:p-8">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 text-danger" />
            Delete
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="h-4 w-4" />
            Transfer
          </Button>
          <Link
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            href={`/admin/clients/${client.clientId}/edit`}
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        </div>
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <CardTitle>Client Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="Mobile" value={client.primaryMobile} />
              <Info label="Email" value={client.email || "-"} />
              <Info label="Address" value={client.address} />
              <Info label="Property" value={`${client.propertyType} · ${client.bhkRequirement}`} />
              <Info label="Budget" value={formatCurrency(client.budget)} />
              <Info label="Preferred location" value={client.preferredLocation} />
              <Info label="Lead source" value={client.leadSource} />
              <Info label="Owner" value={client.assignedUserName} />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className="mt-1" variant="secondary">{leadStatusLabels[client.leadStatus]}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Priority</p>
                <Badge className="mt-1" variant={client.priority === "high" ? "danger" : client.priority === "medium" ? "warning" : "secondary"}>
                  {priorityLabels[client.priority]}
                </Badge>
              </div>
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
                    <TableCell>{item.nextFollowUpDate?.toDate ? format(item.nextFollowUpDate.toDate(), "dd MMM yyyy") : "-"}</TableCell>
                    <TableCell>{leadStatusLabels[item.status]}</TableCell>
                    <TableCell>{item.note}</TableCell>
                    <TableCell>{item.createdByName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <TransferOwnershipModal client={client} employees={employees} open={transferOpen} onOpenChange={setTransferOpen} />

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
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
