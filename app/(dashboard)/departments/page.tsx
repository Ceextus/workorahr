import type { Metadata } from "next";

import { DepartmentBoard } from "@/features/departments/components/department-board";
import { getSession } from "@/lib/auth";
import { isHR } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Departments · Workora",
};

export default async function DepartmentsPage() {
  const user = await getSession();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Departments</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          The teams people belong to. Every employee needs one.
        </p>
      </header>

      <DepartmentBoard canManage={isHR(user?.userType)} />
    </div>
  );
}

/*
 * READS ARE OPEN, WRITES ARE [HR+].
 *
 * GET /departments carries no role annotation — anyone signed in can see the
 * list, which is what the employee filter dropdown depends on. Create, update
 * and delete are all [HR+].
 *
 * So the page is not gated; only the buttons are, and the backend re-checks
 * every write regardless.
 */
