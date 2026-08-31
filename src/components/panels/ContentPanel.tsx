"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AiAssist } from "../AiAssist";
import { Button, Card, Empty, ErrorNote, Loading, Note, inputClass } from "../ui";

type Media = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

/** `filter` splits the same media list into the Posts / Reels / Stories tabs. */
export function ContentPanel({ filter }: { filter: "all" | "reels" | "stories" }) {
  const [items, setItems] = useState<Media[] | null>(null);
  const [note, setNote] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = filter === "stories" ? "/api/ig/stories" : "/api/ig/media?limit=48";

    (async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error);
          return;
        }
        const list: Media[] = (filter === "stories" ? data.stories : data.media) ?? [];
        setItems(
          filter === "reels"
            ? list.filter(
                (m) => m.media_product_type === "REELS" || m.media_type === "VIDEO",
              )
            : list,
        );
        setNote(data.note);
      } catch {
        if (!cancelled) setError("Network error.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filter]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!items) return <Loading label="Loading content…" />;

  if (selected) {
    return <MediaDetail id={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-5">
      <Note>{note}</Note>

      {items.length === 0 ? (
        <Empty
          title={
            filter === "stories"
              ? "No active stories"
              : filter === "reels"
                ? "No reels yet"
                : "No posts yet"
          }
          hint={
            filter === "stories"
              ? "Stories expire after 24 hours, and expired ones are not retrievable through the API."
              : "Publish from the Compose tab to see content here."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className="group overflow-hidden rounded-xl border border-black/10 bg-white text-left transition hover:border-black/30"
            >
              <div className="relative aspect-square bg-black/5">
                {m.thumbnail_url || m.media_url ? (
                  <Image
                    src={m.thumbnail_url ?? m.media_url!}
                    alt={m.caption?.slice(0, 60) ?? "Post"}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-2 text-xs text-black/65">
                  {m.caption || "No caption"}
                </p>
                <p className="text-[11px] text-black/40">
                  ♥ {m.like_count ?? 0} · 💬 {m.comments_count ?? 0}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<{
    media?: Media;
    insights?: unknown;
    note?: string;
    error?: string;
  } | null>(null);
  const [comments, setComments] = useState<
    { id: string; text?: string; username?: string }[] | null
  >(null);
  const [commentsNote, setCommentsNote] = useState<string | undefined>();
  const [reply, setReply] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  /** Draft reply per comment id, so each is reviewed on its own comment. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [drafting, setDrafting] = useState<string | null>(null);
  const [posting, setPosting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ig/media?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d));
    fetch(`/api/ig/comments?mediaId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setComments(d.comments ?? []);
        setCommentsNote(d.note ?? d.error);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  /**
   * Draft a reply to one specific comment.
   *
   * The comment text is the whole point of the context — without it the model
   * has nothing to reply to and asks which comment you mean.
   */
  async function draftReply(comment: { id: string; text?: string; username?: string }) {
    setDrafting(comment.id);
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "comment-reply-one",
          prompt: `Reply to this comment:\n@${comment.username ?? "user"}: ${comment.text ?? ""}`,
          context: [
            m?.caption ? `The post says: ${m.caption}` : null,
            `Reply in the same language as the comment.`,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      const data = await res.json();
      if (!res.ok) setStatus(data.error);
      else setDrafts((d) => ({ ...d, [comment.id]: (data.text ?? "").trim() }));
    } catch {
      setStatus("Network error.");
    } finally {
      setDrafting(null);
    }
  }

  /** Draft for every comment that has no draft yet, one at a time. */
  async function draftAll() {
    const pending = (comments ?? []).filter((c) => !drafts[c.id]);
    setDrafting("all");
    for (const comment of pending) {
      await draftReply(comment);
    }
    setDrafting(null);
  }

  /** Post one comment's draft. Public and immediate, so it stays per-comment. */
  async function postDraft(commentId: string) {
    const text = drafts[commentId]?.trim();
    if (!text) return;
    setPosting(commentId);
    const res = await fetch("/api/ig/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, message: text }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Reply posted." : data.error);
    if (res.ok) {
      setDrafts((d) => {
        const next = { ...d };
        delete next[commentId];
        return next;
      });
    }
    setPosting(null);
  }

  async function send() {
    if (!reply.trim()) return;
    setStatus("Sending…");
    const res = await fetch("/api/ig/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        replyTo ? { commentId: replyTo, message: reply } : { mediaId: id, message: reply },
      ),
    });
    const result = await res.json();
    setStatus(res.ok ? "Posted." : result.error);
    if (res.ok) {
      setReply("");
      setReplyTo(null);
    }
  }

  if (!data) return <Loading />;
  if (data.error) return <ErrorNote>{data.error}</ErrorNote>;

  const m = data.media;

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack}>
        ← Back
      </Button>

      <Card>
        <div className="flex flex-wrap gap-5">
          {(m?.media_url || m?.thumbnail_url) && (
            <Image
              src={m.thumbnail_url ?? m.media_url!}
              alt="Post"
              width={200}
              height={200}
              unoptimized
              className="rounded-xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="whitespace-pre-wrap text-sm">{m?.caption || "No caption"}</p>
            <p className="text-xs text-black/45">
              {m?.media_type} · {m?.timestamp?.slice(0, 10)} · ♥ {m?.like_count ?? 0} · 💬{" "}
              {m?.comments_count ?? 0}
            </p>
            {m?.permalink && (
              <a
                href={m.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium underline"
              >
                View on Instagram
              </a>
            )}
          </div>
        </div>
      </Card>

      {data.insights ? (
        <Card>
          <h3 className="font-medium">Insights</h3>
          <pre className="mt-2 max-h-56 overflow-auto rounded-xl bg-black/[0.04] p-3 text-xs">
            {JSON.stringify(data.insights, null, 2)}
          </pre>
        </Card>
      ) : null}

      <Card>
        <h3 className="font-medium">Comments</h3>
        <Note>{commentsNote}</Note>
        {comments === null ? (
          <Loading />
        ) : comments.length === 0 ? (
          <p className="mt-2 text-sm text-black/45">No comments.</p>
        ) : (
          <>
            {comments.length > 1 && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={draftAll}
                  disabled={drafting !== null}
                >
                  {drafting === "all"
                    ? "Drafting…"
                    : `Draft a reply for all ${comments.length}`}
                </Button>
                <span className="text-xs text-black/45">
                  Drafts only — each is posted separately by you.
                </span>
              </div>
            )}

            <ul className="mt-3 space-y-3">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-black/10 p-3 text-sm"
                >
                  <div>
                    <span className="font-medium">@{c.username ?? "user"}</span>{" "}
                    <span>{c.text}</span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setReplyTo(c.id)}
                      className="text-xs text-black/45 underline"
                    >
                      reply manually
                    </button>
                    <button
                      onClick={() => draftReply(c)}
                      disabled={drafting !== null}
                      className="text-xs font-medium text-brand-ink hover:underline disabled:opacity-40"
                    >
                      {drafting === c.id ? "Drafting…" : "✨ Draft a reply"}
                    </button>
                  </div>

                  {drafts[c.id] !== undefined && (
                    <div className="mt-2 space-y-2 rounded-lg bg-brand/[0.04] p-2.5">
                      <textarea
                        value={drafts[c.id]}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [c.id]: e.target.value }))
                        }
                        rows={2}
                        className={inputClass}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          onClick={() => postDraft(c.id)}
                          disabled={posting === c.id || !drafts[c.id]?.trim()}
                        >
                          {posting === c.id ? "Posting…" : "Post this reply"}
                        </Button>
                        <button
                          onClick={() => draftReply(c)}
                          disabled={drafting !== null}
                          className="text-xs text-black/50 underline"
                        >
                          regenerate
                        </button>
                        <button
                          onClick={() =>
                            setDrafts((d) => {
                              const next = { ...d };
                              delete next[c.id];
                              return next;
                            })
                          }
                          className="text-xs text-black/50 underline"
                        >
                          discard
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-4 space-y-3">
          {replyTo && (
            <p className="text-xs text-black/50">
              Replying to @
              {comments?.find((c) => c.id === replyTo)?.username ?? "user"} ·{" "}
              <button onClick={() => setReplyTo(null)} className="underline">
                cancel
              </button>
            </p>
          )}
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder={replyTo ? "Your reply…" : "Comment on this post…"}
            className={inputClass}
          />
          <AiAssist
            task="comment-reply"
            context={[
              replyTo
                ? `Replying to @${comments?.find((c) => c.id === replyTo)?.username ?? "user"}: ${
                    comments?.find((c) => c.id === replyTo)?.text ?? ""
                  }`
                : null,
              m?.caption ? `The post says: ${m.caption}` : null,
            ]
              .filter(Boolean)
              .join("\n")}
            placeholder={
              replyTo ? "Any direction for the reply?" : "What should the comment say?"
            }
            onInsert={setReply}
          />
          <div className="flex items-center gap-3">
            <Button onClick={send} disabled={!reply.trim()}>
              {replyTo ? "Post reply" : "Post comment"}
            </Button>
            {status && <span className="text-sm text-black/55">{status}</span>}
          </div>
          <p className="text-xs text-black/45">
            Comments are public and post immediately.
          </p>
        </div>
      </Card>
    </div>
  );
}
