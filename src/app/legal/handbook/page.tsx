import type { Metadata } from "next";
import { LegalDocView } from "@/components/LegalDoc";
import { handbook } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Membership Handbook",
  description:
    "The Techxfluence Membership Handbook — categories, benefits, code of conduct, engagement and recognition.",
};

export default function HandbookPage() {
  return <LegalDocView doc={handbook} />;
}
