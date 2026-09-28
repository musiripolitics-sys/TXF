import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { statLabels } from "@/lib/data";
import { getStats } from "@/lib/content";

// Lead-in microcopy shown above each number (parallels `statLabels`).
const leads = ["A community of", "We've hosted", "Backed by", "Active across"];

export async function StatsBand() {
  const stats = await getStats();

  // These numbers used to be fixed strings the data did not support. Now they
  // are counted. If nothing has been counted yet there is nothing honest to
  // show, so the section removes itself rather than advertising zeroes.
  const shown = statLabels
    .map((s, i) => ({ ...s, value: stats?.[s.key] ?? 0, lead: leads[i] }))
    .filter((s) => s.value > 0);

  if (shown.length === 0) return null;

  return (
    <section className="border-y border-line bg-ink-2">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-brand-soft">
            By the numbers
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl text-balance">
            Where we are today
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted text-balance">
            Every figure here is counted from our own records, and moves as the
            community does.
          </p>
        </div>

        <dl
          className={`mt-14 grid gap-y-10 ${
            shown.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-" + shown.length
          }`}
        >
          {shown.map((s) => (
            <div
              key={s.key}
              className="px-4 text-center lg:border-l lg:border-line lg:first:border-l-0"
            >
              <dt className="text-sm text-faint">{s.lead}</dt>
              <dd className="mt-2">
                <span className="block font-display text-5xl font-bold leading-none tracking-tight text-fg sm:text-6xl">
                  <CountUp value={String(s.value)} />
                </span>
                <span className="mt-2 block text-xs font-semibold uppercase tracking-wider text-muted sm:text-sm">
                  {s.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/host"
            className="rounded-full bg-fg px-7 py-3.5 text-base font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Launch your next event
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-line bg-surface px-7 py-3.5 text-base font-semibold text-fg transition-colors hover:border-brand hover:text-brand"
          >
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
