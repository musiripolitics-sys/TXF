"use client";

import { useEffect, useState } from "react";

const MIN_SECTIONS = 3;

export function EventSectionNav({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    if (sections.length < MIN_SECTIONS) return;
    const READING_LINE = 0.28; // of the viewport, from the top

    const pick = () => {
      const line = window.innerHeight * READING_LINE;
      let current = sections[0]?.id ?? null;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = sections[sections.length - 1].id;
      setActive(current);
    };

    const observer = new IntersectionObserver(pick, {
      rootMargin: "0px 0px -70% 0px",
      threshold: [0, 1],
    });
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    window.addEventListener("scroll", pick, { passive: true });
    pick();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", pick);
    };
  }, [sections]);

  if (sections.length < MIN_SECTIONS) return null;

  return (
    <nav aria-label="On this page" className="hidden lg:block rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-faint border-b border-line/60 mb-2">
        On this page
      </p>
      <ul className="space-y-1">
        {sections.map((s) => {
          const current = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={current ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(s.id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    history.replaceState(null, "", `#${s.id}`);
                  }
                }}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                  current
                    ? "bg-brand/10 font-semibold text-brand-soft"
                    : "text-muted hover:bg-ink-2 hover:text-fg"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all ${
                    current ? "bg-brand scale-125" : "bg-line"
                  }`}
                />
                <span>{s.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
