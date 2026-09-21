import { redirect } from "next/navigation";
import { getCurrentUser, isEmployee } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceClient } from "./WorkspaceClient";
import type { Task } from "../admin/os/tasks/types";
import type { Goal, Workstream } from "../admin/os/roadmap/types";

export const metadata = { title: "My Workspace" };

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/workspace");
  if (!(await isEmployee())) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-fg">Workspace is for staff</h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;re signed in as {user.email}. Ask an admin to set your role to Employee to get a
          personal workspace.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: tasks }, { data: goals }, { data: kpis }, { data: workstreams }] = await Promise.all([
    supabase.from("tasks").select("*").eq("owner_id", user.id).order("due_date", { nullsFirst: false }),
    supabase.from("goals").select("*").eq("owner_id", user.id).order("end_date", { nullsFirst: false }),
    supabase.from("employee_kpis").select("*").eq("employee_id", user.id).order("period", { ascending: false }),
    supabase.from("workstreams").select("id,key,name,color").order("sort_order"),
  ]);

  return (
    <WorkspaceClient
      name={user.email?.split("@")[0] ?? "there"}
      tasks={(tasks as Task[]) ?? []}
      goals={(goals as Goal[]) ?? []}
      kpis={(kpis as KpiRow[]) ?? []}
      workstreams={(workstreams as Workstream[]) ?? []}
    />
  );
}

export type KpiRow = {
  id: string;
  kpi_name: string;
  period: string;
  target: number | null;
  actual: number | null;
};
