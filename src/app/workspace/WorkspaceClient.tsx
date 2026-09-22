"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "@/components/Toast";
import { Modal, Field, Input, Textarea, Select, FormActions } from "@/components/os/Modal";
import { Card, KpiCard, StatusBadge, PriorityBadge, EmptyState, Meter } from "@/components/os/ui";
import {
  BOS_STATUSES, BOS_PRIORITIES, STATUS_META, shortDate, num,
  type BosStatus, type BosPriority,
} from "@/lib/bos";
import { setMyTaskStatus, addMyTask, logMyExpense, addMyLead, updateMyKpiActual } from "./actions";
import type { Task } from "../admin/os/tasks/types";
import type { Goal, Workstream } from "../admin/os/roadmap/types";
import type { KpiRow, PendingApproval, AssignedEvent } from "./page";

const todayISO = () => new Date().toISOString().slice(0, 10);

export function WorkspaceClient({
  name,
  tasks,
  goals,
  kpis,
  workstreams,
  approvals,
  assignedEvents,
}: {
  name: string;
  tasks: Task[];
  goals: Goal[];
  kpis: KpiRow[];
  workstreams: Workstream[];
  approvals: PendingApproval[];
  assignedEvents: AssignedEvent[];
}) {
  const [modal, setModal] = useState<null | "task" | "expense" | "lead">(null);
  const [pending, start] = useTransition();
  const [kpiVals, setKpiVals] = useState<Record<string, string>>(
    Object.fromEntries(kpis.map((k) => [k.id, k.actual != null ? String(k.actual) : ""])),
  );

  const saveKpi = (id: string) =>
    start(async () => {
      const res = await updateMyKpiActual(id, Number(kpiVals[id] || 0));
      if (res?.error) toast(res.error, "error");
      else toast("KPI updated", "success");
    });

  const t = todayISO();
  const open = (s: BosStatus) => s !== "completed" && s !== "cancelled";
  const due = tasks.filter((x) => x.due_date === t && open(x.status));
  const overdue = tasks.filter((x) => x.due_date && x.due_date < t && open(x.status));
  const upcoming = tasks.filter((x) => x.due_date && x.due_date > t && open(x.status));

  const kpiAch = useMemo(() => {
    const tt = kpis.reduce((a, k) => a + Number(k.target ?? 0), 0);
    const aa = kpis.reduce((a, k) => a + Number(k.actual ?? 0), 0);
    return tt > 0 ? Math.round((aa / tt) * 100) : 0;
  }, [kpis]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  const quickStatus = (id: string, status: BosStatus) =>
    start(async () => {
      const res = await setMyTaskStatus(id, status);
      if (res?.error) toast(res.error, "error");
    });

  const renderTasks = (list: Task[], empty: string) =>
    list.length === 0 ? (
      <p className="px-4 py-6 text-center text-sm text-muted">{empty}</p>
    ) : (
      <ul className="divide-y divide-line">
        {list.map((x) => (
          <li key={x.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-fg">{x.title}</p>
              <p className="text-xs text-muted">Due {shortDate(x.due_date)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PriorityBadge priority={x.priority} />
              <select
                value={x.status}
                onChange={(e) => quickStatus(x.id, e.target.value as BosStatus)}
                className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-fg outline-none focus:border-brand"
              >
                {BOS_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
              </select>
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold capitalize tracking-tight text-fg">
            {greeting}, {name}
          </h1>
          <p className="text-sm text-muted">Here&apos;s what needs you today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModal("task")} className="rounded-full bg-brand px-3.5 py-1.5 text-sm font-medium text-white">+ Task</button>
          <button onClick={() => setModal("expense")} className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-muted hover:text-fg">+ Log expense</button>
          <button onClick={() => setModal("lead")} className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-muted hover:text-fg">+ Add lead</button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Due today" value={num(due.length)} tone={due.length ? "warn" : "default"} />
        <KpiCard label="Overdue" value={num(overdue.length)} tone={overdue.length ? "bad" : "good"} />
        <KpiCard label="Upcoming" value={num(upcoming.length)} />
        <KpiCard label="My goals" value={num(goals.length)} />
        <KpiCard label="KPI achievement" value={kpis.length ? `${kpiAch}%` : "—"} tone={kpiAch >= 100 ? "good" : "default"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 font-display text-sm font-semibold text-fg">Due today</h2>
            <Card className="p-0">{renderTasks(due, "Nothing due today 🎉")}</Card>
          </section>
          {overdue.length > 0 && (
            <section>
              <h2 className="mb-2 font-display text-sm font-semibold text-red-600">Overdue</h2>
              <Card className="p-0">{renderTasks(overdue, "")}</Card>
            </section>
          )}
          <section>
            <h2 className="mb-2 font-display text-sm font-semibold text-fg">Upcoming</h2>
            <Card className="p-0">{renderTasks(upcoming.slice(0, 8), "No upcoming tasks.")}</Card>
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="mb-2 font-display text-sm font-semibold text-fg">My goals</h2>
            {goals.length === 0 ? (
              <EmptyState title="No goals assigned" hint="Your manager assigns roadmap goals to you." />
            ) : (
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {goals.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{g.objective}</p>
                        <p className="text-xs text-muted">Due {shortDate(g.end_date)}</p>
                      </div>
                      <StatusBadge status={g.status} />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-display text-sm font-semibold text-fg">My KPIs</h2>
            {kpis.length === 0 ? (
              <EmptyState title="No KPIs yet" hint="KPI targets set by your manager appear here." />
            ) : (
              <Card>
                <div className="space-y-4">
                  {kpis.map((k) => {
                    const target = Number(k.target ?? 0);
                    const actual = Number(kpiVals[k.id] || 0);
                    return (
                      <div key={k.id}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="text-fg">{k.kpi_name}</span>
                          <span className="flex items-center gap-1">
                            <input
                              type="number"
                              value={kpiVals[k.id] ?? ""}
                              onChange={(e) => setKpiVals({ ...kpiVals, [k.id]: e.target.value })}
                              className="w-16 rounded-lg border border-line bg-surface px-2 py-0.5 text-right text-xs tabular-nums text-fg outline-none focus:border-brand"
                            />
                            <span className="text-xs tabular-nums text-muted">/ {target || "—"}</span>
                            <button onClick={() => saveKpi(k.id)} disabled={pending} className="ml-1 text-xs font-medium text-brand-soft hover:underline disabled:opacity-60">Save</button>
                          </span>
                        </div>
                        <Meter actual={actual} target={target} />
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-display text-sm font-semibold text-fg">Assigned events</h2>
            {assignedEvents.length === 0 ? (
              <EmptyState title="No assigned events" hint="Events you own appear here." />
            ) : (
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {assignedEvents.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div><p className="font-medium text-fg">{e.title}</p><p className="text-xs text-muted">{e.type}</p></div>
                      <span className="text-xs text-muted">{shortDate(e.date)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-display text-sm font-semibold text-fg">My pending approvals</h2>
            {approvals.length === 0 ? (
              <EmptyState title="Nothing pending" hint="Requests you submit for approval show here." />
            ) : (
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {approvals.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <p className="font-medium text-fg">{a.request_title}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">{a.request_type} · pending</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </div>
      </div>

      <TaskModal open={modal === "task"} onClose={() => setModal(null)} workstreams={workstreams} pending={pending} start={start} />
      <ExpenseModal open={modal === "expense"} onClose={() => setModal(null)} pending={pending} start={start} />
      <LeadModal open={modal === "lead"} onClose={() => setModal(null)} pending={pending} start={start} />
    </div>
  );
}

type StartFn = ReturnType<typeof useTransition>[1];

function TaskModal({ open, onClose, workstreams, pending, start }: { open: boolean; onClose: () => void; workstreams: Workstream[]; pending: boolean; start: StartFn }) {
  const [f, setF] = useState({ title: "", description: "", due_date: "", priority: "medium" as BosPriority, workstream_id: "" });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await addMyTask(f);
      if (res?.error) toast(res.error, "error");
      else { toast("Task added", "success"); setF({ title: "", description: "", due_date: "", priority: "medium", workstream_id: "" }); onClose(); }
    });
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a task">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Task *"><Input value={f.title} required onChange={(e) => setF({ ...f, title: e.target.value })} /></Field></div>
        <div className="sm:col-span-2"><Field label="Description"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
        <Field label="Due date"><Input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
        <Field label="Priority">
          <Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as BosPriority })}>
            {BOS_PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Workstream">
            <Select value={f.workstream_id} onChange={(e) => setF({ ...f, workstream_id: e.target.value })}>
              <option value="">—</option>
              {workstreams.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="sm:col-span-2"><FormActions onCancel={onClose} saving={pending} submitLabel="Add task" /></div>
      </form>
    </Modal>
  );
}

function ExpenseModal({ open, onClose, pending, start }: { open: boolean; onClose: () => void; pending: boolean; start: StartFn }) {
  const [f, setF] = useState({ category: "Operations", description: "", amountRupees: "", spent_on: todayISO() });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await logMyExpense(f);
      if (res?.error) toast(res.error, "error");
      else { toast("Expense submitted for approval", "success"); onClose(); }
    });
  };
  return (
    <Modal open={open} onClose={onClose} title="Log an expense">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category *"><Input value={f.category} required onChange={(e) => setF({ ...f, category: e.target.value })} /></Field>
        <Field label="Amount (₹) *"><Input type="number" min={0} step="0.01" required value={f.amountRupees} onChange={(e) => setF({ ...f, amountRupees: e.target.value })} /></Field>
        <Field label="Date *"><Input type="date" required value={f.spent_on} onChange={(e) => setF({ ...f, spent_on: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Description"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
        <div className="sm:col-span-2"><FormActions onCancel={onClose} saving={pending} submitLabel="Submit expense" /></div>
      </form>
    </Modal>
  );
}

function LeadModal({ open, onClose, pending, start }: { open: boolean; onClose: () => void; pending: boolean; start: StartFn }) {
  const [f, setF] = useState({ name: "", company: "", contact: "", expectedRupees: "", probability: "" });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await addMyLead(f);
      if (res?.error) toast(res.error, "error");
      else { toast("Lead added", "success"); onClose(); }
    });
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a lead">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Lead name *"><Input value={f.name} required onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Company"><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Contact (email/phone)"><Input value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></Field></div>
        <Field label="Expected revenue (₹)"><Input type="number" min={0} step="0.01" value={f.expectedRupees} onChange={(e) => setF({ ...f, expectedRupees: e.target.value })} /></Field>
        <Field label="Probability (%)"><Input type="number" min={0} max={100} value={f.probability} onChange={(e) => setF({ ...f, probability: e.target.value })} /></Field>
        <div className="sm:col-span-2"><FormActions onCancel={onClose} saving={pending} submitLabel="Add lead" /></div>
      </form>
    </Modal>
  );
}
