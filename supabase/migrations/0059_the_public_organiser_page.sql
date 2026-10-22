-- ============================================================
-- 0059 -- The public organiser page gets something to show.
--
-- get_organizer returns six fields: id, name, city, bio, linkedin, and two
-- counts. The page built on it is correspondingly thin -- a name, a line, and
-- a grid of upcoming events -- which is a problem for the one question it
-- exists to answer. Somebody who lands on it is deciding whether to spend an
-- evening with this organiser, and nothing on the page is evidence either
-- way. An organiser with eleven events behind them reads exactly like one
-- who published their first yesterday.
--
-- The evidence is already in the database; it is just behind RLS. Registrations
-- are readable only by the attendee, the host and an admin, so a public page
-- cannot count turnout for itself, and users is readable only by its owner, so
-- it cannot reach the avatar either. That is what this function is for: it is
-- security definer precisely so the public page can be given a chosen set of
-- facts without being given the tables.
--
-- So the same function now also returns:
--
--   avatar          users.avatar_url, which nothing has ever read
--   hosting_since   the date of their first published event
--   upcoming/past   the split of events_count, so the page can label both
--   attendees       turnout across their past events
--   cities          where they run them, commonest first
--   categories      what kind of thing they run, commonest first
--
-- Every existing key keeps its name and meaning, so the page can adopt them
-- one at a time. Tenant scoping is unchanged and still comes from
-- bos_request_tenant(): the events, the follows and now the registrations and
-- the derived lists are all pinned to the requesting business, so an organiser
-- who runs events for two tenants does not have one tenant's turnout counted
-- on the other's page.
--
-- Idempotent. Safe to run twice.
-- ============================================================

create or replace function public.get_organizer(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  -- Their published events in this tenant, once. Every count below is a
  -- question about this set, and asking it seven times against events would
  -- repeat the tenant and status clauses seven times with it.
  with ev as (
    select e.id, e.date, e.city, e.category
    from public.events e
    where e.host_id = p_id
      and e.status = 'published'
      and e.tenant_id = public.bos_request_tenant()
  )
  select case when u.id is null then null else jsonb_build_object(
    'id',            u.id,
    'name',          u.full_name,
    'city',          u.city,
    'bio',           u.bio,
    'linkedin',      u.linkedin_url,
    'avatar',        u.avatar_url,
    'events_count',  (select count(*) from ev),
    'upcoming_count',(select count(*) from ev where ev.date >= current_date),
    'past_count',    (select count(*) from ev where ev.date <  current_date),

    -- Turnout, not registrations in general: an upcoming event's signups say
    -- nothing about whether this organiser fills a room, and counting them
    -- would make a page look more proven the day before an event than the day
    -- after. 'registered' is included alongside 'attended' because check-in is
    -- optional and most past events never had anyone scanning tickets, so
    -- counting only 'attended' would read as zero for almost everybody.
    'attendees',     (select count(*) from public.registrations r
                      join ev on ev.id = r.event_id
                      where r.status in ('registered','attended')
                        and ev.date < current_date
                        and r.tenant_id = public.bos_request_tenant()),

    -- Their first event rather than the day they made an account: it is the
    -- claim the page makes ("hosting since March 2024") and an account that
    -- sat unused for a year would overstate it.
    'hosting_since', (select min(ev.date) from ev),

    'cities',        coalesce((
                       select jsonb_agg(c.city order by c.n desc, c.city)
                       from (select ev.city, count(*) as n from ev
                             where ev.city is not null and ev.city <> ''
                             group by ev.city) c
                     ), '[]'::jsonb),
    'categories',    coalesce((
                       select jsonb_agg(k.category order by k.n desc, k.category)
                       from (select ev.category::text as category, count(*) as n
                             from ev group by ev.category) k
                     ), '[]'::jsonb),

    'followers',     (select count(*) from public.organizer_follows f
                      where f.organizer_id = u.id
                        and f.tenant_id = public.bos_request_tenant())
  ) end
  from public.users u
  join public.tenant_members tm
    on tm.user_id = u.id
   and tm.tenant_id = public.bos_request_tenant()
   and tm.status = 'active'
  where u.id = p_id
    and tm.role::text in ('event_host', 'admin')
    -- Only someone actually running public events gets a public page.
    and exists (select 1 from ev);
$fn$;

comment on function public.get_organizer(uuid) is
  $c$The public organiser page, as a chosen set of facts rather than a table. Security definer so the page can count turnout and read an avatar without registrations or users being readable; every field is one the organiser has already published or a count derived from it, and all of them are scoped to the requesting tenant.$c$;

grant execute on function public.get_organizer(uuid) to anon, authenticated;
