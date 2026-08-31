import "server-only";
import { activeAccountId } from "./accounts";
import { composio, userId } from "./composio";

export const TOOLKIT = "twitter";

/**
 * Composio removed managed Twitter credentials in February 2026, so unlike
 * Instagram this toolkit cannot be connected out of the box: a session scoped
 * to `twitter` fails with code 4300 until an auth config built from the user's
 * own X developer app exists. `SetupRequiredError` carries that state to the
 * API layer so the UI can show the setup wizard instead of a raw 500.
 */
export class SetupRequiredError extends Error {
  readonly code = "X_SETUP_REQUIRED";
  constructor(message = "Twitter needs your own X API credentials before it can connect.") {
    super(message);
  }
}

/**
 * X rejects the entire authorization if the app is not permissioned for every
 * scope requested -- the browser shows only "You weren't able to give access to
 * the App", with no indication which scope was at fault.
 *
 * These are the scopes a standard app with "Read and write" permissions grants.
 * DM and Spaces scopes are deliberately excluded: they need elevated app
 * permissions, and including them by default breaks the flow for everyone who
 * has not set them up.
 */
export const DEFAULT_SCOPES = [
  "tweet.read",
  "tweet.write",
  "tweet.moderate.write",
  "users.read",
  "follows.read",
  "follows.write",
  "like.read",
  "like.write",
  "list.read",
  "list.write",
  "bookmark.read",
  "bookmark.write",
  "mute.read",
  "mute.write",
  "offline.access",
];

/**
 * Opt-in extras. `dm.*` requires the app's permission level to be
 * "Read and write and Direct message"; `space.read` needs elevated access.
 */
export const OPTIONAL_SCOPES = ["dm.read", "dm.write", "space.read"];

const sessionIds = new Map<string, string>();

type AuthConfig = {
  id: string;
  name?: string;
  status?: string;
  toolkit?: { slug?: string };
};

export async function findAuthConfig(): Promise<AuthConfig | null> {
  const list = await composio.authConfigs.list({ toolkit: TOOLKIT });
  const items = (list as { items?: AuthConfig[] }).items ?? [];
  // Defensive: an unrecognised filter key is ignored server-side and returns
  // every config, so confirm the toolkit rather than trusting position.
  return (
    items.find((i) => i.toolkit?.slug?.toLowerCase() === TOOLKIT) ?? null
  );
}

/** Remove the stored config so the user can re-enter credentials. */
export async function deleteAuthConfig() {
  const existing = await findAuthConfig();
  if (!existing) return false;
  await composio.authConfigs.delete(existing.id);
  sessionIds.clear();
  return true;
}

export async function createAuthConfig(input: {
  clientId: string;
  clientSecret: string;
  /**
   * Composio requires the X app's App-Only Bearer Token alongside the OAuth
   * pair. Its credential key is `generic_id` (display name "Application Bearer
   * Token"), and it powers the app-only endpoints -- search, counts, label
   * stream and compliance jobs -- which OAuth user tokens cannot reach.
   */
  bearerToken: string;
  scopes?: string[];
}) {
  return composio.authConfigs.create(TOOLKIT, {
    type: "use_custom_auth",
    name: `x-${Date.now()}`,
    authScheme: "OAUTH2",
    credentials: {
      client_id: input.clientId,
      client_secret: input.clientSecret,
      generic_id: input.bearerToken,
      // The credentials map takes scalars, so scopes travel comma-separated.
      scopes: (input.scopes?.length ? input.scopes : DEFAULT_SCOPES).join(","),
    },
    // Sessions are the tool-router path; without this the config is invisible.
    isEnabledForToolRouter: true,
  });
}

export async function getXSession(user = userId()) {
  const existing = sessionIds.get(user);
  if (existing) {
    try {
      return await composio.use(existing);
    } catch {
      sessionIds.delete(user);
    }
  }

  const authConfig = await findAuthConfig();
  if (!authConfig) throw new SetupRequiredError();

  const session = await composio.create(user, {
    toolkits: [TOOLKIT],
    sandbox: { enable: false },
    authConfigs: { [TOOLKIT]: authConfig.id },
    multiAccount: { enable: true, maxAccountsPerToolkit: 5 },
  });
  sessionIds.set(user, session.sessionId);
  return session;
}

export type XResult<T> = { data: T; note?: string; logId?: string };

/** Same envelope-unwrapping as the Instagram helper. */
export async function xExecute<T = unknown>(
  slug: string,
  args: Record<string, unknown> = {},
): Promise<XResult<T>> {
  const [session, account] = await Promise.all([getXSession(), activeAccountId("x")]);
  const raw = (await session.execute(
    slug,
    args,
    account ? { account } : undefined,
  )) as {
    data?: unknown;
    error?: unknown;
    log_id?: string;
  };
  if (raw.error) {
    throw new Error(
      typeof raw.error === "string" ? raw.error : JSON.stringify(raw.error),
    );
  }
  const payload = (raw.data ?? {}) as Record<string, unknown>;
  const note =
    typeof payload.composio_execution_message === "string"
      ? payload.composio_execution_message
      : undefined;
  const inner = "data" in payload ? payload.data : payload;
  return { data: inner as T, note, logId: raw.log_id };
}

export async function isXConnected() {
  try {
    const session = await getXSession();
    const details = await session.toolkits({ toolkits: [TOOLKIT] });
    const item = details.items?.find(
      (i: { slug?: string }) => i.slug?.toLowerCase() === TOOLKIT,
    );
    return Boolean(item?.connection?.isActive);
  } catch (error) {
    if (error instanceof SetupRequiredError) throw error;
    return false;
  }
}

/** Turn X's terser failures into something actionable. */
export function explainXError(message: string) {
  if (/client-not-enrolled|not linked to project/i.test(message)) {
    return `${message} — your X app is not linked to a Project in the developer portal, or the OAuth config is stale.`;
  }
  if (/UsageCapExceeded|rate limit|429/i.test(message)) {
    return `${message} — X enforces per-app rate limits and monthly post caps by plan tier.`;
  }
  if (/403/.test(message)) {
    return `${message} — your X developer plan may not include this endpoint. Check your access tier.`;
  }
  return message;
}
