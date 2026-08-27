"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "./Icon";
import { googleCalUrl, type CalendarEvent } from "@/lib/calendar";

export type NextStepEvent = {
  slug: string;
  title: string;
  dateLabel: string;
  city: string;
  image?: string;
  priceLabel: string;
};

export type NextStepsProps = {
  calendar: CalendarEvent;
  related?: NextStepEvent[];
  /** The chapter this event belongs to, if any. */
  chapter?: { slug: string; name: string } | null;
};

/**
 * What to do straight after registering.
 *
 * The success panel used to end at the ticket code, which is the worst
 * possible place to stop: the person has just committed to showing up and is
 * more likely to act now than at any other point. Calendar first, because
 * that's what actually gets them through the door, then somewhere to go next.
 */
export function RegistrationNextSteps({
  calendar,
  related = [],
  chapter,
  showCalendar = true,
}: NextStepsProps & { showCalendar?: boolean }) {
  return (
    <div className="mt-6 space-y-5 text-left">
      {showCalendar && (
      <a
        href={googleCalUrl(calendar)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Icon name="calendar" className="h-4 w-4" strokeWidth={1.9} />
        Add to your calendar
      </a>
      )}

      {chapter && (
        <Link
          href={`/c/${chapter.slug}`}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand/40"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-soft">
            <Icon name="users" className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-fg">
              Join {chapter.name}
            </span>
            <span className="block text-xs text-muted">
              Keep up with this crowd between events
            </span>
          </span>
        </Link>
      )}

      {related.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-faint">
            While you&rsquo;re here
          </p>
          <div className="mt-2.5 flex flex-col gap-2">
            {related.map((e) => (
              <Link
                key={e.slug}
                href={`/events/${e.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-2 transition-colors hover:border-brand/40"
              >
                <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-ink-2">
                  {e.image && (
                    <Image
                      src={e.image}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg transition-colors group-hover:text-brand">
                    {e.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {[e.dateLabel, e.city].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 pr-1 text-xs font-semibold text-fg">
                  {e.priceLabel}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/events"
        className="block text-center text-sm font-medium text-brand-soft hover:underline"
      >
        Browse all events →
      </Link>
    </div>
  );
}
