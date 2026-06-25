import type { Leader } from "@/lib/data";

export type OrgNode = {
  leader: Leader;
  reports?: Leader[];
};

export type Org = {
  leader: Leader;
  directors: OrgNode[];
};

type TreeNode = {
  leader: Leader;
  tier: keyof typeof tierStyles;
  children: TreeNode[];
};

const tierStyles = {
  founder: "from-brand to-join ring-brand/25",
  director: "from-brand-soft to-join ring-line",
  member: "from-zinc-400 to-zinc-500 ring-line",
} as const;

function toTree(org: Org): TreeNode {
  return {
    leader: org.leader,
    tier: "founder",
    children: org.directors.map((d) => ({
      leader: d.leader,
      tier: "director",
      children: (d.reports ?? []).map((r) => ({
        leader: r,
        tier: "member",
        children: [],
      })),
    })),
  };
}

function Node({ node }: { node: TreeNode }) {
  const isHiring = node.leader.isHiring;
  return (
    <div className="flex w-36 flex-col items-center rounded-2xl border border-line bg-surface px-3 py-4 text-center shadow-soft sm:w-40">
      <span
        className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br font-display text-sm font-bold ring-4 ${
          isHiring
            ? "from-zinc-50 to-zinc-100 text-zinc-400 ring-zinc-50/50 border border-dashed border-zinc-200"
            : `text-white ${tierStyles[node.tier]}`
        }`}
      >
        {node.leader.initials}
      </span>
      <p className="mt-3 text-sm font-semibold leading-tight text-fg">
        {isHiring ? "Hiring" : node.leader.name}
      </p>
      <p className="mt-0.5 text-xs text-faint">{node.leader.role}</p>
    </div>
  );
}

/** Recursive subtree: a node, a vertical drop, then a connected row of children. */
function Subtree({ node }: { node: TreeNode }) {
  const kids = node.children;
  return (
    <div className="flex flex-col items-center">
      <Node node={node} />

      {kids.length > 0 && (
        <>
          {/* drop from this node to the children's horizontal rail */}
          <span className="h-7 w-px bg-line" aria-hidden />

          <div className="flex items-start">
            {kids.map((child, i) => {
              const isFirst = i === 0;
              const isLast = i === kids.length - 1;
              const railSide =
                kids.length === 1
                  ? "hidden"
                  : isFirst
                    ? "left-1/2 right-0"
                    : isLast
                      ? "left-0 right-1/2"
                      : "left-0 right-0";
              return (
                <div
                  key={child.leader.name}
                  className="flex flex-col items-center px-2 sm:px-3"
                >
                  {/* connector: horizontal rail segment + vertical stub to the child */}
                  <div className="relative h-7 w-full" aria-hidden>
                    <span
                      className={`absolute top-0 h-px bg-line ${railSide}`}
                    />
                    <span className="absolute left-1/2 top-0 h-7 w-px -translate-x-1/2 bg-line" />
                  </div>
                  <Subtree node={child} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function OrgTree({ org }: { org: Org }) {
  const tree = toTree(org);
  return (
    <div className="overflow-x-auto pb-4">
      <div className="mx-auto flex min-w-max justify-center px-4">
        <Subtree node={tree} />
      </div>
    </div>
  );
}
