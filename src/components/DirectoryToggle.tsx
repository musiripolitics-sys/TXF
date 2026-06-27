"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "./Toast";

export function DirectoryToggle({ userId }: { userId: string }) {
  const supabase = createClient();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("discoverable")
        .eq("id", userId)
        .maybeSingle();
      setOn(!!data?.discoverable);
    })();
  }, [supabase, userId]);

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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
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
  );
}
