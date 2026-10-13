-- ============================================================
-- 0054 -- Remove Shreex from this database.
--
-- The platform left this repository three commits ago. This removes what it
-- left behind in the schema: the functions that ran it, and the tables that
-- only existed to support them.
--
-- What this does NOT do, deliberately, is remove tenancy. 90 tables carry
-- tenant_id, 87 restrictive policies compare it to bos_request_tenant(), and
-- 43 BUSINESS functions -- register_for_event, create_pending_order,
-- fulfil_order, check_in_ticket, record_payout -- read or write it. Those
-- functions sell tickets and take money. Rewriting all 43 in one pass against
-- a live site is a different piece of work with a different risk, and
-- supabase/tenancy/DATABASE-SPLIT.md says the same thing: the columns and
-- policies stay until the very last stage, because they are what keeps the
-- live system correct while the replacement is built.
--
-- So: the platform goes, the plumbing stays, and nothing that takes a payment
-- is touched.
--
-- Idempotent. Safe to run twice.
-- ============================================================

-- ------------------------------------------------------------
-- 1. The three functions holding the platform tables up
--
-- Each is a Shreex concept, and each is the only surviving reference to a
-- table below. is_admin and its neighbours gained a super-admin branch in
-- 0052; removing it restores exactly what 0047 had, which is the behaviour
-- this site has always needed: an admin is an admin of this business.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.tenant_members m
     where m.user_id = auth.uid()
       and m.tenant_id = public.bos_request_tenant()
       and m.status = 'active'
       and m.role = 'admin');
$fn$;

comment on function public.is_admin() is
  $c$Whether the caller administers this business. The super-admin branch 0052 added is gone with the platform: there is no platform above this site any more, so there is nobody for it to have described.$c$;

create or replace function public.bos_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.tenant_members m
     where m.user_id = auth.uid()
       and m.tenant_id = public.bos_request_tenant()
       and m.status = 'active'
       and m.role::text in ('admin', 'employee'));
$fn$;

create or replace function public.bos_tenant_role(p_tenant uuid)
returns public.user_role
language sql
stable
security definer
set search_path = public
as $fn$
  select m.role from public.tenant_members m
   where m.tenant_id = p_tenant
     and m.user_id = auth.uid()
     and m.status = 'active';
$fn$;

-- The product catalogue was handed to the platform owner in 0051, because a
-- catalogue shared by several businesses could not be written by an admin of
-- any one of them. There is no platform above this site now and no other
-- business to protect it from, so it goes back to the admin of this one.
drop policy if exists "platform owner writes products" on public.products;
drop policy if exists "admin writes products" on public.products;
create policy "admin writes products" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

comment on policy "admin writes products" on public.products is
  $c$Back to where 0033 had it. The platform-owner rule 0051 introduced existed to stop one business disabling a product for every other business; with one business left, it protected nothing and depended on a function that is going.$c$;

create or replace function public.bos_current_tenant()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_claim uuid := public.bos_claimed_tenant();
  v       uuid;
begin
  if v_claim is not null then
    -- The token says which tenant; membership says whether that is allowed.
    if exists (select 1 from public.tenant_members m
                where m.tenant_id = v_claim and m.user_id = auth.uid()
                  and m.status = 'active')
    then
      return v_claim;
    end if;
    return null;
  end if;

  select u.active_tenant_id into v
    from public.users u
   where u.id = auth.uid()
     and u.active_tenant_id is not null
     and exists (select 1 from public.tenant_members m
                  where m.tenant_id = u.active_tenant_id
                    and m.user_id = u.id and m.status = 'active');
  if v is not null then return v; end if;

  select m.tenant_id into v
    from public.tenant_members m
   where m.user_id = auth.uid() and m.status = 'active'
   order by m.joined_at, m.id
   limit 1;
  return v;
end $fn$;

comment on function public.bos_current_tenant() is
  $c$The business the caller is acting in. 0052 added a branch letting a super admin stand in a business they were not a member of; with the platform gone that branch called a function that no longer exists, which would have failed on every request. Back to the 0047 version.$c$;

-- ------------------------------------------------------------
-- 2. The tables that only the platform used
--
-- Before the functions, not after: platform_admins carries a policy that calls
-- bos_is_super_admin, and Postgres will not drop a function a policy names.
--
-- Checked rather than assumed: after the drops above, nothing references any
-- of these -- no foreign key, no policy on another table, no surviving
-- function.
--
-- Only two: invitations into a business, and the platform administrator list.
-- tenant_products, products and employee_module_access stay, because
-- bos_can_access reads them and fourteen live policies read it.
-- ------------------------------------------------------------
drop table if exists public.tenant_invitations cascade;
drop table if exists public.platform_admins   cascade;

-- tenants and tenant_members stay. 90 tenant_id columns reference tenants,
-- and is_admin, is_host and 43 business functions read tenant_members. They
-- are the plumbing, not the platform.

-- ------------------------------------------------------------
-- 3. The platform's functions
--
-- Creating businesses, switching between them, inviting into them, appointing
-- platform administrators, the OS dashboard, search and the roadmap sync.
-- None of it is reachable from this site's 27 pages.
--
-- bos_can_access is NOT in this list, and that was nearly a mistake. It reads
-- like an OS function and it gates fourteen policies on events, registrations,
-- event_ops, complaints, data_fields, asset_versions and inventory_custody --
-- the section grants this site's own admin console runs on. Dropping it would
-- have taken staff access to the events tables with it. Everything it reads
-- stays for the same reason: employee_module_access, products,
-- tenant_products and bos_product_enabled.
-- ------------------------------------------------------------
drop function if exists public.bos_accept_invitation(p_token uuid);
drop function if exists public.bos_assign_tenant_admin(p_tenant uuid, p_email text, p_role text);
drop function if exists public.bos_create_tenant(p_name text, p_slug text);
drop function if exists public.bos_dashboard_summary(p_from date, p_to date, p_owner uuid, p_workstream uuid);
drop function if exists public.bos_event_slug(p_title text, p_id uuid);
drop function if exists public.bos_govern_attention();
drop function if exists public.bos_grant_platform_admin(p_email text, p_role text, p_expires timestamp with time zone);
drop function if exists public.bos_invitation_preview(p_token uuid);
drop function if exists public.bos_invite_to_tenant(p_email text, p_role text, p_sections text[]);
drop function if exists public.bos_is_platform_owner();
drop function if exists public.bos_is_super_admin();
drop function if exists public.bos_my_sections();
drop function if exists public.bos_my_tenant_summary();
drop function if exists public.bos_my_tenants();
drop function if exists public.bos_platform_admins();
drop function if exists public.bos_platform_owner_check();
drop function if exists public.bos_platform_stats();
drop function if exists public.bos_publish_sop(p_version uuid);
drop function if exists public.bos_remove_member(p_user uuid);
drop function if exists public.bos_rename_tenant(p_tenant uuid, p_name text);
drop function if exists public.bos_revoke_platform_admin(p_user uuid);
drop function if exists public.bos_search(p_q text, p_limit integer);
drop function if exists public.bos_section_status();
drop function if exists public.bos_set_member_role(p_user uuid, p_role text);
drop function if exists public.bos_set_module_access(p_user uuid, p_sections text[]);
drop function if exists public.bos_set_tenant_product(p_key text, p_enabled boolean);
drop function if exists public.bos_set_tenant_status(p_tenant uuid, p_status text);
drop function if exists public.bos_slugify(p_text text);
drop function if exists public.bos_sop_current(p_sop uuid);
drop function if exists public.bos_switch_tenant(p_tenant uuid);
drop function if exists public.bos_sync_roadmap_tasks();
drop function if exists public.bos_task_completion_block(p_task uuid);
drop function if exists public.bos_tenant_admin_list();
drop function if exists public.bos_tenant_products();
drop function if exists public.bos_unassign_tenant_member(p_tenant uuid, p_user uuid);
drop function if exists public.bos_user_directory();

