import { NextResponse } from "next/server";
import { getSession, isConnected } from "@/lib/composio";
import { runAgent, explainModelError, type ChatMessage } from "@/lib/agent";
import { getSettings, voicePrompt } from "@/lib/settings";
import { instagramRules } from "@/lib/skills";

export const runtime = "nodejs";
export const maxDuration = 180;

const ROLE = `You are the AI operator for an Instagram content management app.

You can do anything the connected Instagram Business account allows: read
profile and insights, list and inspect media, read and reply to comments,
handle mentions, read and send direct messages, manage ice breakers, and create
or publish posts, reels, stories and carousels.

Work by discovering tools with COMPOSIO_SEARCH_TOOLS, fetching schemas with
COMPOSIO_GET_TOOL_SCHEMAS when arguments are unclear, then running
COMPOSIO_MULTI_EXECUTE_TOOL. Be concise.

The rules below are the shared contract with the Instagram skills plugin.
Follow them exactly.`;

export async function POST(request: Request) {
  try {
    const { messages = [] } = (await request.json()) as { messages: ChatMessage[] };

    const session = await getSession();
    if (!(await isConnected(session))) {
      return NextResponse.json(
        { error: "Instagram is not connected. Connect it first." },
        { status: 409 },
      );
    }

    const [rules, settings] = await Promise.all([instagramRules(), getSettings()]);
    const { reply, trace } = await runAgent({
      session,
      system: `${ROLE}\n\n${rules}\n\n${voicePrompt(settings)}`,
      messages,
    });

    return NextResponse.json({ reply, trace, sessionId: session.sessionId });
  } catch (error) {
    const { message, status } = explainModelError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
