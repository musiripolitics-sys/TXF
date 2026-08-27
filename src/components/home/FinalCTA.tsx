import Link from "next/link";
import { Button } from "@/components/Button";

export function FinalCTA() {
  return (
    <section className="edge-t relative -mt-1 overflow-hidden bg-[#0e0e0c] px-5 sm:px-8">
      <div className="cross-rule opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-[40rem] -translate-x-1/2 translate-y-1/3 rounded-full bg-brand/20 blur-[120px]"
        aria-hidden
      />
      <div className="edge-pad-t relative mx-auto max-w-5xl px-6 pb-24 text-center sm:px-12">
        <div className="relative">
          <h2 className="font-display text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl text-balance">
            Join the tribe of tech innovators
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/60 text-balance">
            Whether you want to learn, build, hire or just meet your people —
            Techxfluence is where it happens. Connect. Learn. Build. Influence.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/membership" variant="brand" size="lg">
              Become a Member
            </Button>
            <Link
              href="/host"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-base font-semibold text-white transition-colors hover:border-white/60"
            >
              Host an Event
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
