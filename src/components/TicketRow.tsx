import Link from "next/link";
import { type TXFEvent } from "@/lib/data";
import { Icon } from "./Icon";
import { DownloadTicketBtn } from "./DownloadTicketBtn";

export function TicketRow({
  event,
  ticketCode,
  attendeeName,
}: {
  event: TXFEvent;
  ticketCode?: string;
  attendeeName?: string;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 transition-colors hover:bg-ink/30 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/events/${event.slug}`} className="flex-1 group">
        <div className="flex items-center gap-2 mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
          <span>{event.dateLabel}</span>
          <span className="h-1 w-1 rounded-full bg-line" />
          <span>{event.time}</span>
        </div>
        <h3 className="font-display text-lg font-bold text-fg group-hover:text-brand transition-colors">
          {event.title}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {event.venue}, {event.city}
        </p>
      </Link>
      
      {ticketCode && (
        <div className="flex shrink-0 flex-col gap-1 rounded-xl bg-ink-2 px-4 py-3 sm:items-end">
          <span className="text-xs font-medium text-faint">TICKET CODE</span>
          <span className="font-mono text-lg font-bold text-fg">{ticketCode.toUpperCase()}</span>
          {attendeeName && (
            <span className="text-xs text-muted truncate max-w-[150px] mb-2" title={attendeeName}>
              {attendeeName}
            </span>
          )}
          <DownloadTicketBtn event={event} ticketCode={ticketCode} attendeeName={attendeeName} />
        </div>
      )}
    </div>
  );
}
