"use client";

import Link from "next/link";
import { Mail, Phone, Users } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { SkeletonCircle, SkeletonText } from "@/components/ui/skeleton";
import type { Employee } from "@/features/employees/types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card bg-surface-raised p-6 shadow-card">
      <SkeletonCircle size={72} />
      <div className="flex w-full flex-col items-center gap-2">
        <SkeletonText width="60%" className="h-4" />
        <SkeletonText width="45%" className="h-3" />
      </div>
      <div className="w-full border-t border-border-subtle pt-4">
        <div className="flex flex-col items-center gap-2">
          <SkeletonText width="75%" className="h-3" />
          <SkeletonText width="55%" className="h-3" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The grid
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  employees: Employee[] | undefined;
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: Error | null;
}

export function EmployeeGrid({ employees, isLoading, isRefreshing = false, error }: Props) {
  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">Could not load the directory.</p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!employees?.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card bg-surface-raised px-6 py-16 text-center shadow-card">
        <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
          <Users size={22} aria-hidden />
        </span>
        <p className="text-body-lg font-semibold text-text-strong">Nobody to show</p>
        <p className="text-body-md text-text-muted">
          No employees match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4 ${
        isRefreshing ? "opacity-50" : ""
      }`}
    >
      {employees.map((employee) => (
        <Link
          key={employee.id}
          href={`/employees/${employee.id}`}
          className="group flex flex-col items-center gap-4 rounded-card bg-surface-raised p-6 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float"
        >
          <Avatar
            name={`${employee.firstName} ${employee.lastName}`}
            src={employee.profilePictureUrl}
            size={72}
          />

          <div className="min-w-0 w-full">
            <p className="truncate text-body-lg font-bold text-text-strong">
              {employee.firstName} {employee.lastName}
            </p>
            <p className="truncate text-body-md text-text-muted">
              {employee.jobTitle ?? "No job title"}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 border-t border-border-subtle pt-4">
            <span className="flex min-w-0 items-center justify-center gap-2 text-body-sm text-text-muted">
              <Mail size={14} className="shrink-0" aria-hidden />
              <span className="truncate">{employee.email}</span>
            </span>
            <span className="flex items-center justify-center gap-2 text-body-sm text-text-muted">
              <Phone size={14} className="shrink-0" aria-hidden />
              {employee.phone ?? "—"}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/*
 * This is the mockup's Directory screen. It is the one design in the set that
 * needs no new endpoint at all — same GET /employees, same fields, arranged as
 * cards instead of rows.
 *
 * Because of that it is a *view toggle* on /employees rather than its own route.
 * A separate /directory page would mean two routes fetching identical data,
 * duplicated filter state, and two places to fix a bug.
 *
 * The mockup shows photographs, and `<Avatar>` shows them where they exist.
 * Only /employees/me/profile-picture can set one, so nobody uploads on a
 * colleague's behalf — everyone has to add their own. Until they do, the same
 * component falls back to initials, which is why nothing here has to branch on
 * whether a picture is present.
 */
