import { xRoute } from "@/lib/x-route";
import { xExecute } from "@/lib/x";

export const runtime = "nodejs";

/** Per-post analytics over a window. X requires explicit start/end times. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ids = params.get("ids");
  const days = Math.min(Number(params.get("days") ?? 7), 30);

  return xRoute(async () => {
    if (!ids) throw new Error("ids is required (comma separated post ids).");
    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    const r = await xExecute("TWITTER_GET_POST_ANALYTICS", {
      ids: ids.split(",").map((s) => s.trim()).filter(Boolean),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    });
    return { days, analytics: r.data, note: r.note };
  });
}
