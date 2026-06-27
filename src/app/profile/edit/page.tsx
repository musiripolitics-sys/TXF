import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, type ProfileData } from "@/components/ProfileForm";
import { AccountSettings } from "@/components/AccountSettings";

export const metadata = { title: "Edit Profile" };

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile/edit");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name,email,phone,city,bio,linkedin_url")
    .eq("id", user.id)
    .maybeSingle();

  const initial: ProfileData = {
    full_name: profile?.full_name ?? "",
    email: profile?.email ?? user.email ?? "",
    phone: profile?.phone ?? "",
    city: profile?.city ?? "",
    bio: profile?.bio ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
        My account
      </span>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg">
        Edit Profile
      </h1>
      <p className="mt-2 text-sm text-muted">
        Keep your details up to date — they help us connect you with the right
        events and people.
      </p>
      <ProfileForm userId={user.id} initial={initial} />

      <h2 className="mt-12 font-display text-2xl font-bold tracking-tight text-fg">
        Account settings
      </h2>
      <AccountSettings currentEmail={initial.email} />
    </div>
  );
}
