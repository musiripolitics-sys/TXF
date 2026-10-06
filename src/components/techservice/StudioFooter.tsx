import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/data";
import { Container } from "./ui";
import { services } from "./data";

const EMAIL = "hello@techxfluence.com";

/**
 * The studio's own footer — Figma "Footer": brand column, three link
 * columns, a bottom bar and the oversized TXF watermark.
 */
export function StudioFooter() {
  const columns = [
    {
      title: "Services",
      links: services.slice(0, 5).map((s) => ({ label: s.title, href: "#services" })),
    },
    {
      title: "Studio",
      links: [
        { label: "Work", href: "#work" },
        { label: "Process", href: "#process" },
        { label: "Why TXF", href: "#why-txf" },
        { label: "FAQ", href: "#faq" },
        { label: "Contact", href: "#start-project" },
      ],
    },
    {
      title: "Connect",
      links: [
        ...brand.socials
          .filter((s) => s.label === "LinkedIn" || s.label === "Instagram" || s.label === "YouTube")
          .map((s) => ({ label: s.label, href: s.href, external: true })),
        { label: "Techxfluence community", href: "/" },
      ],
    },
  ];

  return (
    <footer className="overflow-hidden border-t border-line bg-surface">
      <Container className="pt-16 sm:pt-[72px]">
        <div className="grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-20">
          <div>
            <Image src="/txf-logo.svg" alt="TXF — We Connect" width={982} height={363} className="h-12 w-auto" />
            <p className="mt-5 max-w-[320px] text-sm leading-[1.6] text-muted">
              A design and development studio building digital experiences that move businesses forward.
            </p>
            <p className="mt-4 text-[13px] text-faint">
              Chennai, India ·{" "}
              <a href={`mailto:${EMAIL}`} className="hover:text-fg">
                {EMAIL}
              </a>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-fg">{col.title}</p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {"external" in l && l.external ? (
                        <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted transition-colors hover:text-fg">
                          {l.label}
                        </a>
                      ) : l.href.startsWith("/") ? (
                        <Link href={l.href} className="text-sm text-muted transition-colors hover:text-fg">
                          {l.label} <span aria-hidden>↗</span>
                        </Link>
                      ) : (
                        <a href={l.href} className="text-sm text-muted transition-colors hover:text-fg">
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-6 text-[13px] text-faint sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} TXF — Technology x Influence. All rights reserved.</p>
          <p>We Design. We Develop. We Deliver.</p>
        </div>
      </Container>

      {/* Figma: Footer Watermark — the mark at 6% opacity, bleeding off the bottom. */}
      <Container>
        <Image
          src="/txf-logo.svg"
          alt=""
          width={982}
          height={363}
          className="pointer-events-none mt-8 -mb-[6%] h-auto w-full select-none opacity-[0.06]"
        />
      </Container>
    </footer>
  );
}
