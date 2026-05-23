import { EmployeeForm } from "@/components/admin/EmployeeForm";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";

export default function NewEmployeePage() {
  return (
    <>
      <TopBar title="New Employee" description="Creates Firebase Auth user and Firestore profile." mode="admin" backHref="/admin/employees" />
      <PageBreadcrumb
        crumbs={[
          { label: "Employees", href: "/admin/employees" },
          { label: "New Employee" },
        ]}
      />
      <div className="p-4 lg:p-8">
        <EmployeeForm />
      </div>
    </>
  );
}
