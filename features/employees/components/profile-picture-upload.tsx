"use client";

import { AlertCircle, Check, ImageUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { pictureSrc } from "@/components/ui/avatar";
import { useUploadProfilePicture } from "@/features/employees/hooks";
import { ApiError } from "@/lib/api-client";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function ProfilePictureUpload({ currentUrl }: { currentUrl?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadProfilePicture();

  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setLocalError(null);

    // Check before uploading — a 5MB round-trip to be told "too big" is rude.
    if (!ACCEPTED.includes(file.type)) {
      setLocalError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("That image is over 5MB. Choose a smaller one.");
      return;
    }

    // Show it immediately; the server has no URL for us until it refetches.
    const objectUrl = URL.createObjectURL(file);
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return objectUrl;
    });

    try {
      await upload.mutateAsync(file);
    } catch (cause) {
      console.error("[profile picture] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  // `pictureSrc` because a stored URL can be a relative path the backend serves;
  // the browser only ever reaches the backend through /api. A blob: preview is
  // passed through untouched.
  const shown = preview ?? pictureSrc(currentUrl);
  const error = localError ?? (upload.error ? upload.error.message : null);

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFile(event.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center gap-4 rounded-card border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border-strong bg-surface-sunk"
        }`}
      >
        {shown ? (
          // Not next/image: this is a blob: URL or an arbitrary backend host,
          // neither of which the optimiser is configured for.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Your profile picture"
            className="h-24 w-24 rounded-pill object-cover"
          />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-pill bg-surface-raised text-text-subtle">
            <ImageUp size={26} aria-hidden />
          </span>
        )}

        <div>
          <p className="text-body-lg font-semibold text-text-strong">
            Drag &amp; drop to upload
          </p>
          <p className="mt-1 text-body-sm text-text-muted">
            JPG, PNG or WebP, up to 5MB.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            // Reset, so choosing the same file twice still fires onChange.
            event.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="inline-flex h-11 items-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
        >
          {upload.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden />
              Uploading…
            </>
          ) : (
            <>
              <ImageUp size={16} aria-hidden />
              Choose a file
            </>
          )}
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 text-body-sm font-medium text-error"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : upload.isSuccess ? (
        <p className="flex items-center gap-2 text-body-sm font-medium text-primary">
          <Check size={15} aria-hidden />
          Picture updated.
        </p>
      ) : null}
    </div>
  );
}

/*
 * THE FILE INPUT IS HIDDEN, NOT REPLACED
 *
 * A real `<input type="file">` sits in the DOM with `sr-only`, and the visible
 * button clicks it. That keeps the native file picker, keyboard access and
 * screen-reader semantics — all of which a div styled to look like a button
 * would throw away.
 *
 * `sr-only` rather than `display: none`, because a hidden input is not
 * focusable and some browsers will not open the picker for it.
 *
 * WHY `event.target.value = ""` AFTER EVERY PICK
 *
 * `onChange` only fires when the value *changes*. Upload a file, decide it was
 * wrong, pick the same file again — no event, and the UI appears frozen.
 * Clearing the value makes every selection a change.
 *
 * WHY THERE IS A LOCAL PREVIEW
 *
 * The endpoint returns no body, so the new `profilePictureUrl` only arrives
 * after the invalidated query refetches. Without a preview the picture would
 * stay stale for a beat, which reads as "nothing happened". `createObjectURL`
 * shows the chosen file instantly, and the previous object URL is revoked so
 * the blob is not leaked.
 *
 * VALIDATING BEFORE UPLOADING IS NOT REDUNDANT
 *
 * The backend will reject an oversized file too — after it has been sent.
 * Checking type and size first turns a slow round-trip and a cryptic 413 into
 * an immediate, specific message.
 *
 * ONE LIMITATION WORTH KNOWING
 *
 * The endpoint is /employees/me/profile-picture. There is no equivalent for
 * anyone else, so this component only ever belongs on your own profile — an HR
 * admin cannot set a colleague's picture.
 */
