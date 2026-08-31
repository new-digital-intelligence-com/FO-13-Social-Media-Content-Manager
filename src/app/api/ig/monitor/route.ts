import { NextResponse } from "next/server";
import { execute, MEDIA_FIELDS, ME, type Media } from "@/lib/ig";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 120;

type Comment = { id: string; text?: string; username?: string; timestamp?: string };

/**
 * Instagram exposes no API to list @mentions, so "monitoring" means sweeping
 * comments on recent posts and flagging what a human should see. Anything
 * matching the escalation keywords is surfaced regardless of sentiment.
 */
const QUESTION = /\?|how (do|much|can)|when |where |can i|do you|is it|price|cost/i;
const NEGATIVE =
  /bad|worst|terrible|awful|hate|disappointed|rude|slow|late|damaged|not work|doesn'?t work/i;

export async function GET(request: Request) {
  const limit = Math.min(Number(new URL(request.url).searchParams.get("posts") ?? 12), 25);

  try {
    const settings = await getSettings();
    const media = await execute<Media[]>("INSTAGRAM_GET_IG_USER_MEDIA", {
      ig_user_id: ME,
      fields: MEDIA_FIELDS,
      limit,
    });
    const posts = Array.isArray(media.data) ? media.data : [];

    const sweeps = await Promise.all(
      posts.map(async (post) => {
        try {
          const comments = await execute<Comment[]>("INSTAGRAM_GET_IG_MEDIA_COMMENTS", {
            ig_media_id: post.id,
          });
          return { post, comments: Array.isArray(comments.data) ? comments.data : [] };
        } catch {
          return { post, comments: [] as Comment[] };
        }
      }),
    );

    const flagged = sweeps.flatMap(({ post, comments }) =>
      comments
        .map((comment) => {
          const text = comment.text ?? "";
          const escalate = settings.escalateKeywords.some((k) =>
            text.toLowerCase().includes(k.toLowerCase()),
          );
          const reason = escalate
            ? "issue"
            : NEGATIVE.test(text)
              ? "negative"
              : QUESTION.test(text)
                ? "question"
                : null;
          return reason
            ? {
                reason,
                priority: escalate ? 1 : reason === "negative" ? 2 : 3,
                commentId: comment.id,
                text,
                username: comment.username,
                timestamp: comment.timestamp,
                mediaId: post.id,
                caption: post.caption?.slice(0, 80),
                permalink: post.permalink,
              }
            : null;
        })
        .filter(Boolean),
    );

    flagged.sort((a, b) => a!.priority - b!.priority);

    return NextResponse.json({
      scanned: { posts: posts.length, comments: sweeps.reduce((n, s) => n + s.comments.length, 0) },
      flagged,
      note: media.note,
      // Be explicit: this is comment monitoring, not mention monitoring.
      limitation:
        "Instagram provides no API to list @mentions. This monitors comments on your recent posts; mentions in other accounts' posts must come from your Instagram notifications.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
