"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { RegistrationForm } from "@/components/RegistrationForm";
import type { TicketType, EventQuestion } from "@/lib/data";
import type { NextStepsProps } from "@/components/RegistrationNextSteps";

/**
 * High-converting Registration CTA button and interactive Dialog.
 *
 * Keeps the sidebar rail compact and focused on the decision (price, seats, button),
 * and provides a full-width, clean dialog for filling in attendee details.
 */
export function RegisterCta({
  eventTitle,
  eventId,
  isFull,
  isPaid,
  priceLabel,
  spotsLeft,
  hasTicket = false,
  ...form
}: {
  eventTitle: string;
  eventId: string;
  isFull: boolean;
  isPaid?: boolean;
  priceLabel?: string;
  spotsLeft: number;
  hasTicket?: boolean;
  memberNote?: string;
  ticketTypes?: TicketType[];
  questions?: EventQuestion[];
  userProfile?: { full_name?: string; email?: string; phone?: string } | null;
  nextSteps?: NextStepsProps;
}) {
  const [open, setOpen] = useState(false);

  // "Pass", not "ticket": one booking covers a session of a programme rather
  // than admission to a single thing, and the word is the organiser's.
  const label = hasTicket
    ? "Book another pass"
    : isFull
      ? "Join the waitlist"
      : isPaid
        ? `Join the Session · ${priceLabel ?? ""}`.trim()
        : "Join the Session · Free";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex w-full items-center justify-center gap-2.5 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-[0_8px_25px_-6px_rgba(255,90,31,0.5)] transition-all hover:bg-brand-soft hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
        <span>{label}</span>
      </button>

      {!hasTicket && !isFull && spotsLeft > 0 && spotsLeft <= 25 && (
        <p className="mt-2 text-center text-xs font-semibold text-amber-600 flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Only {spotsLeft} {spotsLeft === 1 ? "seat" : "seats"} left
        </p>
      )}

      {/* Mobile Sticky Bar - Hidden when modal is active */}
      {!open && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-center text-sm font-semibold text-white shadow-soft"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span>{label}</span>
          </button>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isFull ? "Join the Waitlist" : "Event Registration"}
        subtitle={eventTitle}
      >
        <RegistrationForm
          eventId={eventId}
          isFull={isFull}
          isPaid={isPaid}
          priceLabel={priceLabel}
          onClose={() => setOpen(false)}
          eventTitle={eventTitle}
          {...form}
        />
      </Modal>
    </>
  );
}
