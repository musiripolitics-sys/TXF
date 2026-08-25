"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Search-forward hero entry point — routes into the events marketplace. */
export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/events?q=${encodeURIComponent(q.trim())}` : "/events");
  };

  return (
    <form
      onSubmit={go}
      className="mx-auto mt-9 flex w-full max-w-xl items-center gap-2 rounded-full border border-line bg-surface/80 p-1.5 shadow-soft backdrop-blur focus-within:border-brand"
    >
      <span className="pl-3 text-faint" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" strokeLinecap="round" />
        </svg>
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search events by name, city or topic…"
        aria-label="Search events"
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-fg placeholder:text-faint focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-soft"
      >
        Search
      </button>
    </form>
  );
}
