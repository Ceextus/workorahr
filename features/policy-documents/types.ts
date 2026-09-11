export interface PolicyDocument {
  id: string;
  title: string;
  category: string | null;
  description: string | null;

  /*
   * The docs describe the upload form fields and never the response, so
   * everything about the stored file is optional. `fileName` and `size` are
   * displayed when present and skipped when not.
   */
  fileName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  uploadedBy?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
}

export interface PolicyDocumentFilters {
  /** Free-text search, passed straight through as ?q= */
  q?: string;
}

export interface UploadPolicyDocumentPayload {
  file: File;
  title: string;
  category?: string;
  description?: string;
}

/** "1.4 MB" from a byte count. */
export function formatBytes(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

/*
 * `formatBytes` IS NOT IN lib/format.ts, AND THAT IS A JUDGEMENT CALL.
 *
 * lib/format.ts holds money and dates because three features each render them
 * and a disagreement between those three would be a real bug. File sizes are
 * used by exactly one feature today.
 *
 * The moment board documents render a size too — /board/documents is in the
 * same API — this moves to lib/. Premature sharing has a cost as well: a
 * function in lib/ implies "everything uses this", and hunting through lib for
 * something only one screen needs is its own kind of friction.
 */
