"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { RegistrationForm } from "@/components/RegistrationForm";
import type { TicketType, EventQuestion } from "@/lib/data";
import type { NextStepsProps } from "@/components/RegistrationNextSteps";

/**
 * "Register now", and the form behind it.
 *
 * The form used to sit open in the right-hand rail, which made the rail as
 * tall as the form: name, email, phone, tier, quantity, promo code, every
 * question the organiser asked, the terms line. That card was 972px in a
 * 900px window, and capping it only moved the problem into a scrollbar.
 *
 * As a dialog it costs one click and gives back the whole rail, so what
 * stays on screen while you read is the price, the seats and the button.
 * It also gives the form the full width of a phone instead of a column.
 *
 * The button is the only thing rendered on the server path; nothing about
 * the form loads until it is opened.
 */
export function RegisterCta({
  eventTitle,
  isFull,
  isPaid,
  priceLabel,
  spotsLeft,
  ...form
}: {
  eventTitle: string;
  eventId: string;
  isFull: boolean;
  isPaid?: boolean;
  priceLabel?: string;
  spotsLeft: number;
  memberNote?: string;
  ticketTypes?: TicketType[];
  questions?: EventQuestion[];
  userProfile?: { full_name?: string; email?: string; phone?: string } | null;
  nextSteps?: NextStepsProps;
}) {
  const [open, setOpen] = useState(false);

  const label = isFull
    ? "Join the waitlist"
    : isPaid
      ? `Register now · ${priceLabel ?? ""}`.trim()
      : "Register now · Free";

  return (
    <>
      <button
        id="register"
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-[0_8px_30px_-8px_rgba(255,106,26,0.7)] transition-all hover:-translate-y-0.5 hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
      >
        {label}
      </button>

      {!isFull && spotsLeft > 0 && spotsLeft <= 25 && (
        <p className="mt-2 text-center text-xs font-medium text-amber-600">
          Only {spotsLeft} {spotsLeft === 1 ? "seat" : "seats"} left
        </p>
      )}

      {/*
        * The phone's bar, sharing this component's state.
        *
        * It used to be its own markup in the page with href="#register",
        * which worked while #register was a form to scroll to. Now that the
        * form is a dialog, an anchor would scroll to a button and ask for a
        * second tap. Rendering it here costs nothing — the button and the bar
        * are the same control at two sizes — and there is one definition of
        * what "register" does rather than two that can drift.
        */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="block w-full rounded-full bg-brand py-3 text-center text-sm font-semibold text-white"
        >
          {label}
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isFull ? `Join the waitlist · ${eventTitle}` : `Register · ${eventTitle}`}
      >
        <RegistrationForm isFull={isFull} isPaid={isPaid} priceLabel={priceLabel} {...form} />
      </Modal>
    </>
  );
}
