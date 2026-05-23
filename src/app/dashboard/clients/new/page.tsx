import { ClientForm } from "@/components/clients/ClientForm";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";

export default function NewClientPage() {
  return (
    <>
      <TopBar title="Add Client" description="Duplicate check runs globally before saving." mode="employee" backHref="/dashboard/clients" />
      <PageBreadcrumb
        crumbs={[
          { label: "My Clients", href: "/dashboard/clients" },
          { label: "New Client" },
        ]}
      />
      <div className="p-4 lg:p-8">
        <ClientForm />
      </div>
    </>
  );
}
