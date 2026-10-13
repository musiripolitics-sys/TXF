/**
 * Stands in for next/headers when a server module is bundled for a test.
 *
 * TEST_HOST lets a suite pretend a request arrived for a given host; with it
 * unset, headers() throws exactly as it does outside a request, which is the
 * path the cron job and the webhook take.
 */
export async function headers() {
  const host = process.env.TEST_HOST;
  if (!host) throw new Error("headers() called outside a request scope");
  return new Map([["host", host]]);
}
export async function cookies() {
  return { getAll: () => [], set: () => {} };
}
