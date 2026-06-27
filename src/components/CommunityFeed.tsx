"use client";

import { useEffect, useState, useCallback } from "react";
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
};

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

export function CommunityFeed({
  currentUserId,
  isAdmin,
}: {
  currentUserId: string;
  isAdmin: boolean;
}) {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Record<string, { count: number; mine: boolean }>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const { data: postRows } = await supabase
      .from("posts")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
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
  }, [supabase, currentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    const res = await createPost(body);
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
    // optimistic
    setReactions((r) => ({
      ...r,
      [postId]: { count: cur.count + (cur.mine ? -1 : 1), mine: !cur.mine },
    }));
    if (cur.mine) {
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", currentUserId);
    } else {
      await supabase.from("post_reactions").insert({ post_id: postId, user_id: currentUserId });
    }
  };

  const addComment = async (postId: string) => {
    const text = (drafts[postId] ?? "").trim();
    if (!text) return;
    const res = await createComment(postId, text);
    if (res.error) return toast(res.error, "error");
    setDrafts((d) => ({ ...d, [postId]: "" }));
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

  return (
    <div className="mt-8 space-y-6">
      {/* Composer */}
      <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Share something with the community…"
          className="w-full resize-none rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-faint">{body.length}/1000</span>
          <button
            type="submit"
            disabled={posting || !body.trim()}
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-soft disabled:opacity-50"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Loading…</p>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <p className="font-display text-lg text-fg">No posts yet.</p>
          <p className="mt-1 text-sm text-muted">Be the first to say hello 👋</p>
        </div>
      ) : (
        posts.map((post) => {
          const canDelete = isAdmin || post.author_id === currentUserId;
          const rx = reactions[post.id] ?? { count: 0, mine: false };
          const cms = comments[post.id] ?? [];
          const isOpen = open[post.id];
          return (
            <article
              key={post.id}
              className={`rounded-2xl border bg-surface p-5 shadow-soft ${post.pinned ? "border-brand/40" : "border-line"}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-join text-sm font-bold text-white">
                  {initials(post.author_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-fg">{post.author_name}</p>
                    {post.author_role && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadge[post.author_role] ?? roleBadge.Member}`}>
                        {post.author_role}
                      </span>
                    )}
                    {post.pinned && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-soft">📌 Pinned</span>
                    )}
                  </div>
                  <p className="text-xs text-faint">{timeAgo(post.created_at)}</p>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-fg">{post.body}</p>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-xs">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`font-medium transition-colors ${rx.mine ? "text-brand-soft" : "text-muted hover:text-fg"}`}
                  aria-pressed={rx.mine}
                >
                  {rx.mine ? "♥" : "♡"} {rx.count > 0 ? rx.count : ""} Like
                </button>
                <button
                  onClick={() => setOpen((o) => ({ ...o, [post.id]: !o[post.id] }))}
                  className="font-medium text-muted hover:text-fg"
                >
                  💬 {cms.length > 0 ? cms.length : ""} Comment{cms.length === 1 ? "" : "s"}
                </button>
                <span className="flex-1" />
                {isAdmin && (
                  <button onClick={() => togglePin(post)} className="font-medium text-muted hover:text-fg">
                    {post.pinned ? "Unpin" : "Pin"}
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => removePost(post.id)} className="font-medium text-red-500 hover:underline">
                    Delete
                  </button>
                )}
              </div>

              {/* Comments */}
              {isOpen && (
                <div className="mt-4 space-y-3 border-t border-line pt-4">
                  {cms.map((c) => (
                    <div key={c.id} className="flex gap-2 text-sm">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-2 text-[10px] font-bold text-faint">
                        {initials(c.author_name)}
                      </span>
                      <div className="min-w-0 flex-1 rounded-xl bg-ink-2 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-fg">{c.author_name}</span>
                          <span className="text-[10px] text-faint">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">{c.body}</p>
                        {(isAdmin || c.author_id === currentUserId) && (
                          <button
                            onClick={() => removeComment(post.id, c.id)}
                            className="mt-1 text-[10px] font-medium text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={drafts[post.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addComment(post.id);
                        }
                      }}
                      placeholder="Write a comment…"
                      aria-label="Write a comment"
                      className="flex-1 rounded-full border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none"
                    />
                    <button
                      onClick={() => addComment(post.id)}
                      disabled={!(drafts[post.id] ?? "").trim()}
                      className="rounded-full bg-fg px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
