"use client";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Mail,
  Phone,
  Pencil,
  Power,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton, SkeletonCircle, SkeletonText } from "@/components/ui/skeleton";
import { EditEmployeeDrawer } from "@/features/employees/components/edit-employee-drawer";
import { ProfilePictureUpload } from "@/features/employees/components/profile-picture-upload";
import {
  useDeactivateEmployee,
  useEmployee,
  useMyProfile,
  useReactivateEmployee,
} from "@/features/employees/hooks";
import { useDepartmentNameMap } from "@/features/departments/hooks";
import { useRoleNameMap } from "@/features/roles/hooks";
import {
  getEmployeeDepartmentName,
  getEmployeeRoleName,
  type Employee,
} from "@/features/employees/types";
import { usePayrollForEmployee } from "@/features/payroll/hooks";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Shared bits
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ["General", "Job", "Payroll"] as const;
type Tab = (typeof TABS)[number];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-surface-raised p-6 shadow-card">
      <h2 className="text-body-sm font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Pair({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value && value !== "—" ? value : "Not set";
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <p className="text-body-sm text-text-muted">{label}</p>
      <p className="break-words text-body-md font-semibold text-text-strong">
        {display}
      </p>
    </div>
  );
}

function money(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);
}

/*
 * `Intl.NumberFormat` rather than `"$" + amount.toFixed(2)`. It places the
 * symbol correctly, groups thousands for the reader's locale, and does not
 * hard-code a currency the company may not use.
 *
 * The currency is fixed to NGN because money endpoints return a bare number with
 * no currency code. If the API gains one, this constant becomes a parameter and
 * every call site keeps working unchanged.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Tabs
// ─────────────────────────────────────────────────────────────────────────────

function GeneralTab({
  employee,
  departmentById,
  roleById,
}: {
  employee: Employee;
  departmentById?: Map<string, string>;
  roleById?: Map<string, string>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card title="Personal info">
        <div className="grid grid-cols-1 gap-x-8 divide-y divide-border-subtle sm:grid-cols-2 sm:divide-y-0">
          <Pair label="Full name" value={`${employee.firstName} ${employee.lastName}`} />
          <Pair label="Email address" value={employee.email} />
          <Pair label="Phone number" value={employee.phone} />
        </div>
      </Card>

      <Card title="Placement">
        <div className="grid grid-cols-1 gap-x-8 divide-y divide-border-subtle sm:grid-cols-2 sm:divide-y-0">
          <Pair label="Job title" value={employee.jobTitle} />
          <Pair label="Department" value={getEmployeeDepartmentName(employee, departmentById)} />
          <Pair label="Role" value={getEmployeeRoleName(employee, roleById)} />
          <Pair label="Status" value={employee.active ? "Active" : "Inactive"} />
        </div>
      </Card>
    </div>
  );
}

function JobTab({
  employee,
  departmentById,
}: {
  employee: Employee;
  departmentById?: Map<string, string>;
}) {
  // "3 years 7 months", derived rather than stored.
  const service = (() => {
    if (!employee.hireDate) return null;
    const start = new Date(employee.hireDate);
    if (Number.isNaN(start.getTime())) return null;

    const months =
      (new Date().getFullYear() - start.getFullYear()) * 12 +
      (new Date().getMonth() - start.getMonth());
    if (months < 0) return null;

    const years = Math.floor(months / 12);
    const remainder = months % 12;
    return [
      years ? `${years} year${years === 1 ? "" : "s"}` : null,
      remainder ? `${remainder} month${remainder === 1 ? "" : "s"}` : null,
    ]
      .filter(Boolean)
      .join(" ") || "Less than a month";
  })();

  return (
    <div className="flex flex-col gap-4">
      <Card title="Employment">
        <div className="grid grid-cols-1 gap-x-8 divide-y divide-border-subtle sm:grid-cols-2 sm:divide-y-0">
          <Pair label="Employee ID" value={employee.id} />
          <Pair label="Hire date" value={employee.hireDate} />
          <Pair label="Length of service" value={service} />
          <Pair label="Department" value={getEmployeeDepartmentName(employee, departmentById)} />
        </div>
      </Card>

    </div>
  );
}

function PayrollTab({ employee, canSeePay }: { employee: Employee; canSeePay: boolean }) {
  const { data: payslips, isLoading, error } = usePayrollForEmployee(employee.id, canSeePay);

  if (!canSeePay) {
    return (
      <Card title="Compensation">
        <p className="py-2 text-body-md text-text-muted">
          Only HR and administrators can view compensation.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Compensation">
        <div className="flex items-center justify-between rounded-field bg-primary/8 px-5 py-4">
          <span className="flex items-center gap-2.5 text-body-md font-semibold text-text-strong">
            <Wallet size={18} className="text-primary" aria-hidden />
            Base salary
          </span>
          <span className="text-h5 tabular-nums text-text-strong">
            {money(employee.salary) ?? "Not set"}
          </span>
        </div>
      </Card>

      <Card title="Payslips">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center justify-between gap-4">
                <SkeletonText width="7rem" />
                <Skeleton rounded="pill" className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="py-2 text-body-md text-text-muted">
            Could not load payslips. {error.message}
          </p>
        ) : !payslips?.length ? (
          <p className="py-2 text-body-md text-text-muted">
            No payroll has been processed for this employee yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {payslips.map((payslip) => (
              <li key={payslip.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-body-md font-semibold text-text-strong">
                    {payslip.payPeriod}
                  </p>
                  <p className="text-body-sm text-text-muted">
                    Gross {money(payslip.grossSalary)} · Deductions{" "}
                    {money(payslip.deductions)}
                  </p>
                </div>
                <p className="text-body-lg font-bold tabular-nums text-text-strong">
                  {money(payslip.netSalary)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Skeleton + shell
// ─────────────────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-card bg-surface-raised p-6 shadow-card lg:col-span-1">
        <div className="flex flex-col items-center gap-4">
          <SkeletonCircle size={88} />
          <SkeletonText width="10rem" className="h-5" />
          <SkeletonText width="7rem" />
          <Skeleton rounded="pill" className="h-6 w-24" />
        </div>
      </div>
      <div className="rounded-card bg-surface-raised p-6 shadow-card lg:col-span-2">
        <SkeletonText width="8rem" className="h-4" />
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <SkeletonText width="5rem" className="h-3" />
              <SkeletonText width="10rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SideCard({
  employee,
  actions,
  departmentById,
  roleById,
}: {
  employee: Employee;
  actions?: React.ReactNode;
  departmentById?: Map<string, string>;
  roleById?: Map<string, string>;
}) {
  const deptName = getEmployeeDepartmentName(employee, departmentById);
  const roleName = getEmployeeRoleName(employee, roleById);
  const rows: [LucideIcon, string, string | null][] = [
    [Mail, "Email", employee.email],
    [Phone, "Phone", employee.phone],
    [Building2, "Department", deptName !== "—" ? deptName : null],
    [ShieldCheck, "Role", roleName !== "—" ? roleName : null],
    [CalendarDays, "Hire date", employee.hireDate],
  ];

  return (
    <aside className="flex flex-col gap-5 rounded-card bg-surface-raised p-6 shadow-card">
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar
          name={`${employee.firstName} ${employee.lastName}`}
          src={employee.profilePictureUrl}
          size={88}
        />
        <div>
          <h1 className="text-h5 text-text-strong">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="mt-0.5 text-body-md text-text-muted">
            {employee.jobTitle ?? "No job title"}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-body-sm font-semibold ${
            employee.active ? "bg-primary/10 text-primary" : "bg-surface-sunk text-text-muted"
          }`}
        >
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-pill ${employee.active ? "bg-primary" : "bg-text-subtle"}`}
          />
          {employee.active ? "Active" : "Inactive"}
        </span>
      </div>

      {actions}

      <div className="flex flex-col divide-y divide-border-subtle border-t border-border-subtle pt-1">
        {rows.map(([Icon, label, value]) => (
          <div key={label} className="flex items-start gap-3 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-field bg-surface-sunk text-text-muted">
              <Icon size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-body-sm text-text-muted">{label}</p>
              <p className="break-words text-body-md font-semibold text-text-strong">
                {value || "Not set"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function ManageActions({ employee }: { employee: Employee }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const deactivate = useDeactivateEmployee();
  const reactivate = useReactivateEmployee();
  const pending = deactivate.isPending || reactivate.isPending;
  const error = deactivate.error ?? reactivate.error;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
      >
        <Pencil size={16} aria-hidden />
        Edit details
      </button>

      {employee.active ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-field bg-error/10 px-5 text-body-md font-semibold text-error transition-colors hover:bg-error/20 disabled:opacity-50"
        >
          <Power size={16} aria-hidden />
          Deactivate
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => reactivate.mutate(employee.id)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-field border border-border-strong px-5 text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk disabled:opacity-50"
        >
          <RotateCcw size={16} aria-hidden />
          Reactivate
        </button>
      )}

      {error ? (
        <p role="alert" className="text-body-sm font-medium text-error">
          {error.message}
        </p>
      ) : null}

      <EditEmployeeDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        employee={employee}
      />

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          try {
            await deactivate.mutateAsync(employee.id);
          } finally {
            setConfirming(false);
          }
        }}
        title={`Deactivate ${employee.firstName} ${employee.lastName}?`}
        description="Their login is locked immediately. The record is kept, and they can be reactivated later."
        confirmLabel="Deactivate"
        pendingLabel="Deactivating…"
        isPending={deactivate.isPending}
      />
    </div>
  );
}

export function EmployeeProfile({
  id,
  canSeePay,
  canManage = false,
}: {
  id: string;
  canSeePay: boolean;
  canManage?: boolean;
}) {
  const { data: employee, isLoading, error } = useEmployee(id);
  const { departmentById } = useDepartmentNameMap();
  const { roleById } = useRoleNameMap();
  const [tab, setTab] = useState<Tab>("General");

  // Whose profile this is, answered by the API rather than guessed. See the
  // note at the foot of the file.
  const { data: me } = useMyProfile();
  const isSelf = me?.id === id;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/employees"
        className="inline-flex w-fit items-center gap-2 text-body-md font-semibold text-text-muted transition-colors hover:text-text-strong"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to employees
      </Link>

      {error ? (
        <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
          <p className="text-body-lg font-semibold text-error">
            Could not load this employee.
          </p>
          <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
        </div>
      ) : isLoading || !employee ? (
        <ProfileSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SideCard
              employee={employee}
              departmentById={departmentById}
              roleById={roleById}
              actions={
                <div className="flex flex-col gap-4">
                  {isSelf ? (
                    <ProfilePictureUpload currentUrl={employee.profilePictureUrl} />
                  ) : null}
                  {canManage ? <ManageActions employee={employee} /> : null}
                </div>
              }
            />
          </div>

          <div className="flex flex-col gap-4 lg:col-span-2">
            <div
              role="tablist"
              aria-label="Employee details"
              className="flex gap-1 rounded-card bg-surface-raised p-1.5 shadow-card"
            >
              {TABS.map((candidate) => (
                <button
                  key={candidate}
                  role="tab"
                  type="button"
                  aria-selected={tab === candidate}
                  onClick={() => setTab(candidate)}
                  className={`flex-1 rounded-field px-4 py-2.5 text-body-md font-semibold transition-colors ${
                    tab === candidate
                      ? "bg-grey-900 text-white"
                      : "text-text-muted hover:bg-surface-sunk hover:text-text-strong"
                  }`}
                >
                  {candidate}
                </button>
              ))}
            </div>

            {tab === "General" ? (
              <GeneralTab
                employee={employee}
                departmentById={departmentById}
                roleById={roleById}
              />
            ) : null}
            {tab === "Job" ? <JobTab employee={employee} departmentById={departmentById} /> : null}
            {tab === "Payroll" ? (
              <PayrollTab employee={employee} canSeePay={canSeePay} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * THE MOCKUP HAS FIVE TABS. THREE ARE BUILDABLE.
 *
 *   General   built, but with four fields rather than fifteen. The design shows
 *             gender, date of birth, nationality, marital status, tax ID, social
 *             insurance, health insurance, a full address and an emergency
 *             contact. None of those exist on the Employee model.
 *
 *   Job       built from what is there — id, hire date, derived length of
 *             service. The design's job timeline, contract timeline and work
 *             schedule would each need their own endpoint and table.
 *
 *   Payroll   built. Base salary is on the record, and payslips come from
 *             GET /payroll/employee/{id}, which genuinely exists. The design's
 *             employment type, geofencing, recurring, one-off and offset rows do
 *             not.
 *
 *   Documents omitted entirely. There is no per-employee document endpoint —
 *             /policy-documents is organisation-wide, not personal. Drag-and-drop
 *             upload with nowhere to send the file is worse than no tab.
 *
 *   Setting   omitted. Timezone and birthday-privacy have no fields or endpoints.
 *
 * SALARY IS GATED HERE, AND THAT IS NOT ENOUGH
 *
 * `canSeePay` hides the tab's contents from non-HR viewers, and the payslips
 * query is disabled so it does not fire a request that would 403 anyway.
 *
 * The backend enforces the same rule independently: `toResponseScoped` nulls
 * `salary` for any caller who is not HR, Admin or Super Admin, so the field is
 * absent from the payload rather than merely hidden in the UI. This gate is a
 * courtesy layer on top of that, not the only thing protecting it.
 *
 * WHY `isSelf` IS COMPUTED HERE INSTEAD OF PASSED IN
 *
 * It used to be a prop, and the page filled it with `user?.id === id` — the id
 * from /auth/me compared against an employee id from the URL. Those are two
 * different tables. When they don't share a key that comparison is false for
 * everyone, and the uploader silently never appears on anyone's own profile —
 * a bug with no error message.
 *
 * `useMyProfile()` asks /employees/me, so `me.id` and the route's `id` are the
 * same kind of value by construction. It costs nothing extra: the topbar has
 * already run this query, so TanStack serves it from cache.
 *
 * While it is in flight `me` is undefined and `isSelf` is false, so the
 * uploader appears a moment after the rest of the card. That is the right way
 * round — a control that appears late is better than one that flashes on and
 * then vanishes for someone who cannot use it.
 */
