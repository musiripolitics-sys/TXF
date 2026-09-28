import type { BosStatus, BosPriority } from "@/lib/bos";

export type Workstream = { id: string; key: string; name: string; color: string | null };
export type OwnerOption = { id: string; full_name: string | null; email: string | null };

export type Goal = {
  id: string;
  code: string | null;
  workstream_id: string | null;
  month: number | null;
  week: number | null;
  objective: string;
  deliverable: string | null;
  owner_id: string | null;
  start_date: string | null;
  end_date: string | null;
  priority: BosPriority;
  status: BosStatus;
  budget: number;
  target_kpi: string | null;
  actual_kpi: string | null;
  dependency_id: string | null;
  notes: string | null;
  created_at: string;
};
