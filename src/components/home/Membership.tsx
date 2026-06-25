import { Section, SectionHeading } from "@/components/Section";
import { Button } from "@/components/Button";
import { MembershipTimeline } from "./MembershipTimeline";

export function Membership() {
  return (
    <Section id="membership">
      <SectionHeading
        eyebrow="Membership Benefits"
        title={
          <>
            Why become a <span className="text-brand">member?</span>
          </>
        }
        description="Every membership unlocks perks across your whole journey — from your first event to leading the community."
      />

      <MembershipTimeline />

      <div className="mt-14 flex justify-center">
        <Button href="/membership" variant="brand" size="lg">
          Become a Member
        </Button>
      </div>
    </Section>
  );
}
