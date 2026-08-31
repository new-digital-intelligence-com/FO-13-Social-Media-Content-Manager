import { NextResponse } from "next/server";
import {
  bestTime,
  contentDecay,
  instagramDemographics,
  instagramFollowerHistory,
  postingFrequency,
  youtubeChannelInsights,
  youtubeDailyViews,
  youtubeDemographics,
  youtubeRetention,
} from "@/lib/zernio-features";

export const runtime = "nodejs";

/**
 * Measured analytics: the metrics that need history across posts, which the
 * platform toolkits cannot answer from a single call.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const metric = url.searchParams.get("metric") ?? "best-time";
  const platform = url.searchParams.get("platform") ?? "instagram";
  const videoId = url.searchParams.get("videoId");

  const result = await (async () => {
    switch (metric) {
      case "best-time":
        return bestTime(platform);
      case "decay":
        return contentDecay(platform);
      case "frequency":
        return postingFrequency(platform);
      case "ig-demographics":
        return instagramDemographics();
      case "ig-followers":
        return instagramFollowerHistory();
      case "yt-channel":
        return youtubeChannelInsights();
      case "yt-daily-views":
        return youtubeDailyViews();
      case "yt-demographics":
        return youtubeDemographics();
      case "yt-retention":
        return videoId
          ? youtubeRetention(videoId)
          : { ok: false as const, detail: "videoId is required.", needsSetup: true };
      default:
        return { ok: false as const, detail: `Unknown metric "${metric}".`, needsSetup: true };
    }
  })();

  if (!result.ok) {
    // A setup gap is the caller's to fix (400); an outage is not (503).
    return NextResponse.json(
      { error: result.detail, needsSetup: result.needsSetup },
      { status: result.needsSetup ? 400 : 503 },
    );
  }
  return NextResponse.json(result.data);
}
