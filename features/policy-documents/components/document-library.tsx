"use client";

import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { policyDocumentDownloadUrl } from "@/features/policy-documents/api";
import {
  useDeletePolicyDocument,
  usePolicyDocuments,
  useUploadPolicyDocument,
} from "@/features/policy-documents/hooks";
import { formatBytes } from "@/features/policy-documents/types";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

const MAX_BYTES = 20 * 1024 * 1024;

const fieldBase =
  "w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Upload
// ─────────────────────────────────────────────────────────────────────────────

function UploadDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const categoryId = useId();
  const descriptionId = useId();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const upload = useUploadPolicyDocument();

  const errors = {
    file: file ? undefined : "Choose a file.",
    title: title.trim() ? undefined : "Give the document a title.",
  };
  const isValid = !errors.file && !errors.title;

  function pick(next: File | undefined) {
    if (!next) return;
    setLocalError(null);

    if (next.size > MAX_BYTES) {
      setLocalError("That file is over 20MB.");
      return;
    }

    setFile(next);
    // Offer the filename as the title, but only if the box is still empty —
    // never overwrite something already typed.
    setTitle((current) => current || next.name.replace(/\.[^.]+$/, ""));
  }

  function close() {
    setFile(null);
    setTitle("");
    setCategory("");
    setDescription("");
    setTouched(false);
    setLocalError(null);
    upload.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid || !file) return;

    try {
      await upload.mutateAsync({
        file,
        title: title.trim(),
        category: category.trim() || undefined,
        description: description.trim() || undefined,
      });
      close();
    } catch (cause) {
      console.error("[upload policy document] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Upload a policy document"
      description="Everyone in the company can read and download this."
      footer={
        <>
          <button
            type="button"
            onClick={close}
            className="h-12 flex-1 rounded-field border border-border-strong text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="upload-document-form"
            disabled={upload.isPending}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {upload.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden />
                Uploading…
              </>
            ) : (
              "Upload"
            )}
          </button>
        </>
      }
    >
      <form id="upload-document-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-body-md font-semibold text-text-strong">
            File <span className="text-error">*</span>
          </span>

          <label
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed p-8 text-center transition-colors ${
              touched && errors.file
                ? "border-error bg-error/5"
                : "border-border-strong bg-surface-sunk hover:border-primary"
            }`}
          >
            <span className="grid h-14 w-14 place-items-center rounded-pill bg-surface-raised text-text-subtle">
              <Upload size={24} aria-hidden />
            </span>

            {file ? (
              <span className="min-w-0">
                <span className="block break-words text-body-md font-semibold text-text-strong">
                  {file.name}
                </span>
                <span className="block text-body-sm text-text-muted">
                  {formatBytes(file.size)} · tap to choose a different file
                </span>
              </span>
            ) : (
              <span>
                <span className="block text-body-lg font-semibold text-text-strong">
                  Choose a file
                </span>
                <span className="block text-body-sm text-text-muted">
                  Any format, up to 20MB.
                </span>
              </span>
            )}

            <input
              type="file"
              className="sr-only"
              onChange={(event) => {
                pick(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>

          {localError ?? (touched && errors.file) ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {localError ?? errors.file}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={titleId} className="text-body-md font-semibold text-text-strong">
            Title <span className="text-error">*</span>
          </label>
          <input
            id={titleId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Remote Work Policy"
            className={`h-12 ${fieldBase} ${
              touched && errors.title ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && errors.title ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={categoryId} className="text-body-md font-semibold text-text-strong">
            Category <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <input
            id={categoryId}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="HR"
            list="document-categories"
            className={`h-12 ${fieldBase} border-border-subtle`}
          />
          <datalist id="document-categories">
            <option value="HR" />
            <option value="Finance" />
            <option value="Security" />
            <option value="Legal" />
            <option value="Health & Safety" />
          </datalist>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={descriptionId} className="text-body-md font-semibold text-text-strong">
            Description <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Guidelines for remote and hybrid work."
            className={`resize-y py-3 ${fieldBase} border-border-subtle`}
          />
        </div>
      </form>
    </Drawer>
  );
}

/*
 * THE WHOLE DROP ZONE IS A `<label>` WRAPPING A REAL FILE INPUT.
 *
 * No onClick, no ref, no `inputRef.current.click()`. A label is natively
 * associated with the input inside it, so clicking anywhere in that 8rem box
 * opens the picker — and keyboard focus, screen-reader announcement and the
 * native file dialog all come for free.
 *
 * profile-picture-upload.tsx does the ref dance instead, because it needs a
 * separate drag-and-drop target. This one does not, so it uses the simpler
 * thing that has fewer ways to break.
 *
 * `event.target.value = ""` AFTER EVERY PICK
 *
 * `onChange` only fires when the value changes. Pick a file, decide it was
 * wrong, pick the same one again — no event, and the UI looks frozen. Clearing
 * the value makes every selection a change. Same fix as the profile picture.
 *
 * THE TITLE IS PREFILLED FROM THE FILENAME, BUT ONLY ONCE
 *
 * `setTitle((current) => current || …)` — the updater form reads the live value
 * rather than one captured in a closure, so it cannot clobber something typed
 * a moment earlier. Prefilling unconditionally would silently discard the
 * user's own title if they picked the file second.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The library
// ─────────────────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-5 py-4 sm:px-6">
      <Skeleton className="h-11 w-11 shrink-0" rounded="field" />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonText width="42%" />
        <SkeletonText width="64%" className="h-3" />
      </div>
      <Skeleton className="h-11 w-11 shrink-0" rounded="pill" />
    </li>
  );
}

export function DocumentLibrary({ canManage }: { canManage: boolean }) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const filters = useMemo(
    () => (search.trim() ? { q: search.trim() } : {}),
    [search],
  );

  const { data, isLoading, error } = usePolicyDocuments(filters);
  const remove = useDeletePolicyDocument();

  const documents = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    [data],
  );

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load the document library.
        </p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/*
          A search box that actually searches, unlike the one removed from the
          topbar — GET /policy-documents?q= is a documented parameter.
        */}
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-field border border-border-subtle bg-surface-raised px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search size={18} className="shrink-0 text-text-subtle" aria-hidden />
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search policies…"
            aria-label="Search policy documents"
            className="min-w-0 flex-1 bg-transparent text-body-md text-text-strong outline-none placeholder:text-text-subtle"
          />
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
          >
            <Upload size={16} aria-hidden />
            Upload
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-card bg-surface-raised shadow-card">
        {isLoading ? (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {[0, 1, 2].map((row) => (
              <RowSkeleton key={row} />
            ))}
          </ul>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
              <FileText size={22} aria-hidden />
            </span>
            <div>
              <p className="text-body-lg font-semibold text-text-strong">
                {search ? "Nothing matches that search" : "No documents yet"}
              </p>
              <p className="mt-1 max-w-sm text-body-md text-text-muted">
                {search
                  ? "Try a different term."
                  : canManage
                    ? "Upload the handbook, the expense policy, the code of conduct."
                    : "Company policies will appear here once HR uploads them."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {documents.map((document) => (
              <li key={document.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
                  <FileText size={19} aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="break-words text-body-md font-semibold text-text-strong">
                    {document.title}
                  </p>
                  {document.description ? (
                    <p className="break-words text-body-sm text-text-muted">
                      {document.description}
                    </p>
                  ) : null}
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-sm text-text-subtle">
                    {document.category ? <span>{document.category}</span> : null}
                    {formatBytes(document.sizeBytes) ? (
                      <>
                        {document.category ? <span aria-hidden>·</span> : null}
                        <span>{formatBytes(document.sizeBytes)}</span>
                      </>
                    ) : null}
                    {document.uploadedAt ?? document.createdAt ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>
                          {formatDate(document.uploadedAt ?? document.createdAt)}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1">
                  <a
                    href={policyDocumentDownloadUrl(document.id)}
                    download
                    aria-label={`Download ${document.title}`}
                    className="grid h-11 w-11 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Download size={18} aria-hidden />
                  </a>

                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => remove.mutate(document.id)}
                      disabled={remove.isPending && remove.variables === document.id}
                      aria-label={`Delete ${document.title}`}
                      className="grid h-11 w-11 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-error/10 hover:text-error disabled:opacity-40"
                    >
                      <Trash2 size={18} aria-hidden />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <UploadDrawer open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

/*
 * DOWNLOAD IS AN `<a href download>`, NOT A FETCH.
 *
 * The tempting version calls the endpoint, gets a Blob, makes an object URL and
 * clicks a synthetic link. That works and is worse in four ways: the whole file
 * goes through JavaScript memory, there is no native progress indicator, the
 * server's Content-Disposition filename is lost so every download is named
 * after the id, and the object URL leaks unless it is revoked.
 *
 * A plain anchor hands the whole job to the browser. It only works because the
 * URL is same-origin — `/api/policy-documents/{id}/download` goes through the
 * proxy route, which forwards the HttpOnly cookies the backend needs. Linking
 * straight at the backend host would be cross-origin, would drop the cookie,
 * and would 401. That proxy is why this can be one line.
 *
 * SEARCH GOES TO THE SERVER, UNLIKE THE NOTIFICATIONS FILTER
 *
 * `?q=` is documented, so the term belongs in the query key. That also means
 * every keystroke is a request — see the debounce note in hooks.ts, which is
 * the one thing here worth improving before this list gets large.
 */
