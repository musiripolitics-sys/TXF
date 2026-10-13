/**
 * A seat given back was a seat taken.
 *
 * Two counters say how full an event is, and the site reads them in different
 * places. events.spots_left is the public page — "N of 100 left", and
 * capacity - spots_left as "going". ticket_types.sold is the gate on the
 * order itself, because create_pending_order compares it to the tier capacity.
 *
 * Both were maintained by hand, in some paths and not others, and the two
 * omissions pointed opposite ways: a free RSVP took a seat without
 * decrementing anything, and a cancellation returned one to spots_left
 * regardless — so register-then-cancel left the event emptier than it started
 * and the page counted upwards past capacity. A paid cancellation never
 * returned its seat to the tier at all, so sold ratcheted and a tier could
 * refuse orders for an event with nobody in it.
 *
 * Every assertion below fails against 0055.
 */
import { freshDb, counter } from "./_db.mjs";

const { state, ok } = counter();
const { db, skipped } = await freshDb();
ok(skipped.length === 0, `every migration applied cleanly (${skipped.length} failures)`);

const q = async (s) => (await db.query(s)).rows;
const one = async (s) => (await q(s))[0];

const TENANT = (await one(`select id from public.tenants limit 1`)).id;
const HOST = "dddddddd-0000-0000-0000-00000000000f";
await db.exec(`insert into auth.users(id,email) values ('${HOST}','host@t.test');`);

/** A free event and a paid one, each with a tier, each with 100 seats. */
const mk = async (slug, price) => {
  const e = await one(`insert into public.events
    (tenant_id, slug, title, category, date, date_label, city, venue, capacity, spots_left,
     price_type, price_amount, status, host_id)
    values ('${TENANT}','${slug}','${slug}','Meetup','2030-01-01','1 Jan 2030','Chennai','V',
            100, 100, '${price ? "Paid" : "Free"}', ${price}, 'published', '${HOST}')
    returning id`);
  const t = await one(`insert into public.ticket_types
    (event_id, name, price_amount, capacity, sold) values ('${e.id}','GA',${price},100,0) returning id`);
  return { event: e.id, tier: t.id };
};
const state_ = async (x) => ({
  spots: Number((await one(`select spots_left from public.events where id='${x.event}'`)).spots_left),
  sold: Number((await one(`select sold from public.ticket_types where id='${x.tier}'`)).sold),
  regs: Number((await one(`select count(*) c from public.registrations where event_id='${x.event}'`)).c),
});

const free = await mk("free-seat-test", 0);
const paid = await mk("paid-seat-test", 49900);

// ── A free RSVP, the way register_for_event makes one: no order_id ──────────
console.log("\nA free RSVP takes a seat:");
const rsvp = async (ev, email) => (await one(`insert into public.registrations
  (tenant_id, event_id, attendee_name, attendee_email, status, ticket_type_id)
  values ('${TENANT}','${ev.event}','A','${email}','registered','${ev.tier}') returning id`)).id;

const before = await state_(free);
const regId = await rsvp(free, "a@t.test");
const taken = await state_(free);
ok(taken.spots === before.spots - 1, `spots_left falls when somebody registers (${before.spots} → ${taken.spots})`);
ok(taken.sold === before.sold + 1, `and the tier counts the seat (${before.sold} → ${taken.sold})`);

console.log("\nAnd cancelling gives back exactly that one seat, not more:");
await db.exec(`set role authenticated; set request.jwt.claim.sub='${HOST}';`);
await db.query(`select public.cancel_registration('${regId}')`);
await db.exec(`reset role; set request.jwt.claim.sub='';`);
const back = await state_(free);
ok(back.spots === before.spots,
   `spots_left is back where it started, not above it (${before.spots} → ${taken.spots} → ${back.spots})`);
ok(back.sold === before.sold, `and so is the tier (${back.sold})`);
ok(back.regs === 0, "with no registration left behind");

// The original symptom, stated as the user saw it.
console.log("\nTen rounds of the same, because the old bug compounded:");
for (let i = 0; i < 10; i++) {
  const id = await rsvp(free, `loop${i}@t.test`);
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${HOST}';`);
  await db.query(`select public.cancel_registration('${id}')`);
  await db.exec(`reset role; set request.jwt.claim.sub='';`);
}
const after10 = await state_(free);
ok(after10.spots === 100, `still 100 of 100 left, not 110 (${after10.spots})`);
ok(after10.sold === 0, `and the tier is still empty (${after10.sold})`);
ok(100 - after10.spots === 0, `the page would say "0 going", not "-10 going" (${100 - after10.spots})`);

// ── The paid path: the seat is held at order time, not at registration ──────
console.log("\nA paid seat is held once, by the order, and not double-counted:");
const BUYER = "eeeeeeee-0000-0000-0000-00000000000f";
await db.exec(`insert into auth.users(id,email) values ('${BUYER}','buyer@t.test');`);
const pending = await one(`select public.create_pending_order(
  '${paid.event}'::uuid, '${paid.tier}'::uuid, 1, 'B', 'b@t.test', null, null, '${BUYER}'::uuid) r`);
const orderId = pending.r.order_id;
const held = await state_(paid);
ok(held.spots === 99 && held.sold === 1, `the pending order holds the seat (spots ${held.spots}, sold ${held.sold})`);

// fulfil_order refuses a paid order without a paid payment of at least the
// total — the check 0043 added. So this test pays, the way the webhook does.
const pay = await one(`insert into public.payments
  (tenant_id, user_id, stream, amount, currency, status, provider, provider_ref, related_type, related_id)
  values ('${TENANT}','${BUYER}','ticket_sales',49900,'INR','paid','razorpay','pay_seattest','events','${paid.event}')
  returning id`);
await db.query(`select public.fulfil_order('${orderId}'::uuid, '${pay.id}'::uuid)`);
const sold = await state_(paid);
ok(sold.spots === 99 && sold.sold === 1,
   `fulfilling it does not take the seat a second time (spots ${sold.spots}, sold ${sold.sold})`);
ok(sold.regs === 1, "and the ticket exists");

console.log("\nAnd cancelling a paid ticket returns the seat to the tier, which it never did:");
const paidReg = (await one(`select id from public.registrations where event_id='${paid.event}' limit 1`)).id;
// Cancelled by the host, which is the path a refund takes; who cancels it
// makes no difference to the counters, which is what this is measuring.
await db.exec(`set role authenticated; set request.jwt.claim.sub='${HOST}';`);
await db.query(`select public.cancel_registration('${paidReg}')`);
await db.exec(`reset role; set request.jwt.claim.sub='';`);
const freed = await state_(paid);
ok(freed.sold === 0, `tier.sold is back to 0 — before 0056 it stayed at 1 for ever (${freed.sold})`);
ok(freed.spots === 100, `and the event has its seat back (${freed.spots})`);

console.log(`\n${state.pass} passed, ${state.fail} failed`);
process.exit(state.fail ? 1 : 0);
