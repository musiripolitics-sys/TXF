"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { setEventCover } from "@/app/events/cover-actions";
import { toast } from "./Toast";

/**
 * The picture at the top of an event's card and page.
 *
 * events.image_url has existed since the first migration and no form has ever
 * written it, so every event on the site falls back to the category gradient.
 * Both consoles mount this; the action decides whether the caller is this
 * event's host or an admin.
 */
export function EventCoverUpload({
  eventId,
  initialUrl,
}: {
  eventId: string;
  initialUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [busy, setBusy] = useState(false);

  const send = async (fd: FormData) => {
    fd.set("eventId", eventId);
    setBusy(true);
    const res = await setEventCover(fd);
    setBusy(false);
    if (res.error) return toast(res.error, "error");
    setUrl(res.url ?? null);
    toast(res.url ? "Cover updated." : "Cover removed.", "success");
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    await send(fd);
    // Let the same file be chosen again after a failure.
    if (inputRef.current) inputRef.current.value = "";
  };

  const clear = async () => {
    const fd = new FormData();
    fd.set("clear", "1");
    await send(fd);
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold text-fg">Cover image</p>
      <p className="mt-0.5 text-xs text-muted">
        Shown on the event card and at the top of its page. Landscape, 16:9
        reads best. Without one the card uses the category pattern.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg border border-line bg-ink-2">
          {url ? (
            // unoptimized: a 144px preview of a file this page just
            // uploaded. next.config allows the storage host, so the public
            // pages do optimize it; there is nothing to gain here.
            <Image
              src={url}
              alt=""
              fill
              unoptimized
              sizes="144px"
              className="object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-[11px] text-faint">
              No cover
            </span>
          )}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={onPick}
            disabled={busy}
            className="text-xs text-muted file:mr-2 file:rounded-full file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-fg hover:file:border-brand hover:file:text-brand"
          />
          {url && (
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="text-[11px] font-medium text-red-500 hover:underline disabled:opacity-40"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {busy && <p className="mt-2 text-xs text-faint">Uploading…</p>}
      <p className="mt-2 text-xs text-faint">
        JPEG, PNG, WebP or AVIF, up to 5 MB. Saved as soon as you choose it —
        this is not part of the Save button below.
      </p>
    </div>
  );
}
