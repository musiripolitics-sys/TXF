-- ============================================================
-- 0056 -- Seats are taken and given back by the same arithmetic.
--
-- Two counters describe how full an event is. events.spots_left drives the
-- public page: EventFacts renders "N of 100 left" and the hero renders
-- capacity - spots_left as "going". ticket_types.sold drives whether an order
-- can be placed at all, because create_pending_order compares it to the
-- tier's capacity.
--
-- Neither was symmetric, and in opposite directions.
--
--   register_for_event    takes a seat, decrements NEITHER
--   register_free_order   takes a seat, decrements NEITHER
--   create_pending_order  decrements spots_left and increments sold  ✓
--   cancel_registration   increments spots_left, decrements NEITHER sold
--
-- So a free RSVP followed by a cancellation leaves spots_left one HIGHER than
-- before anybody did anything: the seat was never taken and was given back
-- anyway. Do it twice and the page reads "102 of 100 left"; do it enough and
-- "going" goes negative. That is the +1 this fixes.
--
-- The paid side leaks the other way and matters more. A cancelled ticket
-- never gives its seat back to the tier, so sold only ever rises, and a tier
-- eventually refuses new orders for an event with nobody in it. This database
-- is already there: 0 registration rows against sold = 2 and spots_left = 96.
--
-- Part 3 reconciles both from the registrations table, which is the only
-- record that cannot drift because it is the thing being counted.
--
-- Idempotent. Safe to run twice.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Giving a seat back also gives it back to the tier
--
-- Only the sold line is new. Everything else is 0043's cancel_registration
-- unchanged, repeated here because create or replace needs the whole body.
-- greatest(...,0) because a tier that has already been reconciled to 0 must
-- not be driven negative by a cancellation that arrives afterwards.
-- ------------------------------------------------------------
create or replace function public.cancel_registration(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_reg    public.registrations;
  v_uid    uuid := auth.uid();
  v_event  public.events;
  v_next   public.registrations;
  v_did_promote boolean := false;
  v_svc    boolean := auth.role() = 'service_role';
  v_tenant uuid := public.bos_request_tenant();
begin
  select * into v_reg from public.registrations
   where id = p_registration_id
     and (v_svc or tenant_id = v_tenant)
   for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_reg.user_id is distinct from v_uid and not public.is_admin()
     and not exists (select 1 from public.events e
                      where e.id = v_reg.event_id and e.host_id = v_uid
                        and e.tenant_id = v_reg.tenant_id) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_event from public.events
   where id = v_reg.event_id and tenant_id = v_reg.tenant_id for update;

  -- The seat returns to the tier whichever way the rest of this goes: whether
  -- it is handed to a waitlister or returned to the pool, the person who paid
  -- for it no longer holds it.
  if v_reg.status in ('registered', 'attended') and v_reg.ticket_type_id is not null then
    update public.ticket_types
       set sold = greatest(sold - 1, 0)
     where id = v_reg.ticket_type_id;
  end if;

  if v_reg.status = 'registered' then
    select * into v_next from public.registrations
      where event_id = v_reg.event_id and status = 'waitlisted'
        and tenant_id = v_reg.tenant_id
      order by registered_at asc limit 1 for update;

    if found and v_event.price_amount = 0 then
      -- Free event: seat transfers to the waitlister automatically, so it is
      -- still taken and spots_left must not move.
      update public.registrations set status = 'registered' where id = v_next.id;
      v_did_promote := true;
    else
      update public.events set spots_left = spots_left + 1
       where id = v_reg.event_id and tenant_id = v_reg.tenant_id;
      if found and v_event.price_amount > 0 then
        if v_next.user_id is not null then
          perform public.notify(v_next.user_id, 'waitlist',
            'A spot just opened for ' || v_event.title,
            'You''re first in line — grab your ticket before it''s gone.',
            '/events/' || v_event.slug);
        end if;
        delete from public.registrations where id = v_reg.id;
        return jsonb_build_object('ok', true, 'promoted', null,
          'spot_opened', jsonb_build_object(
            'email', v_next.attendee_email, 'name', v_next.attendee_name,
            'event_title', v_event.title, 'slug', v_event.slug));
      end if;
    end if;
  end if;

  delete from public.registrations where id = v_reg.id;

  return jsonb_build_object('ok', true,
    'promoted', case when v_did_promote then jsonb_build_object(
      'email', v_next.attendee_email, 'name', v_next.attendee_name,
      'event_title', v_event.title, 'slug', v_event.slug) else null end,
    'spot_opened', null);
end;
$fn$;

comment on function public.cancel_registration(uuid) is
  $c$Cancel a registration, return the seat to the event and to its ticket tier, and promote a waitlister where the event is free. Before 0056 the tier never got its seat back, so sold rose for ever and a tier could refuse orders for an empty event.$c$;

-- ------------------------------------------------------------
-- 2. Taking a seat on the free path actually takes one
--
-- register_for_event and register_free_order create a registration without
-- touching either counter, while cancel_registration returns seats to both.
-- Rather than restate two long functions, a trigger closes the asymmetry at
-- the row that represents the seat.
--
-- It must NOT fire for the paid path, which has already decremented
-- spots_left and incremented sold at create_pending_order time to hold the
-- seats through checkout. A paid registration is distinguishable: it carries
-- an order_id. So the trigger covers exactly the rows nothing else counted.
-- ------------------------------------------------------------
create or replace function public.bos_take_seat()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- A paid registration's seat was taken by create_pending_order.
  if new.order_id is not null then return new; end if;
  if new.status <> 'registered' then return new; end if;

  update public.events
     set spots_left = greatest(spots_left - 1, 0)
   where id = new.event_id;

  if new.ticket_type_id is not null then
    update public.ticket_types set sold = sold + 1 where id = new.ticket_type_id;
  end if;
  return new;
end;
$fn$;

comment on function public.bos_take_seat() is
  $c$Takes the seat for a registration nothing else counted: a free RSVP, which reaches the database through register_for_event or register_free_order and used to leave both counters untouched while cancelling one returned a seat to each. Skips rows carrying an order_id, whose seats create_pending_order already holds.$c$;

drop trigger if exists trg_bos_take_seat on public.registrations;
create trigger trg_bos_take_seat
  after insert on public.registrations
  for each row execute function public.bos_take_seat();

-- ------------------------------------------------------------
-- 3. Reconcile what has already drifted
--
-- From registrations, which is the thing being counted and therefore the only
-- one of the three that cannot be wrong. Pending orders hold seats without a
-- registration row, so they are counted too — otherwise this would hand back
-- seats that somebody is in the middle of paying for.
-- ------------------------------------------------------------
update public.ticket_types t set sold = (
  select count(*) from public.registrations r
   where r.ticket_type_id = t.id and r.status in ('registered', 'attended')
) + (
  select coalesce(sum(o.quantity), 0) from public.orders o
   where o.ticket_type_id = t.id and o.status = 'pending'
);

update public.events e set spots_left = greatest(e.capacity - (
  (select count(*) from public.registrations r
    where r.event_id = e.id and r.status in ('registered', 'attended'))
  + (select coalesce(sum(o.quantity), 0) from public.orders o
      where o.event_id = e.id and o.status = 'pending')
), 0);
