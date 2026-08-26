"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadGroupFile } from "@/app/community/actions";
import { toast } from "./Toast";

/** Admin-only: add slides, recordings or notes to a session group's shelf. */
export function GroupFileUpload({ eventId }: { eventId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("eventId", eventId);

    setBusy(true);
    const res = await uploadGroupFile(fd);
    setBusy(false);

    if (res.error) return toast(res.error, "error");
    toast("File added to the group.", "success");
    formRef.current?.reset();
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 rounded-full border border-dashed border-line px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
      >
        + Add a file
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="gf-title" className="text-xs font-medium text-muted">
          Title
        </label>
        <input
          id="gf-title"
          name="title"
          required
          placeholder="e.g., Workshop slides"
          className="rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="gf-desc" className="text-xs font-medium text-muted">
          Description <span className="text-faint">(optional)</span>
        </label>
        <input
          id="gf-desc"
          name="description"
          placeholder="What's in it?"
          className="rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="gf-file" className="text-xs font-medium text-muted">
            File <span className="text-faint">(max 50 MB)</span>
          </label>
          <input
            id="gf-file"
            name="file"
            type="file"
            required
            className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-ink-2 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-fg"
          />
        </div>
        <div className="flex w-32 shrink-0 flex-col gap-1.5">
          <label htmlFor="gf-cost" className="text-xs font-medium text-muted">
            Credit cost
          </label>
          <input
            id="gf-cost"
            name="creditCost"
            type="number"
            min={0}
            defaultValue={0}
            className="rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
          />
        </div>
      </div>
      <p className="text-xs text-faint">0 means free to everyone who attended.</p>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Add file"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-medium text-faint hover:text-fg"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
