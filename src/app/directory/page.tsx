import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DirectoryBrowser, type Member } from "@/components/DirectoryBrowser";

export const metadata = {
  title: "Member Directory",
  description: "Find and connect with other members of the Techxfluence community.",
};

export default async function DirectoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/directory");

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_directory");

  const members = (data as Member[]) ?? [];

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
        Want to appear here? Turn on the directory toggle in your{" "}
        <a href="/profile/edit" className="text-brand-soft underline">
          profile settings
        </a>
        .
      </p>

      <DirectoryBrowser members={members} />
    </div>
  );
}
