import { VIDEO_PARTS, ytExecute, ytRoute } from "@/lib/yt";

export const runtime = "nodejs";

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
    return { videos: r.data, note: r.note };
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
