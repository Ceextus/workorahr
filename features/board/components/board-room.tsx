"use client";

import {
  AlertCircle,
  Download,
  FileText,
  Landmark,
  Lock,
  MessagesSquare,
  Plus,
  ScrollText,
  Trash2,
  UserMinus,
  Upload,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { boardDocumentDownloadUrl } from "@/features/board/api";
import {
  useAddBoardMember,
  useBoardActivity,
  useBoardDocuments,
  useBoardMembers,
  useBoardMembership,
  useDeleteBoardDocument,
  useEnterBoardRoom,
  useRemoveBoardMember,
  useUploadBoardDocument,
} from "@/features/board/hooks";
import { UserPicker } from "@/features/employees/components/user-picker";
import { useUserNameMap } from "@/features/employees/hooks";
import { formatBytes } from "@/features/policy-documents/types";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · The door
// ─────────────────────────────────────────────────────────────────────────────

function LockedOut() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card bg-surface-raised px-6 py-16 text-center shadow-card">
      <span className="grid h-14 w-14 place-items-center rounded-panel bg-surface-sunk text-text-subtle">
        <Lock size={26} aria-hidden />
      </span>
      <div className="max-w-md">
        <p className="text-body-lg font-semibold text-text-strong">
          You are not a board member
        </p>
        <p className="mt-1.5 text-body-md text-text-muted">
          The Board Room is restricted to people on the membership list. Being an
          administrator is not enough — an existing admin has to add you
          explicitly.
        </p>
      </div>
    </div>
  );
}

function RoomSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card bg-surface-raised p-6 shadow-card">
        <SkeletonText width="30%" className="h-4" />
        <div className="mt-4 flex flex-col gap-2">
          <SkeletonText width="70%" className="h-3" />
          <SkeletonText width="55%" className="h-3" />
        </div>
      </div>
      <div className="rounded-card bg-surface-raised p-6 shadow-card">
        <SkeletonText width="25%" className="h-4" />
        <div className="mt-4 flex flex-col gap-2">
          <SkeletonText width="60%" className="h-3" />
          <SkeletonText width="45%" className="h-3" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Add a member
// ─────────────────────────────────────────────────────────────────────────────

function AddMemberDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const userIdField = useId();
  const [userId, setUserId] = useState("");
  const [touched, setTouched] = useState(false);
  const add = useAddBoardMember();

  const error = userId.trim() ? undefined : "Choose who to add.";

  function close() {
    setUserId("");
    setTouched(false);
    add.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (error) return;

    try {
      await add.mutateAsync({ userId: userId.trim() });
      close();
    } catch (cause) {
      console.error("[add board member] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Add a board member"
      description="Requires an administrator account."
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
            form="add-member-form"
            disabled={add.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {add.isPending ? "Adding…" : "Add member"}
          </button>
        </>
      }
    >
      <form id="add-member-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={userIdField} className="text-body-md font-semibold text-text-strong">
            Who joins the board <span className="text-error">*</span>
          </label>
          <UserPicker
            id={userIdField}
            value={userId}
            onChange={setUserId}
            placeholder="Choose someone"
            invalid={Boolean(touched && error)}
          />
          {touched && error ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {error}
            </p>
          ) : null}
        </div>
      </form>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Upload papers
// ─────────────────────────────────────────────────────────────────────────────

function UploadDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const upload = useUploadBoardDocument();

  function close() {
    setFile(null);
    setIsRecording(false);
    upload.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    try {
      await upload.mutateAsync({ file, isRecording });
      close();
    } catch (cause) {
      console.error("[upload board document] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Upload to the board room"
      description="Only board members can see this."
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
            form="upload-board-form"
            disabled={upload.isPending || !file}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {upload.isPending ? "Uploading…" : "Upload"}
          </button>
        </>
      }
    >
      <form id="upload-board-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed border-border-strong bg-surface-sunk p-8 text-center transition-colors hover:border-primary">
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
                Papers, minutes or a meeting recording.
              </span>
            </span>
          )}
          <input
            type="file"
            className="sr-only"
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (next) setFile(next);
              event.target.value = "";
            }}
          />
        </label>

        <label className="flex items-start gap-3 rounded-field bg-surface-sunk p-4">
          <input
            type="checkbox"
            checked={isRecording}
            onChange={(event) => setIsRecording(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
          />
          <span>
            <span className="block text-body-md font-semibold text-text-strong">
              This is a meeting recording
            </span>
            <span className="block text-body-sm text-text-muted">
              Sent as ?isRecording=true, so recordings can be told apart from
              ordinary papers.
            </span>
          </span>
        </label>
      </form>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · The room
// ─────────────────────────────────────────────────────────────────────────────

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: typeof Landmark;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card bg-surface-raised shadow-card">
      <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4 sm:px-6">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
          <Icon size={17} aria-hidden />
        </span>
        <h2 className="flex-1 text-body-lg font-bold text-text-strong">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function BoardRoom({ canAdmin }: { canAdmin: boolean }) {
  const membership = useBoardMembership();
  const isMember = membership.isMember;

  const members = useBoardMembers({ enabled: isMember });
  const documents = useBoardDocuments({ enabled: isMember });
  const activity = useBoardActivity("", { enabled: isMember });

  const removeMember = useRemoveBoardMember();
  const removeDocument = useDeleteBoardDocument();
  const { resolveUser } = useUserNameMap();

  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Record entry once per visit, after membership is confirmed.
  const enter = useEnterBoardRoom();
  const entered = useRef(false);
  const enterMutate = enter.mutate;

  useEffect(() => {
    if (isMember && !entered.current) {
      entered.current = true;
      enterMutate();
    }
  }, [isMember, enterMutate]);

  if (membership.isLoading) return <RoomSkeleton />;
  if (!isMember) return <LockedOut />;

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Members"
        icon={Landmark}
        action={
          canAdmin ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-field border border-border-strong px-3 text-body-sm font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
            >
              <Plus size={15} aria-hidden />
              Add
            </button>
          ) : null
        }
      >
        {members.isLoading ? (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {[0, 1].map((row) => (
              <li key={row} className="px-5 py-4 sm:px-6">
                <SkeletonText width="45%" />
              </li>
            ))}
          </ul>
        ) : !members.data?.length ? (
          <p className="px-5 py-8 text-center text-body-md text-text-muted sm:px-6">
            No members listed.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {members.data.map((member) => (
              <li key={member.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="break-all text-body-md font-semibold text-text-strong">
                    {resolveUser(member.name, member.userId) ?? member.email ?? member.userId}
                  </p>
                  {member.addedAt ? (
                    <p className="text-body-sm text-text-subtle">
                      Added {formatDateTime(member.addedAt)}
                    </p>
                  ) : null}
                </div>

                {canAdmin ? (
                  <button
                    type="button"
                    onClick={() => removeMember.mutate(member.id)}
                    disabled={removeMember.isPending && removeMember.variables === member.id}
                    aria-label="Remove this member"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-error/10 hover:text-error disabled:opacity-40"
                  >
                    <UserMinus size={17} aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Documents"
        icon={FileText}
        action={
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-field border border-border-strong px-3 text-body-sm font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
          >
            <Upload size={15} aria-hidden />
            Upload
          </button>
        }
      >
        {documents.isLoading ? (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {[0, 1].map((row) => (
              <li key={row} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <Skeleton className="h-10 w-10 shrink-0" rounded="field" />
                <SkeletonText width="50%" />
              </li>
            ))}
          </ul>
        ) : !documents.data?.length ? (
          <p className="px-5 py-8 text-center text-body-md text-text-muted sm:px-6">
            Nothing uploaded yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {documents.data.map((document) => (
              <li key={document.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-field ${
                    document.isRecording
                      ? "bg-secondary/20 text-grey-900"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {document.isRecording ? (
                    <Video size={17} aria-hidden />
                  ) : (
                    <FileText size={17} aria-hidden />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="break-words text-body-md font-semibold text-text-strong">
                    {document.title ?? document.fileName ?? "Untitled"}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-body-sm text-text-subtle">
                    {document.isRecording ? <span>Recording</span> : null}
                    {formatBytes(document.sizeBytes) ? (
                      <span>{formatBytes(document.sizeBytes)}</span>
                    ) : null}
                    {document.uploadedAt ?? document.createdAt ? (
                      <span>{formatDateTime(document.uploadedAt ?? document.createdAt)}</span>
                    ) : null}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1">
                  <a
                    href={boardDocumentDownloadUrl(document.id)}
                    download
                    aria-label="Download"
                    className="grid h-11 w-11 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Download size={17} aria-hidden />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeDocument.mutate(document.id)}
                    disabled={
                      removeDocument.isPending && removeDocument.variables === document.id
                    }
                    aria-label="Delete"
                    className="grid h-11 w-11 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-error/10 hover:text-error disabled:opacity-40"
                  >
                    <Trash2 size={17} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Chat"
        icon={MessagesSquare}
        action={
          <Link
            href="/board/chat"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-field border border-border-strong px-3 text-body-sm font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
          >
            Open
          </Link>
        }
      >
        <p className="px-5 py-6 text-body-md text-text-muted sm:px-6">
          Discussion history between board members. Read-only in this app —
          sending requires the /ws/board WebSocket.
        </p>
      </Panel>

      <Panel title="Activity log" icon={ScrollText}>
        {activity.isLoading ? (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {[0, 1, 2].map((row) => (
              <li key={row} className="px-5 py-3.5 sm:px-6">
                <SkeletonText width="60%" className="h-3" />
              </li>
            ))}
          </ul>
        ) : !activity.data?.length ? (
          <p className="px-5 py-8 text-center text-body-md text-text-muted sm:px-6">
            Nothing recorded yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {activity.data.slice(0, 20).map((entry) => (
              <li key={entry.id} className="px-5 py-3.5 sm:px-6">
                <p className="break-words text-body-md text-text-strong">
                  <span className="font-semibold">
                    {entry.userName ?? entry.userId?.slice(0, 8) ?? "Someone"}
                  </span>{" "}
                  {entry.action ?? "did something"}
                  {entry.detail ? ` — ${entry.detail}` : ""}
                </p>
                {entry.occurredAt ?? entry.createdAt ? (
                  <p className="text-body-sm text-text-subtle">
                    {formatDateTime(entry.occurredAt ?? entry.createdAt)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <AddMemberDrawer open={addOpen} onClose={() => setAddOpen(false)} />
      <UploadDrawer open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

/*
 * THE ENTRY EFFECT IS THE ONE PLACE IN THIS APP AN EFFECT IS THE RIGHT TOOL.
 *
 * `POST /board/enter` records that somebody opened the room. It is not caused
 * by a click — it is caused by arriving — and that is exactly what an effect is
 * for: synchronising an external system with the fact that this component is
 * now on screen.
 *
 * The `entered` ref stops it firing twice. React's development StrictMode
 * deliberately mounts, unmounts and remounts every component to surface exactly
 * this class of bug, so without the ref the audit log would gain two entries
 * per visit in development and be quietly wrong.
 *
 * `enterMutate` is pulled out of the mutation object before the dependency
 * array. Depending on `enter` itself would re-run this whenever TanStack handed
 * back a new object — the identity trap that caused the drawer focus bug in
 * Phase 06. The function is stable; the object around it is not.
 *
 * WHY EVERY PANEL IS ON ONE PAGE
 *
 * Members, documents and activity are three small lists that a board member
 * looks at together. Splitting them across tabs would mean three navigations to
 * answer "who is here, what was circulated, and what happened" — the three
 * questions this room exists to answer. Chat gets its own route because it is a
 * scrolling transcript rather than a list.
 */
