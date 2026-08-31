import { myChannelId, ytExecute, ytRoute } from "@/lib/yt";

export const runtime = "nodejs";

/** ?videoId= comment threads on a video · ?parentId= replies to one comment. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const videoId = params.get("videoId");
  const parentId = params.get("parentId");
  const max = Math.min(Number(params.get("max") ?? 25), 100);

  return ytRoute(async () => {
    if (parentId) {
      const r = await ytExecute("YOUTUBE_LIST_COMMENTS", {
        part: "snippet",
        parentId,
        maxResults: max,
      });
      return { replies: r.data, note: r.note };
    }
    // LIST_COMMENT_THREADS is deprecated; THREADS2 is the current tool.
    // allThreadsRelatedToChannelId takes the channel id string, not a boolean.
    const r = await ytExecute("YOUTUBE_LIST_COMMENT_THREADS2", {
      part: "snippet,replies",
      ...(videoId
        ? { videoId }
        : { allThreadsRelatedToChannelId: await myChannelId() }),
      maxResults: max,
    });
    return { threads: r.data, note: r.note };
  });
}

type Action = "reply" | "comment" | "update" | "delete" | "spam" | "moderate";

export async function POST(request: Request) {
  const { action, videoId, channelId, parentId, commentId, text, status, banAuthor } =
    (await request.json()) as {
      action: Action;
      videoId?: string;
      channelId?: string;
      parentId?: string;
      commentId?: string;
      text?: string;
      status?: "heldForReview" | "published" | "rejected";
      banAuthor?: boolean;
    };

  return ytRoute(async () => {
    // The comment tools take `textOriginal`, not `text`, and camelCase ids.
    const calls: Record<Action, () => Promise<unknown>> = {
      reply: () =>
        ytExecute("YOUTUBE_CREATE_COMMENT_REPLY", {
          parentId,
          textOriginal: text,
        }),
      comment: async () =>
        ytExecute("YOUTUBE_POST_COMMENT", {
          videoId,
          channelId: channelId ?? (await myChannelId()),
          textOriginal: text,
        }),
      update: () =>
        ytExecute("YOUTUBE_UPDATE_COMMENT", { id: commentId, textOriginal: text }),
      delete: () => ytExecute("YOUTUBE_DELETE_COMMENT", { id: commentId }),
      spam: () => ytExecute("YOUTUBE_MARK_COMMENT_AS_SPAM", { id: commentId }),
      moderate: () =>
        ytExecute("YOUTUBE_SET_COMMENT_MODERATION_STATUS", {
          id: commentId,
          moderationStatus: status ?? "heldForReview",
          // banAuthor is only valid alongside a "rejected" status.
          ...(banAuthor && status === "rejected" ? { banAuthor: true } : {}),
        }),
    };
    const run = calls[action];
    if (!run) throw new Error(`Unknown comment action "${action}".`);
    return { ok: true, result: await run() };
  });
}
