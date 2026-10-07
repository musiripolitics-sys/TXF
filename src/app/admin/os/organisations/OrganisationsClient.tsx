"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "@/components/Toast";
import { Card, EmptyState } from "@/components/os/ui";
import type { Organisation } from "@/lib/os-tenants";
import {
  createOrganisation, renameOrganisation, setOrganisationStatus, switchTenant,
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
}: {
  orgs: Organisation[];
  canCreate: boolean;
  migrated: boolean;
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
            const isAdmin = o.role === "admin";
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

      <p className="mt-6 text-[11px] leading-relaxed text-faint">
        Adding people to a business happens in{" "}
        <Link href="/admin/os/team/access" className="underline hover:text-fg">Team &amp; Access</Link>,
        inside whichever business you are currently working in. Switch first, then invite —
        an invitation belongs to one business, not to the platform.
      </p>
    </div>
  );
}
