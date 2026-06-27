"use client";

import { useMemo, useState } from "react";

export type Member = {
  id: string;
  full_name: string | null;
  city: string | null;
  bio: string | null;
  linkedin_url: string | null;
  primary_role: string | null;
};

const roleLabel: Record<string, string> = {
  community_member: "Member",
  event_host: "Host",
  admin: "Admin",
};
const roleBadge: Record<string, string> = {
  Host: "bg-host/15 text-host-soft",
  Admin: "bg-[#2563eb]/15 text-[#2563eb]",
  Member: "bg-ink-2 text-faint",
};

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?";
}

export function DirectoryBrowser({ members }: { members: Member[] }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("All");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return members.filter((m) => {
      const label = roleLabel[m.primary_role ?? ""] ?? "Member";
      return (
        (role === "All" || label === role) &&
        (s === "" ||
          `${m.full_name ?? ""} ${m.city ?? ""} ${m.bio ?? ""}`
            .toLowerCase()
            .includes(s))
      );
    });
  }, [members, q, role]);

  return (
    <div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, city or bio…"
          aria-label="Search members"
          className="w-full flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Filter by role"
          className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-fg focus:border-brand focus:outline-none"
        >
          {["All", "Member", "Host", "Admin"].map((r) => (
            <option key={r} value={r}>
              {r === "All" ? "All roles" : r}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <p className="font-display text-lg text-fg">No members found.</p>
          <p className="mt-1 text-sm text-muted">
            {members.length === 0
              ? "The directory is just getting started — opt in from your profile to be the first."
              : "Try a different search or role filter."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {filtered.map((m) => {
            const label = roleLabel[m.primary_role ?? ""] ?? "Member";
            const name = m.full_name || "Member";
            return (
              <div
                key={m.id}
                className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-join text-sm font-bold text-white">
                    {initials(name)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-fg">{name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadge[label] ?? roleBadge.Member}`}
                      >
                        {label}
                      </span>
                    </div>
                    {m.city && <p className="text-xs text-faint">{m.city}</p>}
                  </div>
                </div>
                {m.bio && (
                  <p className="mt-3 line-clamp-3 text-sm text-muted">{m.bio}</p>
                )}
                {m.linkedin_url && (
                  <a
                    href={m.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-xs font-medium text-brand-soft hover:underline"
                  >
                    Connect on LinkedIn →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
