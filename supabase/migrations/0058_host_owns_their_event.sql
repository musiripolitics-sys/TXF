-- ============================================================
-- 0058 -- A host owns their event, including its agenda and speakers.
--
-- The access a host has is already almost complete and uneven in a way
-- nobody chose. For an event where host_id = auth.uid() they may:
--
--   events           select, update, delete        every column
--   ticket_types     all                           their own event's
--   event_questions  all                           their own event's
--   event_agenda     nothing                       ADMIN ONLY
--   event_speakers   nothing                       ADMIN ONLY
--
-- So a host can change the price of a pass and the date of the event, but
-- not the running order of the day — which is the part they are most likely
-- to be the only person who knows. That is an omission rather than a policy:
-- the three tables that do work were each given a host clause when they were
-- added, and these two were not.
--
-- The clause is the same one ticket_types already uses, so there is one shape
-- of "this host owns this event" in the schema rather than two.
--
-- Idempotent. Safe to run twice.
-- ============================================================

drop policy if exists "host manages own event_agenda" on public.event_agenda;
create policy "host manages own event_agenda" on public.event_agenda
  for all
  using (exists (select 1 from public.events e
                  where e.id = event_agenda.event_id
                    and e.host_id = auth.uid()
                    and e.tenant_id = event_agenda.tenant_id))
  with check (exists (select 1 from public.events e
                       where e.id = event_agenda.event_id
                         and e.host_id = auth.uid()
                         and e.tenant_id = event_agenda.tenant_id));

comment on policy "host manages own event_agenda" on public.event_agenda is
  $c$The run of show belongs to whoever is running it. Scoped by tenant as well as by host, so the clause cannot match an event of the same id in another business -- which is what the restrictive isolation policy is there to prevent, and this does not rely on it.$c$;

drop policy if exists "host manages own event_speakers" on public.event_speakers;
create policy "host manages own event_speakers" on public.event_speakers
  for all
  using (exists (select 1 from public.events e
                  where e.id = event_speakers.event_id
                    and e.host_id = auth.uid()
                    and e.tenant_id = event_speakers.tenant_id))
  with check (exists (select 1 from public.events e
                       where e.id = event_speakers.event_id
                         and e.host_id = auth.uid()
                         and e.tenant_id = event_speakers.tenant_id));

comment on policy "host manages own event_speakers" on public.event_speakers is
  $c$Who is speaking at an event is the host's to say. Same shape as the agenda policy above.$c$;

-- The speakers themselves are a shared catalogue, not per-event: linking one
-- needs a row to link to. A host may add a speaker and read the catalogue,
-- but not edit or delete somebody else's entry -- renaming a speaker would
-- rename them on every event they appear on.
drop policy if exists "host reads speakers" on public.speakers;
create policy "host reads speakers" on public.speakers
  for select using (true);

drop policy if exists "host adds speakers" on public.speakers;
create policy "host adds speakers" on public.speakers
  for insert with check (public.is_host());

comment on policy "host adds speakers" on public.speakers is
  $c$A host may add to the speaker catalogue but not edit or remove an existing entry: speakers are shared across events, so a rename would reach every event that names them.$c$;
