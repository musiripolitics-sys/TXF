-- ============================================================
-- 0057 -- The site's own content, in the database.
--
-- lib/content.ts used to read each of these tables and, when one came back
-- empty, serve a hardcoded array from lib/data.ts instead. Every one of them
-- WAS empty, so the live site showed ten named leaders, six activity cards,
-- eight perks and three priced membership tiers that nobody had entered and
-- that no amount of editing the database could change.
--
-- The fallbacks are gone. That makes these rows load-bearing: without them
-- /membership has no plans, the homepage has no activity cards, and the
-- leadership strip is empty. A database rebuilt from this repository needs
-- them, which is why they are a migration rather than something typed into
-- the live project once and forgotten.
--
-- Generated from the live rows rather than retyped, so the values here are
-- the ones the site is serving.
--
-- NOT seeded: partners. That table is empty in production too, and the
-- marquee renders nothing, which is the honest result — inventing a partner
-- is the one thing a seed must not do.
--
-- Every statement guards on a natural key, so this is safe to run twice and
-- safe to run against a database that already has some of it. It will not
-- overwrite an edit: once a row exists, the matching insert is skipped.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Two columns production has and this repository does not
--
-- Found by this migration failing to apply against a database built from the
-- repo while applying fine against production. Both are real drift, and both
-- matter: lib/content.ts orders perks by plan_benefits.sort_order, so a
-- project rebuilt from this repository would 400 on /membership and show no
-- plans at all. (The other was leader_role, which lost 'Manager' somewhere
-- between 0001_init.sql and schema.sql; that is fixed in schema.sql itself,
-- since it is a type definition rather than a column.)
-- ------------------------------------------------------------
alter table public.plan_benefits add column if not exists sort_order int not null default 0;

-- ----------------------------------------------------------
-- 10 leaders
-- ----------------------------------------------------------
insert into public.leader_profiles
  (display_name, role, city, focus, bio, events_count, points, linkedin_url, is_hiring, image_url, sort_order)
select 'Kumaresan', 'Founder', 'Chennai', 'Vision & Strategy', 'Leading Techxfluence to build India''s strongest community for creators and innovators.', 64, 9820, null, false, '/team/kumaresan.png', 0
 where not exists (select 1 from public.leader_profiles where display_name = 'Kumaresan');

insert into public.leader_profiles
  (display_name, role, city, focus, bio, events_count, points, linkedin_url, is_hiring, image_url, sort_order)
select 'Priyanka', 'Manager', 'Chennai', 'Operations & Programs', 'Keeping Techxfluence running — coordinating events, partnerships and the team behind every gathering.', 28, 5200, null, false, '/team/priyanka.jpg', 1
 where not exists (select 1 from public.leader_profiles where display_name = 'Priyanka');

insert into public.leader_profiles
  (display_name, role, city, focus, bio, events_count, points, linkedin_url, is_hiring, image_url, sort_order)
select 'Mahalakshmi', 'Community Lead', 'Chennai', 'Member Experience', 'Fostering collaboration and growing the Techxfluence volunteer network.', 41, 7430, null, false, '/team/mahalakshmi.png', 2
 where not exists (select 1 from public.leader_profiles where display_name = 'Mahalakshmi');

insert into public.leader_profiles
  (display_name, role, city, focus, bio, events_count, points, linkedin_url, is_hiring, image_url, sort_order)
select 'Abishek', 'Community Lead', 'Bengaluru', 'Ambassador Relations', 'Connecting campus leads and driving technology events across chapters.', 35, 6610, null, false, '/team/abishek.png', 3
 where not exists (select 1 from public.leader_profiles where display_name = 'Abishek');

insert into public.leader_profiles
  (display_name, role, city, focus, bio, events_count, points, linkedin_url, is_hiring, image_url, sort_order)
select 'Open Coordinator (Chennai)', 'Event Coordinator', 'Chennai', 'Event Ops', 'Join as Event Coordinator to organize hackathons, meetups and tech events.', 0, 0, null, true, null, 4
 where not exists (select 1 from public.leader_profiles where display_name = 'Open Coordinator (Chennai)');

insert into public.leader_profiles
  (display_name, role, city, focus, bio, events_count, points, linkedin_url, is_hiring, image_url, sort_order)
select 'Open Ambassador (Chennai)', 'Ambassador', 'Chennai', 'Community Growth', 'Join as Community Ambassador to lead your local chapter.', 0, 0, null, true, null, 5
 where not exists (select 1 from public.leader_profiles where display_name = 'Open Ambassador (Chennai)');

insert into public.leader_profiles
  (display_name, role, city, focus, bio, events_count, points, linkedin_url, is_hiring, image_url, sort_order)
select 'Open Mentor (Chennai)', 'Mentor', 'Chennai', 'Technical Guidance', 'Join as Tech Mentor to support builders in system design and product.', 0, 0, null, true, null, 6
 where not exists (select 1 from public.leader_profiles where display_name = 'Open Mentor (Chennai)');

insert into public.leader_profiles
  (display_name, role, city, focus, bio, events_count, points, linkedin_url, is_hiring, image_url, sort_order)
select 'Open Coordinator (Bengaluru)', 'Event Coordinator', 'Bengaluru', 'Event Ops', 'Join as Event Coordinator to organize hackathons, meetups and tech events.', 0, 0, null, true, null, 7
 where not exists (select 1 from public.leader_profiles where display_name = 'Open Coordinator (Bengaluru)');

insert into public.leader_profiles
  (display_name, role, city, focus, bio, events_count, points, linkedin_url, is_hiring, image_url, sort_order)
select 'Open Ambassador (Bengaluru)', 'Ambassador', 'Bengaluru', 'Community Growth', 'Join as Community Ambassador to lead your local chapter.', 0, 0, null, true, null, 8
 where not exists (select 1 from public.leader_profiles where display_name = 'Open Ambassador (Bengaluru)');

insert into public.leader_profiles
  (display_name, role, city, focus, bio, events_count, points, linkedin_url, is_hiring, image_url, sort_order)
select 'Open Mentor (Bengaluru)', 'Mentor', 'Bengaluru', 'Technical Guidance', 'Join as Tech Mentor to support builders in system design and product.', 0, 0, null, true, null, 9
 where not exists (select 1 from public.leader_profiles where display_name = 'Open Mentor (Bengaluru)');

-- ----------------------------------------------------------
-- 6 activity cards
-- ----------------------------------------------------------
insert into public.activities (title, description, accent, sort_order)
select 'Monthly Meetups', 'Recurring city meetups, wherever our community gathers.', 'brand', 0
 where not exists (select 1 from public.activities where title = 'Monthly Meetups');

insert into public.activities (title, description, accent, sort_order)
select 'Hackathons', 'Weekend build sprints with real prizes.', 'join', 1
 where not exists (select 1 from public.activities where title = 'Hackathons');

insert into public.activities (title, description, accent, sort_order)
select 'Workshops', 'Hands-on, expert-led skill sessions.', 'host', 2
 where not exists (select 1 from public.activities where title = 'Workshops');

insert into public.activities (title, description, accent, sort_order)
select 'Startup Showcases', 'A stage for early teams to launch.', 'brand', 3
 where not exists (select 1 from public.activities where title = 'Startup Showcases');

insert into public.activities (title, description, accent, sort_order)
select 'Mentorship', '1:1 guidance from senior operators.', 'join', 4
 where not exists (select 1 from public.activities where title = 'Mentorship');

insert into public.activities (title, description, accent, sort_order)
select 'Innovation Challenges', 'Monthly contests & open-source bounties.', 'host', 5
 where not exists (select 1 from public.activities where title = 'Innovation Challenges');

-- ----------------------------------------------------------
-- 8 membership benefits
-- ----------------------------------------------------------
insert into public.benefits (title, description, icon, tag, sort_order)
select 'Free / Discounted Access', 'Walk into select events on us, or grab member-only pricing on everything else — from meetups to flagship summits.', 'ticket', 'Save money', 0
 where not exists (select 1 from public.benefits where title = 'Free / Discounted Access');

insert into public.benefits (title, description, icon, tag, sort_order)
select 'Priority Registration', 'Skip the queue for limited-seat workshops and hackathons. Members register first, every time.', 'clock', 'Skip the line', 1
 where not exists (select 1 from public.benefits where title = 'Priority Registration');

insert into public.benefits (title, description, icon, tag, sort_order)
select 'Exclusive Events', 'Member-only sessions, founder dinners and late-night hack nights you won''t find anywhere else.', 'sparkle', 'Insider access', 2
 where not exists (select 1 from public.benefits where title = 'Exclusive Events');

insert into public.benefits (title, description, icon, tag, sort_order)
select 'Networking', 'Curated introductions to founders, engineers, designers and investors who can move your work forward.', 'nodes', 'Connections', 3
 where not exists (select 1 from public.benefits where title = 'Networking');

insert into public.benefits (title, description, icon, tag, sort_order)
select 'Learning Resources', 'Templates, session recordings and playbooks from every event — yours to keep and reuse.', 'book', 'Level up', 4
 where not exists (select 1 from public.benefits where title = 'Learning Resources');

insert into public.benefits (title, description, icon, tag, sort_order)
select 'Partner Discounts', 'Deals on developer tools, cloud credits and courses from our partner ecosystem.', 'tag', 'Perks', 5
 where not exists (select 1 from public.benefits where title = 'Partner Discounts');

insert into public.benefits (title, description, icon, tag, sort_order)
select 'Leadership Opportunities', 'Host tracks, mentor peers and represent Techxfluence as a community ambassador.', 'trophy', 'Grow', 6
 where not exists (select 1 from public.benefits where title = 'Leadership Opportunities');

insert into public.benefits (title, description, icon, tag, sort_order)
select 'Badges & Recognition', 'Earn points, badges and certificates for everything you contribute to the community.', 'medal', 'Status', 7
 where not exists (select 1 from public.benefits where title = 'Badges & Recognition');

-- ----------------------------------------------------------
-- 3 membership tiers and 14 perks
-- ----------------------------------------------------------
insert into public.membership_plans
  (tier, name, price_amount, cadence, tagline, is_highlight, cta_label, sort_order)
select 'Free', 'Free Member', 0, 'forever', 'Come to anything. Always.', false, 'Join Free', 0
 where not exists (select 1 from public.membership_plans where tier = 'Free');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'Attend any event — free tier never gates the door', 0 from public.membership_plans p
 where p.tier = 'Free'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'Attend any event — free tier never gates the door');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'Your ticket, QR check-in and attendance history', 1 from public.membership_plans p
 where p.tier = 'Free'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'Your ticket, QR check-in and attendance history');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'The private group for every event you attend', 2 from public.membership_plans p
 where p.tier = 'Free'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'The private group for every event you attend');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'Community feed and monthly newsletter', 3 from public.membership_plans p
 where p.tier = 'Free'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'Community feed and monthly newsletter');

insert into public.membership_plans
  (tier, name, price_amount, cadence, tagline, is_highlight, cta_label, sort_order)
select 'Pro', 'Pro Member', 49900, 'per month', 'See the room before you walk into it.', true, 'Go Pro', 1
 where not exists (select 1 from public.membership_plans where tier = 'Pro');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'Everything in Free', 0 from public.membership_plans p
 where p.tier = 'Pro'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'Everything in Free');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'See who''s attending, on every event', 1 from public.membership_plans p
 where p.tier = 'Pro'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'See who''s attending, on every event');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'The full member directory', 2 from public.membership_plans p
 where p.tier = 'Pro'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'The full member directory');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'Priority registration on limited seats', 3 from public.membership_plans p
 where p.tier = 'Pro'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'Priority registration on limited seats');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'Member pricing on paid events', 4 from public.membership_plans p
 where p.tier = 'Pro'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'Member pricing on paid events');

insert into public.membership_plans
  (tier, name, price_amount, cadence, tagline, is_highlight, cta_label, sort_order)
select 'Elite', 'Elite Member', 149900, 'per month', 'Be someone in the community.', false, 'Become Elite', 2
 where not exists (select 1 from public.membership_plans where tier = 'Elite');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'Everything in Pro', 0 from public.membership_plans p
 where p.tier = 'Elite'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'Everything in Pro');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'Speaking slots and session hosting', 1 from public.membership_plans p
 where p.tier = 'Elite'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'Speaking slots and session hosting');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, '1:1 mentorship matching', 2 from public.membership_plans p
 where p.tier = 'Elite'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = '1:1 mentorship matching');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'Chapter leadership opportunities', 3 from public.membership_plans p
 where p.tier = 'Elite'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'Chapter leadership opportunities');

insert into public.plan_benefits (plan_id, perk_text, sort_order)
select p.id, 'Featured profile in the directory', 4 from public.membership_plans p
 where p.tier = 'Elite'
   and not exists (select 1 from public.plan_benefits b
                    where b.plan_id = p.id and b.perk_text = 'Featured profile in the directory');