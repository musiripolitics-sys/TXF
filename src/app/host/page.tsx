import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Section, SectionHeading } from "@/components/Section";
import { hostSteps } from "@/lib/data";

export const metadata: Metadata = {
  title: "Host an Event",
  description:
    "List, promote and run your tech event on Techxfluence. Submit your event, get reviewed, go live and manage registrations with our support.",
};

const support = [
  { title: "Registration & ticketing", desc: "We handle sign-ups, payments and QR check-in." },
  { title: "Promotion", desc: "Reach 5,000+ members across email, WhatsApp, Discord and social." },
  { title: "Sponsors & partners", desc: "Tap into our partner network for venue, prizes and budget." },
  { title: "Analytics", desc: "Live dashboards for registrations, attendance and feedback." },
];

export default function HostPage() {
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-ink-2">
        <div
          className="pointer-events-none absolute -top-24 right-0 h-72 w-96 rounded-full bg-host/15 blur-[120px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <span className="text-xs font-medium uppercase tracking-wider text-host-soft">
            Host an Event
          </span>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl text-balance">
            Create and list your event — we&apos;ll help you fill the room
          </h1>
          <p className="mt-4 max-w-xl text-muted text-balance">
            Organizations, startups, colleges and individuals can submit, promote
            and manage events on Techxfluence with full support.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="#submit" variant="host" size="lg">
              Submit your event
            </Button>
            <Button href="/legal/organizer-agreement" variant="outline" size="lg">
              Read organizer agreement
            </Button>
          </div>
        </div>
      </header>

      {/* Pipeline */}
      <Section>
        <SectionHeading
          eyebrow="How it works"
          title="From submission to sold-out"
          description="A clear five-step pipeline — review, go live, promote and manage."
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-5">
          {hostSteps.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-line bg-surface p-5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-host/15 font-display text-sm font-bold text-host-soft">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-sm font-semibold text-fg">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted">{step.desc}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Support grid */}
      <div className="border-y border-line bg-ink-2">
        <Section>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <SectionHeading
              align="left"
              eyebrow="What you get"
              title="End-to-end event support"
              description="You focus on the experience. We handle the operational heavy lifting."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {support.map((s) => (
                <div
                  key={s.title}
                  className="rounded-2xl border border-line bg-surface p-5"
                >
                  <h3 className="font-display text-base font-semibold text-fg">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Submission form */}
      <Section id="submit">
        <div className="mx-auto max-w-2xl">
          <SectionHeading
            eyebrow="Event Submission"
            title="Tell us about your event"
            description="Fill in the details and our team will review for approval."
          />
          <HostForm />
          <p className="mt-4 text-center text-xs text-faint">
            By submitting you agree to the{" "}
            <Link href="/legal/organizer-agreement" className="text-brand-soft underline">
              Event Organizer Agreement
            </Link>{" "}
            and{" "}
            <Link href="/legal/terms" className="text-brand-soft underline">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </div>
      </Section>
    </>
  );
}

function HostForm() {
  return (
    <form className="mt-10 space-y-5 rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Event title" placeholder="AI Meetup Chennai" />
        <Field label="Category" placeholder="Meetup / Workshop / Hackathon" />
        <Field label="Date" type="date" />
        <Field label="City" placeholder="Chennai" />
      </div>
      <Field label="Venue" placeholder="IIT Madras Research Park" />
      <Field label="Organizer email" type="email" placeholder="you@org.com" />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">
          Event description
        </label>
        <textarea
          rows={4}
          placeholder="What's the event about, who's it for, and what should attendees expect?"
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
      <Button href="/host" variant="host" size="lg" className="w-full">
        Submit for review
      </Button>
    </form>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
}: {
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-fg">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}
