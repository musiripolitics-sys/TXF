import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { CommunityFeed } from "@/components/CommunityFeed";

export const metadata = {
  title: "Community",
  description: "What the Techxfluence community is talking about.",
};

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/community");
  const admin = await isAdmin();

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
        Community
      </span>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg">
          The feed
        </h1>
        <a
          href="/directory"
          className="mt-2 shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-fg hover:border-brand hover:text-brand"
        >
          Member directory →
        </a>
      </div>
      <p className="mt-2 text-sm text-muted">
        Share wins, ask questions, and see what the community is up to.
      </p>

      <CommunityFeed currentUserId={user.id} isAdmin={admin} />
    </div>
  );
}
