import { ytExecute, ytRoute } from "@/lib/yt";

export const runtime = "nodejs";

/** The authenticated channel plus its lifetime statistics. */
export async function GET() {
  return ytRoute(async () => {
    const [channels, stats] = await Promise.all([
      ytExecute("YOUTUBE_LIST_CHANNELS", {
        part: "snippet,statistics,brandingSettings,contentDetails",
        mine: true,
      }),
      ytExecute("YOUTUBE_GET_CHANNEL_STATISTICS").catch(() => null),
    ]);
    return { channel: channels.data, statistics: stats?.data ?? null, note: channels.note };
  });
}

/** Update channel metadata (title, description, keywords). */
export async function PATCH(request: Request) {
  const { id, title, description, keywords } = await request.json();
  return ytRoute(async () => {
    if (!id) throw new Error("Channel id is required.");
    const r = await ytExecute("YOUTUBE_UPDATE_CHANNEL", {
      id,
      part: "brandingSettings",
      brandingSettings: {
        channel: {
          ...(title ? { title } : {}),
          ...(description ? { description } : {}),
          ...(keywords ? { keywords } : {}),
        },
      },
    });
    return { ok: true, result: r.data };
  });
}
