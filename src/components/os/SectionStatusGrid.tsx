import Link from "next/link";
import { SECTION_GROUPS, type SectionStatus } from "@/lib/bos-sections";

/**
 * Every section of the Business OS with its live state, grouped exactly as the
 * sidebar groups them. A section with no records says so in words rather than
 * showing a bare 0, and anything past its date carries an overdue badge — the
 * two states that were previously indistinguishable.
 */
export function SectionStatusGrid({ status }: { status: SectionStatus }) {
  return (
    <div className="space-y-5">
      {SECTION_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
            {group.label}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {group.items.map((item) => (
              <SectionTile key={item.key} item={item} state={status[item.key]} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionTile({
  item,
  state,
}: {
  item: (typeof SECTION_GROUPS)[number]["items"][number];
  state: SectionStatus[string];
}) {
  // No entry at all means the table isn't in this database yet — that is a
  // different problem from "the table is empty", so it reads differently.
  if (!state) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface-2 px-3 py-2.5">
        <p className="truncate text-xs font-medium text-faint">{item.label}</p>
        <p className="mt-1 text-[11px] text-faint">Not installed</p>
      </div>
    );
  }

  const overdue = state.overdue ?? 0;
  const empty = state.total === 0;

  return (
    <Link
      href={item.href}
      className={`group flex flex-col rounded-xl border px-3 py-2.5 transition-colors ${
        overdue > 0
          ? "border-red-300 bg-red-50 hover:border-red-400"
          : empty
            ? "border-dashed border-line bg-surface-2 hover:border-brand/40"
            : "border-line bg-surface hover:border-brand/40"
      }`}
    >
      <p className="truncate text-xs font-medium text-muted group-hover:text-fg">
        {item.label}
      </p>

      {empty ? (
        <p className="mt-1 text-[11px] text-faint">No {item.noun} yet</p>
      ) : (
        <>
          <p className="mt-0.5 font-display text-xl font-bold tabular-nums leading-none text-fg">
            {state.total}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px]">
            {overdue > 0 ? (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 font-semibold text-white">
                {overdue} overdue
              </span>
            ) : state.open != null && state.open > 0 ? (
              <span className="text-muted">{state.open} open</span>
            ) : (
              <span className="text-green-600">All clear</span>
            )}
          </p>
        </>
      )}
    </Link>
  );
}
