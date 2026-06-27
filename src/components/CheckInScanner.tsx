"use client";

import { useEffect, useRef, useState } from "react";
import { checkInTicket, type CheckInResult } from "@/app/host/checkin/actions";

// Minimal shape of the html5-qrcode instance we use.
type Scanner = {
  start: (
    camera: { facingMode: string },
    config: { fps: number; qrbox: number },
    onSuccess: (text: string) => void,
    onError: (err: unknown) => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
};

export function CheckInScanner() {
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [manual, setManual] = useState("");
  const [count, setCount] = useState(0);

  const scannerRef = useRef<Scanner | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  // Process a code (from camera or manual entry).
  const process = async (code: string) => {
    if (busy) return;
    setBusy(true);
    const res = await checkInTicket(code);
    setResult(res);
    if (res.status === "ok") setCount((c) => c + 1);
    setBusy(false);
  };

  const onScan = (text: string) => {
    const now = Date.now();
    // Ignore repeat reads of the same code within 3s.
    if (text === lastRef.current.code && now - lastRef.current.at < 3000) return;
    lastRef.current = { code: text, at: now };
    process(text);
  };

  const startCamera = async () => {
    setResult(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("reader") as unknown as Scanner;
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        onScan,
        () => {},
      );
      setScanning(true);
    } catch {
      setResult({
        status: "error",
        message:
          "Couldn't start the camera. Check permissions, or type the code below.",
      });
    }
  };

  const stopCamera = async () => {
    const s = scannerRef.current;
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {
        /* already stopped */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Stop the camera on unmount.
  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manual.trim()) {
      process(manual);
      setManual("");
    }
  };

  const resultStyles: Record<CheckInResult["status"], string> = {
    ok: "border-host/40 bg-host/10 text-host-soft",
    already: "border-amber-500/40 bg-amber-500/10 text-amber-600",
    invalid: "border-red-500/30 bg-red-500/10 text-red-600",
    error: "border-red-500/30 bg-red-500/10 text-red-600",
  };

  return (
    <div className="mt-8 space-y-5">
      {/* Result card */}
      {result && (
        <div className={`rounded-2xl border p-5 ${resultStyles[result.status]}`}>
          <p className="font-display text-lg font-bold">
            {result.status === "ok" && "✓ Checked in"}
            {result.status === "already" && "⚠ Already checked in"}
            {(result.status === "invalid" || result.status === "error") &&
              "✕ " + result.message}
          </p>
          {result.attendeeName && (
            <p className="mt-1 text-sm font-medium text-fg">
              {result.attendeeName}
            </p>
          )}
          {result.eventTitle && (
            <p className="text-xs text-muted">{result.eventTitle}</p>
          )}
          {result.status === "already" && result.checkedInAt && (
            <p className="mt-1 text-xs">
              at {new Date(result.checkedInAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Camera */}
      <div className="overflow-hidden rounded-2xl border border-line bg-ink-2">
        <div id="reader" className="w-full" />
        <div className="flex items-center justify-between gap-3 p-4">
          <span className="text-xs text-muted">
            {scanning ? "Scanning…" : "Camera off"}
          </span>
          {scanning ? (
            <button
              onClick={stopCamera}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-fg hover:border-brand hover:text-brand"
            >
              Stop camera
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-soft"
            >
              Start camera
            </button>
          )}
        </div>
      </div>

      {/* Manual entry */}
      <form onSubmit={submitManual} className="flex gap-2">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Or enter ticket code"
          aria-label="Ticket code"
          className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          disabled={busy || !manual.trim()}
          className="rounded-full bg-fg px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Check in"}
        </button>
      </form>

      <p className="text-center text-sm text-faint">
        {count} checked in this session
      </p>
    </div>
  );
}
