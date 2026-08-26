"use client";

import { useState } from "react";
import { reportContent } from "@/app/community/actions";
import { toast } from "./Toast";

/**
 * Report a post or comment. Deliberately quiet — a small text link, not a
 * button competing with Reply, so it's there when needed and invisible
 * otherwise.
 */
export function ReportButton({
  postId,
  commentId,
  compact = false,
}: {
  postId?: string;
  commentId?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const send = async () => {
    setBusy(true);
    const res = await reportContent({ postId, commentId }, reason);
    setBusy(false);

    if (res.error) return toast(res.error, "error");
    setDone(true);
    setOpen(false);
    setReason("");
    toast(res.message ?? "Reported. An admin will take a look.", "success");
  };

  const size = compact ? "text-[11px]" : "text-xs";

  if (done) {
    return <span className={`${size} font-medium text-faint`}>Reported</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`${size} font-medium text-faint transition-colors hover:text-fg`}
      >
        Report
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            send();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        autoFocus
        maxLength={500}
        placeholder="What's wrong with it?"
        className="w-52 rounded-lg border border-line bg-ink px-2.5 py-1.5 text-xs text-fg placeholder:text-faint focus:border-brand focus:outline-none"
      />
      <button
        onClick={send}
        disabled={busy}
        className="rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-[11px] font-medium text-faint hover:text-fg"
      >
        Cancel
      </button>
    </span>
  );
}
