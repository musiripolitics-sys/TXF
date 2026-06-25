import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={
        align === "center"
          ? "mx-auto max-w-2xl text-center"
          : "max-w-2xl text-left"
      }
    >
      {eyebrow && (
        <span className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-soft">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl text-balance">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-muted text-balance">{description}</p>
      )}
    </div>
  );
}

export function Section({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24 ${className}`}
    >
      {children}
    </section>
  );
}
