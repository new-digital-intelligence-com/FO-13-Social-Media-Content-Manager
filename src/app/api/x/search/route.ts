import { xRoute } from "@/lib/x-route";
import { xExecute } from "@/lib/x";

export const runtime = "nodejs";
export const maxDuration = 120;

const POST_FIELDS = ["id", "text", "created_at", "public_metrics", "author_id"];

/**
 * ?q=            recent search (last 7 days on most plans)
 * ?archive=1     full-archive search (requires a higher X access tier)
 * ?counts=1      volume only, no post bodies
 * ?mentions=@you convenience wrapper -- X has no mentions endpoint here, so
 *                monitoring your handle means searching for it.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q");
  const archive = params.get("archive") === "1";
  const counts = params.get("counts") === "1";
  const max = Math.min(Number(params.get("max") ?? 25), 100);

  return xRoute(async () => {
    if (!q?.trim()) throw new Error("q is required.");

    if (counts) {
      const slug = archive
        ? "TWITTER_SEARCH_FULL_ARCHIVE_COUNTS"
        : "TWITTER_SEARCH_RECENT_COUNTS";
      const r = await xExecute(slug, { query: q });
      return { mode: "counts", archive, counts: r.data, note: r.note };
    }

    const slug = archive ? "TWITTER_FULL_ARCHIVE_SEARCH" : "TWITTER_RECENT_SEARCH";
    const r = await xExecute(slug, {
      query: q,
      max_results: max,
      "tweet__fields": POST_FIELDS,
    });
    return { mode: "search", archive, results: r.data, note: r.note };
  });
}
