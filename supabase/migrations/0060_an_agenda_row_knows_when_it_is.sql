-- ============================================================
-- 0060 -- An agenda row knows when it is.
--
-- event_agenda has when_label and what, and when_label is free text. For a
-- single evening that is fine: "18:30" next to "Doors open" is a label and
-- nothing needs to compute with it. For anything running over more than one
-- day it is the only record of the schedule, and it is unreadable to the
-- application:
--
--   when_label        what
--   Week 1 · Oct 24   AI Fundamentals & Creative Thinking — ...
--   Week 2 · Oct 31   AI for Design & Visual Creation — ...
--
-- Those are the real dates of a four-week course. Nothing can use them. The
-- event row says date = 18 Oct, which is three sentences away from what its
-- own agenda says, and no query can notice because one of the two is prose.
-- That disagreement is what archived the course the morning after a session
-- it had not run yet.
--
-- So an agenda row gets the three columns it was describing in words:
--
--   on_date     the day this item happens, when it has one of its own
--   start_time  when it starts
--   end_time    when it ends
--
-- All three are nullable and nothing backfills them. A row that is a time of
-- day within a single-day event ("18:30 · Doors open") has no date to give,
-- and a conference track row may have times but no date distinct from the
-- event's. when_label stays, and stays the thing the detail page renders:
-- hosts have written labels that say more than a date does ("Week 1 · Oct
-- 24"), and replacing that with a formatted date would lose the week number.
-- It is derived from these columns when they are set and typed when they are
-- not.
--
-- No policy changes. event_agenda already carries exactly the right ones --
-- 0058 gave a host full control of their own event's agenda, and these are
-- columns on that table, reached through the same policies.
--
-- Idempotent. Safe to run twice.
-- ============================================================

alter table public.event_agenda
  add column if not exists on_date    date,
  add column if not exists start_time time,
  add column if not exists end_time   time;

comment on column public.event_agenda.on_date is
  $c$The day this item happens, for an event that runs over more than one. Null for a row that is a time within the event's single day.$c$;

comment on column public.event_agenda.start_time is
  $c$When this item starts, in the event's timezone. Null for a row that is a heading rather than a slot.$c$;

comment on column public.event_agenda.end_time is
  $c$When this item ends, in the event's timezone.$c$;

-- The agenda is read in sort_order, and now also asked "what is the first and
-- last day of this event" -- which is a scan of one event's rows either way,
-- but the index makes the date question answerable without reading `what`,
-- which holds a paragraph per row.
create index if not exists event_agenda_event_date_idx
  on public.event_agenda (event_id, on_date);

-- ------------------------------------------------------------
-- The span an agenda actually covers.
--
-- Returned rather than written: the event's own date columns stay the ones
-- the form writes, and this is what the form compares them against. A
-- function means the comparison is the same one everywhere -- the editor
-- offering "use these dates", and anything later that wants to check whether
-- the two have drifted again.
-- ------------------------------------------------------------
create or replace function public.agenda_span(p_event_id uuid)
returns table (first_day date, last_day date, dated_rows int, total_rows int)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    min(a.on_date),
    max(a.on_date),
    count(a.on_date)::int,
    count(*)::int
  from public.event_agenda a
  join public.events e
    on e.id = a.event_id
   and e.tenant_id = a.tenant_id
  where a.event_id = p_event_id
    and e.tenant_id = public.bos_request_tenant();
$fn$;

comment on function public.agenda_span(uuid) is
  $c$The first and last dated day of an event's agenda, with how many rows carry a date at all. The caller decides what to do about a disagreement with the event's own date; this only reports it.$c$;

grant execute on function public.agenda_span(uuid) to anon, authenticated;
