"use client";

import { Building2, CalendarDays, Mail, Phone, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Skeleton, SkeletonCircle, SkeletonText } from "@/components/ui/skeleton";
import { ProfilePictureUpload } from "@/features/employees/components/profile-picture-upload";
import { useMyProfile } from "@/features/employees/hooks";
import { useDepartmentNameMap } from "@/features/departments/hooks";
import { useRoleNameMap } from "@/features/roles/hooks";
import {
  getEmployeeDepartmentName,
  getEmployeeRoleName,
} from "@/features/employees/types";
import { formatDate } from "@/lib/format";

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 py-3.5">
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
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex flex-col items-center gap-4 rounded-card bg-surface-raised p-6 shadow-card">
        <SkeletonCircle size={88} />
        <SkeletonText width="10rem" className="h-5" />
        <SkeletonText width="7rem" />
        <Skeleton className="h-40 w-full" />
      </div>
      <div className="rounded-card bg-surface-raised p-6 shadow-card lg:col-span-2">
        <SkeletonText width="8rem" className="h-4" />
        <div className="mt-4 flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3">
              <Skeleton className="h-9 w-9" />
              <div className="flex flex-col gap-2">
                <SkeletonText width="5rem" className="h-3" />
                <SkeletonText width="11rem" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MyProfile() {
  const { data: employee, isLoading, error } = useMyProfile();

  // `department` and `role` can arrive as a {id,name} object, as a bare name, or
  // as a raw UUID depending on the endpoint. These two maps are what turn the
  // UUID case into something readable; both are cached app-wide.
  const { departmentById } = useDepartmentNameMap();
  const { roleById } = useRoleNameMap();

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load your profile.
        </p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  if (isLoading || !employee) return <ProfileSkeleton />;

  const fullName = `${employee.firstName} ${employee.lastName}`;

  // Both helpers return "—" when they cannot resolve a name. `Row` renders its
  // own "Not set" for an empty value, so the dash is normalised away here
  // rather than showing two different kinds of blank in the same list.
  const rawDept = getEmployeeDepartmentName(employee, departmentById);
  const rawRole = getEmployeeRoleName(employee, roleById);
  const deptName = rawDept === "—" ? null : rawDept;
  const roleName = rawRole === "—" ? null : rawRole;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <aside className="flex flex-col gap-5 rounded-card bg-surface-raised p-6 shadow-card">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar name={fullName} src={employee.profilePictureUrl} size={88} />
          <div>
            <h2 className="text-h5 text-text-strong">{fullName}</h2>
            <p className="mt-0.5 text-body-md text-text-muted">
              {employee.jobTitle ?? "No job title"}
            </p>
          </div>
        </div>

        {/*
          The only place in the app a picture can be changed. The endpoint is
          /employees/me/profile-picture — there is no equivalent for anyone else.
        */}
        <ProfilePictureUpload currentUrl={employee.profilePictureUrl} />
      </aside>

      <section className="rounded-card bg-surface-raised p-6 shadow-card lg:col-span-2">
        <h2 className="text-body-sm font-semibold uppercase tracking-wide text-text-muted">
          My details
        </h2>

        <div className="mt-2 flex flex-col divide-y divide-border-subtle">
          <Row icon={Mail} label="Email" value={employee.email} />
          <Row icon={Phone} label="Phone" value={employee.phone} />
          <Row icon={Building2} label="Department" value={deptName} />
          <Row icon={ShieldCheck} label="Role" value={roleName} />
          <Row
            icon={CalendarDays}
            label="Hire date"
            value={formatDate(employee.hireDate)}
          />
        </div>

        <p className="mt-4 rounded-field bg-surface-sunk p-3 text-body-sm text-text-muted">
          Only your picture can be changed here. To update anything else, contact
          HR.
        </p>
      </section>
    </div>
  );
}

/*
 * WHY THIS PAGE EXISTS
 *
 * The picture endpoint is `/employees/me/profile-picture` — self only, with no
 * equivalent for changing anyone else's. So there has to be one guaranteed
 * place a person can reach their own profile, independent of whether the app
 * can work out which row in /employees is theirs.
 *
 * Before this, the uploader was only reachable from /employees/{id} behind an
 * `isSelf` check that compared a *user* id from /auth/me against an *employee*
 * id — two different keys in most schemas. If those never matched, the uploader
 * simply never appeared and there was no other route to it.
 *
 * `GET /employees/me` sidesteps the question entirely: the server decides who
 * you are.
 *
 * WHY THE DETAILS ARE READ-ONLY
 *
 * `PUT /employees/{id}` is HR-only and takes jobTitle, salary, departmentId and
 * roleIds — none of which someone should set for themselves. Name, phone and
 * email are maintained by HR. Pointing people at HR is better than rendering
 * fields that cannot be saved.
 */
