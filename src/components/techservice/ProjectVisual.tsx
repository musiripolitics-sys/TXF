import Image from "next/image";
import type { Project } from "./data";

/**
 * Figma: Project Visual — a 620×420 gradient panel with a browser window
 * rising out of the bottom edge. Each product type gets a drawn screen of
 * what it actually looks like; swap in real screenshots when you have them.
 */
const BG: Record<Project["visual"], string> = {
  platform: "from-brand to-[#ffb27a]",
  website: "from-[#ffd9c4] to-[#ff8a3d]",
  commerce: "from-[#1f1f24] to-[#5b5b66]",
  crm: "from-[#ff7a45] to-[#1f1f24]",
  os: "from-[#141416] to-[#ff5a1f]",
};

export function ProjectVisual({ kind }: { kind: Project["visual"] }) {
  return (
    <div className={`relative aspect-[620/420] w-full overflow-hidden rounded-[20px] bg-gradient-to-br ${BG[kind]}`} aria-hidden>
      <div className="absolute left-[7.7%] right-[7.7%] top-[13.3%] h-[95%] overflow-hidden rounded-[14px] bg-surface shadow-[0_24px_48px_rgba(0,0,0,0.18)] transition-transform duration-500 group-hover:-translate-y-2">
        <div className="flex h-8 items-center gap-1.5 bg-[#f1efeb] px-3.5">
          <span className="h-[9px] w-[9px] rounded-full bg-[#ff5f57]" />
          <span className="h-[9px] w-[9px] rounded-full bg-[#febc2e]" />
          <span className="h-[9px] w-[9px] rounded-full bg-[#28c840]" />
        </div>
        {kind === "platform" && <Platform />}
        {kind === "website" && <Website />}
        {kind === "commerce" && <Commerce />}
        {kind === "crm" && <Crm />}
        {kind === "os" && <Os />}
      </div>
    </div>
  );
}

/* ── shared bits ─────────────────────────────────────────────────── */

function Bar({ w, className = "" }: { w: string; className?: string }) {
  return <div className={`h-2 rounded-full bg-fg/15 ${className}`} style={{ width: w }} />;
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`block text-[9px] font-semibold uppercase leading-none tracking-wide sm:text-[10px] ${className}`}>{children}</span>;
}

/* ── Techxfluence: events platform ───────────────────────────────── */

function Platform() {
  const tiles = ["/events/meetup.jpg", "/events/hackathon.jpg", "/events/workshop.jpg", "/events/conference.jpg"];
  return (
    <div className="space-y-4 p-[5.3%]">
      <div className="grid grid-cols-[1fr_1.1fr] gap-4">
        <div className="space-y-2.5 pt-1">
          <div className="h-3.5 w-[90%] rounded bg-fg/85" />
          <div className="h-3.5 w-[62%] rounded bg-brand" />
          <Bar w="85%" className="mt-4" />
          <Bar w="70%" />
          <div className="mt-4 h-6 w-20 rounded-full bg-brand" />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {tiles.map((src) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-md bg-ink-2">
              <Image src={src} alt="" fill sizes="(max-width: 1024px) 25vw, 120px" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5 rounded-lg border border-line p-2">
            <div className="h-9 rounded bg-brand/15" />
            <Bar w="80%" />
            <Bar w="50%" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Company website: nav, hero with photo, feature columns ──────── */

function Website() {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-line px-[5%] py-2.5">
        <div className="h-3 w-14 rounded bg-fg/85" />
        <div className="flex items-center gap-2.5">
          <Bar w="24px" />
          <Bar w="24px" />
          <Bar w="24px" />
          <div className="h-4 w-12 rounded-full bg-brand" />
        </div>
      </div>
      <div className="grid grid-cols-[1.1fr_1fr] items-center gap-4 px-[5%] py-4">
        <div className="space-y-2">
          <Label className="text-brand">Your company</Label>
          <div className="h-3.5 w-[95%] rounded bg-fg/85" />
          <div className="h-3.5 w-[70%] rounded bg-fg/85" />
          <Bar w="90%" className="mt-3" />
          <Bar w="75%" />
          <div className="flex gap-2 pt-2">
            <div className="h-5 w-16 rounded-full bg-brand" />
            <div className="h-5 w-14 rounded-full border border-fg/20" />
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink-2">
          <Image src="/events/networking.jpg" alt="" fill sizes="(max-width: 1024px) 40vw, 240px" className="object-cover" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5 px-[5%]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5 rounded-lg bg-ink p-2.5">
            <div className="h-5 w-5 rounded-md bg-brand/20" />
            <div className="h-2.5 w-[70%] rounded bg-fg/70" />
            <Bar w="90%" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── E-commerce: storefront + order journey to delivery ──────────── */

function Commerce() {
  const steps = ["Ordered", "Packed", "Shipped", "Delivered"];
  const products = ["bg-[#ffd9c4]", "bg-[#e8e4dc]", "bg-[#ffb27a]", "bg-[#d9d4ff]"];
  return (
    <div className="space-y-3 p-[5%]">
      <div className="flex items-center justify-between">
        <div className="h-3 w-16 rounded bg-fg/85" />
        <div className="flex items-center gap-1.5 rounded-full bg-ink px-2 py-1">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          <Label className="text-fg/70">Cart · 3</Label>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {products.map((c, i) => (
          <div key={i} className="space-y-1">
            <div className={`aspect-square rounded-md ${c}`} />
            <Bar w="80%" />
            <div className="h-2 w-8 rounded bg-brand/70" />
          </div>
        ))}
      </div>
      {/* Order #1042 tracking — orders through to delivery */}
      <div className="rounded-lg border border-line p-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-fg/70">Order #1042</Label>
          <span className="rounded-full bg-[#28c840]/15 px-1.5 py-0.5 text-[8px] font-semibold text-[#1a8a2e] sm:text-[9px]">On the way</span>
        </div>
        <div className="mt-2.5 flex items-center">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${i < 3 ? "bg-brand" : "border-2 border-fg/20 bg-surface"}`} />
              {i < steps.length - 1 && <span className={`h-0.5 flex-1 ${i < 2 ? "bg-brand" : "bg-fg/15"}`} />}
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between">
          {steps.map((s) => (
            <Label key={s} className="text-fg/50">
              {s}
            </Label>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── CRM: deal pipeline board ────────────────────────────────────── */

function Crm() {
  const columns = [
    { name: "Lead", cards: 3, tone: "bg-fg/15" },
    { name: "Qualified", cards: 2, tone: "bg-[#ffb27a]" },
    { name: "Proposal", cards: 2, tone: "bg-brand/70" },
    { name: "Won", cards: 1, tone: "bg-[#28c840]/70" },
  ];
  return (
    <div className="p-[5%]">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-fg/85" />
        <div className="flex gap-1.5">
          <div className="h-4 w-10 rounded-full border border-fg/20" />
          <div className="h-4 w-12 rounded-full bg-brand" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {columns.map((c) => (
          <div key={c.name} className="space-y-1.5 rounded-lg bg-ink p-1.5">
            <div className="flex items-center gap-1 px-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${c.tone}`} />
              <Label className="text-fg/60">{c.name}</Label>
            </div>
            {Array.from({ length: c.cards }).map((_, i) => (
              <div key={i} className="space-y-1 rounded-md border border-line bg-surface p-1.5">
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-fg/15" />
                  <div className="h-1.5 w-[70%] rounded bg-fg/60" />
                </div>
                <Bar w="85%" className="!h-1.5" />
                <div className={`h-1.5 w-8 rounded ${c.tone}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Business OS: sidebar, KPIs, tasks ───────────────────────────── */

function Os() {
  const kpis = ["bg-brand", "bg-fg/80", "bg-[#28c840]/80"];
  const tasks = [
    { done: true, tag: "bg-[#28c840]/20" },
    { done: false, tag: "bg-brand/20" },
    { done: false, tag: "bg-[#ffb27a]/40" },
  ];
  return (
    <div className="grid h-full grid-cols-[22%_1fr]">
      <div className="space-y-2 bg-[#141416] p-2.5">
        <div className="mb-3 h-2.5 w-[70%] rounded bg-white/80" />
        {[true, false, false, false, false].map((on, i) => (
          <div key={i} className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${on ? "bg-brand" : ""}`}>
            <span className={`h-2 w-2 rounded-sm ${on ? "bg-white" : "bg-white/30"}`} />
            <div className={`h-1.5 flex-1 rounded ${on ? "bg-white/90" : "bg-white/25"}`} />
          </div>
        ))}
      </div>
      <div className="space-y-2.5 p-[4%]">
        <div className="h-3 w-[40%] rounded bg-fg/85" />
        <div className="grid grid-cols-3 gap-2">
          {kpis.map((c, i) => (
            <div key={i} className="rounded-lg border border-line p-2">
              <Bar w="60%" className="!h-1.5" />
              <div className={`mt-1.5 h-3 w-[55%] rounded ${c}`} />
            </div>
          ))}
        </div>
        <div className="space-y-1.5 rounded-lg border border-line p-2">
          <Label className="text-fg/60">Tasks &amp; approvals</Label>
          {tasks.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`grid h-3 w-3 place-items-center rounded-sm border ${t.done ? "border-brand bg-brand" : "border-fg/25"}`} />
              <div className="h-1.5 flex-1 rounded bg-fg/30" />
              <div className={`h-2.5 w-9 rounded-full ${t.tag}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
