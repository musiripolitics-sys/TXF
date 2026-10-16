import { jsonLdSafe } from "@/lib/jsonld";
import { SITE_URL as SITE } from "@/lib/site";

/**
 * schema.org/ProfilePage for an organiser.
 *
 * The event pages already declare their organiser inline, which tells a search
 * engine the name but not that the name has a page of its own. This closes
 * that: the profile is the Person, the events it lists are the works, and the
 * follower count is the one honest interaction statistic the page has.
 */
export function OrganizerJsonLd({
  id,
  name,
  bio,
  city,
  avatar,
  linkedin,
  followers,
  eventsCount,
}: {
  id: string;
  name: string;
  bio?: string | null;
  city?: string | null;
  avatar?: string | null;
  linkedin?: string | null;
  followers: number;
  eventsCount: number;
}) {
  const url = `${SITE}/organizer/${id}`;

  const data = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    mainEntity: {
      "@type": "Person",
      name,
      ...(bio ? { description: bio } : {}),
      ...(avatar
        ? { image: avatar.startsWith("http") ? avatar : `${SITE}${avatar}` }
        : {}),
      ...(city ? { homeLocation: { "@type": "Place", name: city } } : {}),
      ...(linkedin ? { sameAs: [linkedin] } : {}),
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/FollowAction",
          userInteractionCount: followers,
        },
      ],
      ...(eventsCount > 0
        ? {
            // "Events organised" has no schema.org predicate of its own;
            // performerIn is the closest thing that search engines read.
            knowsAbout: "Technology events",
          }
        : {}),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdSafe(data) }}
    />
  );
}
