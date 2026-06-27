import type { Metadata } from "next";
import { Space_Grotesk, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/Toast";
import { getUserRole } from "@/lib/auth";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Editorial serif — used for names in the "Meet our leaders" section.
const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://techxfluence.com"),
  title: {
    default: "Techxfluence — Where Technology Meets Influence",
    template: "%s · Techxfluence",
  },
  description:
    "Techxfluence is a technology community and event ecosystem. Join events, host experiences, connect with innovators and grow with a thriving tech tribe across India.",
  keywords: [
    "Techxfluence",
    "tech community",
    "tech events",
    "hackathons",
    "meetups",
    "India tech",
    "startup networking",
  ],
  openGraph: {
    title: "Techxfluence — Where Technology Meets Influence",
    description:
      "Join events, host experiences and connect with innovators across India.",
    type: "website",
  },
};

// Per-role brand accent. Applied as inline CSS variables on <body> so the
// whole UI recolours (orange = member/default, green = host, blue = admin).
const roleTheme: Record<string, React.CSSProperties> = {
  host: {
    "--color-brand": "#16a34a",
    "--color-brand-soft": "#15803d",
    "--color-brand-ink": "#052e16",
  } as React.CSSProperties,
  admin: {
    "--color-brand": "#2563eb",
    "--color-brand-soft": "#1d4ed8",
    "--color-brand-ink": "#0a1f4d",
  } as React.CSSProperties,
  member: {},
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = await getUserRole();

  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${serif.variable} h-full antialiased`}
    >
      <body
        data-role={role}
        style={roleTheme[role]}
        className="min-h-full flex flex-col bg-ink text-fg"
      >
        <Nav role={role} />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
