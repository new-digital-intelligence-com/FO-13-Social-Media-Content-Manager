"use client";

import { useEffect, useState } from "react";
import { AiAssist } from "../AiAssist";
import {
  Button,
  Card,
  Empty,
  ErrorNote,
  Field,
  Loading,
  Note,
  Stat,
  inputClass,
} from "../ui";

type Me = {
  id?: string;
  username?: string;
  name?: string;
  description?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
  };
};

export function XOverview({ me, usage }: { me: Me | null; usage: unknown }) {
  const m = me?.public_metrics;
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-lg font-semibold">@{me?.username ?? "unknown"}</h2>
        <p className="text-sm text-black/55">{me?.name}</p>
        {me?.description && <p className="mt-2 text-sm">{me.description}</p>}
        <p className="mt-1 font-mono text-xs text-black/35">ID {me?.id}</p>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-black/10 pt-5 sm:grid-cols-4">
          <Stat label="Followers" value={m?.followers_count ?? "—"} />
          <Stat label="Following" value={m?.following_count ?? "—"} />
          <Stat label="Posts" value={m?.tweet_count ?? "—"} />
          <Stat label="Listed" value={m?.listed_count ?? "—"} />
        </div>
      </Card>
      {usage ? (
        <Card>
          <h3 className="font-medium">Monthly post usage</h3>
          <p className="mt-1 text-sm text-black/55">
            X caps posts per month by plan tier.
          </p>
          <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-black/[0.04] p-3 text-xs">
            {JSON.stringify(usage, null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}

/* ---------- compose ---------- */

export function XCompose({ me }: { me: Me | null }) {
  const [parts, setParts] = useState<string[]>([""]);
  const [replyToId, setReplyToId] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const isThread = parts.length > 1;
  const over = parts.find((p) => p.length > 280);
  const ready = parts.some((p) => p.trim()) || mediaIds.length > 0;

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/x/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else if (data.mediaId) setMediaIds([...mediaIds, data.mediaId]);
      else setError("Upload finished but X returned no media id.");
    } finally {
      setUploading(false);
    }
  }

  async function post() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/x/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread: isThread ? parts.filter((p) => p.trim()) : undefined,
          text: isThread ? undefined : parts[0],
          replyToId: replyToId || undefined,
          quoteId: quoteId || undefined,
          mediaIds: mediaIds.length ? mediaIds : undefined,
          pollOptions: pollOptions.trim()
            ? pollOptions.split(",").map((o) => o.trim()).filter(Boolean)
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else {
        setResult(`Posted ${data.created?.length ?? 1} item(s).`);
        setParts([""]);
        setMediaIds([]);
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        {parts.map((part, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {isThread ? `Post ${i + 1}` : "Post"}
              </span>
              <span
                className={`text-xs tabular-nums ${
                  part.length > 280 ? "text-red-600" : "text-black/45"
                }`}
              >
                {part.length}/280
              </span>
            </div>
            <textarea
              rows={3}
              value={part}
              onChange={(e) =>
                setParts(parts.map((p, j) => (i === j ? e.target.value : p)))
              }
              placeholder="What's happening?"
              className={inputClass}
            />
            {parts.length > 1 && (
              <button
                onClick={() => setParts(parts.filter((_, j) => j !== i))}
                className="text-xs text-black/50 underline"
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={() => setParts([...parts, ""])}>
            + Add to thread
          </Button>
          <label className="cursor-pointer rounded-xl border border-black/15 px-4 py-2 text-sm font-medium hover:border-black/35">
            {uploading ? "Uploading…" : "Attach media"}
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
          </label>
          <AiAssist
            platform="x"
            task="caption"
            context={[
              `Writing an X post (280 characters max) for @${me?.username ?? ""}.`,
              isThread ? `It is post 1 of a ${parts.length}-post thread.` : null,
              parts.filter((p) => p.trim()).length
                ? `Draft so far:\n${parts.filter((p) => p.trim()).join("\n---\n")}`
                : null,
              replyToId ? `It is a reply to post ${replyToId}.` : null,
              quoteId ? `It quotes post ${quoteId}.` : null,
            ]
              .filter(Boolean)
              .join("\n")}
            placeholder="What is the post about?"
            onInsert={(t) =>
              setParts((p) => [t.split("\n")[0].slice(0, 280), ...p.slice(1)])
            }
          />
        </div>

        {mediaIds.length > 0 && (
          <p className="text-xs text-black/50">
            {mediaIds.length} media attached ({mediaIds.join(", ")})
          </p>
        )}

        <details className="rounded-xl border border-black/10 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Reply, quote or poll
          </summary>
          <div className="mt-3 space-y-3">
            <Field label="Reply to post ID">
              <input
                value={replyToId}
                onChange={(e) => setReplyToId(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Quote post ID">
              <input
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Poll options" hint="Comma separated, 2–4 options.">
              <input
                value={pollOptions}
                onChange={(e) => setPollOptions(e.target.value)}
                placeholder="Yes, No, Maybe"
                className={inputClass}
              />
            </Field>
          </div>
        </details>

        <ErrorNote>{error}</ErrorNote>
        {over && (
          <ErrorNote>
            One post is {over.length} characters. X allows 280 — split it into a
            thread.
          </ErrorNote>
        )}
        {result && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
            {result}
          </p>
        )}

        {confirming ? (
          <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-medium">
              Post {isThread ? `this ${parts.filter((p) => p.trim()).length}-post thread` : "this"} to
              @{me?.username}?
            </p>
            <p className="text-sm text-black/60">
              It is public immediately. Deleting later does not recall replies or
              reposts.
            </p>
            <div className="flex gap-2">
              <Button onClick={post} disabled={busy}>
                {busy ? "Posting…" : "Yes, post it"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setConfirming(true)} disabled={!ready || !!over || busy}>
            {isThread ? "Post thread" : "Post"}
          </Button>
        )}
      </Card>
    </div>
  );
}

/* ---------- timeline ---------- */

type Post = {
  id: string;
  text?: string;
  created_at?: string;
  public_metrics?: Record<string, number>;
};

export function XTimeline({ me }: { me: Me | null }) {
  const [view, setView] = useState<"home" | "bookmarks" | "liked">("home");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["home", "bookmarks", "liked"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition ${
              view === v ? "bg-brand text-white" : "bg-black/[0.06] text-black/70"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <TimelineView key={view} view={view} userId={me?.id} />
    </div>
  );
}

function TimelineView({ view, userId }: { view: string; userId?: string }) {
  const [data, setData] = useState<{ posts?: Post[]; note?: string; error?: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const url = `/api/x/timeline?view=${view}${userId ? `&userId=${userId}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData({ error: "Network error." }));
    return () => {
      cancelled = true;
    };
  }, [view, userId]);

  if (!data) return <Loading />;
  if (data.error) return <ErrorNote>{data.error}</ErrorNote>;

  const posts = Array.isArray(data.posts) ? data.posts : [];
  if (posts.length === 0)
    return <Empty title="Nothing here" hint="X returned no posts for this view." />;

  return (
    <div className="space-y-3">
      <Note>{data.note}</Note>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} userId={userId} />
      ))}
    </div>
  );
}

export function PostCard({ post, userId }: { post: Post; userId?: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function act(action: string) {
    setStatus("…");
    const res = await fetch("/api/x/engage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, tweetId: post.id, userId }),
    });
    const data = await res.json();
    setStatus(res.ok ? "done" : data.error);
  }

  const m = post.public_metrics ?? {};

  return (
    <Card className="space-y-2">
      <p className="whitespace-pre-wrap text-sm">{post.text}</p>
      <p className="text-xs text-black/45">
        {post.created_at?.slice(0, 10)} · ♥ {m.like_count ?? 0} · ↺{" "}
        {m.retweet_count ?? 0} · 💬 {m.reply_count ?? 0}
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {["like", "retweet", "bookmark"].map((a) => (
          <button
            key={a}
            onClick={() => act(a)}
            className="rounded-lg border border-black/12 px-2.5 py-1 text-xs capitalize hover:border-black/30"
          >
            {a}
          </button>
        ))}
        {status && <span className="text-xs text-black/45">{status}</span>}
      </div>
    </Card>
  );
}

/* ---------- search ---------- */

export function XSearch({ me }: { me: Me | null }) {
  const [q, setQ] = useState(me?.username ? `@${me.username}` : "");
  const [archive, setArchive] = useState(false);
  const [countsOnly, setCountsOnly] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setData(null);
    const url = `/api/x/search?q=${encodeURIComponent(q)}${archive ? "&archive=1" : ""}${
      countsOnly ? "&counts=1" : ""
    }`;
    const res = await fetch(url);
    setData(await res.json());
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <Note>
          X has no mentions endpoint here — monitoring your handle means
          searching for it. Recent search covers roughly the last 7 days on most
          plans.
        </Note>
        <Field label="Query" hint="Supports from:, -is:retweet, has:media, OR, quotes.">
          <input value={q} onChange={(e) => setQ(e.target.value)} className={inputClass} />
        </Field>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={archive}
              onChange={(e) => setArchive(e.target.checked)}
            />
            Full archive (needs higher plan tier)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={countsOnly}
              onChange={(e) => setCountsOnly(e.target.checked)}
            />
            Volume only
          </label>
        </div>
        <Button onClick={run} disabled={busy || !q.trim()}>
          {busy ? "Searching…" : "Search"}
        </Button>
      </Card>

      {data?.error ? (
        <ErrorNote>{String(data.error)}</ErrorNote>
      ) : data ? (
        <Card>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(data.results ?? data.counts ?? data, null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}

/* ---------- lists ---------- */

export function XLists({ me }: { me: Me | null }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    if (!me?.id) return;
    const res = await fetch(`/api/x/lists?userId=${me.id}`);
    setData(await res.json());
  };

  useEffect(() => {
    let cancelled = false;
    if (!me?.id) return;
    fetch(`/api/x/lists?userId=${me.id}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [me?.id]);

  async function create() {
    setStatus("Creating…");
    const res = await fetch("/api/x/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name }),
    });
    const d = await res.json();
    setStatus(res.ok ? "Created." : d.error);
    if (res.ok) {
      setName("");
      load();
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h3 className="font-medium">Create a list</h3>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="List name"
            className={inputClass}
          />
          <Button onClick={create} disabled={!name.trim()}>
            Create
          </Button>
        </div>
        {status && <p className="text-sm text-black/55">{status}</p>}
      </Card>

      {!data ? (
        <Loading />
      ) : data.error ? (
        <ErrorNote>{String(data.error)}</ErrorNote>
      ) : (
        <Card>
          <h3 className="mb-2 font-medium">Your lists</h3>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(data.owned ?? data, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}

/* ---------- DMs ---------- */

/**
 * Recent messages with one person, as context for drafting a reply.
 *
 * A reply drafted with no idea what was said is the failure the comment
 * drafting hit: the model has nothing to work from and asks for the message.
 */
function dmContext(data: Record<string, unknown> | null, participantId: string) {
  const events = (data?.events as
    | { text?: string; sender_id?: string; senderId?: string }[]
    | undefined) ?? [];
  const relevant = participantId.trim()
    ? events.filter(
        (e) => e.sender_id === participantId || e.senderId === participantId,
      )
    : events;
  const lines = (relevant.length ? relevant : events)
    .slice(-6)
    .map((e) => e.text)
    .filter(Boolean);
  return lines.length
    ? `Recent messages in this conversation:\n${lines.join("\n")}\nReply in the same language.`
    : "";
}

export function XDms() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [participantId, setParticipantId] = useState("");
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/x/dms")
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function send() {
    setStatus("Sending…");
    const res = await fetch("/api/x/dms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, text }),
    });
    const d = await res.json();
    setStatus(res.ok ? "Sent." : d.error);
    if (res.ok) setText("");
    setConfirming(false);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h3 className="font-medium">Send a direct message</h3>
        <Field label="Recipient user ID" hint="Numeric id, not the @handle.">
          <input
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Message">
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClass}
          />
        </Field>
        <AiAssist
          platform="x"
          task="dm-reply"
          context={dmContext(data, participantId)}
          placeholder="What should the message say?"
          onInsert={setText}
        />
        {confirming ? (
          <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-medium">Send this DM? It cannot be recalled.</p>
            <div className="flex gap-2">
              <Button onClick={send}>Yes, send</Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setConfirming(true)}
            disabled={!participantId.trim() || !text.trim()}
          >
            Send DM
          </Button>
        )}
        {status && <p className="text-sm text-black/55">{status}</p>}
      </Card>

      {data && !data.error ? (
        <Card>
          <h3 className="mb-2 font-medium">Recent DM activity</h3>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(data.events ?? data, null, 2)}
          </pre>
        </Card>
      ) : data?.error ? (
        <ErrorNote>{String(data.error)}</ErrorNote>
      ) : null}
    </div>
  );
}
