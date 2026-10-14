"use client";

import { useEffect, useState } from "react";

/**
 * Jump-links down the event page, with the section you are reading marked.
 *
 * "When it's required" is the whole design: an event with a description and
 * nothing else does not need a table of contents, and showing one makes a
 * thin page look emptier. Below MIN_SECTIONS this renders nothing, and the
 * list is built from the sections the page actually rendered — an event with
 * no speakers has no Speakers link, because the caller never passed one.
 *
 * The active item is the LAST section whose top has passed the reading line,
 * not the first one intersecting the viewport. That distinction is the whole
 * of it: About is usually the tallest section on the page, so it intersects
 * at almost every scroll position, and "first visible" marked it current from
 * the top of the page to the bottom — a highlight that never moves, which is
 * worse than no highlight because it looks like it is working.
 *
 * An IntersectionObserver still drives the updates, since it fires only when
 * something crosses a boundary, but the answer is read off the positions.
 */
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
      // At the very bottom nothing further can cross the line, so the last
      // section is current whether or not its top ever reached it.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
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
    <nav aria-label="On this page" className="hidden lg:block">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
        On this page
      </p>
      <ul className="space-y-0.5">
        {sections.map((s) => {
          const current = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={current ? "true" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  current
                    ? "bg-brand/10 font-medium text-brand-soft"
                    : "text-muted hover:bg-ink-2 hover:text-fg"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                    current ? "bg-brand" : "bg-line"
                  }`}
                />
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
