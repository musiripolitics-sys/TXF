"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated "running number". Renders the final value on the server and as the
 * initial client state (so it's always correct without JS, for SEO, and in
 * environments where IntersectionObserver / rAF don't run). The first time it
 * scrolls into view it resets to 0 and counts up. Preserves any prefix/suffix
 * and thousands separators (e.g. "5,000+", "54K+", "₹999").
 */
export function CountUp({
  value,
  duration = 1600,
}: {
  value: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const match = value.match(/[\d.,]+/);
    if (!match) return; // nothing numeric to animate

    const target = parseFloat(match[0].replace(/,/g, "")) || 0;
    const prefix = value.slice(0, match.index);
    const suffix = value.slice((match.index ?? 0) + match[0].length);
    const grouped = match[0].includes(",") || target >= 1000;

    const format = (n: number) => {
      const v = grouped
        ? Math.round(n).toLocaleString("en-US")
        : String(Math.round(n));
      return `${prefix}${v}${suffix}`;
    };

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return; // leave the final value in place

    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let fallback = 0;
    let startTs = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

    const run = (now: number) => {
      if (!startTs) startTs = now;
      const p = Math.min((now - startTs) / duration, 1);
      setDisplay(format(target * ease(p)));
      if (p < 1) raf = requestAnimationFrame(run);
    };

    const animate = () => {
      setDisplay(format(0));
      raf = requestAnimationFrame(run);
      // Guarantee the exact final value lands even if a frame is dropped.
      fallback = window.setTimeout(() => setDisplay(format(target)), duration + 250);
    };

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          obs.disconnect();
          animate();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);

    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}
