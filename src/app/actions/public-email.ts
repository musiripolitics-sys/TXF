"use server";

import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import {
  sendContactReceived,
  sendHostProposalReceived,
  sendNewsletterWelcome,
  sendInternalAlert,
} from "@/lib/email";

/**
 * Acknowledgements for the three public forms.
 *
 * These are callable by anyone, so none of them takes the content to send.
 * They take the id of a row that was just written and read it back with the
 * service role, which means a caller cannot use them to post arbitrary text
 * to an arbitrary address over our domain. Submitting junk still costs an
 * email, but that is true of the form itself and belongs to rate limiting,
 * not to this.
 *
 * Every one of them is best-effort. A failed acknowledgement must never make
 * a submitted form look like it failed.
 */

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const firstName = (s: string | null | undefined) => (s || "there").split(" ")[0];

/** Everyone who can act on an internal alert. */
async function admins() {
  const db = admin();
  if (!db) return [];
  const { data } = await db.from("users").select("email,full_name").eq("primary_role", "admin");
  return ((data as { email: string | null; full_name: string | null }[]) ?? []).filter((a) => a.email);
}

export async function acknowledgeContact(id: string) {
  try {
    const db = admin();
    if (!db) return;
    const { data } = await db
      .from("contact_messages")
      .select("name,email,topic,message")
      .eq("id", id)
      .maybeSingle();
    const row = data as { name: string | null; email: string | null; topic: string | null; message: string | null } | null;
    if (!row?.email) return;

    await sendContactReceived({ to: row.email, name: firstName(row.name), subject: row.topic });
    await Promise.all(
      (await admins()).map((a) =>
        sendInternalAlert({
          to: a.email!,
          name: firstName(a.full_name),
          heading: "New contact message",
          what: "somebody has written in through the contact form.",
          details: [
            ["From", row.name],
            ["Email", row.email],
            ["Topic", row.topic],
            ["Message", row.message?.slice(0, 400)],
          ],
          href: "/admin",
          cta: "Open the console",
        }),
      ),
    );
  } catch {
    // An acknowledgement is not worth failing a submission over.
  }
}

export async function acknowledgeHostProposal(id: string) {
  try {
    const db = admin();
    if (!db) return;
    const { data } = await db
      .from("host_submissions")
      .select("title,category,date,city,venue,organizer_email,organizer_id")
      .eq("id", id)
      .maybeSingle();
    const row = data as {
      title: string | null; category: string | null; date: string | null;
      city: string | null; venue: string | null;
      organizer_email: string | null; organizer_id: string | null;
    } | null;
    if (!row?.organizer_email) return;

    // The form takes an email but not a name; the name is on the account when
    // the proposer was signed in.
    let proposer: string | null = null;
    if (row.organizer_id) {
      const { data: u } = await db.from("users").select("full_name").eq("id", row.organizer_id).maybeSingle();
      proposer = (u as { full_name: string | null } | null)?.full_name ?? null;
    }

    await sendHostProposalReceived({
      to: row.organizer_email,
      name: firstName(proposer),
      eventTitle: row.title,
    });
    await Promise.all(
      (await admins()).map((a) =>
        sendInternalAlert({
          to: a.email!,
          name: firstName(a.full_name),
          heading: "New event proposal",
          what: "somebody wants to host an event.",
          details: [
            ["Proposed by", proposer ?? row.organizer_email],
            ["Email", row.organizer_email],
            ["Event", row.title],
            ["Category", row.category],
            ["Date", row.date],
            ["City", [row.venue, row.city].filter(Boolean).join(", ") || null],
          ],
          href: "/admin/os/hosts",
          cta: "Review the proposal",
        }),
      ),
    );
  } catch {
    /* as above */
  }
}

export async function acknowledgeNewsletter(email: string) {
  try {
    const db = admin();
    if (!db) return;
    // Confirm the address is genuinely on the list before writing to it, so
    // this cannot be used to mail somebody who never subscribed.
    const { data } = await db
      .from("newsletter_subscribers")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (!data) return;
    await sendNewsletterWelcome({ to: email });
  } catch {
    /* as above */
  }
}


// ─────────────────────────── Rate limiting ───────────────────────────
//
// Migration 0023 limits both tables by the address given, which holds even
// against someone posting to PostgREST directly. That is the floor. These add
// a second limit keyed on where the request came from, which is the thing an
// address cannot tell you: one person cycling through made-up addresses looks
// like many people until you look at the connection.

/** The caller's address, as far as any proxy in front of us will say. */
async function callerIp(): Promise<string | null> {
  const h = await headers();
  // x-forwarded-for is a list, oldest first; the left-most is the client.
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim() || null;
  return h.get("x-real-ip") || null;
}

/**
 * Count one request against a bucket. Open on failure: a rate limiter that
 * cannot reach the database must not take the contact form down with it.
 */
async function withinLimit(bucket: string, limit: number, seconds: number): Promise<boolean> {
  try {
    const ip = await callerIp();
    if (!ip) return true;
    const db = admin();
    if (!db) return true;
    const { data, error } = await db.rpc("bos_rate_limit", {
      p_bucket: bucket,
      p_key: ip,
      p_limit: limit,
      p_window: `${seconds} seconds`,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/** Ten contact messages an hour from one connection is already generous. */
export async function contactWithinLimit(): Promise<boolean> {
  return withinLimit("contact-ip", 10, 3600);
}

/** Five signups an hour from one connection. A real person needs one. */
export async function newsletterWithinLimit(): Promise<boolean> {
  return withinLimit("newsletter-ip", 5, 3600);
}
