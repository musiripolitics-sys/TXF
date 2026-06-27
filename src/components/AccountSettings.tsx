"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteAccount } from "@/app/account/actions";

export function AccountSettings({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();

  // --- Change email ---
  const [email, setEmail] = useState(currentEmail);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);
    setEmailErr(null);
    if (!email || email === currentEmail) {
      return setEmailErr("Enter a different email address.");
    }
    setEmailSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/profile` },
    );
    setEmailSaving(false);
    if (error) return setEmailErr(error.message);
    setEmailMsg(
      "Confirmation links sent. Check both your current and new inboxes to complete the change.",
    );
  };

  // --- Delete account ---
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleteErr(null);
    setDeleting(true);
    const res = await deleteAccount();
    if (res.error) {
      setDeleting(false);
      return setDeleteErr(res.error);
    }
    // Account gone — clear the local session and leave.
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="mt-8 space-y-8">
      {/* Change email */}
      <form
        onSubmit={handleEmail}
        className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8"
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-fg">
            Change email
          </h2>
          <p className="mt-1 text-sm text-muted">
            We&apos;ll email confirmation links to both addresses before the
            change takes effect.
          </p>
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {emailErr && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {emailErr}
          </p>
        )}
        {emailMsg && (
          <p className="rounded-xl border border-host/40 bg-host/10 px-4 py-3 text-sm text-host-soft">
            {emailMsg}
          </p>
        )}
        <button
          type="submit"
          disabled={emailSaving}
          className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-soft disabled:opacity-60"
        >
          {emailSaving ? "Sending…" : "Update email"}
        </button>
      </form>

      {/* Danger zone */}
      <div className="space-y-4 rounded-2xl border border-red-500/30 bg-red-500/5 p-6 shadow-soft sm:p-8">
        <div>
          <h2 className="font-display text-lg font-semibold text-red-500">
            Delete account
          </h2>
          <p className="mt-1 text-sm text-muted">
            Permanently deletes your account and profile. This can&apos;t be
            undone. Type <strong className="text-fg">DELETE</strong> to confirm.
          </p>
        </div>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        {deleteErr && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {deleteErr}
          </p>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={confirmText !== "DELETE" || deleting}
          className="rounded-full bg-red-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </div>
  );
}
