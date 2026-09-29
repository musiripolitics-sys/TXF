import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AccessClient, type PersonRow } from "./AccessClient";

export const metadata = { title: "Team & Access · Business OS" };

/**
 * Who can open what. Admin-only, and guarded here rather than by
 * requireSection, because access management is not itself a grantable
 * section — an employee granted "Team" must not be able to grant themselves
 * the rest.
 */
export default async function AccessPage() {
  if (!(await isAdmin())) redirect("/admin/os");

  const supabase = await createClient();
  // Staff only. Members are customers of the public site and have no business
  // in the OS; pulling them in here made the page mostly noise.
  const [{ data: users }, grantsRes, profilesRes] = await Promise.all([
    supabase
      .from("users")
      .select("id,full_name,email,primary_role,created_at")
      .in("primary_role", ["admin", "employee"])
      .order("primary_role")
      .order("full_name"),
    supabase.from("employee_module_access").select("user_id,section"),
    supabase.from("employee_profiles").select("user_id,title,department,status"),
  ]);

  const profiles = new Map(
    ((profilesRes.data as { user_id: string; title: string | null; department: string | null; status: string }[]) ?? [])
      .map((r) => [r.user_id, r]),
  );

  const bySection = new Map<string, string[]>();
  for (const g of (grantsRes.data as { user_id: string; section: string }[]) ?? []) {
    bySection.set(g.user_id, [...(bySection.get(g.user_id) ?? []), g.section]);
  }

  const people: PersonRow[] = (
    (users as {
      id: string;
      full_name: string | null;
      email: string | null;
      primary_role: string;
      created_at: string;
    }[]) ?? []
  )
    .map((u) => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      role: u.primary_role,
      joined: u.created_at,
      title: profiles.get(u.id)?.title ?? null,
      department: profiles.get(u.id)?.department ?? null,
      sections: bySection.get(u.id) ?? [],
    }))
    // Anyone offboarded keeps their account but leaves this list.
    .filter((u) => profiles.get(u.id)?.status !== "ended");

  return <AccessClient people={people} migrated={!grantsRes.error} />;
}
