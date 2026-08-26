"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinCommunity, leaveCommunity } from "@/app/communities/actions";
import { useConfirm } from "./ConfirmDialog";
import { toast } from "./Toast";

/** Join or leave a chapter. Leaving asks first — it's easy to hit by accident. */
export function JoinCommunityBtn({
  communityId,
  slug,
  name,
  initialState,
  memberCount,
}: {
  communityId: string;
  slug: string;
  name: string;
  /** null = not a member */
  initialState: "active" | "pending" | null;
  memberCount: number;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [state, setState] = useState(initialState);
  const [count, setCount] = useState(memberCount);
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setBusy(true);
    const res = await joinCommunity(communityId, slug);
    setBusy(false);
    if (res.error) return toast(res.error, "error");

    if (res.status === "pending") {
      setState("pending");
    } else {
      setState("active");
      setCount((c) => c + 1);
    }
    toast(res.message ?? "You're in.", "success");
    router.refresh();
  };

  const leave = async () => {
    const ok = await confirm({
      title: `Leave ${name}?`,
      body: "You'll stop seeing its posts and announcements. You can rejoin any time.",
      confirmLabel: "Leave chapter",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    const res = await leaveCommunity(communityId, slug);
    setBusy(false);
    if (res.error) return toast(res.error, "error");

    setState(null);
    setCount((c) => Math.max(0, c - 1));
    router.refresh();
  };

  if (state === "pending") {
    return (
      <span className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-faint">
        Request pending
      </span>
    );
  }

  return (
    <>
      {dialog}
      {state === "active" ? (
        <button
          onClick={leave}
          disabled={busy}
          className="group rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-red-500/50 hover:text-red-500 disabled:opacity-50"
        >
          <span className="group-hover:hidden">✓ Joined</span>
          <span className="hidden group-hover:inline">Leave</span>
        </button>
      ) : (
        <button
          onClick={join}
          disabled={busy}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Joining…" : "Join chapter"}
        </button>
      )}
      <span className="text-sm text-faint">
        {count} {count === 1 ? "member" : "members"}
      </span>
    </>
  );
}
