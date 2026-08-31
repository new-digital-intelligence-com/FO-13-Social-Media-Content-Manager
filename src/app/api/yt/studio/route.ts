import { NextResponse } from "next/server";
import { complete, explainModelError } from "@/lib/agent";
import { getSettings, voicePrompt } from "@/lib/settings";
import { VIDEO_PARTS, ytExecute } from "@/lib/yt";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * The AI layer that makes YouTube worth automating: the caption track is a
 * full transcript, and almost every content task downstream is a
 * transformation of it — chapters, descriptions, tags, or a repurposed post
 * for another platform.
 */
const TASKS = {
  summary: {
    label: "summary",
    system:
      "You summarise a YouTube video from its transcript. Give a 3-sentence overview, then 4-6 bullet takeaways. Use only what the transcript says; never invent claims, numbers or names.",
  },
  chapters: {
    label: "chapters",
    system:
      "You write YouTube chapter markers from a transcript with timestamps. Output one per line as `M:SS Title`. The first must be `0:00`. Titles are 2-5 words, concrete, no clickbait. Only use timestamps that appear in the transcript.",
  },
  description: {
    label: "description",
    system:
      "You write YouTube video descriptions from a transcript. Structure: a 2-line hook, a short paragraph on what the viewer learns, then 3-5 bullet points. Under 4,500 characters. No hashtag walls. Do not invent links, sponsors or timestamps.",
  },
  titles: {
    label: "title options",
    system:
      "You write YouTube titles from a transcript. Return 5 numbered options under 60 characters each. Specific and honest — no clickbait, no ALL CAPS, no fabricated numbers.",
  },
  tags: {
    label: "tags",
    system:
      "You suggest YouTube tags from a transcript. Return one comma-separated line of 10-15 tags, lowercase, mixing broad and specific. No explanation.",
  },
  repurpose: {
    label: "cross-platform posts",
    system:
      "You repurpose a YouTube video into posts for other platforms, from its transcript. Return three clearly labelled sections: INSTAGRAM CAPTION (under 300 words, hook first line), X THREAD (4-6 numbered posts, each under 280 characters), and REEL SCRIPT (hook, timestamped beats, on-screen text). Ground everything in the transcript.",
  },
  "comment-reply": {
    label: "comment replies",
    system:
      "You draft replies to YouTube comments as the channel owner. Warm, brief, matching the commenter's language. Never invent facts about products, sponsors, schedules or future videos. Return 2 options.",
  },
} as const;

export async function POST(request: Request) {
  try {
    const { task, videoId, transcript, prompt, context } = (await request.json()) as {
      task: keyof typeof TASKS;
      videoId?: string;
      transcript?: string;
      prompt?: string;
      context?: string;
    };

    const config = TASKS[task];
    if (!config) {
      return NextResponse.json(
        { error: `Unknown task. Expected one of: ${Object.keys(TASKS).join(", ")}` },
        { status: 400 },
      );
    }

    // Pull the transcript when the caller passed only a video id.
    let source = transcript ?? "";
    let usedTranscript = Boolean(transcript);

    if (!source && videoId) {
      const tracks = await ytExecute<{ items?: { id?: string }[] }>(
        "YOUTUBE_LIST_CAPTION_TRACK",
        { video_id: videoId },
      );
      const trackId = Array.isArray(tracks.data)
        ? (tracks.data[0] as { id?: string })?.id
        : tracks.data?.items?.[0]?.id;

      if (trackId) {
        const loaded = await ytExecute("YOUTUBE_LOAD_CAPTIONS", { id: trackId });
        source = typeof loaded.data === "string" ? loaded.data : JSON.stringify(loaded.data);
        usedTranscript = true;
      }
    }

    // Fall back to metadata so the task still works on a video with no captions.
    if (!source && videoId) {
      const details = await ytExecute("YOUTUBE_GET_VIDEO_DETAILS_BATCH", {
        id: videoId,
        part: VIDEO_PARTS,
      });
      source = JSON.stringify(details.data).slice(0, 8000);
    }

    if (!source && !prompt) {
      return NextResponse.json(
        { error: "Provide a videoId, a transcript, or a prompt." },
        { status: 400 },
      );
    }

    const settings = await getSettings();
    const text = await complete({
      system: `${config.system}\n\n${voicePrompt(settings)}`,
      prompt: [
        prompt,
        context && `Context:\n${context}`,
        source && `${usedTranscript ? "Transcript" : "Video metadata"}:\n${source.slice(0, 40000)}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      maxTokens: 4000,
    });

    return NextResponse.json({ text, usedTranscript, task });
  } catch (error) {
    const { message, status } = explainModelError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
