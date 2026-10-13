-- ============================================================
-- 0055 -- Remove the Business OS schema.
--
-- 0054 removed the platform that drove the OS. This removes the OS itself:
-- 51 tables that nothing in this repository reads any more, and the functions,
-- triggers and policies attached to them.
--
-- ⚠️  THIS DESTROYS DATA. At the time of writing the live database holds 21
-- tasks, 12 workstreams, 45 leads and 15 app_modules rows, and none of it was
-- copied to the Shreex project -- that database was created empty. Export
-- anything worth keeping BEFORE running this. There is no undo.
--
-- How the drop list was derived, so it can be checked rather than trusted:
-- every table reachable by foreign key from a table the application reads is
-- kept, plus five the application reaches only through a function --
-- cities (public_stats), payouts (get_host_earnings, record_payout),
-- promo_codes (fulfil_order, validate_promo), rate_limits (bos_rate_limit)
-- and plan_benefits (read through a nested select, which a .from() grep does
-- not see and which nearly cost it its place here). Everything else had no
-- reader in src/ at all.
--
-- Idempotent. Safe to run twice.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Module access becomes staff access
--
-- bos_can_access(section) still gates four policies on tables this site very
-- much keeps -- events staff read/update/write and registrations staff read --
-- so it cannot simply go. What has to go is what it reads: a product gate in
-- tenant_products and a per-section grant in employee_module_access.
--
-- Both were administered from the platform console, and that console left in
-- 0054. The practical state today is therefore that NO employee can be
-- granted events access any more, and the four policies are dead for everyone
-- except admins, who pass on the is_admin() branch.
--
-- This widens them, deliberately and visibly: an active employee of this
-- business can staff its events. That is one business with one staff list,
-- which is what this site is now, and it restores a capability that the
-- platform's departure had quietly taken away. If per-section grants are
-- wanted again they need a screen to grant them from, which is a different
-- piece of work.
-- ------------------------------------------------------------
create or replace function public.bos_can_access(p_section text)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select public.is_admin() or public.bos_is_staff();
$fn$;

comment on function public.bos_can_access(text) is
  $c$Whether the caller may work on this section. Before 0055 this needed a product enabled on the business and an explicit per-section grant, both set from the platform console; with the console gone there was nothing left that could grant one, so the answer had become "only admins" for every section. It is now simply: an active admin or employee of this business. The section argument is kept so the policies that pass it do not have to change, and so a future grant model has somewhere to go.$c$;

-- ------------------------------------------------------------
-- 2. Functions that only exist to serve a table below
--
-- Dropped before their tables so a failed run leaves no function pointing at
-- a table that is already gone. Each raises a clean "does not exist" on a
-- second run rather than a surprise.
-- ------------------------------------------------------------
drop function if exists public.bos_can_see_task(uuid) cascade;
drop function if exists public.bos_can_see_goal(uuid) cascade;
drop function if exists public.bos_notify_task_decision() cascade;
drop function if exists public.bos_notify_task_review() cascade;
drop function if exists public.bos_open_task_review() cascade;
drop function if exists public.bos_guard_task_completion() cascade;
drop function if exists public.bos_stamp_task_completion() cascade;
drop function if exists public.bos_sync_task_approval() cascade;
drop function if exists public.decide_approval(uuid, text, text) cascade;
drop function if exists public.bos_complaint_clock() cascade;
drop function if exists public.bos_track_changes() cascade;
drop function if exists public.bos_product_enabled(text) cascade;
drop function if exists public.bos_touch_products() cascade;
drop function if exists public.record_sponsorship(integer, text) cascade;

-- ------------------------------------------------------------
-- 3. The tables
--
-- cascade, because each carries policies, triggers, indexes and foreign keys
-- from its neighbours in this same list, and the order within one OS module
-- (sops -> sop_versions -> sop_steps -> sop_runs -> sop_run_items) is not
-- worth hand-sorting when every one of them is going.
-- ------------------------------------------------------------

-- Work: goals, workstreams, tasks, reviews, approvals.
drop table if exists public.task_reviews       cascade;
drop table if exists public.task_comments      cascade;
drop table if exists public.tasks              cascade;
drop table if exists public.workstreams        cascade;
drop table if exists public.goals              cascade;
drop table if exists public.approvals          cascade;
drop table if exists public.reviews            cascade;
drop table if exists public.dependencies       cascade;
drop table if exists public.risks              cascade;

-- SOPs.
drop table if exists public.sop_run_items      cascade;
drop table if exists public.sop_runs           cascade;
drop table if exists public.sop_steps          cascade;
drop table if exists public.sop_versions       cascade;
drop table if exists public.sop_acknowledgements cascade;
drop table if exists public.sop_documents      cascade;
drop table if exists public.sops               cascade;

-- Money and planning.
drop table if exists public.revenue_entries    cascade;
drop table if exists public.expenses           cascade;
drop table if exists public.budgets            cascade;
drop table if exists public.cashflow_months    cascade;
drop table if exists public.kpi_values         cascade;
drop table if exists public.kpis               cascade;
drop table if exists public.hiring_plan        cascade;

-- People, as the OS modelled them. public.users and tenant_members stay:
-- they are how this site knows who is signed in.
drop table if exists public.employee_kpis      cascade;
drop table if exists public.employee_profiles  cascade;
drop table if exists public.employee_module_access cascade;

-- Sales, marketing and partners, as the OS modelled them. public.partners
-- stays -- that one is the logo wall on the public site.
drop table if exists public.leads              cascade;
drop table if exists public.campaigns          cascade;
drop table if exists public.content_items      cascade;
drop table if exists public.influencers        cascade;
drop table if exists public.competitors        cascade;
drop table if exists public.partnerships       cascade;
drop table if exists public.sponsorships       cascade;
drop table if exists public.vendors            cascade;
drop table if exists public.podcast_episodes   cascade;

-- Governance, assets and operations.
drop table if exists public.govern_changes     cascade;
drop table if exists public.audit_log          cascade;
drop table if exists public.legal_items        cascade;
drop table if exists public.data_fields        cascade;
drop table if exists public.asset_versions     cascade;
drop table if exists public.assets             cascade;
drop table if exists public.inventory_custody  cascade;
drop table if exists public.inventory          cascade;
drop table if exists public.complaints         cascade;
drop table if exists public.feedback           cascade;
drop table if exists public.event_ops          cascade;
drop table if exists public.host_messages      cascade;
drop table if exists public.email_templates    cascade;

-- The platform's own catalogue: which products a business had switched on.
drop table if exists public.tenant_products    cascade;
drop table if exists public.products           cascade;
drop table if exists public.app_modules        cascade;
