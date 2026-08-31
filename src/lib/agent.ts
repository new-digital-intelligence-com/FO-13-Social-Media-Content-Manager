import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { MODEL, TOKEN_BUDGET, anthropic, composio } from "./composio";

export type ChatMessage = Anthropic.MessageParam;

/** The session object the provider accepts (it also allows a bare user id). */
type Session = {
  sessionId: string;
  tools: () => Promise<unknown>;
};

/**
 * The tool-calling loop, shared by every platform's chat route.
 *
 * Anthropic differs from OpenAI-shaped APIs in three ways that matter here:
 * the system prompt is a top-level parameter rather than a message, tool calls
 * arrive as `tool_use` content blocks (not a `tool_calls` array), and results
 * go back as `tool_result` blocks inside a *user* message.
 */
export async function runAgent({
  session,
  system,
  messages,
}: {
  session: Session;
  system: string;
  messages: ChatMessage[];
}): Promise<{ reply: string; trace: string[] }> {
  const tools = (await session.tools()) as Anthropic.ToolUnion[];

  const conversation: ChatMessage[] = [...trimHistory(messages)];
  const trace: string[] = [];

  for (let turn = 0; turn < TOKEN_BUDGET.maxTurns; turn++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: TOKEN_BUDGET.maxTokens,
      system,
      messages: conversation,
      tools,
    });

    conversation.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const reply = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { reply, trace };
    }

    trace.push(
      ...response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        .map((b) => b.name),
    );

    const results = (await composio.provider.handleToolCalls(
      session as never,
      response,
    )) as ChatMessage[];

    for (const message of results) {
      if (!Array.isArray(message.content)) continue;
      for (const block of message.content) {
        // Long tool output is trimmed rather than dropped, so the model still
        // sees the shape of the result and can say what it truncated.
        if (
          block.type === "tool_result" &&
          typeof block.content === "string" &&
          block.content.length > TOKEN_BUDGET.toolResultChars
        ) {
          block.content =
            block.content.slice(0, TOKEN_BUDGET.toolResultChars) +
            "\n...[truncated]";
        }
      }
    }
    conversation.push(...results);
  }

  return {
    reply: "I hit the tool-call limit before finishing. Try a narrower request.",
    trace,
  };
}

/** A tool result must never lead: it would orphan its assistant tool_use. */
function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  const recent = messages.slice(-TOKEN_BUDGET.historyMessages);
  const start = recent.findIndex((m) => m.role === "user");
  return start <= 0 ? recent : recent.slice(start);
}

/** Anthropic rejects `max_tokens` omissions and unknown params; keep this shared. */
export async function complete({
  system,
  prompt,
  maxTokens = 2000,
  temperature = 0.8,
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Consistent, human error text for model failures. */
export function explainModelError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (/rate_limit|429/i.test(message)) {
    return {
      message: "Rate limited by the model provider. Wait a moment and retry.",
      status: 429,
    };
  }
  if (/authentication|401|api key/i.test(message)) {
    return {
      message: "ANTHROPIC_API_KEY is missing or invalid. Check .env.local.",
      status: 401,
    };
  }
  return { message, status: 500 };
}

/**
 * A completion that can search the web before answering.
 *
 * Account discovery from model recall alone is unreliable: the model has no
 * follower numbers and no sense of what changed after training, which is how a
 * parked handle gets recommended as a major account. Web search replaces recall
 * with something it actually looked up.
 *
 * The tool runs server-side, so there is no client loop -- but a turn can come
 * back as `pause_turn` mid-search, which has to be continued rather than
 * treated as the answer.
 */
const SEARCH_TOOL_TYPE =
  process.env.WEB_SEARCH_TOOL_TYPE ??
  // Haiku 4.5 predates the dynamic-filtering variant; the basic tool is the
  // one it supports. Newer models can be pointed at web_search_20260209.
  "web_search_20250305";

export const webSearchEnabled = process.env.WEB_SEARCH !== "off";

export async function completeWithSearch({
  system,
  prompt,
  maxTokens = 4000,
  maxSearches = 4,
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
  maxSearches?: number;
}): Promise<{ text: string; searches: number; searched: boolean }> {
  if (!webSearchEnabled) {
    return { text: await complete({ system, prompt, maxTokens }), searches: 0, searched: false };
  }

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let searches = 0;

  // A handful of continuations is plenty; this is a bounded lookup, not an agent.
  for (let turn = 0; turn < 5; turn++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages,
      tools: [
        {
          type: SEARCH_TOOL_TYPE,
          name: "web_search",
          max_uses: maxSearches,
        } as unknown as Anthropic.ToolUnion,
      ],
    });

    searches += response.content.filter(
      (b) => (b as { type?: string }).type === "web_search_tool_result",
    ).length;

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return { text, searches, searched: searches > 0 };
  }

  return { text: "", searches, searched: searches > 0 };
}

/**
 * Pull account handles out of free-form research text.
 *
 * Asking one call to search *and* answer in a rigid format does not work: web
 * search pushes the model into prose and markdown, and a strict line parser
 * then finds nothing. So research runs unconstrained, and a second cheap,
 * tool-free call does nothing but reformat what it found.
 */
export async function extractHandles(
  research: string,
  network: "Instagram" | "X",
  topic?: string,
): Promise<{ handle: string; note: string }[]> {
  if (!research.trim()) return [];

  const text = await complete({
    system: [
      `Extract ${network} account handles from the text below.`,
      // Research prose mentions accounts it is rejecting, comparing, or noting
      // in passing. Taking every handle turns those into recommendations.
      "Include ONLY accounts the text actually puts forward as matching the request.",
      "Exclude any the text mentions as an example of what does not fit, dismisses,",
      "names only in passing, or describes as inactive, dormant or renamed.",
      topic
        ? `The request was: "${topic}". Drop any account that does not genuinely fit it, including every qualifier in it.`
        : "",
      "Output one per line, exactly: handle | short description (max 12 words)",
      "No @ prefix. No numbering, bullets, markdown, headings or commentary.",
      "If nothing in the text qualifies, output nothing at all.",
    ]
      .filter(Boolean)
      .join("\n"),
    prompt: research.slice(0, 12000),
    maxTokens: 2000,
    temperature: 0,
  });

  const seen = new Set<string>();
  return text
    .split("\n")
    .map((line) => line.trim().replace(/^[-*\d.\s]+/, ""))
    .filter(Boolean)
    .map((line) => {
      const [rawHandle, ...rest] = line.split("|");
      return {
        handle: rawHandle.trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, ""),
        note: rest.join("|").trim(),
      };
    })
    .filter((entry) => /^[A-Za-z0-9._]{1,30}$/.test(entry.handle))
    .filter((entry) => (seen.has(entry.handle.toLowerCase()) ? false : seen.add(entry.handle.toLowerCase())));
}
