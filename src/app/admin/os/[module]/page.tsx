import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/os-modules";
import { ModuleTable, type RefOptions } from "@/components/os/ModuleTable";

type Params = Promise<{ module: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { module } = await params;
  const cfg = MODULES[module];
  return { title: cfg ? `${cfg.title} · Business OS` : "Business OS" };
}

export default async function ModulePage({ params }: { params: Params }) {
  const { module } = await params;
  const config = MODULES[module];
  if (!config) notFound();

  const supabase = await createClient();
  const refs = config.refs ?? [];

  const [{ data: rows }, owners, workstreams, events, goals, campaigns] = await Promise.all([
    supabase
      .from(config.table)
      .select("*")
      .order(config.order?.col ?? "created_at", { ascending: config.order?.asc ?? false, nullsFirst: false }),
    // Always load users (owners) — needed by nearly every module and cheap at startup scale.
    supabase.from("users").select("id,full_name,email").order("full_name").limit(500),
    refs.includes("workstream")
      ? supabase.from("workstreams").select("id,name,color").order("sort_order")
      : Promise.resolve({ data: [] }),
    refs.includes("event")
      ? supabase.from("events").select("id,title").order("date", { ascending: false }).limit(300)
      : Promise.resolve({ data: [] }),
    refs.includes("goal")
      ? supabase.from("goals").select("id,objective").order("created_at")
      : Promise.resolve({ data: [] }),
    refs.includes("campaign")
      ? supabase.from("campaigns").select("id,name").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  // workstreams are also used to render workstream columns, so load them when a
  // column needs them even if no field does.
  let ws = (workstreams.data as RefOptions["workstreams"]) ?? [];
  if (ws.length === 0 && config.columns.some((c) => c.type === "workstream")) {
    const { data } = await supabase.from("workstreams").select("id,name,color").order("sort_order");
    ws = (data as RefOptions["workstreams"]) ?? [];
  }

  const options: RefOptions = {
    owners: (owners.data as RefOptions["owners"]) ?? [],
    workstreams: ws,
    events: (events.data as RefOptions["events"]) ?? [],
    goals: (goals.data as RefOptions["goals"]) ?? [],
    campaigns: (campaigns.data as RefOptions["campaigns"]) ?? [],
  };

  return (
    <ModuleTable
      config={config}
      rows={((rows as (Record<string, unknown> & { id: string })[]) ?? [])}
      options={options}
    />
  );
}
