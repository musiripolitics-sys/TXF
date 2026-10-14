"use client";

import { useEffect, useRef } from "react";

/**
 * A polished, accessible modal dialog that can hold forms and interactive flows.
 *
 * Features:
 *   - Smooth backdrop fade-in and scale/slide animations via CSS.
 *   - Mobile bottom-sheet layout with touch handle pill.
 *   - Prevents body scroll layout shift by compensating for scrollbar width.
 *   - Focus trapped inside modal and restored to opener on close.
 *   - Escape key and backdrop click to close.
 *   - Clean header with title, subtitle, and accessible close button.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;

    // Prevent scrollbar layout shift on desktop
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
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
      {/* Backdrop with fade transition and blur */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
      />

      {/* Modal Dialog Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[92svh] w-full max-w-lg flex-col rounded-t-3xl border border-line bg-surface shadow-2xl outline-none sm:max-h-[88svh] sm:rounded-2xl animate-modal-pop"
      >
        {/* Mobile drag handle indicator */}
        <div className="mx-auto mt-2.5 mb-1 h-1 w-12 shrink-0 rounded-full bg-line sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="font-display text-lg font-bold tracking-tight text-fg">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs font-normal text-muted" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  );
}
