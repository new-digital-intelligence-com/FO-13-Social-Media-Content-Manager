import { NextResponse } from "next/server";
import { execute } from "@/lib/ig";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Instagram's insight rules are strict and mutually exclusive:
 *   - period is only day | lifetime
 *   - breakdown requires metric_type=total_value
 *   - demographics metrics require a timeframe and cannot mix with time series
 * So each family runs as its own call; one failing never blanks the others.
 */
const SERIES_METRICS = ["reach", "views", "follower_count", "profile_views"];
const TOTALS_METRICS = [
  "accounts_engaged",
  "total_interactions",
  "likes",
  "comments",
  "shares",
  "saves",
  "replies",
  "profile_links_taps",
];

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const days = Math.min(Number(params.get("days") ?? 7), 30);
  const breakdown = params.get("breakdown") ?? "country";
  const until = Math.floor(Date.now() / 1000);
  const since = until - days * 86400;

  const safe = async <T>(run: () => Promise<T>) => {
    try {
      return await run();
    } catch (error) {
      return {
        data: null,
        note: error instanceof Error ? error.message : "Unavailable",
      };
    }
  };

  try {
    const [series, totals, demographics, online] = await Promise.all([
      safe(() =>
        execute("INSTAGRAM_GET_USER_INSIGHTS", {
          metric: SERIES_METRICS,
          period: "day",
          metric_type: "time_series",
          since,
          until,
        }),
      ),
      safe(() =>
        execute("INSTAGRAM_GET_USER_INSIGHTS", {
          metric: TOTALS_METRICS,
          period: "day",
          metric_type: "total_value",
          since,
          until,
        }),
      ),
      safe(() =>
        execute("INSTAGRAM_GET_USER_INSIGHTS", {
          metric: ["follower_demographics"],
          period: "lifetime",
          metric_type: "total_value",
          timeframe: "this_month",
          breakdown,
        }),
      ),
      // Drives "best time to post" -- hour-of-day distribution of online followers.
      safe(() =>
        execute("INSTAGRAM_GET_USER_INSIGHTS", {
          metric: ["online_followers"],
          period: "lifetime",
          since,
          until,
        }),
      ),
    ]);

    const returned = (family: { data: unknown }) =>
      Array.isArray(family.data)
        ? (family.data as { name?: string }[]).map((m) => m.name).filter(Boolean)
        : [];

    const seriesReturned = returned(series);
    const totalsReturned = returned(totals);

    return NextResponse.json({
      days,
      breakdown,
      series: series.data,
      totals: totals.data,
      demographics: demographics.data,
      onlineFollowers: online.data,
      // Composio's raw note is accurate but alarming. Report which metrics came
      // back and let the client explain the gap in the account's own terms.
      coverage: {
        series: { requested: SERIES_METRICS, returned: seriesReturned },
        totals: { requested: TOTALS_METRICS, returned: totalsReturned },
        demographicsAvailable: returned(demographics).length > 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
