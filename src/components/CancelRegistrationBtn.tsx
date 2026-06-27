"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelRegistration } from "@/app/events/[slug]/actions";
import { toast } from "./Toast";

export function CancelRegistrationBtn({
  registrationId,
}: {
  registrationId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const cancel = async () => {
    setBusy(true);
    const res = await cancelRegistration(registrationId);
    setBusy(false);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    toast("Cancelled — your spot has been released.", "success");
    router.refresh();
  };

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-red-500 hover:underline"
      >
        Cancel registration
      </button>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 text-xs">
      <span className="text-muted">Sure?</span>
      <button
        onClick={cancel}
        disabled={busy}
        className="font-medium text-red-500 hover:underline disabled:opacity-50"
      >
        {busy ? "Cancelling…" : "Yes, cancel"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="font-medium text-muted hover:text-fg"
      >
        No
      </button>
    </div>
  );
}
