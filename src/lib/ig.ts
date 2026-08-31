import "server-only";
import { activeAccountId } from "./accounts";
import { getSession } from "./composio";

/**
 * Composio wraps every provider result. Tools return their payload under
 * `data`, list tools nest it again under `data.data`, and a `composio_execution_message`
 * often carries the real explanation for an empty result (missing Meta
 * permission, no activity in the period, etc.) -- surface it, never swallow it.
 */
export type IgResult<T> = {
  data: T;
  note?: string;
  logId?: string;
};

type RawResult = {
  data?: unknown;
  log_id?: string;
  logId?: string;
  error?: unknown;
};

export async function execute<T = unknown>(
  slug: string,
  args: Record<string, unknown> = {},
): Promise<IgResult<T>> {
  const [session, account] = await Promise.all([getSession(), activeAccountId("instagram")]);
  const raw = (await session.execute(
    slug,
    args,
    account ? { account } : undefined,
  )) as RawResult;

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

  // List-shaped tools nest the array one level deeper.
  const inner = "data" in payload ? payload.data : payload;

  return { data: inner as T, note, logId: raw.log_id ?? raw.logId };
}

export const ME = "me";

export type Profile = {
  id: string;
  username?: string;
  name?: string;
  account_type?: string;
  biography?: string | null;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string | null;
  website?: string | null;
};

export type Media = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

export const MEDIA_FIELDS =
  "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";

export type PublishingLimit = {
  quota_usage?: number;
  config?: { quota_total?: number; quota_duration?: number };
};
