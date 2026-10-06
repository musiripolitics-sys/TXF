import { faqs, services, SITE } from "./data";

/**
 * schema.org data for search engines: the studio as a ProfessionalService,
 * and the FAQ (which is visible on the page, as Google requires).
 */
export function StudioJsonLd() {
  const url = `${SITE}/Techservice`;
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: "TXF — Technology x Influence",
      url,
      logo: `${SITE}/txf-logo.svg`,
      email: "hello@techxfluence.com",
      slogan: "We Design. We Develop. We Deliver.",
      address: { "@type": "PostalAddress", addressLocality: "Chennai", addressRegion: "Tamil Nadu", addressCountry: "IN" },
      areaServed: "IN",
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Design & development services",
        itemListElement: services.map((s) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: s.title, description: s.desc },
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      // Static data from this repo only — nothing user-supplied goes in here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
