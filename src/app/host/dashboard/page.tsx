import { redirect } from "next/navigation";
import { getCurrentUser, isHost } from "@/lib/auth";
import { HostDashboard } from "@/components/HostDashboard";

export const metadata = { title: "Host Dashboard" };

export default async function HostDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/host/dashboard");
  if (!(await isHost())) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-fg">Hosts only</h1>
        <p className="mt-2 text-sm text-muted">
          This area is for event hosts. Your account is a Community Member — ask
          an admin to upgrade you to a Host to submit and manage events.
        </p>
        <a
          href="/host"
          className="mt-6 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-soft"
        >
          Propose an event
        </a>
      </div>
    );
  }
  return <HostDashboard hostId={user.id} />;
}
