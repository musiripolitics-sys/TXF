"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "./Toast";

/** Follow an organizer to get notified when they publish a new event. */
export function FollowOrganizerBtn({
  organizerId,
  initialFollowers = 0,
}: {
  organizerId: string;
  initialFollowers?: number;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(initialFollowers);
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
        .from("organizer_follows")
        .select("organizer_id")
        .eq("follower_id", u.user.id)
        .eq("organizer_id", organizerId)
        .maybeSingle();
      if (alive) {
        setFollowing(!!data);
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase, organizerId]);

  const toggle = async () => {
    if (busy) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (u.user.id === organizerId) {
      toast("You can't follow yourself.", "info");
      return;
    }

    const next = !following;
    setBusy(true);
    setFollowing(next);
    setCount((c) => c + (next ? 1 : -1));

    const { error } = next
      ? await supabase
          .from("organizer_follows")
          .insert({ follower_id: u.user.id, organizer_id: organizerId })
      : await supabase
          .from("organizer_follows")
          .delete()
          .eq("follower_id", u.user.id)
          .eq("organizer_id", organizerId);
    setBusy(false);

    if (error) {
      setFollowing(!next);
      setCount((c) => c + (next ? -1 : 1));
      toast("Couldn't update. Please try again.", "error");
    } else if (next) {
      toast("Following — you'll hear about their next event.", "success");
    }
  };

  if (!ready) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
        following
          ? "border border-line bg-surface text-fg hover:border-brand hover:text-brand"
          : "bg-brand text-white hover:bg-brand-soft"
      }`}
    >
      {following ? "Following" : "Follow"}
      {count > 0 && (
        <span className={following ? "text-faint" : "text-white/70"}> · {count}</span>
      )}
    </button>
  );
}
