import { redirect } from "next/navigation";

export const metadata = { title: "Organisations · Business OS" };

/**
 * Moved to /admin/platform.
 *
 * This page used to render the organisation list inside the Business OS shell,
 * which meant a platform operator looking at three businesses was shown one
 * business sidebar, approvals badge and notification bell. Nothing on it was
 * about a business, so none of that chrome belonged — the console now has its
 * own layout above the tenant.
 *
 * Kept as a redirect rather than deleted: the tenant switcher linked here, and
 * so may a bookmark.
 */
export default function OrganisationsMoved() {
  redirect("/admin/platform");
}
