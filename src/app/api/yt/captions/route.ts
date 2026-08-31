import { ytExecute, ytRoute } from "@/lib/yt";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Captions are the highest-value read on YouTube: the transcript is what makes
 * summaries, chapters, descriptions and repurposing possible.
 * ?videoId= lists tracks; add &trackId= to load one.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const videoId = params.get("videoId");
  const trackId = params.get("trackId");

  return ytRoute(async () => {
    if (trackId) {
      const r = await ytExecute("YOUTUBE_LOAD_CAPTIONS", { id: trackId });
      return { transcript: r.data, note: r.note };
    }
    if (!videoId) throw new Error("videoId is required.");
    const r = await ytExecute("YOUTUBE_LIST_CAPTION_TRACK", { video_id: videoId });
    return { tracks: r.data, note: r.note };
  });
}
