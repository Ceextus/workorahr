import type { Metadata } from "next";

import { RoleBoard } from "@/features/roles/components/role-board";
import { getSession } from "@/lib/auth";
import { isHR } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Roles · Workora",
};

export default async function RolesPage() {
  const user = await getSession();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Roles</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Job roles you can attach to employees. Separate from access level.
        </p>
      </header>

      <RoleBoard canManage={isHR(user?.userType)} />
    </div>
  );
}

/*
 * THE ROLE ENDPOINTS CARRY NO DOCUMENTED PERMISSION.
 *
 * Every other write group in the collection is annotated — employees [HR+],
 * vendors [HR+], leave approval [Manager+]. /roles is annotated with nothing at
 * all, which taken literally means any authenticated employee may create,
 * rename and delete roles.
 *
 * The write buttons are gated to HR+ here for consistency with departments, but
 * be clear about what that is worth: if the backend genuinely does not check,
 * this hides the buttons and nothing more. Anyone can still call the endpoint.
 *
 * Worth confirming with whoever owns the API — most likely the annotation is
 * missing from the docs rather than the check missing from the code, but that is
 * a guess and it is the kind of guess worth resolving.
 */
