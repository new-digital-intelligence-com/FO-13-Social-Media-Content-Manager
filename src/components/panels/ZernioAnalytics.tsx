"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, ErrorNote, Loading } from "../ui";
import { ZernioSection } from "../ZernioGate";

type Slot = {
  day_of_week: number;
  hour: number;
  avg_engagement: number;
  post_count: number;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The measured metrics — best time, decay, frequency — that need history across
 * posts. Composio cannot answer these from a single call, so they are Zernio's,
 * and the `instagram-insights` / `youtube-analytics` skills read the same data.
 */
export function ZernioAnalytics({ platform }: { platform: "instagram" | "youtube" }) {
  return (
    <ZernioSection
      feature="Measured analytics"
      fallback="Per-post and account insights above still work — they come from the platform API directly."
    >
      <Inner platform={platform} />
    </ZernioSection>
  );
}

function Inner({ platform }: { platform: "instagram" | "youtube" }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/zernio/analytics?metric=best-time&platform=${platform}`,
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setSlots([]);
      return;
    }
    setError(null);
    setSlots(data.slots ?? []);
  }, [platform]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await load();
      } catch {
        if (!cancelled) setError("Could not load analytics.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!slots) return <Loading label="Loading measured analytics…" />;

  // UTC -> local. Reporting a UTC hour as a posting time is simply wrong for
  // anyone not on UTC, and it is the easiest mistake to make with this data.
  const local = slots
    .map((s) => {
      const d = new Date(Date.UTC(2024, 0, 1 + s.day_of_week, s.hour));
      return { ...s, localDay: d.getDay(), localHour: d.getHours() };
    })
    .sort((a, b) => b.avg_engagement - a.avg_engagement);

  const solid = local.filter((s) => s.post_count >= 3);
  const thin = local.length > 0 && solid.length === 0;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Best times to post</h3>
          <p className="text-xs text-black/55">
            Measured from your own engagement, shown in your timezone.
          </p>
        </div>
        <Button variant="ghost" onClick={() => load()}>
          Refresh
        </Button>
      </div>

      <ErrorNote>{error}</ErrorNote>

      {local.length === 0 ? (
        <p className="text-sm text-black/55">
          No published posts yet, so there is nothing to measure. This fills in
          once posts have engagement behind them.
        </p>
      ) : (
        <>
          {thin && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
              Every slot has fewer than 3 posts behind it. That is not enough to
              recommend a time — treat what follows as raw data, not advice.
            </p>
          )}
          <ul className="space-y-1.5">
            {local.slice(0, 6).map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg bg-black/[0.03] px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {DAYS[(s.localDay + 6) % 7]} {String(s.localHour).padStart(2, "0")}:00
                </span>
                <span className="text-black/55">
                  {s.avg_engagement.toFixed(1)} avg engagement
                  <span className="ml-2 text-xs text-black/40">
                    {s.post_count} post{s.post_count === 1 ? "" : "s"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-black/45">
            A slot backed by one or two posts is noise. The post count is shown
            so you can tell signal from coincidence.
          </p>
        </>
      )}
    </Card>
  );
}
