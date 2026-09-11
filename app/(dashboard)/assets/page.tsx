import type { Metadata } from "next";

import { AssetRegister, MyAssets } from "@/features/assets/components/asset-register";
import { getSession } from "@/lib/auth";
import { isHR } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Assets · Workora",
};

export default async function AssetsPage() {
  const user = await getSession();
  const canManage = isHR(user?.userType);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Assets</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Company equipment, and who currently holds it.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-h5 text-text-strong">Signed out to me</h2>
        <MyAssets />
      </section>

      {canManage ? (
        <section className="flex flex-col gap-4 border-t border-border-subtle pt-6">
          <div>
            <h2 className="text-h5 text-text-strong">Full register</h2>
            <p className="mt-1 text-body-md text-text-muted">
              Everything the company owns, in stock first.
            </p>
          </div>
          <AssetRegister canManage={canManage} />
        </section>
      ) : null}
    </div>
  );
}

/*
 * The same two-tier shape as attendance, payroll and expenses: the personal
 * view always renders, the organisational one is appended for HR.
 *
 * That is not a house style choice — it follows the API. GET /assets/mine has
 * no documented restriction; GET /assets is annotated (HR/Admin). Two
 * endpoints, two audiences, so two sections.
 */
