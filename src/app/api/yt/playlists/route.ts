import { ytExecute, ytRoute } from "@/lib/yt";

export const runtime = "nodejs";

/** ?id= a playlist's items · else the user's playlists. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  return ytRoute(async () => {
    if (id) {
      const r = await ytExecute("YOUTUBE_LIST_PLAYLIST_ITEMS", {
        part: "snippet,contentDetails",
        playlistId: id,
        maxResults: 50,
      });
      return { items: r.data, note: r.note };
    }
    const r = await ytExecute("YOUTUBE_LIST_USER_PLAYLISTS", {
      part: "snippet,contentDetails",
      mine: true,
    });
    return { playlists: r.data, note: r.note };
  });
}

type Action = "create" | "update" | "delete" | "addVideo" | "removeItem";

export async function POST(request: Request) {
  const { action, id, itemId, title, description, privacyStatus, videoId, playlistId } =
    await request.json();

  return ytRoute(async () => {
    const calls: Record<Action, () => Promise<unknown>> = {
      create: () =>
        ytExecute("YOUTUBE_CREATE_PLAYLIST", {
          title,
          ...(description ? { description } : {}),
          ...(privacyStatus ? { privacyStatus } : {}),
        }),
      update: () =>
        ytExecute("YOUTUBE_UPDATE_PLAYLIST", {
          id,
          part: "snippet",
          snippet: { title, ...(description ? { description } : {}) },
        }),
      // Deletion is gated by an explicit confirmDelete flag.
      delete: () => ytExecute("YOUTUBE_DELETE_PLAYLIST", { id, confirmDelete: true }),
      addVideo: () =>
        ytExecute("YOUTUBE_ADD_VIDEO_TO_PLAYLIST", { playlistId, videoId }),
      removeItem: () => ytExecute("YOUTUBE_DELETE_PLAYLIST_ITEM", { id: itemId }),
    };
    const run = calls[action as Action];
    if (!run) throw new Error(`Unknown playlist action "${action}".`);
    return { ok: true, result: await run() };
  });
}
