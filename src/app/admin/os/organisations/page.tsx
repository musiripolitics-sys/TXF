import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadMyOrganisations, isPlatformOwner } from "@/lib/os-tenants";
import { OrganisationsClient } from "./OrganisationsClient";

export const metadata = { title: "Organisations · Business OS" };

/**
 * The businesses on the platform, and the only place one can be created.
 *
 * Guarded here rather than by requireSection, for the same reason Team &
 * Access is: this is not a grantable product. An employee granted every
 * section in the catalogue must still not be able to mint a business — and
 * since 0047 every section grant is itself per-tenant, so a grant could not
 * express platform-level authority even if it wanted to.
 *
 * Anyone signed in who belongs to a business may OPEN this page, because
 * seeing which businesses you are in and renaming the ones you administer is
 * ordinary. Creating is what needs the platform owner, and the database says
 * so independently of this check.
 */
export default async function OrganisationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/os/organisations");

  const [orgs, canCreate] = await Promise.all([loadMyOrganisations(), isPlatformOwner()]);

  // An empty list on a database with 0050 means this account belongs to no
  // business at all, which is a different problem from the migration being
  // outstanding. Distinguished by whether the function answered.
  const migrated = orgs.length > 0 || canCreate;

  return (
    <OrganisationsClient orgs={orgs} canCreate={canCreate} migrated={migrated} />
  );
}
