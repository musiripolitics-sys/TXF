import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DirectoryBrowser, type Member } from "@/components/DirectoryBrowser";
import { getActiveTier } from "@/lib/membership";
import { Button } from "@/components/Button";

export const metadata = {
  title: "Member Directory",
  description: "Find and connect with other members of the Techxfluence community.",
};

export default async function DirectoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/directory");

  const supabase = await createClient();
  const [{ data }, tier] = await Promise.all([
    supabase.rpc("get_directory"),
    getActiveTier(supabase, user.id),
  ]);

  const members = (data as Member[]) ?? [];
  // The database returns nothing to free members. Say why, rather than
  // showing an empty page that looks broken.
  const locked = !tier;

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
        Networking
      </span>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg">
        Member directory
      </h1>
      <p className="mt-2 text-sm text-muted">
        {members.length > 0
          ? `${members.length} member${members.length === 1 ? "" : "s"} you can connect with. `
          : ""}
        Members appear here once they reach <strong>100 points</strong> (earn
        +10 for each session you attend) — Elite members are listed
        automatically. Manage your listing in your{" "}
        <a href="/profile/edit" className="text-brand-soft underline">
          profile settings
        </a>
        .
      </p>

      {locked ? (
        <div className="mt-8 rounded-2xl border border-brand/30 bg-brand/[0.04] px-6 py-10 text-center">
          <h2 className="font-display text-xl font-bold text-fg">
            The directory is a Pro feature
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Pro members can browse everyone who&rsquo;s opted in — what they build,
            which city they&rsquo;re in, and how to reach them. Attending events
            stays free, always.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href="/membership" variant="brand" size="lg">
              See what Pro includes
            </Button>
          </div>
        </div>
      ) : (
        <DirectoryBrowser members={members} />
      )}
    </div>
  );
}
