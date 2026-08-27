import Image from "next/image";
import Link from "next/link";

/**
 * TXF wordmark. The "x" carries the orange brand spark — echoing the
 * crossing stroke in the logo. Used in the nav, footer and hero.
 */
export function Logo({
  className = "",
  withTagline = false,
}: {
  className?: string;
  withTagline?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="Techxfluence home"
      className={`group inline-flex items-center leading-none ${className}`}
    >
      <Image
        src="/logo.png"
        alt="Techxfluence Logo"
        width={160}
        height={40}
        priority
        className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
      />
    </Link>
  );
}

/** Compact monogram mark — the "TXF" badge. */
export function Monogram({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Techxfluence Monogram"
      width={128}
      height={32}
      className={`inline-block h-8 w-auto object-contain ${className}`}
    />
  );
}
