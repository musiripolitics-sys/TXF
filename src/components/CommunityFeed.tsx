"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createPost, createComment } from "@/app/community/actions";
import { toast } from "./Toast";

type Post = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
};

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  parent_id: string | null;
};

type Channel =
  | { type: "topic"; key: "all" | "meetups" | "tech"; label: string }
  | { type: "event"; id: string; label: string };

type Gate = { minBalance: number; cost: number };

const TOPICS: Channel[] = [
  { type: "topic", key: "all", label: "All" },
  { type: "topic", key: "meetups", label: "Meetups" },
  { type: "topic", key: "tech", label: "Tech Clarifications" },
];

type Sort = "hot" | "new" | "top";
const SORTS: { key: Sort; label: string }[] = [
  { key: "hot", label: "Hot" },
  { key: "new", label: "New" },
  { key: "top", label: "Top" },
];

const roleBadge: Record<string, string> = {
  Host: "bg-host/15 text-host-soft",
  Admin: "bg-[#2563eb]/15 text-[#2563eb]",
  Member: "bg-ink-2 text-faint",
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?";
}

/**
 * Reddit-style "hot": reactions decayed by age, so a good post from this
 * morning outranks a quiet one from last week. Without this, a low-traffic
 * feed sorted only by date always looks dead.
 */
function hotScore(post: Post, reactionCount: number): number {
  const hours = (Date.now() - new Date(post.created_at).getTime()) / 3.6e6;
  return (reactionCount + 1) / Math.pow(hours + 2, 1.5);
}

export function CommunityFeed({
  currentUserId,
  isAdmin,
  eventGroups = [],
  gates = {},
  balance = 0,
}: {
  currentUserId: string;
  isAdmin: boolean;
  eventGroups?: { id: string; title: string }[];
  gates?: Record<string, Gate>;
  balance?: number;
}) {
  const supabase = createClient();
  const eventChannels: Channel[] = eventGroups.map((g) => ({
    type: "event",
    id: g.id,
    label: g.title,
  }));

  const [active, setActive] = useState<Channel>(TOPICS[0]);
  const [sort, setSort] = useState<Sort>("hot");
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Record<string, { count: number; mine: boolean }>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const isEvent = active.type === "event";

  // Which gate applies to the composer right now, and can this member clear it?
  const gate = gates[isEvent ? "post_group" : "post_global"] ?? { minBalance: 0, cost: 0 };
  const canPost = isAdmin || balance >= gate.minBalance;
  const commentGate = gates.comment ?? { minBalance: 0, cost: 0 };
  const canComment = isAdmin || balance >= commentGate.minBalance;

  const load = useCallback(async () => {
    let q = supabase
      .from("posts")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    q = active.type === "event"
      ? q.eq("event_id", active.id)
      : q.eq("channel", active.key).is("event_id", null);

    const { data: postRows } = await q;
    const list = (postRows as Post[]) ?? [];
    setPosts(list);

    const ids = list.map((p) => p.id);
    if (ids.length > 0) {
      const [{ data: rx }, { data: cm }] = await Promise.all([
        supabase.from("post_reactions").select("post_id,user_id").in("post_id", ids),
        supabase.from("post_comments").select("*").in("post_id", ids).order("created_at", { ascending: true }),
      ]);
      const rmap: Record<string, { count: number; mine: boolean }> = {};
      for (const r of (rx as { post_id: string; user_id: string }[]) ?? []) {
        const e = (rmap[r.post_id] ??= { count: 0, mine: false });
        e.count++;
        if (r.user_id === currentUserId) e.mine = true;
      }
      setReactions(rmap);
      const cmap: Record<string, Comment[]> = {};
      for (const c of (cm as Comment[]) ?? []) (cmap[c.post_id] ??= []).push(c);
      setComments(cmap);
    } else {
      setReactions({});
      setComments({});
    }
    setLoading(false);
  }, [supabase, currentUserId, active]);

  useEffect(() => {
    load();
  }, [load]);

  /** Pinned posts always lead; the chosen sort orders the rest. */
  const ordered = useMemo(() => {
    const rest = [...posts];
    rest.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const ra = reactions[a.id]?.count ?? 0;
      const rb = reactions[b.id]?.count ?? 0;
      if (sort === "top") return rb - ra;
      if (sort === "new") return b.created_at.localeCompare(a.created_at);
      return hotScore(b, rb) - hotScore(a, ra);
    });
    return rest;
  }, [posts, reactions, sort]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    const res = await createPost(
      body,
      active.type === "topic" ? active.key : "event",
      active.type === "event" ? active.id : null,
    );
    setPosting(false);
    if (res.error) return toast(res.error, "error");
    setBody("");
    await load();
  };

  const removePost = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    setPosts((p) => p.filter((x) => x.id !== id));
  };

  const togglePin = async (post: Post) => {
    await supabase.from("posts").update({ pinned: !post.pinned }).eq("id", post.id);
    await load();
  };

  const toggleLike = async (postId: string) => {
    const cur = reactions[postId] ?? { count: 0, mine: false };
    setReactions((r) => ({ ...r, [postId]: { count: cur.count + (cur.mine ? -1 : 1), mine: !cur.mine } }));
    if (cur.mine) {
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", currentUserId);
    } else {
      await supabase.from("post_reactions").insert({ post_id: postId, user_id: currentUserId });
    }
  };

  const addComment = async (postId: string) => {
    const text = (drafts[postId] ?? "").trim();
    if (!text) return;
    const res = await createComment(postId, text, replyTo[postId] ?? null);
    if (res.error) return toast(res.error, "error");
    setDrafts((d) => ({ ...d, [postId]: "" }));
    setReplyTo((r) => ({ ...r, [postId]: null }));
    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setComments((c) => ({ ...c, [postId]: (data as Comment[]) ?? [] }));
  };

  const removeComment = async (postId: string, id: string) => {
    await supabase.from("post_comments").delete().eq("id", id);
    setComments((c) => ({ ...c, [postId]: (c[postId] ?? []).filter((x) => x.id !== id) }));
  };

  const isActive = (c: Channel) =>
    c.type === active.type &&
    (c.type === "topic"
      ? c.key === (active as { key: string }).key
      : c.id === (active as { id: string }).id);

  // Switching channels shows the spinner immediately; load() only ever turns
  // it off, so no state is set synchronously inside the effect.
  const pick = (c: Channel) => {
    if (!isActive(c)) setLoading(true);
    setActive(c);
  };

  const railItem = (c: Channel, key: string) => (
    <button
      key={key}
      onClick={() => pick(c)}
      className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        isActive(c)
          ? "bg-brand/10 font-semibold text-brand-soft"
          : "text-muted hover:bg-surface-2 hover:text-fg"
      }`}
    >
      {c.label}
    </button>
  );

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
      {/* Rail — channels, your groups, and what you can spend */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
          Channels
        </p>
        <div className="mt-1.5 flex flex-col gap-0.5">
          {TOPICS.map((c) => railItem(c, c.label))}
        </div>

        <p className="mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
          Your session groups
        </p>
        <div className="mt-1.5 flex flex-col gap-0.5">
          {eventChannels.length === 0 ? (
            <p className="px-3 py-2 text-xs leading-relaxed text-faint">
              Attend an event and its group opens here.
            </p>
          ) : (
            eventChannels.map((c) => railItem(c, (c as { id: string }).id))
          )}
        </div>

        <div className="mt-5 rounded-xl border border-line bg-surface p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              Credits
            </span>
            <span className="font-display text-lg font-bold tabular-nums text-fg">
              {balance}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-faint">
            Earn 10 each time you attend a session.
          </p>
          <Link
            href="/profile#credits"
            className="mt-2 inline-block text-xs font-medium text-brand-soft hover:underline"
          >
            See history →
          </Link>
        </div>
      </aside>

      {/* Feed */}
      <div>
        {isEvent && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
            <p className="text-sm text-muted">
              Private to people who attended{" "}
              <span className="font-medium text-fg">{active.label}</span>.
            </p>
            <Link
              href={`/community/g/${(active as { id: string }).id}`}
              className="shrink-0 text-sm font-medium text-brand-soft hover:underline"
            >
              Group home →
            </Link>
          </div>
        )}

        {/* Sort */}
        <div className="flex items-center gap-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === s.key
                  ? "bg-ink-2 text-fg"
                  : "text-faint hover:text-fg"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Composer — states the requirement before anything is typed */}
        <form onSubmit={submit} className="mt-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            disabled={!canPost}
            placeholder={
              canPost
                ? isEvent
                  ? `Share something with the ${active.label} group…`
                  : "Share a win, ask a question…"
                : "You don't have enough credits to post here yet."
            }
            className="w-full resize-y rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-faint">
              {canPost ? (
                gate.minBalance > 0 ? (
                  <>
                    Posting here needs {gate.minBalance} credits — you have{" "}
                    <span className="font-medium text-muted">{balance}</span>.
                  </>
                ) : (
                  "Be kind. Admins can pin and remove posts."
                )
              ) : (
                <>
                  Posting here needs {gate.minBalance} credits — you have{" "}
                  <span className="font-medium text-muted">{balance}</span>. Attend a
                  session to earn 10 more.
                </>
              )}
            </p>
            <button
              type="submit"
              disabled={posting || !body.trim() || !canPost}
              className="shrink-0 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>

        {/* Posts */}
        {loading ? (
          <p className="mt-10 text-sm text-faint">Loading…</p>
        ) : ordered.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-line px-5 py-10 text-center">
            <p className="text-sm font-medium text-fg">Nothing here yet</p>
            <p className="mt-1 text-sm text-faint">
              {isEvent
                ? "Be the first to post in this group."
                : "Start the conversation."}
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {ordered.map((p) => {
              const rx = reactions[p.id] ?? { count: 0, mine: false };
              const all = comments[p.id] ?? [];
              const roots = all.filter((c) => !c.parent_id);
              const kids = (id: string) => all.filter((c) => c.parent_id === id);
              const mine = p.author_id === currentUserId;

              return (
                <article
                  key={p.id}
                  className="rounded-xl border border-line bg-surface p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-join text-xs font-bold text-white">
                      {initials(p.author_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-fg">
                          {p.author_name}
                        </span>
                        {p.author_role && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              roleBadge[p.author_role] ?? roleBadge.Member
                            }`}
                          >
                            {p.author_role}
                          </span>
                        )}
                        {p.pinned && (
                          <span className="rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-soft">
                            Pinned
                          </span>
                        )}
                        <span className="text-xs text-faint">{timeAgo(p.created_at)}</span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                        {p.body}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                        <button
                          onClick={() => toggleLike(p.id)}
                          className={`font-medium transition-colors ${
                            rx.mine ? "text-brand" : "text-faint hover:text-fg"
                          }`}
                        >
                          ▲ {rx.count}
                        </button>
                        <button
                          onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}
                          className="font-medium text-faint transition-colors hover:text-fg"
                        >
                          {all.length} {all.length === 1 ? "comment" : "comments"}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => togglePin(p)}
                            className="font-medium text-faint transition-colors hover:text-fg"
                          >
                            {p.pinned ? "Unpin" : "Pin"}
                          </button>
                        )}
                        {(mine || isAdmin) && (
                          <button
                            onClick={() => removePost(p.id)}
                            className="font-medium text-faint transition-colors hover:text-red-500"
                          >
                            Delete
                          </button>
                        )}
                      </div>

                      {open[p.id] && (
                        <div className="mt-4 border-t border-line pt-3">
                          <div className="flex flex-col gap-3">
                            {roots.map((c) => (
                              <div key={c.id}>
                                <CommentRow
                                  c={c}
                                  currentUserId={currentUserId}
                                  isAdmin={isAdmin}
                                  onDelete={() => removeComment(p.id, c.id)}
                                  onReply={() =>
                                    setReplyTo((r) => ({
                                      ...r,
                                      [p.id]: r[p.id] === c.id ? null : c.id,
                                    }))
                                  }
                                  replying={replyTo[p.id] === c.id}
                                />
                                {kids(c.id).length > 0 && (
                                  <div className="mt-2 flex flex-col gap-2 border-l border-line pl-4">
                                    {kids(c.id).map((k) => (
                                      <CommentRow
                                        key={k.id}
                                        c={k}
                                        currentUserId={currentUserId}
                                        isAdmin={isAdmin}
                                        onDelete={() => removeComment(p.id, k.id)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {canComment ? (
                            <div className="mt-3">
                              {replyTo[p.id] && (
                                <p className="mb-1.5 text-xs text-faint">
                                  Replying to{" "}
                                  <span className="font-medium text-muted">
                                    {all.find((c) => c.id === replyTo[p.id])?.author_name}
                                  </span>{" "}
                                  <button
                                    onClick={() => setReplyTo((r) => ({ ...r, [p.id]: null }))}
                                    className="underline hover:text-fg"
                                  >
                                    cancel
                                  </button>
                                </p>
                              )}
                              <div className="flex gap-2">
                                <input
                                  value={drafts[p.id] ?? ""}
                                  onChange={(e) =>
                                    setDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      addComment(p.id);
                                    }
                                  }}
                                  placeholder="Write a comment…"
                                  className="flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none"
                                />
                                <button
                                  onClick={() => addComment(p.id)}
                                  className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-fg hover:border-brand hover:text-brand"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-faint">
                              Commenting needs {commentGate.minBalance} credits — you have{" "}
                              {balance}. Attend a session to earn 10 more.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentRow({
  c,
  currentUserId,
  isAdmin,
  onDelete,
  onReply,
  replying,
}: {
  c: Comment;
  currentUserId: string;
  isAdmin: boolean;
  onDelete: () => void;
  onReply?: () => void;
  replying?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-2 text-[10px] font-bold text-faint">
        {initials(c.author_name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-fg">{c.author_name}</span>
          <span className="text-[11px] text-faint">{timeAgo(c.created_at)}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {c.body}
        </p>
        <div className="mt-1 flex items-center gap-3">
          {onReply && (
            <button
              onClick={onReply}
              className={`text-[11px] font-medium transition-colors ${
                replying ? "text-brand" : "text-faint hover:text-fg"
              }`}
            >
              Reply
            </button>
          )}
          {(c.author_id === currentUserId || isAdmin) && (
            <button
              onClick={onDelete}
              className="text-[11px] font-medium text-faint transition-colors hover:text-red-500"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
