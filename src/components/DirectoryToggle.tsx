"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "./Toast";

const THRESHOLD = 100;

export function DirectoryToggle({ userId }: { userId: string }) {
  const supabase = createClient();
  const [on, setOn] = useState(false);
  const [points, setPoints] = useState(0);
  const [elite, setElite] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("discoverable, points")
        .eq("id", userId)
        .maybeSingle();
      setOn(!!data?.discoverable);
      setPoints(data?.points ?? 0);

      const { data: m } = await supabase
        .from("memberships")
        .select("tier")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      setElite(m?.tier === "Elite");
    })();
  }, [supabase, userId]);

  const eligible = elite || points >= THRESHOLD;

  const toggle = async () => {
    const next = !on;
    setBusy(true);
    setOn(next);
    const { error } = await supabase
      .from("users")
      .update({ discoverable: next })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      setOn(!next);
      toast("Couldn't update your directory setting.", "error");
    } else {
      toast(
        next
          ? "You're now listed in the member directory."
          : "You've been removed from the directory.",
        "success",
      );
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-fg">
            Member directory
          </h2>
          <p className="mt-1 text-sm text-muted">
            Let other signed-in members find you. Only your name, city, role, bio
            and LinkedIn are shown — never your email or phone.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Show me in the member directory"
          disabled={busy}
          onClick={toggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? "bg-brand" : "bg-line"}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
      </div>

      {/* Eligibility */}
      <div className="mt-4 border-t border-line pt-4">
        {eligible ? (
          <p className="text-xs font-medium text-host-soft">
            ✓ You qualify for the directory
            {elite ? " — Elite member" : ` — ${points} points`}.
            {on ? "" : " Turn on the toggle to be listed."}
          </p>
        ) : (
          <p className="text-xs text-faint">
            You have <strong className="text-fg">{points}</strong> / {THRESHOLD}{" "}
            points. Attend sessions to earn{" "}
            <strong className="text-fg">+10 each</strong> and unlock your listing
            — or go <strong className="text-fg">Elite</strong> to be listed
            automatically.
          </p>
        )}
      </div>
    </div>
  );
}
