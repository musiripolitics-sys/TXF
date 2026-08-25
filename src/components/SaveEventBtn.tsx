"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "./Toast";

/**
 * Heart toggle to bookmark an event. Signed-out visitors are sent to login
 * rather than silently doing nothing.
 */
export function SaveEventBtn({
  eventId,
  className = "",
  showLabel = false,
}: {
  eventId: string;
  className?: string;
  showLabel?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (alive) setReady(true);
        return;
      }
      const { data } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", u.user.id)
        .eq("event_id", eventId)
        .maybeSingle();
      if (alive) {
        setSaved(!!data);
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase, eventId]);

  const toggle = async (e: React.MouseEvent) => {
    // The card is a link — don't navigate when the heart is clicked.
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      router.push(
        `/login?next=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }

    const next = !saved;
    setBusy(true);
    setSaved(next); // optimistic
    const { error } = next
      ? await supabase
          .from("saved_events")
          .insert({ user_id: u.user.id, event_id: eventId })
      : await supabase
          .from("saved_events")
          .delete()
          .eq("user_id", u.user.id)
          .eq("event_id", eventId);
    setBusy(false);

    if (error) {
      setSaved(!next);
      toast("Couldn't update your saved events.", "error");
    } else if (next) {
      toast("Saved. Find it under Saved Events on your profile.", "success");
    }
  };

  if (!ready) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved events" : "Save this event"}
      className={`inline-flex items-center gap-1.5 transition-colors ${
        saved ? "text-brand" : "text-muted hover:text-brand"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
        <path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.5 12 20 12 20Z" strokeLinejoin="round" />
      </svg>
      {showLabel && (
        <span className="text-sm font-medium">{saved ? "Saved" : "Save"}</span>
      )}
    </button>
  );
}
