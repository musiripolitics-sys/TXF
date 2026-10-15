/**
 * The site's own origin, from NEXT_PUBLIC_SITE_URL.
 *
 * Trimmed, and with any trailing slash removed, because this value is pasted
 * into a hosting provider's web form by a human and then concatenated with
 * paths all over the app. A trailing space in it produced
 *
 *   "https://techxfluence.com /auth/confirm?next=/profile"
 *
 * which new URL() rejects, so supabase-js failed before it sent anything and
 * the login page reported "Failed to fetch" — a message that points at the
 * network and not at a stray keystroke in an environment variable. A trailing
 * slash is the same class of problem one character later: "//auth/confirm".
 *
 * `process.env.NEXT_PUBLIC_SITE_URL` is written out literally here because
 * Next inlines the literal at build time; reading it through a variable would
 * leave undefined in the browser bundle.
 */
const CONFIGURED = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");

/** The canonical origin. Falls back to the domain, never to an empty string. */
export const SITE_URL = CONFIGURED || "https://techxfluence.com";

/**
 * The origin to send somebody back to, for links a browser will follow.
 *
 * Prefers the configured value and falls back to wherever the page is
 * actually being served — so a developer on localhost gets a confirmation
 * link back to localhost rather than to production.
 */
export function redirectOrigin(): string {
  if (CONFIGURED) return CONFIGURED;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://techxfluence.com";
}
