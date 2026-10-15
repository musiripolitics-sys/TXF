/**
 * A host can edit their own event completely, and nobody else's at all.
 *
 * The access a host had was almost complete and uneven in a way nobody chose:
 * they could change the price of a pass and the date of the event but not the
 * running order of the day, because event_agenda and event_speakers were the
 * two tables that never got a host clause when they were added.
 *
 * The second half matters more than the first. "A host can edit their event"
 * is only useful alongside "and not anyone else's", and a policy that reads
 * host_id without also pinning the tenant is the shape that has already
 * produced two cross-tenant holes in this schema.
 */
import { freshDb, counter } from "./_db.mjs";

const { state, ok } = counter();
const { db, skipped } = await freshDb();
ok(skipped.length === 0, `every migration applied cleanly (${skipped.length} failures)`);

const q = async (s) => (await db.query(s)).rows;
const TENANT = (await q(`select id from public.tenants limit 1`))[0].id;
const HOST = "aaaa1111-0000-0000-0000-00000000aaaa";
const OTHER = "bbbb2222-0000-0000-0000-00000000bbbb";

await db.exec(`insert into auth.users(id,email) values
  ('${HOST}','host@t.test'), ('${OTHER}','other@t.test');`);
for (const u of [HOST, OTHER]) {
  await db.query(`update public.tenant_members set role='event_host', status='active'
                   where user_id='${u}' and tenant_id='${TENANT}'`);
}

const mkEvent = async (slug, host) =>
  (await q(`insert into public.events
    (tenant_id, slug, title, category, date, date_label, city, venue, capacity, spots_left,
     price_type, price_amount, status, host_id)
    values ('${TENANT}','${slug}','${slug}','Meetup','2030-01-01','1 Jan 2030','Chennai','V',
            50, 50, 'Free', 0, 'published', '${host}') returning id`))[0].id;

const mine = await mkEvent("mine", HOST);
const theirs = await mkEvent("theirs", OTHER);
for (const ev of [mine, theirs]) {
  await db.exec(`insert into public.event_agenda (tenant_id, event_id, when_label, what, sort_order)
                 values ('${TENANT}','${ev}','Kickoff','Welcome',0);`);
}

const asHost = () => db.exec(`set role authenticated; set request.jwt.claim.sub='${HOST}';`);
const asOwner = () => db.exec(`reset role; set request.jwt.claim.sub='';`);
const tryIt = async (sql) => {
  try { const r = await db.query(sql); return { ok: true, n: r.affectedRows ?? r.rows.length }; }
  catch (e) { return { ok: false, err: e.message.split("\n")[0] }; }
};

console.log("\nThe host can run their own event:");
await asHost();
for (const [what, sql] of [
  ["change the title", `update public.events set title='Renamed' where id='${mine}'`],
  ["change the date and venue", `update public.events set date='2030-02-02', venue='Hall B' where id='${mine}'`],
  ["add a ticket tier", `insert into public.ticket_types (tenant_id,event_id,name,price_amount,capacity) values ('${TENANT}','${mine}','Early bird',10000,20)`],
  ["add an agenda row", `insert into public.event_agenda (tenant_id,event_id,when_label,what,sort_order) values ('${TENANT}','${mine}','Break','Tea',1)`],
  ["edit an agenda row", `update public.event_agenda set what='Coffee' where event_id='${mine}' and when_label='Kickoff'`],
  ["delete an agenda row", `delete from public.event_agenda where event_id='${mine}' and when_label='Break'`],
  ["add a registration question", `insert into public.event_questions (event_id,label,type,required,sort_order) values ('${mine}','Dietary needs?','text',false,0)`],
]) {
  const r = await tryIt(sql);
  ok(r.ok, `${what}${r.ok ? "" : " — " + r.err}`);
}

console.log("\nAnd cannot touch somebody else's, which is the half that matters:");
for (const [what, sql, expect] of [
  ["rename their event", `update public.events set title='Hijacked' where id='${theirs}'`, 0],
  ["add to their agenda", `insert into public.event_agenda (tenant_id,event_id,when_label,what,sort_order) values ('${TENANT}','${theirs}','X','Y',9)`, "throws"],
  ["edit their agenda", `update public.event_agenda set what='Hijacked' where event_id='${theirs}'`, 0],
  ["delete their agenda", `delete from public.event_agenda where event_id='${theirs}'`, 0],
  ["add a tier to their event", `insert into public.ticket_types (tenant_id,event_id,name,price_amount,capacity) values ('${TENANT}','${theirs}','Sneaky',0,1)`, "throws"],
]) {
  const r = await tryIt(sql);
  if (expect === "throws") ok(!r.ok, `${what} is refused${r.ok ? " — IT WAS ALLOWED" : ""}`);
  else ok(r.ok && r.n === 0, `${what} matches no rows (${r.ok ? r.n : r.err})`);
}

await asOwner();
const stolen = (await q(`select title from public.events where id='${theirs}'`))[0].title;
ok(stolen === "theirs", `their event still has its own title (${stolen})`);
const theirAgenda = (await q(`select count(*) c from public.event_agenda where event_id='${theirs}'`))[0].c;
ok(Number(theirAgenda) === 1, `and its agenda row survived (${theirAgenda})`);

console.log(`\n${state.pass} passed, ${state.fail} failed`);
process.exit(state.fail ? 1 : 0);
