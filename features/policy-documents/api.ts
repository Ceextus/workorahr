import { api, asList } from "@/lib/api-client";

import type {
  PolicyDocument,
  PolicyDocumentFilters,
  UploadPolicyDocumentPayload,
} from "./types";

export const listPolicyDocuments = async (filters: PolicyDocumentFilters = {}) =>
  asList<PolicyDocument>(
    await api.get("/policy-documents", { query: { ...filters } }),
    "GET /policy-documents",
  );

/**
 * multipart/form-data: the file plus three text fields in the same body.
 *
 * No Content-Type header is set anywhere in this chain — `apiFetch` detects
 * FormData and omits it so the browser can add the boundary marker itself.
 * Setting it by hand is the upload bug that cost hours in Phase 00.
 */
export const uploadPolicyDocument = ({
  file,
  title,
  category,
  description,
}: UploadPolicyDocumentPayload) => {
  const body = new FormData();
  body.append("file", file);
  body.append("title", title);
  if (category) body.append("category", category);
  if (description) body.append("description", description);

  return api.post<PolicyDocument>("/policy-documents", body);
};

export const deletePolicyDocument = (id: string) =>
  api.delete<void>(`/policy-documents/${id}`);

/**
 * The browser-facing URL for a download.
 *
 * NOT an `api.get` — this returns a path for an `<a href>` rather than fetching
 * bytes into JavaScript. The browser then handles the download natively: it
 * streams to disk instead of through memory, shows real progress, and honours
 * the server's Content-Disposition filename.
 *
 * It works because the path is same-origin. The proxy route at
 * app/api/[...proxy]/route.ts forwards it to the backend WITH the HttpOnly auth
 * cookies attached — which is the whole reason that proxy exists. A direct link
 * to the backend host would be cross-origin, would not carry the cookie, and
 * would 401.
 */
export const policyDocumentDownloadUrl = (id: string) =>
  `/api/policy-documents/${id}/download`;
