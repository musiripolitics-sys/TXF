"use client";

import { useState } from "react";
import { unlockFile } from "@/app/community/actions";
import { toast } from "./Toast";

type FileRow = {
  id: string;
  title: string;
  description: string | null;
  size_bytes: number | null;
  credit_cost: number;
  unlocked: boolean;
};

function formatBytes(n: number | null): string {
  if (!n || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/**
 * The downloads shelf. Every row says up front what it costs and whether the
 * member can afford it — nobody clicks Download only to be told no.
 */
export function GroupFiles({
  files,
  balance,
  isAdmin,
}: {
  files: FileRow[];
  balance: number;
  isAdmin: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [owned, setOwned] = useState<Record<string, boolean>>({});
  const [spent, setSpent] = useState(0);

  const wallet = balance - spent;

  const get = async (f: FileRow) => {
    setBusy(f.id);
    const res = await unlockFile(f.id);
    setBusy(null);

    if (res.error) return toast(res.error, "error");
    if (!res.url) return;

    const wasLocked = !(f.unlocked || owned[f.id] || isAdmin);
    if (wasLocked && f.credit_cost > 0) {
      setSpent((s) => s + f.credit_cost);
      toast(`Unlocked — ${f.credit_cost} credits spent.`, "success");
    }
    setOwned((o) => ({ ...o, [f.id]: true }));
    // Signed URL, valid for a minute. A new tab keeps the page state intact.
    window.open(res.url, "_blank", "noopener,noreferrer");
  };

  if (files.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="font-display text-lg font-bold text-fg">Downloads</h2>
        <p className="mt-2 rounded-xl border border-dashed border-line px-5 py-8 text-center text-sm text-faint">
          Nothing shared here yet. Slides and recordings show up after the session.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-fg">Downloads</h2>
        <span className="text-xs text-faint">
          You have <span className="font-medium text-muted tabular-nums">{wallet}</span> credits
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {files.map((f) => {
          const has = f.unlocked || owned[f.id] || isAdmin;
          const affordable = has || wallet >= f.credit_cost;
          const size = formatBytes(f.size_bytes);

          return (
            <div
              key={f.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{f.title}</p>
                {f.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{f.description}</p>
                )}
                <p className="mt-1 text-xs text-faint">
                  {[
                    size,
                    has
                      ? f.credit_cost > 0
                        ? "Unlocked"
                        : "Free"
                      : `${f.credit_cost} credits`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              {affordable ? (
                <button
                  onClick={() => get(f)}
                  disabled={busy === f.id}
                  className="shrink-0 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busy === f.id ? "Opening…" : has ? "Download" : `Unlock · ${f.credit_cost}`}
                </button>
              ) : (
                <span className="shrink-0 text-right text-xs text-faint">
                  {f.credit_cost - wallet} more credits needed
                  <br />
                  <span className="text-[11px]">Attend a session for +10</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
