"use client";

import { AlertCircle } from "lucide-react";
import { useId, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { useReportIncident } from "@/features/incidents/hooks";
import {
  INCIDENT_SEVERITIES,
  type IncidentSeverity,
} from "@/features/incidents/types";
import { ApiError } from "@/lib/api-client";

const fieldBase =
  "w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

const SEVERITY_HINT: Record<IncidentSeverity, string> = {
  LOW: "Annoying, but nothing is broken.",
  MEDIUM: "Something is degraded and people notice.",
  HIGH: "A core function is broken for many people.",
  CRITICAL: "Everything is down, or data is at risk. Wake someone up.",
};

export function ReportIncidentDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("MEDIUM");
  const [touched, setTouched] = useState(false);

  const report = useReportIncident();

  const errors = {
    title: title.trim() ? undefined : "Give this a one-line summary.",
    description: description.trim() ? undefined : "Describe what is happening.",
  };
  const isValid = !errors.title && !errors.description;

  function close() {
    setTitle("");
    setDescription("");
    setSeverity("MEDIUM");
    setTouched(false);
    report.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      severity,
    };

    try {
      await report.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[report incident] sent:", payload);
      console.error("[report incident] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Report an incident"
      description="This goes on the board immediately as OPEN."
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
            form="report-incident-form"
            disabled={report.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {report.isPending ? "Reporting…" : "Report incident"}
          </button>
        </>
      }
    >
      <form
        id="report-incident-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={titleId} className="text-body-md font-semibold text-text-strong">
            What is wrong? <span className="text-error">*</span>
          </label>
          <input
            id={titleId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="API latency spike"
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
          <label
            htmlFor={descriptionId}
            className="text-body-md font-semibold text-text-strong"
          >
            Details <span className="text-error">*</span>
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            placeholder="p99 latency above 2s on /employees since 14:20."
            className={`resize-y py-3 ${fieldBase} ${
              touched && errors.description ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && errors.description ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.description}
            </p>
          ) : null}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body-md font-semibold text-text-strong">
            How bad is it? <span className="text-error">*</span>
          </legend>
          <div className="flex flex-col gap-2">
            {INCIDENT_SEVERITIES.map((value) => {
              const selected = severity === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSeverity(value)}
                  className={`flex flex-col items-start gap-0.5 rounded-field border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border-subtle hover:bg-surface-sunk"
                  }`}
                >
                  <span
                    className={`text-body-md font-bold ${
                      selected ? "text-primary" : "text-text-strong"
                    }`}
                  >
                    {value.charAt(0) + value.slice(1).toLowerCase()}
                  </span>
                  <span className="text-body-sm text-text-muted">
                    {SEVERITY_HINT[value]}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </form>
    </Drawer>
  );
}

/*
 * SEVERITY IS FOUR BUTTONS WITH SENTENCES, NOT A `<select>`.
 *
 * Every other picker in this app is a dropdown, and for category or department
 * that is right — the options are self-explanatory and the list is long.
 *
 * Severity is neither. "HIGH" and "CRITICAL" mean whatever the person picking
 * thinks they mean at 2am, and the difference decides whether someone gets
 * woken up. Inconsistent severity is the single most common failure of an
 * incident process, and it is a UI problem before it is a policy problem.
 *
 * Four cards with one sentence each put the definition at the point of
 * decision. It costs vertical space and is worth it.
 *
 * MEDIUM IS THE DEFAULT, NOT LOW
 *
 * Defaulting to LOW encourages under-reporting: the form is already filled in
 * correctly, so it gets submitted as-is. Defaulting to CRITICAL would train
 * people to ignore the top level. MEDIUM is the one that makes someone actually
 * read the four options and choose.
 *
 * NO ASSIGNEE FIELD HERE, AND THAT IS FORCED BY THE API
 *
 * POST /incidents takes exactly title, description and severity — assignment is
 * a separate endpoint. Which is just as well, because assigning needs a *user*
 * id that this app has no way to look up. See the note at the foot of
 * features/incidents/types.ts.
 */
