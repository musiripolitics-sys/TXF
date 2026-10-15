"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/Toast";

type Tier = {
  id?: string;
  name: string;
  /** Rupees in the form; paise in the column. */
  price: number;
  capacity: number;
  maxPerOrder: number;
  salesEnd: string;
  description: string;
  sold: number;
};

/**
 * Passes and pricing for one event.
 *
 * A host could already do all of this through the API — ticket_types has
 * carried a host clause since it was added — but there was no screen for it,
 * so the one thing an organiser most wants to change after publishing, the
 * price, was the one thing only an admin could reach.
 *
 * Two rules it enforces, both about not damaging somebody who has already
 * paid:
 *
 *   A tier with sales cannot be deleted. registrations.ticket_type_id is
 *   ON DELETE SET NULL, so removing it would strip the tier from every pass
 *   already sold and free seats that are taken.
 *
 *   Its capacity cannot go below what is sold. Capacity is what
 *   create_pending_order checks, and a tier claiming room for twenty with
 *   thirty sold is a tier that will oversell.
 *
 * The event's headline price and capacity are derived from the tiers on
 * save, so the listing, the card and the pass selector cannot disagree.
 */
export function TicketTierEditor({ eventId }: { eventId: string }) {
  const supabase = createClient();
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (apply: (rows: Tier[]) => void = setTiers) => {
    const { data } = await supabase
      .from("ticket_types")
      .select("id,name,description,price_amount,capacity,sold,max_per_order,sales_end")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true });
    apply(
      (data ?? []).map((t) => ({
        id: t.id,
        name: t.name ?? "",
        description: t.description ?? "",
        price: (t.price_amount ?? 0) / 100,
        capacity: t.capacity ?? 0,
        sold: t.sold ?? 0,
        maxPerOrder: t.max_per_order ?? 10,
        salesEnd: t.sales_end ? String(t.sales_end).slice(0, 10) : "",
      })),
    );
  }, [eventId, supabase]);

  useEffect(() => {
    // Guarded so a reply arriving after the panel closes does not set state
    // on an unmounted editor.
    let live = true;
    load((rows) => { if (live) setTiers(rows); });
    return () => { live = false; };
  }, [load]);

  const set = (i: number, patch: Partial<Tier>) =>
    setTiers((ts) => (ts ?? []).map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const add = () =>
    setTiers((ts) => [
      ...(ts ?? []),
      { name: "", description: "", price: 0, capacity: 50, sold: 0, maxPerOrder: 10, salesEnd: "" },
    ]);

  const remove = (i: number) => {
    const t = (tiers ?? [])[i];
    if (t?.sold > 0) {
      return toast(`"${t.name}" has ${t.sold} sold — it cannot be removed.`, "error");
    }
    setTiers((ts) => (ts ?? []).filter((_, j) => j !== i));
  };

  const save = async () => {
    const list = (tiers ?? []).filter((t) => t.name.trim());
    if (!list.length) return toast("An event needs at least one pass.", "error");

    const undersized = list.find((t) => t.capacity < t.sold);
    if (undersized) {
      return toast(
        `"${undersized.name}" has ${undersized.sold} sold — capacity cannot be below that.`,
        "error",
      );
    }

    setSaving(true);
    const existing = await supabase
      .from("ticket_types").select("id,sold").eq("event_id", eventId);
    const kept = new Set(list.map((t) => t.id).filter(Boolean));

    for (const [i, t] of list.entries()) {
      const row = {
        name: t.name.trim(),
        description: t.description.trim() || null,
        price_amount: Math.round((Number(t.price) || 0) * 100),
        capacity: Number(t.capacity) || 0,
        max_per_order: Number(t.maxPerOrder) || 10,
        sales_end: t.salesEnd ? new Date(t.salesEnd).toISOString() : null,
        sort_order: i,
      };
      const res = t.id
        ? await supabase.from("ticket_types").update(row).eq("id", t.id)
        : await supabase.from("ticket_types").insert({ event_id: eventId, ...row });
      if (res.error) {
        setSaving(false);
        return toast(`Couldn't save "${t.name}": ${res.error.message}`, "error");
      }
    }

    const removable = (existing.data ?? [])
      .filter((t) => !kept.has(t.id) && (t.sold ?? 0) === 0)
      .map((t) => t.id);
    if (removable.length) await supabase.from("ticket_types").delete().in("id", removable);

    // Keep the event's headline figures in step with its tiers.
    const total = list.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
    const cheapest = Math.min(...list.map((t) => Math.round((Number(t.price) || 0) * 100)));
    const held = list.reduce((sum, t) => sum + (t.sold ?? 0), 0);
    await supabase
      .from("events")
      .update({
        capacity: total,
        spots_left: Math.max(total - held, 0),
        price_type: cheapest === 0 ? "Free" : "Paid",
        price_amount: cheapest,
        price_label: cheapest === 0 ? "Free" : `₹${(cheapest / 100).toLocaleString("en-IN")}`,
      })
      .eq("id", eventId);

    setSaving(false);
    toast("Passes and pricing saved.", "success");
    await load();
  };

  if (!tiers) return <p className="text-xs text-faint">Loading passes…</p>;

  const input =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none";

  return (
    <div className="space-y-3">
      {tiers.map((t, i) => (
        <div key={t.id ?? `new-${i}`} className="rounded-xl border border-line bg-surface p-3.5">
          <div className="flex items-start justify-between gap-3">
            <input
              value={t.name}
              onChange={(e) => set(i, { name: e.target.value })}
              placeholder="Pass name"
              className={`${input} font-medium`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={t.sold > 0}
              title={t.sold > 0 ? `${t.sold} already sold` : "Remove this pass"}
              className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove
            </button>
          </div>

          <input
            value={t.description}
            onChange={(e) => set(i, { description: e.target.value })}
            placeholder="What this pass includes"
            className={`${input} mt-2 text-xs`}
          />

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ["Price ₹", "price", "number"],
              ["Capacity", "capacity", "number"],
              ["Max per order", "maxPerOrder", "number"],
              ["Sales end", "salesEnd", "date"],
            ] as const).map(([label, key, type]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-faint">
                  {label}
                </span>
                <input
                  type={type}
                  min={type === "number" ? 0 : undefined}
                  value={t[key] as string | number}
                  onChange={(e) =>
                    set(i, {
                      [key]: type === "number" ? Number(e.target.value) : e.target.value,
                    } as Partial<Tier>)
                  }
                  className={`${input} text-xs`}
                />
              </label>
            ))}
          </div>

          {t.sold > 0 && (
            <p className="mt-2 text-[11px] text-amber-600">
              {t.sold} sold. This pass cannot be removed, and its capacity cannot go below {t.sold}.
            </p>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
        >
          + Add a pass
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-brand px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-soft disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save passes & pricing"}
        </button>
      </div>
      <p className="text-[11px] text-faint">
        The event&apos;s capacity and headline price are worked out from these, so the
        listing and the pass selector always agree.
      </p>
    </div>
  );
}
