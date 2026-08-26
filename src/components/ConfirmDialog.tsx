"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  title: string;
  /** What actually happens. Be specific — this is the whole point of asking. */
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for anything that destroys data. */
  tone?: "danger" | "default";
};

/**
 * Promise-based confirmation.
 *
 *   const { confirm, dialog } = useConfirm();
 *   if (!(await confirm({ title: "Delete this?" }))) return;
 *   ...
 *   return <>{dialog}{rest}</>;
 *
 * Cancel is focused on open and Escape closes, so the safe path is always the
 * one a keyboard lands on.
 */
export function useConfirm() {
  const [state, setState] = useState<{
    opts: Options;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (opts: Options) =>
      new Promise<boolean>((resolve) => setState({ opts, resolve })),
    [],
  );

  const close = useCallback(
    (ok: boolean) => {
      state?.resolve(ok);
      setState(null);
    },
    [state],
  );

  const dialog = state ? (
    <ConfirmDialog opts={state.opts} onClose={close} />
  ) : null;

  return { confirm, dialog };
}

function ConfirmDialog({
  opts,
  onClose,
}: {
  opts: Options;
  onClose: (ok: boolean) => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const danger = opts.tone === "danger";

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <button
        aria-label="Cancel"
        tabIndex={-1}
        onClick={() => onClose(false)}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]">
        <h2 id="confirm-title" className="font-display text-lg font-bold text-fg">
          {opts.title}
        </h2>
        {opts.body && (
          <p className="mt-2 text-sm leading-relaxed text-muted">{opts.body}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={() => onClose(false)}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-brand hover:text-brand"
          >
            {opts.cancelLabel ?? "Cancel"}
          </button>
          <button
            onClick={() => onClose(true)}
            className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${
              danger ? "bg-red-600" : "bg-brand"
            }`}
          >
            {opts.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
