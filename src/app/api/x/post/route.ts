import { xRoute } from "@/lib/x-route";
import { xExecute } from "@/lib/x";

export const runtime = "nodejs";
export const maxDuration = 180;

type Body = {
  text?: string;
  /** Post a thread: each entry replies to the previous one. */
  thread?: string[];
  replyToId?: string;
  quoteId?: string;
  mediaIds?: string[];
  pollOptions?: string[];
  pollDurationMinutes?: number;
  forSuperFollowersOnly?: boolean;
  replySettings?: "following" | "mentionedUsers";
};

/** X counts URLs and unicode its own way; 280 is the plain-text guard. */
const LIMIT = 280;

function buildPost(body: Body, text: string, replyTo?: string) {
  return {
    text,
    ...(replyTo ? { reply: { in_reply_to_tweet_id: replyTo } } : {}),
    ...(body.quoteId ? { quote_tweet_id: body.quoteId } : {}),
    ...(body.mediaIds?.length ? { media: { media_ids: body.mediaIds } } : {}),
    ...(body.pollOptions?.length
      ? {
          poll: {
            options: body.pollOptions,
            duration_minutes: body.pollDurationMinutes ?? 1440,
          },
        }
      : {}),
    ...(body.forSuperFollowersOnly ? { for_super_followers_only: true } : {}),
    ...(body.replySettings ? { reply_settings: body.replySettings } : {}),
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  return xRoute(async () => {
    const parts = body.thread?.length ? body.thread : [body.text ?? ""];
    const tooLong = parts.find((p) => p.length > LIMIT);
    if (tooLong) {
      throw new Error(
        `A post is ${tooLong.length} characters; X allows ${LIMIT}. Split it into a thread.`,
      );
    }
    if (parts.every((p) => !p.trim()) && !body.mediaIds?.length) {
      throw new Error("Nothing to post.");
    }

    // A thread is just successive replies, so each needs the previous id.
    const created: unknown[] = [];
    let replyTo = body.replyToId;
    for (const text of parts) {
      const r = await xExecute<{ id?: string; data?: { id?: string } }>(
        "TWITTER_CREATION_OF_A_POST",
        buildPost(body, text, replyTo),
      );
      created.push(r.data);
      const id = (r.data as { id?: string })?.id ?? r.data?.data?.id;
      if (!id) break;
      replyTo = id;
    }
    return { ok: true, created };
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  return xRoute(async () => {
    if (!id) throw new Error("id is required.");
    const r = await xExecute("TWITTER_POST_DELETE_BY_POST_ID", { id });
    return { ok: true, result: r.data };
  });
}
