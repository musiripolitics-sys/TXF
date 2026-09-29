import { createClient } from "@/lib/supabase/server";
import { RoadmapClient } from "./RoadmapClient";
import type { Goal, Workstream, OwnerOption, RoadmapTask, TaskEdge } from "./types";
import type { TaskComment } from "./TaskDetail";
import { requireSection } from "@/lib/os-access";

export const metadata = { title: "90-Day Roadmap · Business OS" };

export default async function RoadmapPage() {
  await requireSection("plan");
  const supabase = await createClient();

  const [{ data: goals }, { data: workstreams }, { data: owners }, tasksRes, edgesRes, commentsRes] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .order("month", { ascending: true, nullsFirst: true })
      .order("week", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true }),
    supabase.from("workstreams").select("id,key,name,color").order("sort_order"),
    supabase
      .from("users")
      .select("id,full_name,email")
      .in("primary_role", ["admin", "employee", "event_host"])
      .order("full_name"),
    // Tasks and the dependency graph load with the goals so expanding a row is
    // instant and needs no second round trip.
    supabase
      .from("tasks")
      .select("id,code,goal_id,title,description,owner_id,start_date,due_date,status,priority,dependency_id,estimate_hours,actual_hours,completed_at")
      .not("goal_id", "is", null)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("dependencies").select("id,from_id,to_id,note,status"),
    // Added by migration 0015; an un-migrated database simply shows no thread.
    supabase
      .from("task_comments")
      .select("id,task_id,author_id,body,created_at")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <RoadmapClient
      initialGoals={(goals as Goal[]) ?? []}
      workstreams={(workstreams as Workstream[]) ?? []}
      owners={(owners as OwnerOption[]) ?? []}
      tasks={(tasksRes.data as RoadmapTask[]) ?? []}
      edges={(edgesRes.data as TaskEdge[]) ?? []}
      comments={(commentsRes.data as TaskComment[]) ?? []}
    />
  );
}
