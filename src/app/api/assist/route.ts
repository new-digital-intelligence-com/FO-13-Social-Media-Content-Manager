import { NextResponse } from "next/server";
import { complete, explainModelError } from "@/lib/agent";
import { getSettings, voicePrompt } from "@/lib/settings";

export const runtime = "nodejs";

/**
 * Writing help for the manual composers. Deliberately tool-free: it costs a
 * fraction of the agent loop.
 *
 * Tasks are Instagram-shaped by default because that is where most composing
 * happens, but the same task is called from the YouTube and X panels. Without
 * a platform override, a YouTube *description* was being drafted under
 * Instagram's caption rules (2,200 characters, hashtag advice) when YouTube
 * allows 5,000 and treats the title separately.
 */
const PLATFORM_RULES: Record<string, string> = {
  youtube:
    "Target YouTube, not Instagram. Descriptions may run to 5,000 characters and should front-load the first two lines, which are all that shows above the fold. The video title is set separately -- do not open with it. Use keywords naturally; YouTube tags are a separate field, so do not append hashtag walls.",
  x: "Target X (Twitter), not Instagram. The hard limit is 280 characters per post -- stay inside it. If the idea does not fit, return a numbered thread where each part is independently under 280.",
  twitter:
    "Target X (Twitter), not Instagram. The hard limit is 280 characters per post -- stay inside it. If the idea does not fit, return a numbered thread where each part is independently under 280.",
};
const TASKS = {
  caption: {
    label: "caption",
    system:
      "You write Instagram captions. Return 3 distinct options, numbered. Each under 2,200 characters, most under 300. Hook in the first line -- it is all most people see. Natural voice, no hashtag walls, no em-dashes. End each with a light call to action only where it fits.",
  },
  hashtags: {
    label: "hashtags",
    system:
      "You suggest Instagram hashtags. Return one space-separated line of 10-20 tags, mixing broad reach and niche intent. Lowercase. No explanation, no numbering.",
  },
  "reel-script": {
    label: "reel script",
    system:
      "You write short-form vertical video scripts for Instagram Reels. Structure: HOOK (first 2 seconds, on-screen text), then beats with timestamps, then the closing CTA. Target 15-30 seconds unless told otherwise. Include suggested on-screen text and a shot note per beat. Be concrete, not generic advice.",
  },
  // Inline per-comment drafting wants one ready-to-post reply, not a menu.
  "comment-reply-one": {
    label: "comment reply",
    system:
      "You draft a single reply to one Instagram comment, as the account owner. Reply in the SAME LANGUAGE the comment is written in. Warm, brief, usually under 200 characters. Output only the reply text: no options, no numbering, no quotes, no commentary. Never invent facts about products, prices, shipping or availability; if the comment asks something unverifiable, reply warmly without inventing an answer.",
  },
  "comment-reply": {
    label: "comment reply",
    system:
      "You draft replies to Instagram comments as the account owner. Warm, brief (usually under 200 characters), matching the commenter's language. Never invent facts about products, prices, shipping or availability -- if the comment asks something unverifiable, say so and suggest the owner answer directly. Return 2 options.",
  },
  "dm-reply": {
    label: "DM reply",
    system:
      "You draft Instagram direct message replies as the account owner. Conversational, brief, matching the sender's language. Never invent facts about orders, prices or availability. Return 2 options.",
  },
  ideas: {
    label: "content ideas",
    system:
      "You propose Instagram content ideas. Return 5 ideas, each one line: format (Reel/carousel/single image) then the concept. Specific and shootable, not category advice.",
  },
  bio: {
    label: "bio",
    system:
      "You write Instagram bios. Max 150 characters. Return 3 options, numbered. Concrete, no buzzwords.",
  },
} as const;

export async function POST(request: Request) {
  try {
    const { task, prompt, context, platform } = (await request.json()) as {
      task: keyof typeof TASKS;
      prompt?: string;
      context?: string;
      platform?: string;
    };

    const config = TASKS[task];
    if (!config) {
      return NextResponse.json(
        { error: `Unknown task. Expected one of: ${Object.keys(TASKS).join(", ")}` },
        { status: 400 },
      );
    }

    // Every draft speaks in the configured brand voice.
    const settings = await getSettings();
    const platformRule = platform ? PLATFORM_RULES[platform.toLowerCase()] : undefined;
    const text = await complete({
      system: [config.system, platformRule, voicePrompt(settings)]
        .filter(Boolean)
        .join("\n\n"),
      prompt:
        [prompt, context && `Context:\n${context}`].filter(Boolean).join("\n\n") ||
        `Write a ${config.label}.`,
    });

    return NextResponse.json({ text });
  } catch (error) {
    const { message, status } = explainModelError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
