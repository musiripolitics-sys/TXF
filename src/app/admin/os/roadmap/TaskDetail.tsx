"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/Toast";
import { StatusBadge } from "@/components/os/ui";
import { BOS_STATUSES, BOS_PRIORITIES, STATUS_META, shortDate } from "@/lib/bos";
import type { BosStatus, BosPriority } from "@/lib/bos";
import { patchTask, setTaskEdge, addTaskComment, deleteTaskComment } from "../actions";
import type { RoadmapTask, TaskEdge, OwnerOption, Goal } from "./types";

export type TaskComment = {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
};

/**
 * The task, opened as a panel over whatever you were looking at.
 *
 * Every field commits on its own: a status change is one click and one write,
 * not a form to fill and submit. Title and description are the exception —
 * they hold an edit until you save, because losing half a sentence to a
 * stray blur is worse than an extra click.
 *
 * Render this with `key={task.id}` so following a blocker link remounts it and
 * the draft title and description reset, rather than syncing them in an effect.
 */
export function TaskDetail({
  task,
  goal,
  allTasks,
  edges,
  comments,
  owners,
  onClose,
  onOpenTask,
}: {
  task: RoadmapTask;
  goal: Goal | null;
  allTasks: RoadmapTask[];
  edges: TaskEdge[];
  comments: TaskComment[];
  owners: OwnerOption[];
  onClose: () => void;
  onOpenTask: (id: string) => void;
}) {
  const [saving, start] = useTransition();
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description ?? "");
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const [picker, setPicker] = useState(false);

  const ownerName = (id: string | null) => {
    const o = owners.find((x) => x.id === id);
    return o ? o.full_name || o.email || "Unknown" : "Unassigned";
  };

  const run = (fn: () => Promise<{ error?: string } | { success: boolean }>, ok = "Saved") =>
    start(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) toast(res.error, "error");
      else toast(ok, "success");
    });

  const patch = (p: Record<string, unknown>, ok?: string) => run(() => patchTask(task.id, p), ok);

  const blockers = edges
    .filter((e) => e.from_id === task.id)
    .map((e) => ({ edge: e, on: allTasks.find((t) => t.id === e.to_id) }))
    .filter((b) => b.on);
  const blocks = edges
    .filter((e) => e.to_id === task.id)
    .map((e) => ({ edge: e, on: allTasks.find((t) => t.id === e.from_id) }))
    .filter((b) => b.on);

  const candidates = allTasks
    .filter((t) => t.id !== task.id && !blockers.some((b) => b.on!.id === t.id))
    .slice(0, 120);

  const overdue =
    !!task.due_date &&
    task.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10) &&
    task.status !== "completed" &&
    task.status !== "cancelled";

  const field =
    "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-brand";

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={task.title}
        className="relative my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-soft"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[11px] text-faint">
              <span className="font-mono">{task.code}</span>
              {goal && (
                <>
                  <span>·</span>
                  <span className="truncate">{goal.code ?? ""} {goal.objective}</span>
                </>
              )}
            </p>
            {editing ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1 font-display text-lg font-bold text-fg outline-none focus:border-brand"
              />
            ) : (
              <h2
                onClick={() => setEditing(true)}
                className="mt-1 cursor-text font-display text-lg font-bold text-fg"
              >
                {task.title}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-ink-2 hover:text-fg"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="grid gap-0 md:grid-cols-[1fr_260px]">
          {/* ── Main column ── */}
          <div className="min-w-0 space-y-6 px-6 py-5">
            <section>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                Description
              </h3>
              {editing ? (
                <textarea
                  rows={4}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="What does done look like?"
                  className={field}
                />
              ) : (
                <p
                  onClick={() => setEditing(true)}
                  className="cursor-text whitespace-pre-wrap rounded-lg px-1 py-0.5 text-sm text-muted hover:bg-surface-2"
                >
                  {task.description || "Add a description…"}
                </p>
              )}
              {editing && (
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={saving}
                    onClick={() =>
                      run(
                        () => patchTask(task.id, { title, description: desc || null }),
                        "Task updated",
                      )
                    }
                    className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setTitle(task.title);
                      setDesc(task.description ?? "");
                      setEditing(false);
                    }}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </section>

            {/* Dependencies */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  Waits on
                </h3>
                <button
                  onClick={() => setPicker((p) => !p)}
                  className="text-[11px] font-medium text-brand-soft hover:underline"
                >
                  {picker ? "Cancel" : "+ Add blocker"}
                </button>
              </div>

              {picker && (
                <select
                  autoFocus
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    run(() => setTaskEdge(task.id, e.target.value, true), "Blocker added");
                    setPicker(false);
                  }}
                  className={`${field} mb-2`}
                >
                  <option value="">Choose a task this one waits on…</option>
                  {candidates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} · {t.title}
                    </option>
                  ))}
                </select>
              )}

              {blockers.length === 0 ? (
                <p className="text-xs text-faint">Nothing. This can start whenever.</p>
              ) : (
                <ul className="space-y-1.5">
                  {blockers.map(({ edge, on }) => {
                    const done = on!.status === "completed";
                    return (
                      <li key={edge.id} className="flex items-start gap-2 text-xs">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${done ? "bg-green-500" : "bg-amber-500"}`} />
                        <button
                          onClick={() => onOpenTask(on!.id)}
                          className="min-w-0 flex-1 text-left hover:underline"
                        >
                          <span className="font-mono text-[11px] text-faint">{on!.code}</span>{" "}
                          <span className={done ? "text-muted line-through" : "text-fg"}>{on!.title}</span>
                          {task.dependency_id === on!.id && (
                            <span className="ml-1.5 rounded bg-brand/10 px-1 text-[10px] font-medium text-brand-soft">
                              critical path
                            </span>
                          )}
                          {edge.note && <span className="block text-faint">{edge.note}</span>}
                        </button>
                        <button
                          onClick={() => run(() => setTaskEdge(task.id, on!.id, false), "Blocker removed")}
                          className="shrink-0 text-faint hover:text-red-600"
                          aria-label="Remove blocker"
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {blocks.length > 0 && (
                <>
                  <h3 className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                    Blocks
                  </h3>
                  <ul className="space-y-1">
                    {blocks.map(({ edge, on }) => (
                      <li key={edge.id}>
                        <button
                          onClick={() => onOpenTask(on!.id)}
                          className="text-xs text-muted hover:underline"
                        >
                          <span className="font-mono text-[11px] text-faint">{on!.code}</span> {on!.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {/* Comments */}
            <section>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                Comments {comments.length > 0 && `(${comments.length})`}
              </h3>
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="group flex gap-2.5">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand-soft">
                      {(ownerName(c.author_id) || "?").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-faint">
                        {ownerName(c.author_id)} · {shortDate(c.created_at)}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-fg">{c.body}</p>
                    </div>
                    <button
                      onClick={() => run(() => deleteTaskComment(c.id), "Comment deleted")}
                      className="shrink-0 text-faint opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                      aria-label="Delete comment"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-faint">No comments yet.</p>
                )}
              </div>

              <div className="mt-3">
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Leave a comment…"
                  className={field}
                />
                <button
                  disabled={saving || !comment.trim()}
                  onClick={() =>
                    run(async () => {
                      const res = await addTaskComment(task.id, comment);
                      if (!("error" in res)) setComment("");
                      return res;
                    }, "Comment added")
                  }
                  className="mt-2 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  Comment
                </button>
              </div>
            </section>
          </div>

          {/* ── Properties: each one commits on change ── */}
          <aside className="space-y-4 border-t border-line bg-surface-2/40 px-5 py-5 md:border-l md:border-t-0">
            <Prop label="Status">
              <select
                value={task.status}
                onChange={(e) => patch({ status: e.target.value as BosStatus }, "Status updated")}
                className={field}
              >
                {BOS_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </Prop>

            <Prop label="Assignee">
              <select
                value={task.owner_id ?? ""}
                onChange={(e) => patch({ owner_id: e.target.value || null }, "Assignee updated")}
                className={field}
              >
                <option value="">Unassigned</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name || o.email}
                  </option>
                ))}
              </select>
            </Prop>

            <Prop label="Priority">
              <select
                value={task.priority}
                onChange={(e) => patch({ priority: e.target.value as BosPriority }, "Priority updated")}
                className={field}
              >
                {BOS_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Prop>

            <Prop label="Start">
              <input
                type="date"
                defaultValue={task.start_date?.slice(0, 10) ?? ""}
                onChange={(e) => patch({ start_date: e.target.value || null }, "Start date updated")}
                className={field}
              />
            </Prop>

            <Prop label={overdue ? "Due · overdue" : "Due"}>
              <input
                type="date"
                defaultValue={task.due_date?.slice(0, 10) ?? ""}
                onChange={(e) => patch({ due_date: e.target.value || null }, "Due date updated")}
                className={`${field} ${overdue ? "border-red-300 text-red-700" : ""}`}
              />
            </Prop>

            <Prop label="Estimate (hours)">
              <input
                type="number"
                min={0}
                step="0.5"
                defaultValue={task.estimate_hours ?? ""}
                onChange={(e) =>
                  patch({ estimate_hours: e.target.value === "" ? null : Number(e.target.value) }, "Estimate updated")
                }
                className={field}
              />
            </Prop>

            <Prop label="Critical path blocker">
              <select
                value={task.dependency_id ?? ""}
                onChange={(e) => patch({ dependency_id: e.target.value || null }, "Blocker updated")}
                className={field}
              >
                <option value="">None</option>
                {allTasks
                  .filter((t) => t.id !== task.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} · {t.title}
                    </option>
                  ))}
              </select>
            </Prop>

            <div className="border-t border-line pt-3 text-[11px] text-faint">
              <p className="flex items-center gap-1.5">
                Currently <StatusBadge status={task.status} />
              </p>
              {task.completed_at && <p className="mt-1">Completed {shortDate(task.completed_at)}</p>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</p>
      {children}
    </div>
  );
}
