/**
 * Render an event's `about` text with its own paragraphs intact.
 *
 * It used to go into a single <p>, where HTML collapses every newline — so a
 * description written with blank lines between sections, and short headings
 * above them, arrived as one unbroken wall. The longer and better-structured
 * the text, the worse it read.
 *
 * The structure is inferred from the text, not from what any particular event
 * happens to say: a block separated by a blank line is a paragraph, and a
 * block that is a single short line with no sentence-ending punctuation is a
 * heading for the block beneath it. That is the shape people already write in
 * when they paste a description into the admin console, and it needs nothing
 * added to the database.
 */

const HEADING_MAX = 72;

/** A lone short line that does not end a sentence is a heading, not a prose line. */
function isHeading(block: string): boolean {
  if (block.includes("\n")) return false;
  const t = block.trim();
  return t.length > 0 && t.length <= HEADING_MAX && !/[.!?:,;]$/.test(t);
}

export function EventProse({ text }: { text: string | null | undefined }) {
  if (!text?.trim()) return null;

  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="mt-4 space-y-4">
      {blocks.map((block, i) =>
        isHeading(block) ? (
          <h3
            key={i}
            className="pt-2 font-display text-sm font-semibold uppercase tracking-wider text-brand-soft"
          >
            {block}
          </h3>
        ) : (
          <p key={i} className="leading-relaxed text-muted">
            {/* A single newline inside a block is a line break the author
                meant — an address, a list — not a paragraph of its own. */}
            {block.split("\n").map((line, j, all) => (
              <span key={j}>
                {line}
                {j < all.length - 1 && <br />}
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
