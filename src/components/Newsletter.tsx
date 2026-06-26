"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Newsletter signup — writes to Supabase `newsletter_subscribers`.
 * Duplicate emails are treated as success (already subscribed).
 */
export function Newsletter({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("newsletter_subscribers")
      .insert({ email, source: compact ? "footer" : "page" });

    setSubmitting(false);

    // 23505 = unique violation → already subscribed, treat as success.
    if (insertError && insertError.code !== "23505") {
      setError("Couldn't subscribe. Please try again.");
      return;
    }

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
        disabled={submitting}
        className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-soft disabled:opacity-60"
      >
        {submitting ? "…" : "Subscribe"}
      </button>
      {error && <span className="text-xs text-red-500 sm:hidden">{error}</span>}
    </form>
  );
}
