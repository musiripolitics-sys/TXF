import type { Metadata } from "next";
import { LegalDocView } from "@/components/LegalDoc";
import { terms } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Techxfluence Terms & Conditions governing use of the platform, events, memberships and hosting services.",
};

export default function TermsPage() {
  return <LegalDocView doc={terms} />;
}
