"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";

type AgendaItem = { id?: string; when_label: string; what: string; sort_order: number };
type Speaker = { id: string; name: string; role: string | null };

/**
 * Fills in the parts of an event that only exist after it's published.
 *
 * The detail page already renders an agenda, speakers, tags, highlights and a
 * refund policy — but nothing could create any of them once an event was live,
 * so those sections rendered for nobody. This is the missing half.
 *
 * Writes go straight through RLS: every table here is admin-only for writes
 * and world-readable for reads, so there's no server action to add.
 */
export function EventContentEditor({
  eventId,
  eventTitle,
  onClose,
}: {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}) {
  const supabase = createClient();
  const { confirm, dialog } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [allSpeakers, setAllSpeakers] = useState<Speaker[]>([]);
  const [linked, setLinked] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [highlights, setHighlights] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");

  const fetchAll = useCallback(async () => {
    const [{ data: ev }, { data: ag }, { data: sp }, { data: link }] = await Promise.all([
      supabase
        .from("events")
        .select("tags, highlights, refund_policy")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("event_agenda")
        .select("id, when_label, what, sort_order")
        .eq("event_id", eventId)
        .order("sort_order"),
      supabase.from("speakers").select("id, name, role").order("name"),
      supabase.from("event_speakers").select("speaker_id").eq("event_id", eventId),
    ]);

    return {
      tags: ((ev?.tags as string[]) ?? []).join(", "),
      highlights: (((ev?.highlights as string[]) ?? []) as string[]).join("\n"),
      refundPolicy: ev?.refund_policy ?? "",
      agenda: (ag as AgendaItem[]) ?? [],
      speakers: (sp as Speaker[]) ?? [],
      linked: ((link ?? []) as { speaker_id: string }[]).map((l) => l.speaker_id),
    };
  }, [supabase, eventId]);

  // State is set after the await, and only if this editor is still mounted —
  // no synchronous setState in the effect body, no update after unmount.
  useEffect(() => {
    let alive = true;
    fetchAll().then((d) => {
      if (!alive) return;
      setTags(d.tags);
      setHighlights(d.highlights);
      setRefundPolicy(d.refundPolicy);
      setAgenda(d.agenda);
      setAllSpeakers(d.speakers);
      setLinked(d.linked);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [fetchAll]);

  const addRow = () =>
    setAgenda((a) => [...a, { when_label: "", what: "", sort_order: a.length }]);

  const move = (i: number, dir: -1 | 1) =>
    setAgenda((a) => {
      const next = [...a];
      const j = i + dir;
      if (j < 0 || j >= next.length) return a;
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((row, k) => ({ ...row, sort_order: k }));
    });

  const removeRow = (i: number) =>
    setAgenda((a) => a.filter((_, k) => k !== i).map((row, k) => ({ ...row, sort_order: k })));

  const save = async () => {
    setSaving(true);
    try {
      const cleanAgenda = agenda
        .filter((r) => r.when_label.trim() || r.what.trim())
        .map((r, i) => ({
          event_id: eventId,
          when_label: r.when_label.trim(),
          what: r.what.trim(),
          sort_order: i,
        }));

      // Agenda is small and order matters, so replace it wholesale rather
      // than diffing rows.
      const { error: delErr } = await supabase
        .from("event_agenda")
        .delete()
        .eq("event_id", eventId);
      if (delErr) throw delErr;
      if (cleanAgenda.length) {
        const { error } = await supabase.from("event_agenda").insert(cleanAgenda);
        if (error) throw error;
      }

      // Same for the speaker links.
      const { error: unlinkErr } = await supabase
        .from("event_speakers")
        .delete()
        .eq("event_id", eventId);
      if (unlinkErr) throw unlinkErr;
      if (linked.length) {
        const { error } = await supabase.from("event_speakers").insert(
          linked.map((speaker_id, i) => ({ event_id: eventId, speaker_id, sort_order: i })),
        );
        if (error) throw error;
      }

      const { error: evErr } = await supabase
        .from("events")
        .update({
          tags: Array.from(
            new Set(tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)),
          ),
          highlights: highlights.split("\n").map((h) => h.trim()).filter(Boolean),
          refund_policy: refundPolicy.trim() || null,
        })
        .eq("id", eventId);
      if (evErr) throw evErr;

      toast("Event content saved.", "success");
      onClose();
    } catch (e) {
      console.error("Save event content:", e);
      toast(
        e instanceof Error ? e.message.slice(0, 120) : "Couldn't save. Please try again.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const close = async () => {
    const ok = await confirm({
      title: "Discard changes?",
      body: "Anything you've edited here will be lost.",
      confirmLabel: "Discard",
      tone: "danger",
    });
    if (ok) onClose();
  };

  const field = "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none";

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      {dialog}
      <div className="mx-auto my-8 max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-fg">Event content</h2>
            <p className="mt-0.5 truncate text-sm text-muted">{eventTitle}</p>
          </div>
          <button onClick={close} className="shrink-0 text-sm text-faint hover:text-fg">
            Close
          </button>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-faint">Loading…</p>
        ) : (
          <div className="mt-6 space-y-7">
            {/* Agenda */}
            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">Agenda</h3>
                <button
                  onClick={addRow}
                  className="text-xs font-semibold text-brand-soft hover:underline"
                >
                  + Add item
                </button>
              </div>
              {agenda.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-faint">
                  No agenda yet. The event page hides this section until there is one.
                </p>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {agenda.map((row, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <input
                        value={row.when_label}
                        onChange={(e) =>
                          setAgenda((a) =>
                            a.map((r, k) => (k === i ? { ...r, when_label: e.target.value } : r)),
                          )
                        }
                        placeholder="7:00 PM"
                        className={`${field} w-28 shrink-0`}
                      />
                      <input
                        value={row.what}
                        onChange={(e) =>
                          setAgenda((a) =>
                            a.map((r, k) => (k === i ? { ...r, what: e.target.value } : r)),
                          )
                        }
                        placeholder="Opening talk — what it covers"
                        className={field}
                      />
                      <div className="flex shrink-0 items-center gap-1 pt-1">
                        <button
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          aria-label="Move up"
                          className="px-1 text-faint hover:text-fg disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => move(i, 1)}
                          disabled={i === agenda.length - 1}
                          aria-label="Move down"
                          className="px-1 text-faint hover:text-fg disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeRow(i)}
                          aria-label="Remove"
                          className="px-1 text-faint hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Speakers */}
            <section>
              <h3 className="text-sm font-semibold text-fg">Speakers</h3>
              <p className="mt-0.5 text-xs text-faint">
                {allSpeakers.length} in the directory · {linked.length} on this event
              </p>
              <div className="mt-2 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-line p-2">
                {allSpeakers.map((s) => {
                  const on = linked.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() =>
                        setLinked((l) => (on ? l.filter((x) => x !== s.id) : [...l, s.id]))
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        on
                          ? "bg-brand text-white"
                          : "border border-line text-muted hover:border-brand/50 hover:text-fg"
                      }`}
                    >
                      {s.name}
                      {s.role ? ` · ${s.role}` : ""}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Tags */}
            <section>
              <h3 className="text-sm font-semibold text-fg">Tags</h3>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="react, beginner, students welcome"
                className={`${field} mt-2`}
              />
              <p className="mt-1 text-xs text-faint">
                Comma separated, lowercased on save. These become filters on the events page.
              </p>
            </section>

            {/* Good to know */}
            <section>
              <h3 className="text-sm font-semibold text-fg">Good to know</h3>
              <textarea
                rows={3}
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                placeholder={"Laptop required\nBeginner friendly\nLunch included"}
                className={`${field} mt-2`}
              />
              <p className="mt-1 text-xs text-faint">One per line.</p>
            </section>

            {/* Refund policy */}
            <section>
              <h3 className="text-sm font-semibold text-fg">Refund &amp; cancellation</h3>
              <textarea
                rows={2}
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value)}
                placeholder="Full refund up to 48 hours before the event."
                className={`${field} mt-2`}
              />
              <p className="mt-1 text-xs text-faint">Shown on paid events only.</p>
            </section>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-5">
              <button onClick={close} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-fg hover:border-brand hover:text-brand">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
