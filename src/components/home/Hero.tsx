import { Button } from "@/components/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="absolute inset-0 bg-grid" aria-hidden />
      <div className="absolute inset-0 glow-brand" aria-hidden />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="animate-float-up inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-host" />
            5,000+ builders · 20+ cities · We Connect
          </span>

          <h1 className="animate-float-up mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-fg sm:text-6xl text-balance">
            The ultimate community for{" "}
            <span className="text-brand">technology</span> enthusiasts
          </h1>

          <p className="animate-float-up mx-auto mt-6 max-w-xl text-lg text-muted text-balance">
            Join events, host experiences, connect with innovators and grow
            with a thriving technology ecosystem. Where technology meets
            influence.
          </p>

          <div className="animate-float-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/events" variant="join" size="lg">
              Join Events
            </Button>
            <Button href="/host" variant="host" size="lg">
              Host an Event
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
