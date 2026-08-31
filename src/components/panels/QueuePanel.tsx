"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Empty, ErrorNote, Loading, Note } from "../ui";

type Post = {
  id: string;
  platform: string;
  caption?: string;
  mediaUrl?: string;
  publishAt: string | null;
  status: "draft" | "scheduled" | "published" | "failed";
  permalink?: string;
  error?: string;
};

type QueueResponse = {
  available: boolean;
  detail?: string;
  needsSetup?: boolean;
  posts: Post[];
};

type Cadence = {
  target: number;
  last7: number;
  last30: number;
  daysSinceLast: number | null;
  averageGapDays: number | null;
  scheduledNext7: number;
  onTrack: boolean;
  shortfall: number;
};

export function QueuePanel({ platform = "instagram" }: { platform?: string }) {
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [cadence, setCadence] = useState<Cadence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/ig/schedule?platform=${platform}`);
    const data: QueueResponse = await res.json();
    setQueue(data);
    if (platform === "instagram") {
      const rhythm = await fetch("/api/ig/cadence").then((r) => r.json()).catch(() => null);
      if (rhythm && !rhythm.error) setCadence(rhythm);
    }
  }, [platform]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await load();
      } catch {
        if (!cancelled) setError("Could not reach the app's own API.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Zernio publishes on its own servers; this only refreshes what we display.
  useEffect(() => {
    const tick = setInterval(() => load().catch(() => {}), 60_000);
    return () => clearInterval(tick);
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    const res = await fetch("/api/ig/schedule", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, platform, ...body }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not update the post.");
    }
    setBusy(null);
    load();
  }

  async function remove(id: string, caption?: string) {
    const label = caption?.trim() ? `"${caption.slice(0, 40)}…"` : "this post";
    if (!confirm(`Delete ${label} from the queue? It will not publish.`)) return;
    setBusy(id);
    await fetch(`/api/ig/schedule?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setBusy(null);
    load();
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!queue) return <Loading label="Loading queue…" />;

  // An unreadable queue is not an empty one. Never render "nothing scheduled"
  // when we simply could not ask.
  if (!queue.available) {
    return (
      <div className="space-y-5">
        {cadence && <CadenceCard cadence={cadence} />}
        <Card className="space-y-2 border-amber-200 bg-amber-50/60">
          <h3 className="font-medium text-amber-900">
            {queue.needsSetup ? "Scheduling is not set up" : "Scheduling is unavailable"}
          </h3>
          <p className="text-sm text-amber-800">{queue.detail}</p>
          <p className="text-sm text-amber-800">
            {queue.needsSetup
              ? "Add ZERNIO_API_KEY to .env.local and connect the account on Zernio, then reload."
              : "Zernio holds and publishes scheduled posts, so nothing can be queued until it is back. Already-scheduled posts are unaffected — they live on Zernio, not here."}
          </p>
          <p className="text-sm text-amber-800">
            You can still <strong>publish immediately</strong> from the Compose
            tab; that path goes through Instagram directly and does not use
            Zernio.
          </p>
          <div>
            <Button variant="ghost" onClick={() => load()}>
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const scheduled = queue.posts.filter((p) => p.status === "scheduled");
  const drafts = queue.posts.filter((p) => p.status === "draft");

  return (
    <div className="space-y-5">
      {cadence && <CadenceCard cadence={cadence} />}

      <Note>
        <strong>Scheduled posts publish on their own.</strong> Zernio holds each
        one and fires it at its time — this tab does not need to be open, and the
        app does not need to be running. A post that fails is retried three
        times before it is marked failed.
      </Note>

      {queue.posts.length === 0 ? (
        <Empty
          title="Nothing scheduled"
          hint="Build a post in Compose, set a date, and choose 'Schedule' instead of publishing now."
        />
      ) : (
        <div className="space-y-6">
          <Section
            title="Scheduled"
            count={scheduled.length}
            hint="These will publish automatically at the time shown."
            posts={scheduled}
            busy={busy}
            onPatch={patch}
            onRemove={remove}
          />
          <Section
            title="Drafts"
            count={drafts.length}
            hint="Saved but with no date. These will never publish until you set a time."
            posts={drafts}
            busy={busy}
            onPatch={patch}
            onRemove={remove}
          />
          <Section
            title="Done"
            count={queue.posts.filter((p) => p.status === "published" || p.status === "failed").length}
            hint="Already published, or failed after Zernio's three retries."
            posts={queue.posts.filter(
              (p) => p.status === "published" || p.status === "failed",
            )}
            busy={busy}
            onPatch={patch}
            onRemove={remove}
          />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  hint,
  posts,
  busy,
  onPatch,
  onRemove,
}: {
  title: string;
  count: number;
  hint: string;
  posts: Post[];
  busy: string | null;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onRemove: (id: string, caption?: string) => void;
}) {
  if (posts.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-medium">
          {title} <span className="text-black/40">({count})</span>
        </h3>
        <p className="text-xs text-black/50">{hint}</p>
      </div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          busy={busy === post.id}
          onPatch={onPatch}
          onRemove={onRemove}
        />
      ))}
    </section>
  );
}

function PostCard({
  post,
  busy,
  onPatch,
  onRemove,
}: {
  post: Post;
  busy: boolean;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onRemove: (id: string, caption?: string) => void;
}) {
  const done = post.status === "published" || post.status === "failed";
  return (
    <Card className={`space-y-3 ${busy ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <StatusPill post={post} />
        <p className="mt-2 line-clamp-2 text-sm">
          {post.caption || <span className="text-black/45">No caption</span>}
        </p>
        <p className="mt-1 text-xs text-black/45">{whenLabel(post)}</p>
        {post.error && <p className="mt-1 text-xs text-red-600">{post.error}</p>}
        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs text-blue-600 underline"
          >
            View on the platform
          </a>
        )}
      </div>

      {!done && (
        <div className="space-y-2 border-t border-black/10 pt-3">
          <label className="block text-xs font-medium text-black/60">
            {post.publishAt ? "Publishes at" : "Set a time to schedule it"}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              disabled={busy}
              value={post.publishAt ? toLocalInput(post.publishAt) : ""}
              onChange={(e) =>
                onPatch(post.id, {
                  publishAt: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })
              }
              className="rounded-lg border border-black/15 px-3 py-1.5 text-sm"
            />
            {post.publishAt && (
              <Button
                variant="ghost"
                onClick={() => onPatch(post.id, { publishAt: null })}
              >
                Unschedule (keep as draft)
              </Button>
            )}
            <Button variant="ghost" onClick={() => onRemove(post.id, post.caption)}>
              Delete
            </Button>
          </div>
          <p className="text-xs text-black/45">
            Times are in your timezone (
            {Intl.DateTimeFormat().resolvedOptions().timeZone}).
          </p>
        </div>
      )}
    </Card>
  );
}

function whenLabel(post: Post) {
  if (post.status === "published")
    return `Published ${post.publishAt ? new Date(post.publishAt).toLocaleString() : ""}`.trim();
  if (post.status === "failed") return "Failed — not published";
  if (!post.publishAt) return "Draft — no date set, will not publish";
  const at = new Date(post.publishAt);
  const mins = Math.round((at.getTime() - Date.now()) / 60000);
  const rel =
    mins < 0
      ? "overdue — Zernio is retrying"
      : mins < 60
        ? `in ${mins} min`
        : mins < 1440
          ? `in ${Math.round(mins / 60)} h`
          : `in ${Math.round(mins / 1440)} d`;
  return `Publishes ${at.toLocaleString()} · ${rel}`;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  // datetime-local wants local wall-clock, not UTC.
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function StatusPill({ post }: { post: Post }) {
  if (post.status === "published") return <Pill tone="emerald">Published</Pill>;
  if (post.status === "failed") return <Pill tone="red">Failed</Pill>;
  if (post.status === "draft") return <Pill tone="grey">Draft · not scheduled</Pill>;
  return <Pill tone="blue">Scheduled · publishes automatically</Pill>;
}

function Pill({
  tone,
  children,
}: {
  tone: "emerald" | "red" | "amber" | "blue" | "grey";
  children: React.ReactNode;
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    grey: "bg-black/[0.05] text-black/60 ring-black/10",
  }[tone];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${tones}`}>
      {children}
    </span>
  );
}

function CadenceCard({ cadence }: { cadence: Cadence }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium">Posting cadence</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
            cadence.onTrack
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-amber-50 text-amber-800 ring-amber-200"
          }`}
        >
          {cadence.onTrack ? "On track" : `${cadence.shortfall} more needed this week`}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Target / week" value={cadence.target} />
        <Metric label="Posted last 7d" value={cadence.last7} />
        <Metric label="Scheduled next 7d" value={cadence.scheduledNext7} />
        <Metric label="Days since last" value={cadence.daysSinceLast ?? "—"} />
      </div>
      {cadence.averageGapDays !== null && (
        <p className="mt-3 text-sm text-black/55">
          Average gap between recent posts: {cadence.averageGapDays} days.
        </p>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-black/50">{label}</div>
    </div>
  );
}
