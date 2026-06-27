import { redirect } from "next/navigation";
import { getCurrentUser, isHost } from "@/lib/auth";
import { CheckInScanner } from "@/components/CheckInScanner";

export const metadata = { title: "Check-in" };

export default async function CheckInPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/host/checkin");
  if (!(await isHost())) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-fg">Hosts only</h1>
        <p className="mt-2 text-sm text-muted">
          Event check-in is for hosts and admins.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-12 sm:px-8">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
        Door check-in
      </span>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg">
        Scan tickets
      </h1>
      <p className="mt-2 text-sm text-muted">
        Scan an attendee&apos;s QR code, or type their ticket code, to check
        them in.
      </p>
      <CheckInScanner />
    </div>
  );
}
