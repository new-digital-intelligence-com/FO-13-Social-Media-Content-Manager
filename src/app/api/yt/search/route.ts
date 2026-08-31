import { ytExecute, ytRoute } from "@/lib/yt";

export const runtime = "nodejs";

/** ?q= search · ?popular=1 most popular · ?categories=1 video categories. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q");
  const max = Math.min(Number(params.get("max") ?? 25), 50);

  return ytRoute(async () => {
    if (params.get("categories") === "1") {
      const r = await ytExecute("YOUTUBE_LIST_VIDEO_CATEGORIES", {
        part: "snippet",
        regionCode: params.get("region") ?? "US",
      });
      return { categories: r.data };
    }
    if (params.get("popular") === "1") {
      const r = await ytExecute("YOUTUBE_LIST_MOST_POPULAR_VIDEOS", {
        part: "snippet,statistics",
        regionCode: params.get("region") ?? "US",
        maxResults: max,
      });
      return { popular: r.data, note: r.note };
    }
    if (!q?.trim()) throw new Error("q is required.");
    const r = await ytExecute("YOUTUBE_SEARCH_YOU_TUBE", {
      q,
      part: "snippet",
      maxResults: max,
      ...(params.get("type") ? { type: params.get("type") } : {}),
      ...(params.get("order") ? { order: params.get("order") } : {}),
    });
    return { results: r.data, note: r.note };
  });
}
