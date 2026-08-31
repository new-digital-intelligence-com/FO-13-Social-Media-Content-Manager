import { NextResponse } from "next/server";
import {
  TOOLKITS,
  disconnectAccount,
  listAccounts,
  renameAccount,
  setActiveAccount,
  type PlatformId,
} from "@/lib/accounts";
import { getSession } from "@/lib/composio";
import { getXSession } from "@/lib/x";
import { getYtSession } from "@/lib/yt";

export const runtime = "nodejs";
export const maxDuration = 120;

function isPlatform(value: string | null): value is PlatformId {
  return value !== null && value in TOOLKITS;
}

/** Session factory per platform; X needs its auth-config-aware one. */
async function sessionFor(platform: PlatformId) {
  if (platform === "x") return getXSession();
  if (platform === "youtube") return getYtSession();
  return getSession();
}

export async function GET(request: Request) {
  const platform = new URL(request.url).searchParams.get("platform");
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
  }
  try {
    return NextResponse.json({
      platform,
      accounts: await listAccounts(platform),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/** Start a Connect Link for an *additional* account, labelled by alias. */
export async function POST(request: Request) {
  try {
    const { platform, label } = (await request.json()) as {
      platform: PlatformId;
      label?: string;
    };
    if (!isPlatform(platform)) {
      return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
    }

    const existing = await listAccounts(platform);
    if (existing.length >= 5) {
      return NextResponse.json(
        { error: "Limit of 5 connected accounts per platform reached." },
        { status: 400 },
      );
    }

    // Aliases must be unique per user and toolkit.
    const base = (label?.trim() || `${platform}-${existing.length + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "");
    const taken = new Set(existing.map((a) => a.alias).filter(Boolean));
    let alias = base;
    let n = 2;
    while (taken.has(alias)) alias = `${base}-${n++}`;

    const session = await sessionFor(platform);
    const connection = await session.authorize(TOOLKITS[platform], { alias });

    return NextResponse.json({
      ok: true,
      alias,
      redirectUrl: connection.redirectUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/** Switch the acting account, or rename one. */
export async function PATCH(request: Request) {
  try {
    const { platform, accountId, label } = (await request.json()) as {
      platform: PlatformId;
      accountId: string;
      label?: string;
    };
    if (!isPlatform(platform) || !accountId) {
      return NextResponse.json(
        { error: "platform and accountId are required." },
        { status: 400 },
      );
    }
    if (typeof label === "string") await renameAccount(accountId, label);
    else await setActiveAccount(platform, accountId);

    return NextResponse.json({ ok: true, accounts: await listAccounts(platform) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const platform = params.get("platform");
  const accountId = params.get("accountId");
  if (!isPlatform(platform) || !accountId) {
    return NextResponse.json(
      { error: "platform and accountId are required." },
      { status: 400 },
    );
  }
  try {
    await disconnectAccount(platform, accountId);
    return NextResponse.json({ ok: true, accounts: await listAccounts(platform) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
