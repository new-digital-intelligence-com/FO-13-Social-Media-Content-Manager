import "server-only";
import { composio, userId } from "./composio";
import { readStore, writeStore } from "./store";

/** Platform id in the UI -> toolkit slug on the integration platform. */
export const TOOLKITS = {
  instagram: "instagram",
  x: "twitter",
  youtube: "youtube",
} as const;

export type PlatformId = keyof typeof TOOLKITS;

export type Account = {
  id: string;
  alias: string | null;
  status: string;
  /** Best available human label: alias, else a short id. */
  label: string;
  active: boolean;
  createdAt?: string;
};

type RawAccount = {
  id: string;
  alias?: string | null;
  status?: string;
  createdAt?: string;
  created_at?: string;
  toolkit?: { slug?: string };
};

/**
 * Which connected account each platform currently acts as.
 *
 * A user can link several accounts per toolkit (two Instagram profiles, a
 * personal and a brand X account). Without an explicit choice the platform
 * silently uses the most recently connected one, which is a surprising default
 * once more than one exists -- so the selection is stored and passed on every
 * call.
 */
type Selection = Partial<Record<PlatformId, string>>;

/**
 * Local display names, keyed by connected-account id.
 *
 * Aliases are set at connect time via `session.authorize(toolkit, { alias })`.
 * The installed SDK's `connectedAccounts.update` only accepts a status, so
 * renaming an existing account is stored here rather than pushed upstream.
 */
type Labels = Record<string, string>;

export async function listAccounts(platform: PlatformId): Promise<Account[]> {
  const toolkit = TOOLKITS[platform];
  const [response, selection, labels] = await Promise.all([
    composio.connectedAccounts.list({ userIds: [userId()] }),
    readStore<Selection>("accounts", {}),
    readStore<Labels>("account-labels", {}),
  ]);

  const items = ((response as { items?: RawAccount[] }).items ?? []).filter(
    (a) => a.toolkit?.slug?.toLowerCase() === toolkit,
  );

  // Fall back to the first active account so a fresh install still works.
  const chosen =
    selection[platform] ?? items.find((a) => a.status === "ACTIVE")?.id;

  return items.map((a) => ({
    id: a.id,
    alias: a.alias ?? null,
    status: a.status ?? "UNKNOWN",
    label: labels[a.id] || a.alias?.trim() || `Account ${a.id.slice(-6)}`,
    active: a.id === chosen,
    createdAt: a.createdAt ?? a.created_at,
  }));
}

/** The account id to pass as `account` on tool execution, if any. */
export async function activeAccountId(
  platform: PlatformId,
): Promise<string | undefined> {
  const accounts = await listAccounts(platform);
  const active = accounts.find((a) => a.active && a.status === "ACTIVE");
  // With one account there is nothing to disambiguate, so send nothing and let
  // the session resolve it.
  if (accounts.filter((a) => a.status === "ACTIVE").length < 2) return undefined;
  return active?.id;
}

export async function setActiveAccount(platform: PlatformId, accountId: string) {
  const selection = await readStore<Selection>("accounts", {});
  await writeStore("accounts", { ...selection, [platform]: accountId });
}

export async function renameAccount(accountId: string, label: string) {
  const labels = await readStore<Labels>("account-labels", {});
  if (label.trim()) labels[accountId] = label.trim();
  else delete labels[accountId];
  await writeStore("account-labels", labels);
}

export async function disconnectAccount(platform: PlatformId, accountId: string) {
  await composio.connectedAccounts.delete(accountId);

  const [selection, labels] = await Promise.all([
    readStore<Selection>("accounts", {}),
    readStore<Labels>("account-labels", {}),
  ]);
  if (selection[platform] === accountId) {
    delete selection[platform];
    await writeStore("accounts", selection);
  }
  if (labels[accountId]) {
    delete labels[accountId];
    await writeStore("account-labels", labels);
  }
}

/** Shared multi-account session config. */
export const MULTI_ACCOUNT = {
  enable: true,
  maxAccountsPerToolkit: 5,
} as const;
