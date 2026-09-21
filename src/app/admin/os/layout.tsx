import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { OsNav } from "@/components/os/OsNav";

export const metadata = { title: "Business OS" };

/**
 * The Business Operating System module. Admin-only. Rendered inside the
 * existing AppShell (Chrome routes /admin/** through the admin sidebar + blue
 * theme), so this layout only adds the module sub-nav and page padding.
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

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
      <OsNav />
      {children}
    </div>
  );
}
