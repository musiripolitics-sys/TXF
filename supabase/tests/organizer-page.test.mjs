/**
 * get_organizer returns a track record, and only the organiser's own.
 *
 * The public organiser page is anonymous, so everything it shows has to come
 * out of one security-definer function — registrations and users are both
 * closed to anon, and the page must not be given either. That makes the
 * function the whole security boundary for the page, and two of its answers
 * are easy to get subtly wrong:
 *
 *   turnout      counting an upcoming event's signups would make a page look
 *                more proven the day before an event than the day after
 *   the tenant   a cross-tenant leak here reports another business's events
 *                and attendance on this one's page
 *
 * Both are asserted below, along with the page's precondition: somebody who
 * is not running public events has no public page at all.
 */
import { freshDb, counter } from "./_db.mjs";

const { state, ok } = counter();
const { db, skipped } = await freshDb();
ok(skipped.length === 0, `every migration applied cleanly (${skipped.length} failures)`);

const q = async (s) => (await db.query(s)).rows;
const TENANT = (await q(`select id from public.tenants limit 1`))[0].id;

const HOST = "aaaa1111-0000-0000-0000-00000000aaaa";
const QUIET = "cccc3333-0000-0000-0000-00000000cccc";
const FAN = "dddd4444-0000-0000-0000-00000000dddd";

await db.exec(`insert into auth.users(id,email) values
  ('${HOST}','host@t.test'), ('${QUIET}','quiet@t.test'), ('${FAN}','fan@t.test');`);
await db.exec(`update public.users
   set full_name='Asha Raman', city='Chennai', bio='Runs the Chennai AI meetup.',
       linkedin_url='https://linkedin.com/in/asha', avatar_url='/team/asha.jpg'
 where id='${HOST}';`);
for (const u of [HOST, QUIET]) {
  await db.query(`update public.tenant_members set role='event_host', status='active'
                   where user_id='${u}' and tenant_id='${TENANT}'`);
}

const mkEvent = async ({ slug, host, date, city = "Chennai", category = "Meetup", status = "published", tenant = TENANT }) =>
  (await q(`insert into public.events
    (tenant_id, slug, title, category, date, date_label, city, venue, capacity, spots_left,
     price_type, price_amount, status, host_id)
    values ('${tenant}','${slug}','${slug}','${category}','${date}','d','${city}','V',
            50, 50, 'Free', 0, '${status}', '${host}') returning id`))[0].id;

// Two behind them, two ahead, one still a draft.
const past1 = await mkEvent({ slug: "past-1", host: HOST, date: "2024-03-15" });
const past2 = await mkEvent({ slug: "past-2", host: HOST, date: "2024-06-20", category: "Workshop" });
const soon1 = await mkEvent({ slug: "soon-1", host: HOST, date: "2030-01-01" });
const soon2 = await mkEvent({ slug: "soon-2", host: HOST, date: "2030-02-02", city: "Online", category: "Hackathon" });
await mkEvent({ slug: "draft", host: HOST, date: "2030-03-03", status: "draft", city: "Kochi" });

const register = async (event, status, email) =>
  db.exec(`insert into public.registrations
    (tenant_id, event_id, attendee_name, attendee_email, status, ticket_code)
    values ('${TENANT}','${event}','A','${email}','${status}','${email}')`);

await register(past1, "registered", "p1a@t.test");
await register(past1, "registered", "p1b@t.test");
await register(past1, "attended", "p1c@t.test");
await register(past1, "cancelled", "p1d@t.test");
await register(past2, "registered", "p2a@t.test");
await register(past2, "attended", "p2b@t.test");
// Signups for something that has not happened yet.
await register(soon1, "registered", "s1a@t.test");
await register(soon1, "registered", "s1b@t.test");

await db.exec(`insert into public.organizer_follows (tenant_id, follower_id, organizer_id)
               values ('${TENANT}','${FAN}','${HOST}');`);

const asAnon = () => db.exec(`reset role; set request.jwt.claim.sub='';`);
const organizer = async (id) =>
  (await q(`select public.get_organizer('${id}') as o`))[0].o;

console.log("\nWhat an anonymous visitor is given:");
await asAnon();
const o = await organizer(HOST);

ok(o !== null, "the organiser has a public page");
ok(o.name === "Asha Raman", "their name");
ok(o.bio === "Runs the Chennai AI meetup.", "their bio");
ok(o.linkedin === "https://linkedin.com/in/asha", "their LinkedIn");
ok(o.avatar === "/team/asha.jpg", "their avatar, which nothing could read before");
ok(o.followers === 1, "the follower count");

console.log("\nThe counts, and the draft that is in none of them:");
ok(o.events_count === 4, `4 published events, not 5 (got ${o.events_count})`);
ok(o.upcoming_count === 2, `2 upcoming (got ${o.upcoming_count})`);
ok(o.past_count === 2, `2 past (got ${o.past_count})`);
ok(o.hosting_since === "2024-03-15", `hosting since their first event (got ${o.hosting_since})`);

console.log("\nTurnout is turnout, not signups:");
ok(o.attendees === 5, `5 people across the two past events (got ${o.attendees})`);
ok(o.attendees !== 7, "the upcoming event's 2 signups are not counted as people hosted");

console.log("\nWhere and what, commonest first:");
ok(
  JSON.stringify(o.cities) === JSON.stringify(["Chennai", "Online"]),
  `cities by frequency (got ${JSON.stringify(o.cities)})`,
);
ok(o.cities.includes("Kochi") === false, "the draft's city is not advertised");
ok(o.categories[0] === "Meetup", `the kind they run most often leads (got ${o.categories[0]})`);
ok(o.categories.length === 3, `3 distinct categories (got ${o.categories.length})`);

console.log("\nNo public events, no public page:");
ok((await organizer(QUIET)) === null, "a host who has published nothing");
ok((await organizer(FAN)) === null, "a member who is not a host");
ok(
  (await organizer("99999999-9999-9999-9999-999999999999")) === null,
  "an id that is nobody",
);

console.log("\nAnother business's events stay on that business's page:");
const OTHER = (
  await q(`insert into public.tenants (slug, name, status)
           values ('other','Other','active') returning id`)
)[0].id;
await db.exec(`insert into public.tenant_members (tenant_id, user_id, role, status)
               values ('${OTHER}','${HOST}','event_host','active');`);
const elsewhere = await mkEvent({
  slug: "elsewhere", host: HOST, date: "2024-01-01", city: "Mumbai", tenant: OTHER,
});
await db.exec(`insert into public.registrations
  (tenant_id, event_id, attendee_name, attendee_email, status, ticket_code)
  values ('${OTHER}','${elsewhere}','A','x@t.test','attended','x')`);

const after = await organizer(HOST);
ok(after.events_count === 4, `still 4 events (got ${after.events_count})`);
ok(after.attendees === 5, `still 5 people hosted (got ${after.attendees})`);
ok(!after.cities.includes("Mumbai"), "the other tenant's city does not appear");
ok(
  after.hosting_since === "2024-03-15",
  `and an earlier event elsewhere does not backdate them (got ${after.hosting_since})`,
);

console.log(`\n${state.pass} passed, ${state.fail} failed`);
process.exit(state.fail ? 1 : 0);
