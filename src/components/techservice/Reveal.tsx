import type { ReactNode } from "react";

/**
 * Fades content up as it scrolls into view — in CSS only (`.ts-reveal` in
 * globals.css, driven by `animation-timeline: view()`).
 *
 * The earlier version hid content with JavaScript until an observer fired,
 * which left blank sections whenever it fired late. Now nothing is ever
 * hidden: browsers without scroll-driven animations, and anyone with reduced
 * motion, simply see the content.
 */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={`ts-reveal ${className}`}>{children}</div>;
}
