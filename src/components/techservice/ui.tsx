import type { ReactNode } from "react";

/**
 * Shared building blocks for /Techservice, matching the Figma frame
 * "TXF — Studio Portfolio": a 1200px column, an orange-dot eyebrow and
 * large, tight display headings.
 */

export function Container({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-[1264px] px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p
      className={`inline-flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.14em] ${
        dark ? "text-white" : "text-fg"
      }`}
    >
      <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
      {children}
    </p>
  );
}

export function Heading({
  eyebrow,
  title,
  sub,
  align = "center",
  dark = false,
  as: Tag = "h2",
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: "center" | "left";
  dark?: boolean;
  as?: "h1" | "h2";
}) {
  const center = align === "center";
  return (
    <div className={center ? "mx-auto flex max-w-[860px] flex-col items-center text-center" : "max-w-[680px]"}>
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <Tag
        className={`mt-[18px] font-display text-[34px] font-bold leading-[1.06] tracking-[-0.03em] sm:text-5xl lg:text-[60px] lg:leading-[1.04] text-balance ${
          dark ? "text-white" : "text-fg"
        }`}
      >
        {title}
      </Tag>
      {sub && (
        <p
          className={`mt-[18px] max-w-[640px] text-[17px] leading-[1.55] sm:text-[19px] text-balance ${
            dark ? "text-[#b4b4bc]" : "text-muted"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/** The small orange number square used on cards ("01"). */
export function NumberBadge({ n, onDark = false }: { n: string; onDark?: boolean }) {
  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-base font-bold text-brand ${
        onDark ? "bg-brand/20" : "bg-brand/10"
      }`}
    >
      {n}
    </span>
  );
}

export const pad = (i: number) => String(i + 1).padStart(2, "0");
