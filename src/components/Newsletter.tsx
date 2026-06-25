"use client";

import { useState } from "react";

/**
 * Newsletter signup. Front-end only — on submit it shows a confirmation.
 * Wire `onSubmit` to an API route / email provider when the backend exists.
 */
export function Newsletter({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setDone(true);
  };

  if (done) {
    return (
      <p
        className={`rounded-xl border border-host/40 bg-host/10 px-4 py-3 text-sm text-host-soft ${
          compact ? "" : "max-w-md"
        }`}
      >
        You&apos;re in! Watch your inbox for the next drop.
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`flex flex-col gap-2 sm:flex-row ${compact ? "" : "max-w-md"}`}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        aria-label="Email address"
        className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-soft"
      >
        Subscribe
      </button>
    </form>
  );
}
