import type { BosStatus, BosPriority, BosFrequency } from "@/lib/bos";

export type TaskView =
  | "today"
  | "week"
  | "month"
  | "overdue"
  | "upcoming"
  | "completed"
  | "blocked"
  | "all";

export type Task = {
  id: string;
  code: string | null;
  workstream_id: string | null;
  goal_id: string | null;
  title: string;
  description: string | null;
  owner_id: string | null;
  frequency: BosFrequency;
  start_date: string | null;
  due_date: string | null;
  status: BosStatus;
  priority: BosPriority;
  dependency_id: string | null;
  budget: number;
  actual_cost: number;
  target: number | null;
  actual: number | null;
  comments: string | null;
  created_at: string;
};
