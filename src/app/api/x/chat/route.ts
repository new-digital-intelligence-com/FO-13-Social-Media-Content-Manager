import { NextResponse } from "next/server";
import { runAgent, explainModelError, type ChatMessage } from "@/lib/agent";
import { getSettings, voicePrompt } from "@/lib/settings";
import { xRules } from "@/lib/skills";
import { SetupRequiredError, explainXError, getXSession } from "@/lib/x";

export const runtime = "nodejs";
export const maxDuration = 180;

const ROLE = `You are the AI operator for an X (Twitter) content management app.

You can use everything the connected X account allows: read the timeline, post
and delete posts and threads, like, repost, bookmark, hide replies, follow,
mute, search recent and archived posts, manage lists, read and send DMs, and
pull post analytics.

Discover tools with COMPOSIO_SEARCH_TOOLS, fetch schemas with
COMPOSIO_GET_TOOL_SCHEMAS when arguments are unclear, then run
COMPOSIO_MULTI_EXECUTE_TOOL. Be concise.

The rules below are the shared contract with the X skills plugin. Follow them
exactly.`;

export async function POST(request: Request) {
  try {
    const { messages = [] } = (await request.json()) as { messages: ChatMessage[] };
    const session = await getXSession();
    const [rules, settings] = await Promise.all([xRules(), getSettings()]);

    const { reply, trace } = await runAgent({
      session,
      system: `${ROLE}\n\n${rules}\n\n${voicePrompt(settings)}`,
      messages,
    });

    return NextResponse.json({ reply, trace, sessionId: session.sessionId });
  } catch (error) {
    if (error instanceof SetupRequiredError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    const { message, status } = explainModelError(error);
    return NextResponse.json({ error: explainXError(message) }, { status });
  }
}
