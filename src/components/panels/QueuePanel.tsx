"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Empty, ErrorNote, Loading, Note } from "../ui";

type Post = {
  id: string;
  kind: string;
  caption?: string;
  publishAt: string | null;
  approved: boolean;
  status: "draft" | "scheduled" | "published" | "failed";
  error?: string;
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

export function QueuePanel() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [cadence, setCadence] = useState<Cadence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [runner, setRunner] = useState<{
    autoPublish?: boolean;
    scheduler?: { active?: boolean; intervalMinutes?: number; lastRunAt?: string | null };
  } | null>(null);

  const load = useCallback(async () => {
    const [queue, rhythm] = await Promise.all([
      fetch("/api/ig/schedule").then((r) => r.json()),
      fetch("/api/ig/cadence").then((r) => r.json()),
    ]);
    if (queue.error) setError(queue.error);
    setPosts(queue.posts ?? []);
    if (!rhythm.error) setCadence(rhythm);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await load();
      } catch {
        if (!cancelled) setError("Network error.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // The server publishes on its own now, so this only refreshes the view.
  useEffect(() => {
    const tick = setInterval(load, 60_000);
    return () => clearInterval(tick);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ig/schedule/run")
      .then((r) => r.json())
      .then((d) => !cancelled && setRunner(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [posts]);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/ig/schedule", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/ig/schedule?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  async function runNow() {
    setStatus("Checking for due posts…");
    const res = await fetch("/api/ig/schedule/run", { method: "POST" });
    const data = await res.json();
    setStatus(
      data.ran?.length
        ? `Published ${data.ran.length}.`
        : "Nothing approved and due right now.",
    );
    load();
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!posts) return <Loading label="Loading queue…" />;

  return (
    <div className="space-y-5">
      {cadence && <CadenceCard cadence={cadence} />}

      {runner?.autoPublish ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <span className="font-medium">Auto-publish is on.</span> Scheduled posts
          go out at their time on their own — no approval step, and this tab does
          not need to be open.
          {runner.scheduler?.active && (
            <span className="text-emerald-700">
              {" "}
              The server checks every {runner.scheduler.intervalMinutes ?? 1} min
              {runner.scheduler.lastRunAt &&
                ` (last check ${new Date(runner.scheduler.lastRunAt).toLocaleTimeString()})`}
              .
            </span>
          )}
          <span className="mt-1 block text-xs text-emerald-700">
            Turn it off in Automation if you would rather approve each post.
            On serverless, point a cron job at{" "}
            <code>POST /api/ig/schedule/run</code> — a background timer needs a
            long-running server.
          </span>
        </div>
      ) : (
        <Note>
          Instagram has no scheduling API, so this queue is ours. Approval is
          required: a post publishes only once you tick it, however overdue it is.
          Enable auto-publish in Automation to remove that step.
        </Note>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={runNow}>
          Run due posts now
        </Button>
        {status && <span className="text-sm text-black/55">{status}</span>}
      </div>

      {posts.length === 0 ? (
        <Empty
          title="Nothing queued"
          hint="Build a post in Compose, then choose 'Add to queue' instead of publishing immediately."
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-black/[0.06] px-2 py-0.5 text-xs font-medium">
                      {post.kind}
                    </span>
                    <StatusPill post={post} autoPublish={runner?.autoPublish} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm">
                    {post.caption || <span className="text-black/45">No caption</span>}
                  </p>
                  <p className="mt-1 text-xs text-black/45">
                    {post.publishAt
                      ? `Scheduled ${new Date(post.publishAt).toLocaleString()}`
                      : "Draft — no date set"}
                  </p>
                  {post.error && (
                    <p className="mt-1 text-xs text-red-600">{post.error}</p>
                  )}
                </div>
              </div>

              {post.status !== "published" && (
                <div className="flex flex-wrap items-center gap-2 border-t border-black/10 pt-3">
                  <input
                    type="datetime-local"
                    value={
                      post.publishAt
                        ? new Date(post.publishAt).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      patch(post.id, {
                        publishAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                    className="rounded-lg border border-black/15 px-3 py-1.5 text-sm"
                  />
                  {!runner?.autoPublish && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={post.approved}
                        onChange={(e) => patch(post.id, { approved: e.target.checked })}
                      />
                      Approved to publish
                    </label>
                  )}
                  <Button variant="ghost" onClick={() => remove(post.id)}>
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ post, autoPublish }: { post: Post; autoPublish?: boolean }) {
  if (post.status === "published")
    return <Pill tone="emerald">Published</Pill>;
  if (post.status === "failed") return <Pill tone="red">Failed</Pill>;
  if (post.status === "draft") return <Pill tone="grey">Draft</Pill>;
  if (autoPublish) return <Pill tone="blue">Scheduled</Pill>;
  return post.approved ? (
    <Pill tone="blue">Scheduled · approved</Pill>
  ) : (
    <Pill tone="amber">Awaiting your approval</Pill>
  );
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
          {cadence.onTrack
            ? "On track"
            : `${cadence.shortfall} more needed this week`}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Target / week" value={cadence.target} />
        <Metric label="Posted last 7d" value={cadence.last7} />
        <Metric label="Scheduled next 7d" value={cadence.scheduledNext7} />
        <Metric
          label="Days since last"
          value={cadence.daysSinceLast ?? "—"}
        />
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
