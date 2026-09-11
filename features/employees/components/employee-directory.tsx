"use client";

import { LayoutGrid, Plus, Table2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AddEmployeeDrawer } from "@/features/employees/components/add-employee-drawer";
import { EmployeeFilterBar } from "@/features/employees/components/employee-filters";
import { EmployeeGrid } from "@/features/employees/components/employee-grid";
import {
  EmployeeTable,
  sortEmployees,
  type SortState,
} from "@/features/employees/components/employee-table";
import { useEmployees } from "@/features/employees/hooks";
import { useDepartmentNameMap } from "@/features/departments/hooks";
import {
  getEmployeeDepartmentId,
  type Employee,
  type EmployeeClientFilters,
} from "@/features/employees/types";

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Client-side narrowing
// ─────────────────────────────────────────────────────────────────────────────

function matches(employee: Employee, filters: EmployeeClientFilters) {
  if (filters.departmentId) {
    const empDeptId = getEmployeeDepartmentId(employee);
    if (empDeptId !== filters.departmentId) {
      return false;
    }
  }
  if (filters.active !== undefined && employee.active !== filters.active) {
    return false;
  }

  if (filters.search) {
    const term = filters.search.trim().toLowerCase();
    const haystack = [
      employee.firstName,
      employee.lastName,
      `${employee.firstName} ${employee.lastName}`,
      employee.email,
      employee.jobTitle,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(term)) return false;
  }

  return true;
}

/*
 * The full name is in the haystack as well as the parts, so "Jane Smith"
 * matches even though no single field contains that string.
 *
 * All of this is local because GET /employees only filters on firstName,
 * lastName and email — see the note in employee-filters.tsx for why one search
 * box cannot be mapped onto three separate server params.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Pagination controls
// ─────────────────────────────────────────────────────────────────────────────

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (candidate) =>
      candidate === 1 || candidate === pageCount || Math.abs(candidate - page) <= 1,
  );

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 pt-2">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="h-9 rounded-field px-3 text-body-md font-semibold text-text-muted transition-colors hover:bg-surface-sunk disabled:opacity-40"
      >
        Previous
      </button>

      {pages.map((candidate, index) => {
        const previous = pages[index - 1];
        const gap = previous !== undefined && candidate - previous > 1;

        return (
          <span key={candidate} className="flex items-center gap-1.5">
            {gap ? <span className="px-1 text-text-subtle">…</span> : null}
            <button
              type="button"
              onClick={() => onChange(candidate)}
              aria-current={candidate === page ? "page" : undefined}
              className={`h-9 min-w-9 rounded-field px-3 text-body-md font-semibold transition-colors ${
                candidate === page
                  ? "bg-primary text-white"
                  : "text-text-muted hover:bg-surface-sunk hover:text-text-strong"
              }`}
            >
              {candidate}
            </button>
          </span>
        );
      })}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        className="h-9 rounded-field px-3 text-body-md font-semibold text-text-muted transition-colors hover:bg-surface-sunk disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · The directory
// ─────────────────────────────────────────────────────────────────────────────

export function EmployeeDirectory({ canManage }: { canManage: boolean }) {
  const [filters, setFilters] = useState<EmployeeClientFilters>({});
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
  const [view, setView] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetched once, unfiltered. The narrowing below is all local.
  const { data, isLoading, error } = useEmployees();
  const { departmentById } = useDepartmentNameMap();

  const visible = useMemo(() => {
    if (!data) return undefined;
    return sortEmployees(
      data.filter((employee) => matches(employee, filters)),
      sort,
      departmentById,
    );
  }, [data, filters, sort, departmentById]);

  const pageCount = Math.max(1, Math.ceil((visible?.length ?? 0) / PAGE_SIZE));

  /*
   * Clamp rather than reset.
   *
   * Filtering can shrink the list below the current page — page 4 of 1 renders
   * empty and looks broken. The obvious fix is a `useEffect` that calls
   * `setPage(1)` whenever the filters change, but that is a cascading render:
   * one pass draws the empty page, then state updates, then it draws again.
   *
   * Deriving the effective page from what actually exists needs no effect and
   * cannot render an out-of-range page even for a frame. `setPage` still drives
   * the control; this only decides what is safe to show.
   */
  const effectivePage = Math.min(page, pageCount);
  const pageRows = visible?.slice(
    (effectivePage - 1) * PAGE_SIZE,
    effectivePage * PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-field bg-surface-raised p-1 shadow-card">
          {(
            [
              ["table", Table2, "Table view"],
              ["grid", LayoutGrid, "Card view"],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              aria-pressed={view === value}
              aria-label={label}
              className={`grid h-9 w-10 place-items-center rounded-field transition-colors ${
                view === value
                  ? "bg-surface-sunk text-text-strong shadow-card"
                  : "text-text-muted hover:text-text-strong"
              }`}
            >
              <Icon size={18} aria-hidden />
            </button>
          ))}
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
          >
            <Plus size={17} aria-hidden />
            Add new
          </button>
        ) : null}
      </div>

      <EmployeeFilterBar filters={filters} onChange={setFilters} />

      {view === "table" ? (
        <EmployeeTable
          employees={pageRows}
          isLoading={isLoading}
          error={error}
          sort={sort}
          onSortChange={setSort}
          canManage={canManage}
          onClearFilters={() => setFilters({})}
          departmentById={departmentById}
        />
      ) : (
        <EmployeeGrid employees={pageRows} isLoading={isLoading} error={error} />
      )}

      {!isLoading && visible ? (
        <>
          <Pagination page={effectivePage} pageCount={pageCount} onChange={setPage} />
          <p className="text-center text-body-sm text-text-muted">
            {visible.length === 0
              ? "No employees"
              : `Showing ${(effectivePage - 1) * PAGE_SIZE + 1}–${Math.min(effectivePage * PAGE_SIZE, visible.length)} of ${visible.length}`}
          </p>
        </>
      ) : null}

      <AddEmployeeDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

/*
 * WHAT THE BACKEND CHANGE REMOVED FROM THIS FILE
 *
 * The debounce, and `placeholderData`. Both existed because every keystroke
 * changed the query key and fired a request. Now nothing here refetches on a
 * filter change — the data is already in hand and `useMemo` re-runs the filter.
 *
 * That is strictly better while the list is small: instant, no flicker, no
 * request per character. It also means `isPlaceholderData` and the dimmed-rows
 * state are gone, because there is no in-flight refetch to indicate.
 *
 * The debounce and the query-key filters both come back the day pagination
 * lands. Worth keeping in mind rather than treating this as the end state.
 *
 * ONE FILTER, ONE MEMO
 *
 * Filtering and sorting are one `useMemo` over `[data, filters, sort]`, so the
 * work happens once per change rather than on every render. At a few hundred
 * rows it is imperceptible either way; the memo is there so it stays that way
 * as the list grows.
 */
