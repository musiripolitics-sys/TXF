"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "@/components/Toast";
import { Card, EmptyState } from "@/components/os/ui";
import type { Organisation, PlatformAdmin } from "@/lib/os-tenants";
import {
  createOrganisation, renameOrganisation, setOrganisationStatus, switchTenant,
  grantPlatformAdmin, revokePlatformAdmin,
} from "../actions";

/** The same rule as public.bos_slugify, for previewing the address as you type. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  suspended: "bg-amber-50 text-amber-700",
  archived: "bg-surface-2 text-faint",
};

/**
 * Every business this person belongs to, with the one control that did not
 * exist until 0050: a way to make another.
 *
 * Switching is here as well as in the top bar, because the top bar switcher
 * is a one-line control that cannot say what it is switching you into. This
 * can: role, member count, products, status.
 */
export function OrganisationsClient({
  orgs,
  canCreate,
  migrated,
  platformAdmins,
  me,
}: {
  orgs: Organisation[];
  canCreate: boolean;
  migrated: boolean;
  platformAdmins: PlatformAdmin[];
  me: string;
}) {
  const [saving, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const preview = slugify(slug || name);

  function create(formData: FormData) {
    start(async () => {
      const res = await createOrganisation(formData);
      if ("error" in res && res.error) return toast(res.error, "error");
      toast(`${formData.get("name")} created. You are its admin.`, "success");
      setAdding(false);
      setName("");
      setSlug("");
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-fg">Organisations</h1>
          <p className="mt-0.5 text-sm text-muted">
            The businesses running on this platform. Each one has its own people, products
            and data, and nothing crosses between them.
          </p>
        </div>
        {canCreate && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            New organisation
          </button>
        )}
      </header>

      {!migrated && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Migration 0050 has not run.</strong> Creating and managing businesses needs{" "}
          <code className="font-mono text-[12px]">0050_organisations.sql</code> in the Supabase
          SQL editor. Until then a business can only be inserted by hand.
        </div>
      )}

      {adding && (
        <Card className="mb-4">
          <form action={create}>
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              New organisation
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  Name
                </span>
                <input
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  autoFocus
                  placeholder="Acme Widgets"
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-brand"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  Address <span className="font-normal normal-case tracking-normal">(optional)</span>
                </span>
                <input
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={preview || "acme-widgets"}
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-[13px] text-fg outline-none focus:border-brand"
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] text-faint">
              {preview
                ? <>Identified across the platform as <code className="font-mono text-fg">{preview}</code>. It does not change if you rename the business later.</>
                : "The address is built from the name unless you set one."}
            </p>
            <p className="mt-3 rounded-xl border border-line bg-surface-2/50 px-3 py-2 text-[11px] text-muted">
              You become its admin, and it starts with the full product catalogue. It begins
              empty — no people, no events, no money — and sees nothing belonging to any other
              business.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="submit"
                disabled={saving || name.trim().length < 2}
                className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-xs font-medium text-faint hover:text-fg"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {orgs.length === 0 ? (
        <EmptyState
          title="You do not belong to a business"
          hint={
            migrated
              ? "Somebody who administers one needs to invite you, from Team & Access."
              : "Run migration 0050, then reload."
          }
        />
      ) : (
        <div className="space-y-3">
          {orgs.map((o) => {
            // A super admin holds no membership, so bos_my_tenant_summary
            // reports super_admin rather than admin. Both may rename and
            // suspend; the database decides, this only draws the buttons.
            const isAdmin = o.role === "admin" || o.role === "super_admin";
            return (
              <Card key={o.id} className={o.is_active ? "border-brand/40" : ""}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {renaming === o.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          autoFocus
                          className="rounded-lg border border-line bg-surface px-2.5 py-1 text-sm text-fg outline-none focus:border-brand"
                        />
                        <button
                          type="button"
                          disabled={saving || draftName.trim().length < 2}
                          onClick={() =>
                            start(async () => {
                              const res = await renameOrganisation(o.id, draftName);
                              if ("error" in res && res.error) return toast(res.error, "error");
                              toast("Renamed", "success");
                              setRenaming(null);
                            })
                          }
                          className="rounded-full border border-brand px-3 py-1 text-xs font-semibold text-brand disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenaming(null)}
                          className="text-xs text-faint hover:text-fg"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <h2 className="flex flex-wrap items-center gap-2 font-display text-base font-semibold text-fg">
                        {o.name}
                        {o.is_active && (
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                            You are here
                          </span>
                        )}
                        {o.is_default && (
                          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
                            Main
                          </span>
                        )}
                        {o.status !== "active" && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[o.status] ?? ""}`}>
                            {o.status}
                          </span>
                        )}
                      </h2>
                    )}
                    <p className="mt-1 text-xs text-faint">
                      <code className="font-mono text-[11px]">{o.slug}</code>
                      {" · "}you are {o.role === "admin" ? "an admin" : `a${/^[aeiou]/.test(o.role) ? "n" : ""} ${o.role.replace(/_/g, " ")}`}
                      {" · "}{o.member_count} {o.member_count === 1 ? "person" : "people"}
                      {" · "}{o.product_count} products
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {o.status === "active" && !o.is_active && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          start(async () => {
                            const res = await switchTenant(o.id);
                            if (res && "error" in res && res.error) return toast(res.error, "error");
                            toast(`Now working in ${o.name}`, "success");
                          })
                        }
                        className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:border-brand hover:text-brand disabled:opacity-50"
                      >
                        Open
                      </button>
                    )}
                    {isAdmin && renaming !== o.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setRenaming(o.id);
                          setDraftName(o.name);
                        }}
                        className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:border-brand hover:text-brand"
                      >
                        Rename
                      </button>
                    )}
                    {isAdmin && !o.is_default && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          start(async () => {
                            const next = o.status === "active" ? "suspended" : "active";
                            const res = await setOrganisationStatus(o.id, next);
                            if ("error" in res && res.error) return toast(res.error, "error");
                            toast(next === "active" ? `${o.name} reactivated` : `${o.name} suspended`, "success");
                          })
                        }
                        className={
                          o.status === "active"
                            ? "text-xs font-medium text-faint hover:text-red-600 disabled:opacity-50"
                            : "rounded-full border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 disabled:opacity-50"
                        }
                      >
                        {o.status === "active" ? "Suspend" : "Reactivate"}
                      </button>
                    )}
                  </div>
                </div>

                {o.is_default && (
                  <p className="mt-3 text-[11px] text-faint">
                    The main business. Everything with no business of its own falls back here,
                    which is why it cannot be suspended.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {canCreate && (
        <PlatformAdmins admins={platformAdmins} me={me} saving={saving} start={start} />
      )}

      <p className="mt-6 text-[11px] leading-relaxed text-faint">
        Adding people to a business happens in{" "}
        <Link href="/admin/os/team/access" className="underline hover:text-fg">Team &amp; Access</Link>,
        inside whichever business you are currently working in. Switch first, then invite —
        an invitation belongs to one business, not to the platform.
      </p>
    </div>
  );
}

/**
 * Who runs the platform.
 *
 * Here rather than on Team & Access, because platform authority is not a fact
 * about any business and Team & Access is always about one. Before 0052 there
 * was nothing to show: the authority was "admin of the business flagged
 * default", so appointing somebody meant editing a membership and hoping.
 *
 * Support is listed beside super admin deliberately. A list that showed only
 * permanent authority would hide exactly the access worth reviewing.
 */
function PlatformAdmins({
  admins,
  me,
  saving,
  start,
}: {
  admins: PlatformAdmin[];
  me: string;
  saving: boolean;
  start: (fn: () => Promise<void>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("super_admin");
  const [days, setDays] = useState("7");
  const field =
    "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-brand";

  const supers = admins.filter((a) => a.role === "super_admin" && !a.is_expired).length;

  return (
    <div className="mt-8">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
          Platform administrators ({admins.length})
        </h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:border-brand hover:text-brand"
        >
          {open ? "Cancel" : "+ Appoint"}
        </button>
      </div>

      {open && (
        <Card className="mb-3">
          <form
            action={(fd) =>
              start(async () => {
                const res = await grantPlatformAdmin(fd);
                if ("error" in res && res.error) return toast(res.error, "error");
                toast("Appointed", "success");
                setOpen(false);
                setEmail("");
              })
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  Email of an existing account
                </span>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="them@example.com"
                  className={field}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  As
                </span>
                <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className={field}>
                  <option value="super_admin">Super admin</option>
                  <option value="support">Support (temporary)</option>
                </select>
              </label>
            </div>

            {role === "support" && (
              <label className="mt-3 block max-w-[12rem]">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  Ends after
                </span>
                <select name="days" value={days} onChange={(e) => setDays(e.target.value)} className={field}>
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                </select>
              </label>
            )}

            <p className="mt-3 rounded-xl border border-line bg-surface-2/50 px-3 py-2 text-[11px] text-muted">
              {role === "super_admin"
                ? "A super admin may enter every business on the platform and create new ones. Entering a business they do not belong to is written to that business audit log."
                : "Support access must end. It does not make somebody a super admin — it is the seat that time-boxed internal access will use."}
            </p>

            <button
              type="submit"
              disabled={saving || !email.includes("@")}
              className="mt-3 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Appointing…" : "Appoint"}
            </button>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <div className="divide-y divide-line">
          {admins.map((a) => (
            <div key={a.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                  {a.full_name || a.email || a.user_id}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      a.role === "super_admin" ? "bg-brand/10 text-brand-soft" : "bg-surface-2 text-faint"
                    }`}
                  >
                    {a.role === "super_admin" ? "Super admin" : "Support"}
                  </span>
                  {a.is_expired && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      Expired
                    </span>
                  )}
                  {a.user_id === me && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
                      You
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-faint">
                  {a.email}
                  {a.granted_by_email && ` · appointed by ${a.granted_by_email}`}
                  {a.expires_at
                    ? ` · ${a.is_expired ? "ended" : "ends"} ${new Date(a.expires_at).toLocaleDateString()}`
                    : " · does not expire"}
                </p>
              </div>
              <button
                type="button"
                disabled={saving || (a.role === "super_admin" && supers <= 1 && !a.is_expired)}
                title={
                  a.role === "super_admin" && supers <= 1 && !a.is_expired
                    ? "The last platform administrator cannot be removed — nobody else can appoint one."
                    : undefined
                }
                onClick={() =>
                  start(async () => {
                    const res = await revokePlatformAdmin(a.user_id);
                    if ("error" in res && res.error) return toast(res.error, "error");
                    toast("Removed", "success");
                  })
                }
                className="shrink-0 text-xs font-medium text-faint hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>
      <p className="mt-2 max-w-2xl text-xs text-muted">
        Platform authority is a row here, not a membership in any business — which is why removing
        the last one is refused: nobody else is able to appoint a replacement.
      </p>
    </div>
  );
}
