"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type ProfileData = {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  bio: string;
  linkedin_url: string;
};

export function ProfileForm({
  userId,
  initial,
}: {
  userId: string;
  initial: ProfileData;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof ProfileData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("users")
      .update({
        full_name: form.full_name || null,
        phone: form.phone || null,
        city: form.city || null,
        bio: form.bio || null,
        linkedin_url: form.linkedin_url || null,
      })
      .eq("id", userId);

    setSaving(false);
    if (updateError) {
      setError("Couldn't save your profile. Please try again.");
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8"
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">Email</label>
        <input
          type="email"
          value={form.email}
          disabled
          className="w-full cursor-not-allowed rounded-xl border border-line bg-ink-2 px-4 py-3 text-sm text-faint"
        />
        <p className="mt-1 text-xs text-faint">
          Email is managed by your login and can&apos;t be changed here.
        </p>
      </div>

      <Input label="Full name" value={form.full_name} onChange={(v) => set("full_name", v)} placeholder="Your name" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+91 …" />
        <Input label="City" value={form.city} onChange={(v) => set("city", v)} placeholder="Chennai" />
      </div>

      <Input label="LinkedIn URL" value={form.linkedin_url} onChange={(v) => set("linkedin_url", v)} placeholder="https://linkedin.com/in/…" />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">Bio</label>
        <textarea
          rows={4}
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="A line or two about you and what you build."
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-xl border border-host/40 bg-host/10 px-4 py-3 text-sm text-host-soft">
          Profile saved.
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-soft disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-medium text-muted hover:text-fg"
        >
          Back to profile
        </button>
      </div>
    </form>
  );
}

function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-fg">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}
