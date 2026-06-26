import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "@/components/ContactForm";
import { Newsletter } from "@/components/Newsletter";
import { brand } from "@/lib/data";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Techxfluence team — for events, partnerships, membership, press or general enquiries.",
};

export default function ContactPage() {
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-ink-2">
        <div className="pointer-events-none absolute inset-0 glow-brand" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <span className="text-xs font-medium uppercase tracking-wider text-brand-soft">
            Contact
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl text-balance">
            Let&apos;s talk
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted text-balance">
            Hosting an event, exploring a partnership, or just want to say hi?
            Drop us a line and the right person will get back to you.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
        {/* Contact info */}
        <div className="space-y-8">
          <InfoBlock label="Email" value={brand.email} href={`mailto:${brand.email}`} />
          <InfoBlock label="Location" value={brand.location} />

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">
              Community
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {brand.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand hover:text-brand"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-base font-semibold text-fg">
              Join the newsletter
            </h2>
            <p className="mt-1 text-sm text-muted">
              Events, opportunities and resources — once a month, no spam.
            </p>
            <div className="mt-4">
              <Newsletter compact />
            </div>
          </div>
        </div>

        {/* Form */}
        <Suspense fallback={<div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 animate-pulse h-96"></div>}>
          <ContactForm />
        </Suspense>
      </div>
    </>
  );
}

function InfoBlock({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">
        {label}
      </h2>
      {href ? (
        <a
          href={href}
          className="mt-1 block font-medium text-fg transition-colors hover:text-brand"
        >
          {value}
        </a>
      ) : (
        <p className="mt-1 font-medium text-fg">{value}</p>
      )}
    </div>
  );
}
