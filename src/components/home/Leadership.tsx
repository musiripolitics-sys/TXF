import Link from "next/link";
import { Section } from "@/components/Section";
import { LeaderTeamCard } from "@/components/LeaderTeamCard";
import { type Leader } from "@/lib/data";
import { getLeaders } from "@/lib/content";

export async function Leadership() {
  const leaders = await getLeaders();
  const order = ["Mahalakshmi", "Kumaresan", "Abishek"];
  const activeLeaders: Leader[] = order
    .map((n) => leaders.find((l) => l.name === n))
    .filter((l): l is Leader => !!l);

  return (
    <div className="border-y border-line bg-ink-2">
      <Section id="leadership">
        {/* Editorial header */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-faint">
              Our Team <sup className="text-[10px]">[{activeLeaders.length}]</sup>
            </span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl text-balance">
              The people behind Techxfluence
            </h2>
          </div>
          <p className="text-muted lg:pb-2 text-balance">
            Our team is a blend of organizers, mentors and ambassadors dedicated
            to building experiences, not just events. We come together with one
            shared goal: to help you learn, connect and grow in the world of
            technology.
          </p>
        </div>

        {/* Black & white team grid */}
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {activeLeaders.map((leader) => (
            <LeaderTeamCard key={leader.name} leader={leader} />
          ))}
        </div>

        <div className="mt-12">
          <Link
            href="/leaders"
            className="inline-flex items-center justify-center rounded-full border border-fg px-6 py-3 text-sm font-semibold text-fg transition-colors hover:bg-fg hover:text-white"
          >
            Meet the whole team
          </Link>
        </div>
      </Section>
    </div>
  );
}
