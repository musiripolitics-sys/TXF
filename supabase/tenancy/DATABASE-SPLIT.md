# Database per tenant — plan

Decided 8 October 2026, after the cost was put in writing and the answer was
go. This supersedes Stages 2–7 of the shared-schema plan for everything about
where data lives. It does not supersede the work itself: the 90 `tenant_id`
columns and 87 isolation policies stay in place until the very last stage,
because they are what keeps the live system correct while the new one is built.

## What changes

One Supabase project per business, each holding the full 97-table schema with
**no** `tenant_id` anywhere and **no** isolation policies. The app decides
which project to talk to from the request, not from the row.

## What it costs, recorded so nobody relitigates it later

| Discarded | |
| --- | --- |
| `tenant_id` columns | 90 |
| Restrictive isolation policies | 87 of 292 |
| Definer functions naming a tenant | 87 of 100 |
| Migrations existing only for shared tenancy | 20 of 54 |
| Test suites whose subject is isolation | 16 of 44 |

And four standing costs: every migration replays per project; identity
fragments, so one person signing up at two businesses gets two unrelated
accounts and organisation switching becomes impossible; the platform console
turns one query into N; roughly $25 per project per month, each provisioned,
monitored and backed up.

The win, and it is a real one: each business gets its own public website.
`bos_request_tenant()` resolving anonymous visitors to the default tenant is
exactly why a second business cannot have one today.

## The order, and why this order

The destructive stage is **last**. Stage E drops 90 columns and cannot be
undone; running it early would leave neither architecture standing. Every
stage before it is reversible, and the system keeps working throughout.

### Stage A — route by request, against the database that exists
A registry mapping host to project, and every client resolving through it.
Seeded with one entry pointing at the current environment variables, so
behaviour is identical on day one. No schema change. This is also the stage
that makes a second domain possible at all, which is most of the benefit
arriving before any of the risk.

### Stage B — a migration runner that targets many projects
Applies `supabase/migrations/*.sql` to every registered project, records what
applied where, and refuses to continue on a partial failure. Built and proven
against two throwaway projects before any real one exists. 54 migrations today
and no orchestration for them; this is the piece that has to exist before a
second project is anything but a liability.

### Stage C — give Techxfluence its own project
Provision it, replay all 54 migrations with the Stage B runner, move the data
across, and verify row counts table by table. The shared database stays
authoritative until the comparison passes.

### Stage D — cut the domain over
`techxfluence.com` points at the new project. Reversible by changing one
registry entry back, which is the reason Stage A exists.

### Stage E — de-tenant the schema
Only now, and only once Stage D has held. Drop the 90 columns, their foreign
keys and indexes, the 87 isolation policies, the composite unique constraints
(restoring the narrow ones), the four tenancy tables, the five tenancy
functions, and strip the tenant predicate from 87 function bodies. Restore the
role predicates to `users.primary_role`.

**One-way door.** By the time it runs it should be provably unnecessary rather
than hopefully safe.

### Stage F — the platform console, and what is left of it
`0050`–`0053` assume one database. Each listing becomes N calls or the console
is dropped. Decide with the code in front of us rather than now.

## Not in this plan

Cross-business reporting, a shared identity provider, and anything that reads
two businesses at once. They stop being single queries at Stage C and need
designing from scratch; none of them is required for the first customer.

## Status

Stage A in progress.
