function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?";
}

/**
 * "23 going" with stacked faces.
 *
 * The single highest-value piece of social proof on an event: a count of real
 * people converts differently from a count of remaining seats. Names only
 * appear for members who opted into the directory — the count stands alone
 * when nobody has.
 */
export function GoingStrip({
  going,
  names,
  size = "sm",
}: {
  going: number;
  names: string[];
  size?: "sm" | "md";
}) {
  if (going <= 0) return null;

  const avatar = size === "md" ? "h-8 w-8 text-[11px]" : "h-6 w-6 text-[9px]";
  const text = size === "md" ? "text-sm" : "text-xs";
  const shown = names.slice(0, 4);
  const extra = going - shown.length;

  return (
    <div className="flex items-center gap-2">
      {shown.length > 0 && (
        <div className="flex -space-x-2">
          {shown.map((n) => (
            <span
              key={n}
              title={n}
              className={`grid ${avatar} place-items-center rounded-full border-2 border-surface bg-gradient-to-br from-brand to-join font-bold text-white`}
            >
              {initials(n)}
            </span>
          ))}
          {extra > 0 && (
            <span
              className={`grid ${avatar} place-items-center rounded-full border-2 border-surface bg-ink-2 font-bold text-faint`}
            >
              +{extra > 99 ? "99" : extra}
            </span>
          )}
        </div>
      )}
      <span className={`${text} font-medium text-muted`}>
        {going} going
      </span>
    </div>
  );
}
