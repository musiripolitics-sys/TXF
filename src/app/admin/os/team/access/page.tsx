import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AccessClient, type PersonRow } from "./AccessClient";

export const metadata = { title: "People & Access · Business OS" };

/**
 * Who can open what. Admin-only, and guarded here rather than by
 * requireSection, because access management is not itself a grantable
 * section — an employee granted "Team" must not be able to grant themselves
 * the rest.
 */
export default async function AccessPage() {
  if (!(await isAdmin())) redirect("/admin/os");

  const supabase = await createClient();
  const [{ data: users }, grantsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id,full_name,email,primary_role,created_at")
      .in("primary_role", ["admin", "employee", "event_host", "community_member"])
      .order("primary_role")
      .order("full_name"),
    supabase.from("employee_module_access").select("user_id,section"),
  ]);

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
  ).map((u) => ({
    id: u.id,
    name: u.full_name,
    email: u.email,
    role: u.primary_role,
    joined: u.created_at,
    sections: bySection.get(u.id) ?? [],
  }));

  return <AccessClient people={people} migrated={!grantsRes.error} />;
}
