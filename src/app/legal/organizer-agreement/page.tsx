import type { Metadata } from "next";
import { LegalDocView } from "@/components/LegalDoc";
import { organizerAgreement } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Event Organizer Agreement",
  description:
    "The Techxfluence Event Organizer Agreement covering responsibilities, approval, ticketing, revenue sharing and liability.",
};

export default function OrganizerAgreementPage() {
  return <LegalDocView doc={organizerAgreement} />;
}
