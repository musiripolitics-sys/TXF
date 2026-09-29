"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "@/components/Toast";
import { Card, EmptyState } from "@/components/os/ui";
import { setEmployeeRole, setModuleAccess } from "../../actions";

export type PersonRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  joined: string;
  sections: string[];
};

const SECTIONS = [
  ["plan", "Plan"], ["events", "Events"], ["money", "Money"], ["grow", "Grow"],
  ["marketing", "Marketing"], ["team", "Team"], ["product", "Product"],
  ["govern", "Govern"], ["insights", "Insights"],
] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  employee: "Employee",
  event_host: "Host",
  community_member: "Member",
};

/**
 * People and what they can open.
 *
 * Access is granted by ticking sections, which is the same vocabulary the
 * sidebar uses — so what an admin ticks here is literally what the employee
 * will see. Admins are shown but not editable: they always have everything,
 * and letting one be edited invites locking the last admin out.
 */
export function AccessClient({ people, migrated }: { people: PersonRow[]; migrated: boolean }) {
  const [saving, start] = useTransition();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return people;
    return people.filter(
      (p) =>
        (p.name ?? "").toLowerCase().includes(t) ||
        (p.email ?? "").toLowerCase().includes(t),
    );
  }, [people, q]);

  const employees = filtered.filter((p) => p.role === "employee");
  const others = filtered.filter((p) => p.role !== "employee");

  const run = (fn: () => Promise<{ error?: string } | { success: boolean }>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) toast(res.error, "error");
      else toast(ok, "success");
    });

  const openEditor = (p: PersonRow) => {
    setOpenId(p.id);
    setDraft(p.sections);
  };

  return (
    <>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">People &amp; Access</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email…"
          className="w-56 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg outline-none focus:border-brand"
        />
      </div>
      <p className="mb-5 max-w-2xl text-sm text-muted">
        Who can open which sections of the Business OS. Ticking a section is
        exactly what that person will see in their sidebar. Admins always have
        every section and cannot be edited here.
      </p>

      {!migrated && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Run migration <span className="font-mono">0016_employee_access.sql</span> in Supabase to
          start assigning access. Until then nobody but an admin can open the OS.
        </div>
      )}

      <Section title={`Employees (${employees.length})`}>
        {employees.length === 0 ? (
          <EmptyState
            title="No employees yet"
            hint="Anyone who has signed up can be made an employee below, then given sections."
          />
        ) : (
          <div className="divide-y divide-line">
            {employees.map((p) => (
              <PersonLine
                key={p.id}
                person={p}
                editing={openId === p.id}
                draft={draft}
                saving={saving}
                onEdit={() => openEditor(p)}
                onCancel={() => setOpenId(null)}
                onToggle={(s) =>
                  setDraft((d) => (d.includes(s) ? d.filter((x) => x !== s) : [...d, s]))
                }
                onSelectAll={() => setDraft(SECTIONS.map(([k]) => k))}
                onClear={() => setDraft([])}
                onSave={() => {
                  run(() => setModuleAccess(p.id, draft), "Access updated");
                  setOpenId(null);
                }}
                onRole={(role) => run(() => setEmployeeRole(p.id, role), "Role updated")}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title={`Everyone else (${others.length})`}>
        <div className="divide-y divide-line">
          {others.map((p) => (
            <PersonLine
              key={p.id}
              person={p}
              editing={openId === p.id}
              draft={draft}
              saving={saving}
              onEdit={() => openEditor(p)}
              onCancel={() => setOpenId(null)}
              onToggle={(s) =>
                setDraft((d) => (d.includes(s) ? d.filter((x) => x !== s) : [...d, s]))
              }
              onSelectAll={() => setDraft(SECTIONS.map(([k]) => k))}
              onClear={() => setDraft([])}
              onSave={() => {
                run(() => setModuleAccess(p.id, draft), "Access updated");
                setOpenId(null);
              }}
              onRole={(role) => run(() => setEmployeeRole(p.id, role), "Role updated")}
            />
          ))}
        </div>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">{title}</h2>
      <Card className="p-0">{children}</Card>
    </div>
  );
}

function PersonLine({
  person: p,
  editing,
  draft,
  saving,
  onEdit,
  onCancel,
  onToggle,
  onSelectAll,
  onClear,
  onSave,
  onRole,
}: {
  person: PersonRow;
  editing: boolean;
  draft: string[];
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onToggle: (s: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onSave: () => void;
  onRole: (role: string) => void;
}) {
  const isAdminRow = p.role === "admin";

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand-soft">
          {(p.name || p.email || "?").slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{p.name || "No name"}</p>
          <p className="truncate text-xs text-faint">{p.email}</p>
        </div>

        <select
          value={p.role}
          disabled={isAdminRow || saving}
          onChange={(e) => onRole(e.target.value)}
          className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-fg outline-none focus:border-brand disabled:opacity-50"
        >
          {Object.entries(ROLE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        {isAdminRow ? (
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand-soft">
            All sections
          </span>
        ) : (
          <button
            onClick={editing ? onCancel : onEdit}
            className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:border-brand hover:text-brand"
          >
            {editing ? "Cancel" : p.sections.length === 0 ? "No access" : `${p.sections.length} sections`}
          </button>
        )}
      </div>

      {!editing && !isAdminRow && p.sections.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-11">
          {SECTIONS.filter(([k]) => p.sections.includes(k)).map(([k, label]) => (
            <span key={k} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
              {label}
            </span>
          ))}
        </div>
      )}

      {editing && !isAdminRow && (
        <div className="mt-3 rounded-xl border border-line bg-surface-2/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              Sections this person can open
            </p>
            <div className="flex gap-2 text-[11px]">
              <button onClick={onSelectAll} className="text-brand-soft hover:underline">
                All
              </button>
              <button onClick={onClear} className="text-muted hover:underline">
                None
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {SECTIONS.map(([k, label]) => {
              const on = draft.includes(k);
              return (
                <button
                  key={k}
                  onClick={() => onToggle(k)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
                    on
                      ? "border-brand/40 bg-brand/10 font-medium text-brand-soft"
                      : "border-line text-muted hover:border-brand/30"
                  }`}
                >
                  <span
                    className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded border ${
                      on ? "border-brand bg-brand text-white" : "border-line"
                    }`}
                  >
                    {on && (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2 6.5L4.5 9 10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              disabled={saving}
              onClick={onSave}
              className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save access"}
            </button>
            <span className="text-[11px] text-faint">
              {draft.length === 0
                ? "They will not be able to open the Business OS."
                : `${draft.length} of 9 sections`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
