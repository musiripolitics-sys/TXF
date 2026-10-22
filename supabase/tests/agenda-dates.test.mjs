/**
 * An agenda row carries its own date and times.
 *
 * when_label was free text, so a four-week course recorded its real dates as
 * prose — "Week 1 · Oct 24" — that no query could read. The event row said
 * 18 Oct, three sentences away from what its own agenda said, and nothing
 * could notice because one of the two was a sentence. That is the
 * disagreement that archived the course the morning after a session it had
 * not run.
 *
 * The columns are nullable on purpose and this asserts that too: an agenda
 * row is often a time within one day ("18:30 · Doors open") and has no date
 * of its own to give.
 */
import { freshDb, counter } from "./_db.mjs";

const { state, ok } = counter();
const { db, skipped } = await freshDb({ quiet: true });
ok(skipped.length === 0, `every migration applied cleanly (${skipped.length} failures)`);

const q = async (s) => (await db.query(s)).rows;
const TENANT = (await q(`select id from public.tenants limit 1`))[0].id;
const HOST = "aaaa1111-0000-0000-0000-00000000aaaa";

await db.exec(`insert into auth.users(id,email) values ('${HOST}','host@t.test');`);
await db.query(`update public.tenant_members set role='event_host', status='active'
                 where user_id='${HOST}' and tenant_id='${TENANT}'`);

const course = (await q(`insert into public.events
  (tenant_id, slug, title, category, date, date_label, city, venue, capacity,
   spots_left, price_type, price_amount, status, host_id)
  values ('${TENANT}','course','Course','Workshop','2026-10-24','d','Chennai','V',
          50, 50, 'Free', 0, 'published', '${HOST}') returning id`))[0].id;

const weeks = [
  ["Week 1 · Oct 24", "2026-10-24"],
  ["Week 2 · Oct 31", "2026-10-31"],
  ["Week 3 · Nov 7", "2026-11-07"],
  ["Week 4 · Nov 14", "2026-11-14"],
];
for (const [i, [label, day]] of weeks.entries()) {
  await db.exec(`insert into public.event_agenda
    (tenant_id, event_id, when_label, what, sort_order, on_date, start_time, end_time)
    values ('${TENANT}','${course}','${label}','Session',${i},'${day}','10:00','11:30')`);
}
// The row that is a time of day and not a day: it must still be allowed.
await db.exec(`insert into public.event_agenda
  (tenant_id, event_id, when_label, what, sort_order)
  values ('${TENANT}','${course}','Doors open','Registration',9)`);

const span = async (id) => (await q(`select * from public.agenda_span('${id}')`))[0];
/**
 * A `date` column comes back as a JS Date. toISOString() would be wrong here:
 * it is midnight local, and in any zone ahead of UTC that lands on the day
 * before. Read the local parts instead.
 */
const day = (v) => {
  if (v == null) return null;
  if (!(v instanceof Date)) return String(v).slice(0, 10);
  return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(
    v.getDate(),
  ).padStart(2, "0")}`;
};

console.log("\nThe span the agenda actually covers:");
const s = await span(course);
ok(day(s.first_day) === "2026-10-24", `first dated day (got ${day(s.first_day)})`);
ok(day(s.last_day) === "2026-11-14", `last dated day (got ${day(s.last_day)})`);
ok(s.dated_rows === 4, `4 rows carry a date (got ${s.dated_rows})`);
ok(s.total_rows === 5, `5 rows in all — the undated one counts too (got ${s.total_rows})`);

console.log("\nTimes survive the round trip:");
const t = (await q(`select start_time, end_time from public.event_agenda
                    where event_id='${course}' and sort_order=0`))[0];
ok(String(t.start_time).startsWith("10:00"), `start (got ${t.start_time})`);
ok(String(t.end_time).startsWith("11:30"), `end (got ${t.end_time})`);

console.log("\nA row need not have any of them:");
const bare = (await q(`select on_date, start_time, end_time from public.event_agenda
                       where event_id='${course}' and when_label='Doors open'`))[0];
ok(bare.on_date === null, "no date");
ok(bare.start_time === null, "no start time");

console.log("\nAnd an event with no agenda is not an error:");
const empty = (await q(`insert into public.events
  (tenant_id, slug, title, category, date, date_label, city, venue, capacity,
   spots_left, price_type, price_amount, status, host_id)
  values ('${TENANT}','bare','Bare','Meetup','2026-12-01','d','Chennai','V',
          10, 10, 'Free', 0, 'published', '${HOST}') returning id`))[0].id;
const none = await span(empty);
ok(none.total_rows === 0, "zero rows");
ok(none.first_day === null, "and a null span rather than no row at all");

console.log(`\n${state.pass} passed, ${state.fail} failed`);
process.exit(state.fail ? 1 : 0);
