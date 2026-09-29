import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OsShell } from "@/components/os/OsShell";

export const metadata = { title: "Business OS" };

/**
 * The Business OS runs in its own shell rather than inside AppShell. Nesting
 * it there meant every page carried the app sidebar and a wall of module pills
 * at the same time; Chrome now routes /admin/os/** straight through to this.
 */
export default async function OsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/os");

  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-fg">Not authorised</h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;re signed in as {user.email}, but the Business OS is
          admin-only. Ask an existing admin to grant your role.
        </p>
      </div>
    );
  }

  // Badge counts for the top bar. A badge that is always there stops being a
  // signal, so both are omitted at zero; a failed count shows nothing rather
  // than a wrong number.
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [approvals, overdueTasks, criticalRisks] = await Promise.all([
    supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("decision", "pending"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .lt("due_date", today)
      .not("status", "in", "(completed,cancelled)"),
    supabase
      .from("risks")
      .select("id", { count: "exact", head: true })
      .gte("risk_score", 15)
      .not("status", "in", "(completed,cancelled)"),
  ]);

  return (
    <OsShell
      email={user.email ?? ""}
      approvalCount={approvals.count ?? 0}
      alertCount={(overdueTasks.count ?? 0) + (criticalRisks.count ?? 0)}
    >
      {children}
    </OsShell>
  );
}
