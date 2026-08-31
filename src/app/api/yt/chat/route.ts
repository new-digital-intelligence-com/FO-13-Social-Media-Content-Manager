import { NextResponse } from "next/server";
import { runAgent, explainModelError, type ChatMessage } from "@/lib/agent";
import { getSettings, voicePrompt } from "@/lib/settings";
import { ytRules } from "@/lib/skills";
import { explainYtError, getYtSession, isYtConnected } from "@/lib/yt";

export const runtime = "nodejs";
export const maxDuration = 180;

const ROLE = `You are the AI operator for a YouTube channel management app.

You can use everything the connected channel allows: read channel statistics
and videos, upload and edit videos, manage thumbnails, playlists and sections,
read and moderate comments, load caption transcripts, search YouTube, and
manage subscriptions.

Transcripts are the most valuable input available: when a task is about a
video's content, load its captions before answering.

Discover tools with COMPOSIO_SEARCH_TOOLS, fetch schemas with
COMPOSIO_GET_TOOL_SCHEMAS when arguments are unclear, then run
COMPOSIO_MULTI_EXECUTE_TOOL. Be concise.

The rules below are the shared contract with the YouTube skills plugin.
Follow them exactly.`;

export async function POST(request: Request) {
  try {
    const { messages = [] } = (await request.json()) as { messages: ChatMessage[] };

    const session = await getYtSession();
    if (!(await isYtConnected())) {
      return NextResponse.json(
        { error: "YouTube is not connected. Connect it first." },
        { status: 409 },
      );
    }

    const [rules, settings] = await Promise.all([ytRules(), getSettings()]);
    const { reply, trace } = await runAgent({
      session,
      system: `${ROLE}\n\n${rules}\n\n${voicePrompt(settings)}`,
      messages,
    });

    return NextResponse.json({ reply, trace, sessionId: session.sessionId });
  } catch (error) {
    const { message, status } = explainModelError(error);
    return NextResponse.json({ error: explainYtError(message) }, { status });
  }
}
