import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./TasksClient";
import type { Task, TaskView } from "./types";
import type { Workstream, OwnerOption } from "../roadmap/types";

export const metadata = { title: "Tasks · Business OS" };

type SP = Promise<Record<string, string | string[] | undefined>>;

const V: TaskView[] = ["today", "week", "month", "overdue", "upcoming", "completed", "blocked", "all"];

export default async function TasksPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const raw = typeof sp.view === "string" ? sp.view : "all";
  const view: TaskView = (V as string[]).includes(raw) ? (raw as TaskView) : "all";

  const supabase = await createClient();
  const [{ data: tasks }, { data: workstreams }, { data: goals }, { data: owners }] =
    await Promise.all([
      supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("workstreams").select("id,key,name,color").order("sort_order"),
      supabase.from("goals").select("id,objective").order("created_at"),
      supabase
        .from("users")
        .select("id,full_name,email")
        .in("primary_role", ["admin", "employee", "event_host"])
        .order("full_name"),
    ]);

  return (
    <TasksClient
      initialTasks={(tasks as Task[]) ?? []}
      workstreams={(workstreams as Workstream[]) ?? []}
      goals={(goals as { id: string; objective: string }[]) ?? []}
      owners={(owners as OwnerOption[]) ?? []}
      initialView={view}
    />
  );
}
