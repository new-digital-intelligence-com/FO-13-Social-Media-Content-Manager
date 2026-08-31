import { VIDEO_PARTS, ytExecute, ytRoute } from "@/lib/yt";

export const runtime = "nodejs";

/**
 * `YOUTUBE_LIST_CHANNEL_VIDEOS` returns **playlistItem** resources, whose `id`
 * is the playlist-item id — not the video id. Passing that straight through
 * means every downstream consumer (AI Studio, details, captions) looks up an id
 * that does not exist and gets "Video not found".
 *
 * The real id lives at `snippet.resourceId.videoId`, so hoist it into `id` and
 * keep the original as `playlistItemId` for playlist removal, which genuinely
 * needs it.
 */
async function withStatistics(data: unknown) {
  const items =
    Array.isArray(data) ? data : ((data as { items?: unknown[] } | null)?.items ?? null);
  if (!Array.isArray(items) || items.length === 0) return data;

  const ids = items
    .map((i) => (i as { id?: string }).id)
    .filter((id): id is string => typeof id === "string");
  if (ids.length === 0) return data;

  // Best-effort: a failed statistics lookup must not blank the video list.
  const details = await ytExecute("YOUTUBE_GET_VIDEO_DETAILS_BATCH", {
    id: ids.join(","),
    parts: "statistics",
  }).catch(() => null);

  const raw = details?.data as { items?: unknown[] } | unknown[] | undefined;
  const rows = Array.isArray(raw) ? raw : (raw?.items ?? []);
  const byId = new Map(
    (rows as { id?: string; statistics?: unknown }[]).map((v) => [v.id, v.statistics]),
  );

  const merged = items.map((raw2) => {
    const item = raw2 as { id?: string };
    const stats = item.id ? byId.get(item.id) : undefined;
    return stats ? { ...item, statistics: stats } : item;
  });
  return Array.isArray(data) ? merged : { ...(data as object), items: merged };
}

function normalizeUploads(data: unknown) {
  const items =
    Array.isArray(data)
      ? data
      : ((data as { items?: unknown[] } | null)?.items ?? null);
  if (!Array.isArray(items)) return data;

  const fixed = items.map((raw) => {
    const item = raw as {
      id?: unknown;
      snippet?: { resourceId?: { videoId?: string } };
    };
    const videoId = item.snippet?.resourceId?.videoId;
    if (!videoId) return item;
    return { ...item, id: videoId, playlistItemId: item.id };
  });

  return Array.isArray(data) ? fixed : { ...(data as object), items: fixed };
}


/** ?id= one video (with rating) · else the channel's uploads. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const max = Math.min(Number(params.get("max") ?? 25), 50);

  return ytRoute(async () => {
    if (id) {
      const [details, rating] = await Promise.all([
        // Note: this tool takes `parts`, not `part`.
        ytExecute("YOUTUBE_GET_VIDEO_DETAILS_BATCH", { id, parts: VIDEO_PARTS }),
        ytExecute("YOUTUBE_GET_VIDEO_RATING", { id }).catch(() => null),
      ]);
      return { video: details.data, rating: rating?.data ?? null, note: details.note };
    }
    // `mine` is what scopes this to the authenticated channel; without it (or
    // channelId) the API rejects the call outright.
    const r = await ytExecute("YOUTUBE_LIST_CHANNEL_VIDEOS", {
      mine: true,
      part: "snippet",
      maxResults: max,
    });
    const videos = normalizeUploads(r.data);
    // playlistItems cannot carry `statistics` — that part only exists on the
    // videos resource — so the list card's "N views" was permanently dead.
    // One batch lookup over the normalized ids fills it in.
    return { videos: await withStatistics(videos), note: r.note };
  });
}

/** UPDATE_VIDEO is the one tool here using snake_case argument names. */
export async function PATCH(request: Request) {
  const { videoId, title, description, tags, privacyStatus, categoryId } =
    await request.json();
  return ytRoute(async () => {
    if (!videoId) throw new Error("videoId is required.");
    const r = await ytExecute("YOUTUBE_UPDATE_VIDEO", {
      video_id: videoId,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(tags?.length ? { tags } : {}),
      ...(privacyStatus ? { privacy_status: privacyStatus } : {}),
      ...(categoryId ? { category_id: String(categoryId) } : {}),
    });
    return { ok: true, result: r.data };
  });
}

/** Deletion is guarded server-side by an explicit confirmDelete flag. */
export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  return ytRoute(async () => {
    if (!id) throw new Error("id is required.");
    if (params.get("confirm") !== "true") {
      throw new Error("Deleting a video is permanent. Pass confirm=true to proceed.");
    }
    const r = await ytExecute("YOUTUBE_DELETE_VIDEO", {
      videoId: id,
      confirmDelete: true,
    });
    return { ok: true, result: r.data };
  });
}

export async function POST(request: Request) {
  const { videoId, rating } = await request.json();
  return ytRoute(async () => {
    if (!videoId || !rating) throw new Error("videoId and rating are required.");
    const r = await ytExecute("YOUTUBE_RATE_VIDEO", { id: videoId, rating });
    return { ok: true, result: r.data };
  });
}
