import type { Metadata } from "next";

import { MyPayslips } from "@/features/payroll/components/my-payslips";
import { PayrollRegister } from "@/features/payroll/components/payroll-register";
import { getSession } from "@/lib/auth";
import { isAdmin, isHR } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Payroll · Workora",
};

export default async function PayrollPage() {
  const user = await getSession();
  const canSeeRegister = isHR(user?.userType);
  const canRun = isAdmin(user?.userType);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Payroll</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Your payslips, and the company register.
        </p>
      </header>

      <MyPayslips />

      {canSeeRegister ? (
        <section className="flex flex-col gap-4 border-t border-border-subtle pt-6">
          <div>
            <h2 className="text-h5 text-text-strong">Company register</h2>
            <p className="mt-1 text-body-md text-text-muted">
              Every payslip generated, by period.
            </p>
          </div>
          <PayrollRegister canRun={canRun} />
        </section>
      ) : null}
    </div>
  );
}

/*
 * TWO PERMISSION LEVELS ON ONE PAGE, AND THEY ARE DIFFERENT.
 *
 *   everyone   GET /payroll/me — your own payslips
 *   HR+        GET /payroll — the register
 *   ADMIN      POST /payroll/run — generating a period
 *
 * So HR can read the register but not run payroll, which is why `canRun` is a
 * separate check rather than reusing `canSeeRegister`. Collapsing them would
 * offer HR a button that 403s.
 *
 * Same shape as attendance: the personal half always renders, the company half
 * is appended. Splitting into two routes would make HR bounce between them for
 * one task.
 *
 * All three gates are courtesy — the backend re-checks every call, and the read
 * hooks set `retry: false` so a 403 settles immediately instead of retrying a
 * decision that will not change.
 */
