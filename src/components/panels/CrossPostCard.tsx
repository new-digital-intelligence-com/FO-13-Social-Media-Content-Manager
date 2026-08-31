"use client";

import { useState } from "react";
import { Button, Card, ErrorNote } from "../ui";
import { useZernio, ZernioSection } from "../ZernioGate";

type Target = { platform: "instagram" | "youtube" | "twitter"; customContent: string };

const PLATFORMS: {
  id: Target["platform"];
  label: string;
  limit: number;
  needs: "video" | "media" | "none";
  note: string;
}[] = [
  {
    id: "instagram",
    label: "Instagram",
    limit: 2200,
    needs: "media",
    note: "Requires media. Only the first 125 characters show before the fold, and captions have no clickable links.",
  },
  {
    id: "youtube",
    label: "YouTube",
    limit: 5000,
    needs: "video",
    note: "Requires a video. The title is set separately, not taken from this text.",
  },
  {
    id: "twitter",
    label: "X",
    limit: 280,
    needs: "none",
    note: "280 characters, hard limit.",
  },
];

/**
 * Cross-posting: one payload, several platforms, one call.
 *
 * The same capability the `instagram-crossposting` skill drives. The important
 * part is not the fan-out but the guard rails around it — the strictest media
 * requirement wins, and a partial success has to be reported per platform
 * rather than as a single "posted".
 */
export function CrossPostCard({
  content,
  mediaUrl,
  mediaType,
}: {
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
}) {
  const { status } = useZernio();
  if (!status || status.state !== "ready") {
    return (
      <ZernioSection
        feature="Cross-posting"
        fallback="Publish to each platform from its own tab instead — that still works, one at a time."
      >
        <span />
      </ZernioSection>
    );
  }
  // Only offer platforms with a live Zernio account. Offering one that is not
  // connected produces a target that can only ever land in `skipped` — the UI
  // would be promising a publish that cannot happen.
  const connected = (status.accounts ?? [])
    .filter((a) => a.active)
    .map((a) => a.platform);
  return (
    <Inner
      content={content}
      mediaUrl={mediaUrl}
      mediaType={mediaType}
      connected={connected}
    />
  );
}

function Inner({
  content,
  mediaUrl,
  mediaType,
  connected,
}: {
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  connected: string[];
}) {
  const [selected, setSelected] = useState<Target["platform"][]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [publishAt, setPublishAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const available = PLATFORMS.filter((p) => connected.includes(p.id));
  const chosen = available.filter((p) => selected.includes(p.id));
  const missing = PLATFORMS.filter((p) => !connected.includes(p.id));

  /** A target whose media requirement this payload cannot satisfy. */
  function blocker(p: (typeof PLATFORMS)[number]): string | null {
    if (p.needs === "video" && mediaType !== "video")
      return "needs a video — this payload has none";
    if (p.needs === "media" && !mediaUrl) return "needs media — this payload has none";
    return null;
  }

  const blocked = chosen.filter((p) => blocker(p));
  const tooLong = chosen.filter(
    (p) => (overrides[p.id] ?? content).length > p.limit,
  );

  async function send() {
    const names = chosen.map((p) => p.label).join(", ");
    if (
      !confirm(
        `Post to ${names}${publishAt ? ` at ${new Date(publishAt).toLocaleString()}` : " right now"}?\n\n` +
          `This publishes to ${chosen.length} account${chosen.length === 1 ? "" : "s"} and cannot be undone.`,
      )
    )
      return;

    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const res = await fetch("/api/zernio/crosspost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mediaUrl,
          mediaType,
          publishAt: publishAt ? new Date(publishAt).toISOString() : null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          targets: chosen.map((p) => ({
            platform: p.id,
            customContent: overrides[p.id] || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Cross-post failed.");
        return;
      }
      // Report per platform. "Posted" alone would hide a target that failed.
      const results: string[] = (data.post?.platforms ?? []).map(
        (t: { platform?: string; status?: string; error?: string }) =>
          `${t.platform}: ${t.status ?? "pending"}${t.error ? ` — ${t.error}` : ""}`,
      );
      if (data.skipped?.length) {
        results.push(`skipped (no connected account): ${data.skipped.join(", ")}`);
      }
      if (data.warnings?.length) results.push(`warnings: ${data.warnings.join("; ")}`);
      setOutcome(results.join("\n") || "Submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-medium">Also post elsewhere</h3>
        <p className="text-xs text-black/55">
          One call, several platforms. Give each its own wording where the limits
          differ.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {available.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                setSelected((s) =>
                  on ? s.filter((x) => x !== p.id) : [...s, p.id],
                )
              }
              className={`rounded-lg px-3 py-1.5 text-sm ring-1 transition ${
                on
                  ? "bg-black text-white ring-black"
                  : "bg-white text-black/70 ring-black/15 hover:ring-black/30"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {chosen.map((p) => {
        const text = overrides[p.id] ?? content;
        const block = blocker(p);
        return (
          <div key={p.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{p.label}</span>
              <span
                className={`text-xs ${text.length > p.limit ? "text-red-600" : "text-black/45"}`}
              >
                {text.length} / {p.limit}
              </span>
            </div>
            <textarea
              rows={2}
              value={text}
              onChange={(e) =>
                setOverrides((o) => ({ ...o, [p.id]: e.target.value }))
              }
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
            />
            <p className="text-xs text-black/45">{p.note}</p>
            {block && (
              <p className="text-xs text-red-600">
                {p.label} {block}.
              </p>
            )}
          </div>
        );
      })}

      {chosen.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className="block text-xs font-medium">Publish at (optional)</span>
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className="rounded-lg border border-black/15 px-3 py-1.5 text-sm"
            />
          </label>
          <Button
            onClick={send}
            disabled={busy || blocked.length > 0 || tooLong.length > 0}
          >
            {busy
              ? "Sending…"
              : publishAt
                ? `Schedule to ${chosen.length}`
                : `Publish now to ${chosen.length}`}
          </Button>
        </div>
      )}

      {missing.length > 0 && (
        <p className="text-xs text-black/45">
          Not offered: {missing.map((p) => p.label).join(", ")} — no account
          connected on Zernio. Connect one there and it appears here.
        </p>
      )}

      <ErrorNote>{error}</ErrorNote>
      {outcome && (
        <pre className="whitespace-pre-wrap rounded-lg bg-black/[0.04] px-3 py-2 text-xs">
          {outcome}
        </pre>
      )}
      {chosen.length > 0 && (
        <p className="text-xs text-black/45">
          Results are reported per platform. One can succeed while another fails —
          if that happens, retry only the failed one, or the successful platform
          gets posted twice.
        </p>
      )}
    </Card>
  );
}
