import { Button } from "@/components/Button";

export function FinalCTA() {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-line bg-surface px-6 py-16 text-center sm:px-12">
        <div className="relative">
          <h2 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl text-balance">
            Join the tribe of tech innovators
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted text-balance">
            Whether you want to learn, build, hire or just meet your people —
            Techxfluence is where it happens. Connect. Learn. Build. Influence.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/membership" variant="brand" size="lg">
              Become a Member
            </Button>
            <Button href="/host" variant="outline" size="lg">
              Host an Event
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
