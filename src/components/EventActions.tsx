"use client";

import { Icon } from "./Icon";
import { toast } from "./Toast";
import { googleCalUrl } from "@/lib/calendar";

interface Props {
  title: string;
  dateISO: string; // YYYY-MM-DD
  time?: string;
  location?: string;
  details?: string;
}

export function EventActions(props: Props) {
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: props.title, url });
      } catch {
        /* user cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Event link copied to clipboard", "success");
    } catch {
      toast("Couldn't copy the link", "error");
    }
  };

  return (
    <div className="flex gap-2">
      <a
        href={googleCalUrl(props)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-brand hover:text-brand"
      >
        <Icon name="calendar" className="h-4 w-4" />
        Add to Calendar
      </a>
      <button
        type="button"
        onClick={share}
        aria-label="Share this event"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-brand hover:text-brand"
      >
        <Icon name="share" className="h-4 w-4" />
        Share
      </button>
    </div>
  );
}
