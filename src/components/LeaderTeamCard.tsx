import { leaderLinkedIn, type Leader } from "@/lib/data";

/**
 * Editorial black-and-white team card. The whole card links to the leader's
 * LinkedIn profile. (Swap the gradient block for a grayscale <Image> when real
 * headshots are available.)
 */
export function LeaderTeamCard({ leader }: { leader: Leader }) {
  const isHiring = leader.isHiring;
  return (
    <a
      href={leaderLinkedIn(leader)}
      target={isHiring ? undefined : "_blank"}
      rel={isHiring ? undefined : "noopener noreferrer"}
      aria-label={isHiring ? "Join the team" : `${leader.name} on LinkedIn`}
      className="group block"
    >
      <article className="overflow-hidden rounded-2xl border border-line bg-surface p-3 shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:border-fg/30">
        {/* Monochrome portrait */}
        <div className={`relative aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-b ${isHiring ? "from-zinc-50 to-zinc-100 border border-dashed border-zinc-200" : "from-zinc-500 to-zinc-900"}`}>
          {leader.image && !isHiring ? (
            <img
              src={leader.image}
              alt={leader.name}
              className="absolute inset-0 h-full w-full object-cover grayscale transition duration-300 group-hover:scale-105"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-grid opacity-10" aria-hidden />
              <span className={`absolute inset-0 grid place-items-center font-display ${isHiring ? "text-7xl text-zinc-300 font-normal" : "text-6xl font-bold text-white/85"}`}>
                {leader.initials}
              </span>
            </>
          )}
          {!isHiring && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              {/* LinkedIn affordance */}
              <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md bg-white/15 text-white opacity-80 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C20.3 8.65 21 10.6 21 13.4V21h-4v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.49V21H9V9Z" />
                </svg>
              </span>
            </>
          )}
          {isHiring && (
            <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md bg-zinc-100 text-zinc-400 transition-colors group-hover:bg-brand/10 group-hover:text-brand-soft">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-2 px-2 pb-1 pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-faint">
              {leader.role}
            </p>
            <p className="mt-1 font-serif text-2xl text-fg">
              {isHiring ? "Hiring" : leader.name}
            </p>
          </div>
          <span
            className="mb-1 shrink-0 text-faint transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-fg"
            aria-hidden
          >
            ↗
          </span>
        </div>
      </article>
    </a>
  );
}
