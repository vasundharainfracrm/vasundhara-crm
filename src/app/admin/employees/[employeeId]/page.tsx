"use client";

import { useParams } from "next/navigation";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useEmployees } from "@/hooks/useEmployees";

export default function EditEmployeePage() {
  const params = useParams<{ employeeId: string }>();
  const { employees } = useEmployees();
  const employee = employees.find((item) => item.uid === params.employeeId);

  return (
    <>
      <TopBar title="Edit Employee" description="Update Firestore profile and access status." mode="admin" backHref="/admin/employees" />
      <PageBreadcrumb
        crumbs={[
          { label: "Employees", href: "/admin/employees" },
          { label: employee?.fullName || "Employee" },
        ]}
      />
      <div className="p-4 lg:p-8">
        {employee ? <EmployeeForm employee={employee} /> : <p className="text-sm text-muted-foreground">Loading employee...</p>}
      </div>
    </>
  );
}
