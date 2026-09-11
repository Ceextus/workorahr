import type { Metadata } from "next";

import { DocumentLibrary } from "@/features/policy-documents/components/document-library";
import { getSession } from "@/lib/auth";
import { isHR } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Policy documents · Workora",
};

export default async function PolicyDocumentsPage() {
  const user = await getSession();
  const canManage = isHR(user?.userType);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Policy documents</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          {canManage
            ? "Company policies, and the place to publish them."
            : "Company policies everyone is expected to have read."}
        </p>
      </header>

      <DocumentLibrary canManage={canManage} />
    </div>
  );
}

/*
 * Reading and downloading are open to everyone — that is the entire purpose of
 * a policy library, and a document nobody can open is not a policy.
 *
 * Upload and delete are gated at HR. The docs annotate neither, so this is the
 * frontend's own policy rather than a documented rule; the same caveat as
 * vendors. If the backend turns out to allow any employee to upload, this is
 * one boolean to change.
 */
