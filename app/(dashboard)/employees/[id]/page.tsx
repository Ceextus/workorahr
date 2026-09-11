import type { Metadata } from "next";

import { EmployeeProfile } from "@/features/employees/components/employee-profile";
import { getSession } from "@/lib/auth";
import { isHR } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Employee · Workora",
};

export default async function EmployeeDetailPage({
  params,
}: PageProps<"/employees/[id]">) {
  // `params` is a Promise in Next 16 — without the await you get undefined,
  // and the request quietly goes to /employees/undefined.
  const { id } = await params;
  const user = await getSession();

  return (
    <EmployeeProfile
      id={id}
      canSeePay={isHR(user?.userType)}
      canManage={isHR(user?.userType)}
    />
  );
}

/*
 * ONLY THE THINGS THE SERVER ACTUALLY KNOWS ARE PASSED DOWN.
 *
 * `userType` comes from /auth/me, so the two permission flags are settled here
 * and arrive as plain booleans — no loading state for something that gates a
 * whole tab.
 *
 * "Is this my own profile?" used to be passed the same way, as
 * `isSelf={user?.id === id}`. It looked equivalent and was not: /auth/me
 * returns a *user* id and the URL carries an *employee* id, two separate
 * tables that need not share a key. EmployeeProfile now answers that question
 * itself with /employees/me, where both sides of the comparison are employee
 * ids. Passing a guess from the server was cheaper; being right matters more.
 */
