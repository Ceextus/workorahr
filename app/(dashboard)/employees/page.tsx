import type { Metadata } from "next";

import { EmployeeDirectory } from "@/features/employees/components/employee-directory";
import { getSession } from "@/lib/auth";
import { isHR } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Employees · Workora",
};

export default async function EmployeesPage() {
  const user = await getSession();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Employees</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Manage your team, their placement and their access.
        </p>
      </header>

      {/*
        `canManage` decides whether Add / Deactivate / Reactivate are offered.
        Courtesy only — every one of those endpoints is [HR+] and the backend
        re-checks. Hiding them just avoids offering actions that will 403.
      */}
      <EmployeeDirectory canManage={isHR(user?.userType)} />
    </div>
  );
}
