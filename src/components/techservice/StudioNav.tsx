"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { sections, START } from "./data";

/**
 * The studio's own header — /Techservice is a separate site, so it does not
 * use the Techxfluence community nav (see Chrome.tsx). Matches the Figma
 * "Nav": TXF logo, section links, black "Start a Project".
 *
 * Highlights the section in view and, on phones, folds the links into a menu.
 */
export function StudioNav() {
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Current section = the last one whose top has passed under the header.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
      let current = "";
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 110) current = s.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Close the phone menu on Escape or a tap outside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const link = (id: string) =>
    `rounded-full px-3 py-2 text-[15px] font-medium transition-colors ${
      active === id ? "text-fg" : "text-muted hover:text-fg"
    }`;

  return (
    <header
      ref={menuRef}
      className={`sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur transition-shadow duration-300 ${
        scrolled ? "shadow-soft" : ""
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1264px] items-center justify-between gap-6 px-5 sm:px-8">
        <a href="#top" aria-label="TXF — back to top" className="shrink-0">
          <Image src="/txf-logo.svg" alt="TXF — We Connect" width={982} height={363} priority className="h-10 w-auto" />
        </a>

        <nav aria-label="Studio" className="hidden items-center gap-1 lg:flex">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? "true" : undefined} className={link(s.id)}>
              <span className="relative">
                {s.label}
                {active === s.id && (
                  <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand" aria-hidden />
                )}
              </span>
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={START}
            className="hidden items-center gap-1.5 rounded-full bg-fg px-5 py-2.5 text-[15px] font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-black sm:inline-flex"
          >
            Start a Project <span aria-hidden>→</span>
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="studio-menu"
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-fg lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="studio-menu" className="border-t border-line bg-surface px-5 pb-6 pt-3 sm:px-8 lg:hidden">
          <nav aria-label="Studio" className="flex flex-col">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between border-b border-line py-3.5 font-display text-lg font-medium ${
                  active === s.id ? "text-brand" : "text-fg"
                }`}
              >
                {s.label}
                <span className="text-faint" aria-hidden>
                  →
                </span>
              </a>
            ))}
          </nav>
          <a
            href={START}
            onClick={() => setOpen(false)}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-6 py-3.5 font-medium text-white"
          >
            Start a Project <span aria-hidden>→</span>
          </a>
        </div>
      )}
    </header>
  );
}
