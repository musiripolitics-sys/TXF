/**
 * Number and date formatting shared across the site.
 *
 * What is left of src/lib/bos.ts. That file was the Business OS vocabulary —
 * task statuses, CRM stages, a hundred-field dashboard shape — and with the
 * OS gone, two formatters were all anything still called. Both pin the locale
 * on purpose: `toLocaleDateString()` with no locale renders "14/01/2026" on
 * the server and "1/14/2026" in a US browser, which React reports as a
 * hydration mismatch and the reader sees as a flicker.
 */

export const num = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-IN").format(n ?? 0);

export function shortDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}
