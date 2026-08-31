import { NextResponse } from "next/server";
import { complete, explainModelError } from "@/lib/agent";
import { execute, MEDIA_FIELDS, ME, type Media } from "@/lib/ig";
import { getSettings, voicePrompt } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Content suggestions grounded in this account's own performance, not generic
 * advice. Pulls recent posts, ranks by engagement, and asks the model to build
 * on what actually worked. Says so plainly when there is not enough data.
 */
export async function GET() {
  try {
    const settings = await getSettings();
    const media = await execute<Media[]>("INSTAGRAM_GET_IG_USER_MEDIA", {
      ig_user_id: ME,
      fields: MEDIA_FIELDS,
      limit: 30,
    });

    const posts = (Array.isArray(media.data) ? media.data : []).map((m) => ({
      caption: m.caption?.slice(0, 140) ?? "",
      type: m.media_product_type ?? m.media_type ?? "",
      engagement: (m.like_count ?? 0) + (m.comments_count ?? 0),
      timestamp: m.timestamp,
    }));

    const ranked = [...posts].sort((a, b) => b.engagement - a.engagement);
    const top = ranked.slice(0, 5);

    const grounded = posts.length > 0;
    const evidence = grounded
      ? `Top performing posts (engagement = likes + comments):\n${top
          .map((p, i) => `${i + 1}. [${p.type}, ${p.engagement}] ${p.caption || "(no caption)"}`)
          .join("\n")}\n\nTotal posts analysed: ${posts.length}.`
      : "This account has no posts yet, so there is no performance history.";

    const suggestions = await complete({
      system: [
        "You propose Instagram content ideas for an account you are given real data about.",
        voicePrompt(settings),
        "Return 5 ideas. Each: format (Reel/carousel/single image), then the concept in one line.",
        "Ground each idea in the evidence provided and say briefly which post or pattern it builds on.",
        "If there is no performance history, say so in one line first and base ideas on the stated topics instead. Never invent metrics.",
      ]
        .filter(Boolean)
        .join("\n"),
      prompt: evidence,
    });

    return NextResponse.json({
      grounded,
      analysed: posts.length,
      top,
      suggestions,
    });
  } catch (error) {
    const { message, status } = explainModelError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
