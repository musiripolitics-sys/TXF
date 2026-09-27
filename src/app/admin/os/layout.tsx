import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
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

  return <OsShell email={user.email ?? ""}>{children}</OsShell>;
}
