import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata = { title: "Admin Console" };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-fg">
          Not authorised
        </h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;re signed in as {user.email}, but this account doesn&apos;t
          have admin access. Ask an existing admin to grant your role.
        </p>
      </div>
    );
  }
  return <AdminDashboard adminEmail={user.email ?? ""} adminId={user.id} />;
}
