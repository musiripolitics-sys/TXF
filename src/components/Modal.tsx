"use client";

import { useEffect, useRef } from "react";

/**
 * A modal that can hold a form.
 *
 * ConfirmDialog already existed but is a confirmation — fixed title, two
 * buttons, max-w-sm — so it cannot carry a registration form. This is the same
 * conventions (Escape closes, the backdrop closes, role=dialog with a labelled
 * title) with room for arbitrary content and its own scrollbar.
 *
 * Three details that are easy to leave out and obvious once missing:
 *
 *   The page behind it does not scroll while it is open. Without that, a wheel
 *   gesture over the backdrop scrolls the event page under the dialog, which
 *   reads as the page having come loose.
 *
 *   Focus moves into the panel on open and returns to whatever opened it on
 *   close, so a keyboard does not get dropped at the top of the document.
 *
 *   The panel is capped at the viewport and scrolls internally. A registration
 *   form with several tiers, a question or two and an existing ticket is
 *   taller than a laptop screen, and a dialog that overflows the window cannot
 *   be scrolled to its own submit button.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Focus the panel itself rather than the first field: a screen reader
    // should hear the title before it hears "Full name".
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[92svh] w-full max-w-lg flex-col rounded-t-2xl border border-line bg-surface shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] outline-none sm:max-h-[88svh] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id="modal-title" className="font-display text-base font-semibold text-fg">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-m-1 shrink-0 rounded-full p-1 text-faint transition-colors hover:text-fg"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
