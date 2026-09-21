import { createClient } from "@/lib/supabase/server";
import { RoadmapClient } from "./RoadmapClient";
import type { Goal, Workstream, OwnerOption } from "./types";

export const metadata = { title: "90-Day Roadmap · Business OS" };

export default async function RoadmapPage() {
  const supabase = await createClient();

  const [{ data: goals }, { data: workstreams }, { data: owners }] = await Promise.all([
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
  ]);

  return (
    <RoadmapClient
      initialGoals={(goals as Goal[]) ?? []}
      workstreams={(workstreams as Workstream[]) ?? []}
      owners={(owners as OwnerOption[]) ?? []}
    />
  );
}
