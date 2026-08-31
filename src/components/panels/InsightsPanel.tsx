"use client";

import { useEffect, useState } from "react";
import { Card, Empty, ErrorNote, Loading } from "../ui";
import { ZernioAnalytics } from "./ZernioAnalytics";

type Metric = { name?: string; title?: string; description?: string; values?: unknown };

type Coverage = {
  series: { requested: string[]; returned: string[] };
  totals: { requested: string[]; returned: string[] };
  demographicsAvailable: boolean;
};

type InsightData = {
  series?: Metric[];
  totals?: Metric[];
  demographics?: unknown;
  onlineFollowers?: unknown;
  coverage?: Coverage;
  error?: string;
};

const LABELS: Record<string, string> = {
  reach: "Reach",
  views: "Views",
  follower_count: "New followers",
  profile_views: "Profile views",
  accounts_engaged: "Accounts engaged",
  total_interactions: "Interactions",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saves: "Saves",
  replies: "Replies",
  profile_links_taps: "Link taps",
};

export function InsightsPanel() {
  const [days, setDays] = useState(7);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              days === d ? "bg-brand text-white" : "bg-black/[0.06] text-black/70"
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      <InsightsView key={days} days={days} />
    </div>
  );
}

function InsightsView({ days }: { days: number }) {
  const [data, setData] = useState<InsightData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ig/insights?days=${days}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData({ error: "Network error" }));
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (!data) return <Loading label="Loading insights…" />;
  if (data.error) return <ErrorNote>{data.error}</ErrorNote>;

  return (
    <div className="space-y-5">
      <Coverage coverage={data.coverage} />

      {/* Measured timing lives on Zernio: it needs history across posts, which
          a single Instagram insights call cannot give. */}
      <ZernioAnalytics platform="instagram" />

      {!data.series?.length && !data.totals?.length ? (
        <Empty
          title="No insight data for this period"
          hint="Instagram omits metrics with no activity. Accounts below Meta's reporting threshold also return nothing."
        />
      ) : (
        <>
          {data.totals?.length ? (
            <Card>
              <h3 className="mb-3 font-medium">Totals · last {days} days</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {data.totals.map((m, i) => (
                  <MetricCard key={i} metric={m} />
                ))}
              </div>
            </Card>
          ) : null}

          {data.series?.length ? (
            <Card>
              <h3 className="mb-3 font-medium">Daily</h3>
              <div className="space-y-4">
                {data.series.map((m, i) => (
                  <Series key={i} metric={m} />
                ))}
              </div>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const total =
    typeof metric.values === "object" && metric.values !== null
      ? JSON.stringify(metric.values).match(/"value":\s*(\d+)/)?.[1]
      : undefined;
  return (
    <div className="rounded-xl bg-black/[0.04] p-4">
      <div className="text-2xl font-semibold tabular-nums">{total ?? "—"}</div>
      <div className="text-sm capitalize text-black/50">{metric.title ?? metric.name}</div>
    </div>
  );
}

/** Tiny inline bar chart — enough to see shape without a chart library. */
function Series({ metric }: { metric: Metric }) {
  const points = Array.isArray(metric.values)
    ? (metric.values as { end_time?: string; value?: number }[])
    : [];
  const max = Math.max(1, ...points.map((p) => p.value ?? 0));

  return (
    <div>
      <p className="text-sm font-medium capitalize">{metric.title ?? metric.name}</p>
      {points.length === 0 ? (
        <p className="mt-1 text-xs text-black/45">No data.</p>
      ) : (
        <div className="mt-2 flex items-end gap-1.5" style={{ height: 64 }}>
          {points.map((p, i) => (
            <div key={i} className="group relative flex-1" title={`${p.end_time?.slice(0, 10)}: ${p.value ?? 0}`}>
              <div
                className="w-full rounded-t bg-brand/80"
                style={{ height: Math.max(2, ((p.value ?? 0) / max) * 64) }}
              />
            </div>
          ))}
        </div>
      )}
      {points.length > 0 && (
        <div className="mt-1 flex justify-between text-[11px] text-black/40">
          <span>{points[0]?.end_time?.slice(5, 10)}</span>
          <span>peak {max}</span>
          <span>{points[points.length - 1]?.end_time?.slice(5, 10)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Instagram silently omits metrics with no data. Rather than surfacing the raw
 * API note, say plainly which metrics have nothing yet and why.
 */
function Coverage({ coverage }: { coverage?: Coverage }) {
  if (!coverage) return null;

  const missing = [
    ...coverage.series.requested.filter((m) => !coverage.series.returned.includes(m)),
    ...coverage.totals.requested.filter((m) => !coverage.totals.returned.includes(m)),
  ];

  if (missing.length === 0 && coverage.demographicsAvailable) return null;

  return (
    <div className="rounded-xl bg-black/[0.04] px-4 py-3 text-sm">
      {missing.length > 0 && (
        <p>
          <span className="font-medium">No data yet for:</span>{" "}
          {missing.map((m) => LABELS[m] ?? m).join(", ")}.{" "}
          <span className="text-black/55">
            Instagram returns a metric only once the account has activity for it
            in this period.
          </span>
        </p>
      )}
      {!coverage.demographicsAvailable && (
        <p className={missing.length > 0 ? "mt-2" : ""}>
          <span className="font-medium">Audience demographics unavailable.</span>{" "}
          <span className="text-black/55">
            Meta withholds demographics until an account passes roughly 100
            followers.
          </span>
        </p>
      )}
    </div>
  );
}
