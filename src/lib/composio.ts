import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { Composio } from "@composio/core";
import { AnthropicProvider } from "@composio/anthropic";

export const TOOLKIT = "instagram";

/**
 * Claude Haiku 4.5 has a 200K context window, so these are generous compared
 * with the previous provider's 8k tokens/min cap. Sessions still use meta-tool
 * discovery rather than preloading every toolkit schema -- it keeps prompts
 * small and lets one session serve any toolkit.
 */
export const TOKEN_BUDGET = {
  /** Max characters of a single tool result fed back to the model. */
  toolResultChars: 20000,
  /** Max prior messages replayed on each turn. */
  historyMessages: 30,
  /** Max tool-calling rounds before giving up. */
  maxTurns: 12,
  /** Response cap per turn. */
  maxTokens: 8000,
};

/**
 * Fail fast on a missing or masked key.
 *
 * `composio dev init` (CLI 0.4.0) can persist the dashboard's masked display
 * form, e.g. "ak_ab**wxyz". The SDK accepts it and the API then rejects the
 * first request with an opaque 401, so check the shape up front.
 */
function checkApiKey() {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) {
    throw new Error(
      "COMPOSIO_API_KEY is not set. Copy .env.example to .env.local and add the " +
        "key from Dashboard -> Platform -> your project -> Settings -> API keys.",
    );
  }
  if (key.includes("*") || key.length < 10) {
    throw new Error(
      "COMPOSIO_API_KEY looks masked or truncated. Reveal the key in the " +
        "dashboard before copying it -- a masked value like ak_ab**wxyz is rejected.",
    );
  }
}

checkApiKey();

export const composio = new Composio({ provider: new AnthropicProvider() });

/** Reads ANTHROPIC_API_KEY from the environment. */
export const anthropic = new Anthropic();

/**
 * Haiku 4.5 predates adaptive thinking and `output_config.effort` -- both are
 * rejected on this model, so neither is set anywhere in this app.
 */
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

export function userId(): string {
  const id = process.env.COMPOSIO_TEST_USER_ID;
  if (!id) {
    throw new Error(
      "COMPOSIO_TEST_USER_ID is not set. Add it to .env.local. In production, " +
        "replace this with your authenticated user's id -- Composio scopes " +
        "connections per user.",
    );
  }
  return id;
}

// Sessions are reusable across requests; only the id needs to survive.
// Swap for your session store (redis/db) when this serves more than one user.
const sessionIds = new Map<string, string>();

export async function getSession(user = userId()) {
  const existing = sessionIds.get(user);
  if (existing) {
    try {
      return await composio.use(existing);
    } catch {
      sessionIds.delete(user);
    }
  }
  const session = await composio.create(user, {
    toolkits: [TOOLKIT],
    sandbox: { enable: false },
    // Allows several Instagram profiles under one user; the acting account is
    // chosen per call rather than defaulting to "most recently connected".
    multiAccount: { enable: true, maxAccountsPerToolkit: 5 },
  });
  sessionIds.set(user, session.sessionId);
  return session;
}

export async function isConnected(session: Awaited<ReturnType<typeof getSession>>) {
  const details = await session.toolkits({ toolkits: [TOOLKIT] });
  const item = details.items?.find(
    (i: { slug?: string }) => i.slug?.toLowerCase() === TOOLKIT,
  );
  return Boolean(item?.connection?.isActive);
}
