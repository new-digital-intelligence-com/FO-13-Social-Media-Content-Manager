"use client";

import { useState } from "react";
import { Button, Card, Empty, ErrorNote, Field, Loading, Note, inputClass } from "./ui";

type Platform = "instagram" | "x" | "youtube";

type Candidate = {
  id: string;
  handle: string;
  name?: string;
  note?: string;
  followers?: number | null;
  verified?: boolean;
  url?: string;
  thumbnail?: string;
  unverified?: boolean;
  isPrivate?: boolean;
  /** Already followed / subscribed. */
  following?: boolean;
  topic?: string;
  mediaCount?: number;
};

/** 1_200_000 -> "1.2M" */
function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

const TOPIC_IDEAS = [
  "AI agents",
  "tech content creators",
  "real estate creators",
  "motivation pages",
  "meme accounts",
  "indie hackers",
];

/**
 * Topic-based account discovery.
 *
 * The flow is deliberately the same everywhere: suggest, then show a list the
 * user ticks, then act only on what was ticked. What differs is how far each
 * platform can go:
 *
 *  - X: suggestions verified against the real API, then followed here.
 *  - YouTube: candidates come from real search, then subscribed here.
 *  - Instagram: suggestions only. The API has no follow endpoint at all, so
 *    each card links out to the profile.
 */
export function GrowthPanel({ platform }: { platform: Platform }) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [minFollowers, setMinFollowers] = useState(100_000);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "following">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const canAct = platform !== "instagram";
  const actionVerb = platform === "youtube" ? "Subscribe to" : "Follow";

  async function suggest() {
    setBusy(true);
    setError(null);
    setResult(null);
    setCandidates(null);
    setSelected(new Set());
    try {
      const endpoint =
        platform === "instagram"
          ? "/api/ig/growth"
          : platform === "x"
            ? "/api/x/growth"
            : "/api/yt/growth";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          platform === "instagram"
            ? { topic, count, minFollowers }
            : { action: "suggest", topic, count, minFollowers },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        // Leave candidates null so the "nothing matched" state cannot render
        // over a hard failure.
        setCandidates(null);
        setError(data.error ?? `Request failed (${res.status}).`);
        return;
      }

      const list: Candidate[] =
        platform === "instagram"
          ? (data.suggestions ?? []).map(
              (s: {
                handle: string;
                note?: string;
                url: string;
                exists?: boolean | null;
                isPrivate?: boolean;
                fullName?: string;
                followers?: number;
                following?: boolean;
                mediaCount?: number;
              }) => ({
                id: s.handle,
                handle: s.handle,
                name: s.fullName,
                note: s.note,
                followers: s.followers ?? null,
                url: s.url,
                // Only a confirmed lookup earns the check mark.
                verified: s.exists === true,
                unverified: s.exists === null,
                isPrivate: s.isPrivate,
                following: s.following,
                mediaCount: s.mediaCount,
              }),
            )
          : platform === "x"
            ? (data.candidates ?? []).map(
                (c: {
                  id: string;
                  username: string;
                  name?: string;
                  description?: string;
                  followers?: number;
                  verified?: boolean;
                  following?: boolean;
                }) => ({
                  id: c.id,
                  handle: c.username,
                  name: c.name,
                  note: c.description,
                  followers: c.followers,
                  verified: c.verified,
                  following: c.following,
                  url: `https://x.com/${c.username}`,
                }),
              )
            : (data.candidates ?? []).map(
                (c: {
                  channelId: string;
                  title?: string;
                  description?: string;
                  thumbnail?: string;
                  subscribed?: boolean;
                  topic?: string;
                  subscribers?: number;
                }) => ({
                  id: c.channelId,
                  handle: c.title ?? c.channelId,
                  note: c.description,
                  thumbnail: c.thumbnail,
                  following: c.subscribed,
                  followers: c.subscribers ?? null,
                  topic: c.topic,
                  url: `https://www.youtube.com/channel/${c.channelId}`,
                }),
              );

      setCandidates(list);
      setFilter("all");
      // Pre-tick everything except accounts already followed — the user is
      // reviewing a list, not building one, but re-following is pointless.
      setSelected(new Set(list.filter((c) => !c.following).map((c) => c.id)));
      setMeta(data);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function act() {
    if (!canAct || selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const endpoint = platform === "x" ? "/api/x/growth" : "/api/yt/growth";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          platform === "x"
            ? { action: "follow", userIds: [...selected] }
            : { action: "subscribe", channelIds: [...selected] },
        ),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      setResult(
        `${data.succeeded} done${
          data.failed?.length ? `, ${data.failed.length} failed` : ""
        }.`,
      );
      setCandidates(
        (candidates ?? []).filter((c) => !selected.has(c.id) || data.failed?.some(
          (f: { id: string }) => f.id === c.id,
        )),
      );
      setSelected(new Set());
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const followLabel =
    platform === "youtube"
      ? { already: "Subscribed", notYet: "Not subscribed" }
      : { already: "Following", notYet: "Not following" };

  const all = candidates ?? [];
  const following = all.filter((c) => c.following);
  const notFollowing = all.filter((c) => !c.following);
  const visible =
    filter === "following" ? following : filter === "new" ? notFollowing : all;

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div>
          <h3 className="font-medium">Find accounts by topic</h3>
          <p className="mt-1 text-sm text-black/55">
            {platform === "x"
              ? "Suggestions are checked against the real API — anything that does not resolve is dropped, and accounts you already follow are filtered out."
              : platform === "youtube"
                ? "Candidates come from YouTube search, so these are real channels. Ones you already follow are filtered out."
                : "Instagram has no follow or lookup API, so these are AI suggestions only — open each profile to check it."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <Field label="Topics" hint="One per line, or comma separated. Up to 6.">
            <textarea
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="AI agents, real estate creators, memes"
              className={inputClass}
            />
          </Field>
          <Field label="How many" hint="Max 100">
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className={`${inputClass} w-24`}
            />
          </Field>
          <Field
            label={platform === "youtube" ? "Min subscribers" : "Min followers"}
            hint="Filters out small accounts"
          >
            <select
              value={minFollowers}
              onChange={(e) => setMinFollowers(Number(e.target.value))}
              className={`${inputClass} w-36`}
            >
              <option value={0}>Any size</option>
              <option value={10_000}>10K+</option>
              <option value={100_000}>100K+</option>
              <option value={500_000}>500K+</option>
              <option value={1_000_000}>1M+</option>
              <option value={10_000_000}>10M+</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button onClick={suggest} disabled={busy || !topic.trim()}>
              {busy ? "Finding…" : "Suggest"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TOPIC_IDEAS.map((t) => (
            <button
              key={t}
              onClick={() =>
                setTopic((current) =>
                  current
                    .split(/[,\n]/)
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .includes(t)
                    ? current
                    : [current.trim(), t].filter(Boolean).join(", "),
                )
              }
              className="rounded-full bg-black/[0.05] px-2.5 py-1 text-xs text-black/60 transition hover:bg-brand/[0.08] hover:text-brand-ink"
            >
              {t}
            </button>
          ))}
        </div>

        <p className="text-xs text-black/45">
          {platform === "youtube"
            ? "Channels come from YouTube search and are ranked by real subscriber counts."
            : "The web is searched for current top accounts, then each handle is checked for real follower counts."}
        </p>

        {error && /ANTHROPIC_API_KEY/i.test(error) ? (
          <ErrorNote>
            <strong>No model key configured.</strong> Account discovery is
            AI-driven, so it cannot run without one. Add{" "}
            <code>ANTHROPIC_API_KEY=sk-ant-…</code> to <code>.env.local</code>{" "}
            (from console.anthropic.com) and restart the dev server — Next.js only
            reads that file at startup.
          </ErrorNote>
        ) : (
          <ErrorNote>{error}</ErrorNote>
        )}
        {result && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
            {result}
          </p>
        )}
      </Card>

      {busy && !candidates && <Loading label="Looking for accounts…" />}

      {candidates && candidates.length === 0 && meta?.reason ? (
        <Card>
          <p className="text-sm font-medium">No matching accounts found</p>
          <p className="mt-1 text-sm text-black/60">{String(meta.reason)}</p>
          <p className="mt-3 text-xs text-black/45">
            Try rewording the topic, or lower the follower bar.
          </p>
        </Card>
      ) : candidates && candidates.length === 0 ? (
        <Empty
          title="Nothing came through the filters"
          hint={
            minFollowers > 0
              ? `Nothing found for this topic above ${compact(minFollowers)} followers. Lower the bar, or use a broader topic — narrow niches often have no accounts that large.`
              : "No accounts came back for that topic. Try wording it differently, or use a broader term."
          }
        />
      ) : null}

      {candidates && candidates.length > 0 && (
        <Card className="space-y-4">
          {platform === "instagram" && (
            <>
              {Number(meta?.minFollowers) > 0 &&
                meta?.thresholdEnforced === false &&
                (() => {
                  const lookup = meta.lookup as
                    | { health?: string; status?: number | null }
                    | undefined;
                  const bar = compact(Number(meta.minFollowers));
                  // "Configured" and "working" are different failures and need
                  // different instructions.
                  if (lookup?.health === "rejected") {
                    return (
                      <ErrorNote>
                        The {bar}+ filter was not applied: the lookup credential is
                        configured but was rejected
                        {lookup.status ? ` (HTTP ${lookup.status})` : ""} — captured
                        signatures expire. Grab a fresh <code>_s</code>, <code>ts</code>{" "}
                        and <code>_ts</code> from the service&apos;s network tab and
                        replace all three in .env.local, then restart the server.
                      </ErrorNote>
                    );
                  }
                  if (lookup?.health === "unreachable") {
                    return (
                      <ErrorNote>
                        The {bar}+ filter was not applied: the lookup service could not
                        be reached. These are unranked suggestions for now.
                      </ErrorNote>
                    );
                  }
                  return (
                    <ErrorNote>
                      The {bar}+ filter was not applied. Instagram exposes no follower
                      data for accounts you do not manage, so it needs a lookup —
                      set IG_LOOKUP_SIGNATURE, IG_LOOKUP_REQUEST_TS and IG_LOOKUP_TS
                      in .env.local and restart. Until then these are unranked
                      suggestions.
                    </ErrorNote>
                  );
                })()}
              {meta?.searched === false && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                  These came from the model&apos;s own knowledge, not a live search,
                  so some may be dated. Check each profile.
                </p>
              )}
              <Note>{String(meta?.limitation ?? "")}</Note>
              {typeof meta?.confirmed === "number" && (
                <p className="text-xs text-black/50">
                  {String(meta.confirmed)} confirmed to exist
                  {Number(meta.unverifiable) > 0 &&
                    `, ${String(meta.unverifiable)} could not be checked`}
                  {Number(meta.dropped) > 0 &&
                    `, ${String(meta.dropped)} dropped as non-existent`}
                  {Number(meta.abandoned) > 0 &&
                    `, ${String(meta.abandoned)} dropped as dormant`}
                  .
                </p>
              )}
            </>
          )}
          {platform === "x" && meta?.searched === false && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
              These came from the model&apos;s own knowledge, not a live search.
            </p>
          )}
          {platform === "x" && typeof meta?.proposed === "number" && (
            <Note>
              {String(meta.proposed)} suggested, {String(meta.verified)} exist on X
              {Number(meta.belowThreshold) > 0 &&
                `, ${String(meta.belowThreshold)} below the follower threshold`}
              , {candidates.length} shown.
            </Note>
          )}
          {platform === "youtube" && typeof meta?.minSubscribers === "number" &&
            Number(meta.minSubscribers) > 0 && (
              <Note>
                Ranked by real subscriber counts, everything under{" "}
                {Number(meta.minSubscribers).toLocaleString()} removed.
              </Note>
            )}

          {(() => {
            const funnel = meta?.funnel as
              | { requested?: number; proposed?: number; shown?: number }
              | undefined;
            if (!funnel?.requested || (funnel.shown ?? 0) >= funnel.requested) return null;
            return (
              <p className="text-xs text-black/50">
                Showing {funnel.shown} of the {funnel.requested} requested — the rest
                were filtered out as too small, dormant, or not found. Lower the
                follower bar or broaden the topic for more.
              </p>
            );
          })()}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-lg bg-black/[0.05] p-0.5">
              {(
                [
                  ["all", "All", candidates.length],
                  ["new", followLabel.notYet, notFollowing.length],
                  ["following", followLabel.already, following.length],
                ] as const
              ).map(([id, label, n]) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    filter === id ? "bg-white text-brand-ink shadow-sm" : "text-black/55"
                  }`}
                >
                  {label}
                  <span className="ml-1 text-black/40">{n}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {canAct && (
                <span className="text-sm text-black/55">
                  {selected.size} selected
                </span>
              )}
              {canAct && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSelected(
                        new Set(
                          visible.filter((c) => !c.following).map((c) => c.id),
                        ),
                      )
                    }
                    className="text-xs text-black/50 underline"
                  >
                    Select shown
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-xs text-black/50 underline"
                  >
                    None
                  </button>
                </div>
              )}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-black/45">
              Nothing in this filter.
            </p>
          ) : (
          <ul className="space-y-2">
            {visible.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-xl border border-black/10 p-3"
              >
                {canAct && (
                  <input
                    type="checkbox"
                    disabled={c.following}
                    checked={selected.has(c.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(c.id);
                      else next.delete(c.id);
                      setSelected(next);
                    }}
                    className="mt-1"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-brand-ink hover:underline"
                  >
                    {platform === "youtube" ? c.handle : `@${c.handle}`}
                    {c.verified && <span className="ml-1 text-xs text-blue-600">✓</span>}
                  </a>
                  {c.name && c.name !== c.handle && (
                    <span className="ml-2 text-sm text-black/50">{c.name}</span>
                  )}
                  {c.following && (
                    <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                      {platform === "youtube" ? "subscribed" : "following"}
                    </span>
                  )}
                  {c.unverified && (
                    <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">
                      unverified
                    </span>
                  )}
                  {c.mediaCount === 0 && (
                    <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">
                      no posts
                    </span>
                  )}
                  {c.isPrivate && (
                    <span className="ml-1.5 rounded bg-black/[0.06] px-1.5 py-0.5 text-[11px] text-black/55">
                      private
                    </span>
                  )}
                  {c.note && <p className="mt-0.5 text-sm text-black/55">{c.note}</p>}
                  <p className="mt-0.5 text-xs text-black/40">
                    {typeof c.followers === "number" && (
                      <span className="font-medium text-black/55">
                        {compact(c.followers)}{" "}
                        {platform === "youtube" ? "subscribers" : "followers"}
                      </span>
                    )}
                    {c.topic && typeof c.followers === "number" && " · "}
                    {c.topic}
                  </p>
                </div>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-black/45 underline"
                >
                  open profile ↗
                </a>
              </li>
            ))}
          </ul>
          )}

          {canAct && (
            <div className="space-y-2 border-t border-black/10 pt-4">
              <Note>
                Following in bulk is what platforms police. Keep batches small,
                space them out, and only follow accounts you would follow by hand.
              </Note>
              <Button onClick={act} disabled={busy || selected.size === 0}>
                {busy ? "Working…" : `${actionVerb} ${selected.size} selected`}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
