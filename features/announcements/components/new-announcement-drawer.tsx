"use client";

import { AlertCircle } from "lucide-react";
import { useId, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { useCreateAnnouncement } from "@/features/announcements/hooks";
import {
  TARGET_AUDIENCES,
  type TargetAudience,
} from "@/features/announcements/types";
import { ApiError } from "@/lib/api-client";

const fieldBase =
  "w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

/** "SUPER_ADMIN" → "Super admin", "ALL" → "Everyone" */
export function audienceLabel(audience: TargetAudience): string {
  if (audience === "ALL") return "Everyone";
  const words = audience.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function NewAnnouncementDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const expiresId = useId();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [audiences, setAudiences] = useState<TargetAudience[]>(["ALL"]);
  const [touched, setTouched] = useState(false);

  const create = useCreateAnnouncement();

  const errors = {
    title: title.trim() ? undefined : "Give this a title.",
    body: body.trim() ? undefined : "Write the announcement.",
    audiences: audiences.length > 0 ? undefined : "Choose at least one audience.",
  };
  const isValid = !errors.title && !errors.body && !errors.audiences;

  // Picking "Everyone" clears the rest, and picking anyone specific clears
  // "Everyone" — the two cannot coherently be selected together.
  function toggleAudience(audience: TargetAudience) {
    setAudiences((current) => {
      if (audience === "ALL") return ["ALL"];

      const withoutAll = current.filter((value) => value !== "ALL");
      return withoutAll.includes(audience)
        ? withoutAll.filter((value) => value !== audience)
        : [...withoutAll, audience];
    });
  }

  function close() {
    setTitle("");
    setBody("");
    setPinned(false);
    setExpiresAt("");
    setAudiences(["ALL"]);
    setTouched(false);
    create.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;

    const payload = {
      title: title.trim(),
      body: body.trim(),
      pinned,
      targetAudiences: audiences,
      // datetime-local gives "2026-09-14T09:00" with no zone. Round-tripping it
      // through Date attaches the reader's offset before sending ISO.
      ...(expiresAt && { expiresAt: new Date(expiresAt).toISOString() }),
    };

    try {
      await create.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[create announcement] sent:", payload);
      console.error(
        "[create announcement] response:",
        (cause as ApiError)?.body ?? cause,
      );
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="New announcement"
      description="Everyone in the chosen audiences sees this the next time they load the app."
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
            form="new-announcement-form"
            disabled={create.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {create.isPending ? "Publishing…" : "Publish"}
          </button>
        </>
      }
    >
      <form
        id="new-announcement-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={titleId} className="text-body-md font-semibold text-text-strong">
            Title <span className="text-error">*</span>
          </label>
          <input
            id={titleId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Office closed on Friday"
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
          <label htmlFor={bodyId} className="text-body-md font-semibold text-text-strong">
            Announcement <span className="text-error">*</span>
          </label>
          <textarea
            id={bodyId}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            placeholder="What does everyone need to know?"
            className={`resize-y py-3 ${fieldBase} ${
              touched && errors.body ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && errors.body ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.body}
            </p>
          ) : null}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body-md font-semibold text-text-strong">
            Who sees this? <span className="text-error">*</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {TARGET_AUDIENCES.map((audience) => {
              const selected = audiences.includes(audience);
              return (
                <button
                  key={audience}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleAudience(audience)}
                  className={`h-11 rounded-pill border px-4 text-body-md font-semibold transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-strong text-text-muted hover:bg-surface-sunk"
                  }`}
                >
                  {audienceLabel(audience)}
                </button>
              );
            })}
          </div>
          {touched && errors.audiences ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.audiences}
            </p>
          ) : null}
        </fieldset>

        <div className="flex flex-col gap-2">
          <label
            htmlFor={expiresId}
            className="text-body-md font-semibold text-text-strong"
          >
            Expires <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <input
            id={expiresId}
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className={`h-12 ${fieldBase} border-border-subtle`}
          />
          <p className="text-body-sm text-text-subtle">
            Leave empty and it stays up until someone deletes it.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-field bg-surface-sunk p-4">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(event) => setPinned(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
          />
          <span>
            <span className="block text-body-md font-semibold text-text-strong">
              Pin to the top
            </span>
            <span className="block text-body-sm text-text-muted">
              Pinned announcements sort above everything else on the dashboard.
            </span>
          </span>
        </label>
      </form>
    </Drawer>
  );
}

/*
 * "EVERYONE" IS A REAL OPTION AND ALSO A CONTRADICTION, SO IT IS HANDLED IN CODE
 *
 * The API treats an absent `targetAudiences`, an empty array, and ["ALL"] as
 * the same thing: everybody. That means ["ALL", "HR"] is meaningless — it is
 * just "everybody" with a decoration that implies a narrowing that is not
 * happening.
 *
 * `toggleAudience` makes that impossible to express: choosing Everyone clears
 * the specific picks, and choosing a specific role drops Everyone. The
 * alternative — allowing any combination and letting the backend flatten it —
 * would work, and would let someone publish to "Everyone, HR" believing they
 * had sent it to HR alone.
 *
 * THE DATETIME FIELD IS THE ONE PLACE A TIMEZONE BUG WOULD HIDE
 *
 * `<input type="datetime-local">` yields "2026-09-14T09:00" — no zone, no
 * seconds. Sent as-is to a Spring backend it is parsed as UTC, so an
 * announcement set to expire at 9am local quietly expires at 9am UTC: an hour
 * early in Lagos, five hours late in Los Angeles.
 *
 * `new Date(value).toISOString()` is what fixes it. `new Date` reads that
 * string as local time, `toISOString` converts to UTC with an explicit Z. The
 * spread — `...(expiresAt && {...})` — keeps the field out of the payload
 * entirely when it is blank, rather than sending `expiresAt: null` or the empty
 * string, neither of which the docs describe.
 *
 * WHY VALIDATION WAITS FOR `touched`
 *
 * An empty form is invalid by definition. Showing three red errors before
 * anyone has typed a character is scolding someone for not having started yet.
 * `touched` flips on the first submit attempt, so errors appear at the moment
 * they become useful. The submit button stays enabled throughout — a disabled
 * button that will not say why is the single most common form-UX mistake, and
 * this project hit exactly that bug on the employee form.
 */
