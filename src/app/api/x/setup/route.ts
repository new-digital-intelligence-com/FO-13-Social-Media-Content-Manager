import { NextResponse } from "next/server";
import {
  DEFAULT_SCOPES,
  OPTIONAL_SCOPES,
  createAuthConfig,
  deleteAuthConfig,
  findAuthConfig,
  getXSession,
  isXConnected,
  SetupRequiredError,
  TOOLKIT,
} from "@/lib/x";

export const runtime = "nodejs";

/** Where the user is in the three-step Twitter setup. */
export async function GET() {
  try {
    const authConfig = await findAuthConfig();
    if (!authConfig) {
      return NextResponse.json({
        step: "credentials",
        defaultScopes: DEFAULT_SCOPES,
        optionalScopes: OPTIONAL_SCOPES,
        connected: false,
      });
    }
    const connected = await isXConnected();
    return NextResponse.json({
      // Returned on every step: the form may be shown after a reset without
      // the component remounting, and an empty scopes box fails silently.
      defaultScopes: DEFAULT_SCOPES,
      optionalScopes: OPTIONAL_SCOPES,
      step: connected ? "ready" : "connect",
      authConfigId: authConfig.id,
      connected,
    });
  } catch (error) {
    if (error instanceof SetupRequiredError) {
      return NextResponse.json({
        step: "credentials",
        defaultScopes: DEFAULT_SCOPES,
        optionalScopes: OPTIONAL_SCOPES,
        connected: false,
      });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/** Store the user's own X app credentials as a custom auth config. */
export async function POST(request: Request) {
  try {
    const { clientId, clientSecret, bearerToken, scopes } = await request.json();
    if (!clientId?.trim() || !clientSecret?.trim() || !bearerToken?.trim()) {
      return NextResponse.json(
        {
          error:
            "X needs three values: the OAuth 2.0 Client ID, the Client Secret, " +
            "and the App-Only Bearer Token from the same app.",
        },
        { status: 400 },
      );
    }
    const config = await createAuthConfig({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      bearerToken: bearerToken.trim(),
      scopes,
    });
    return NextResponse.json({ ok: true, authConfigId: (config as { id?: string }).id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/** Begin OAuth once credentials exist. */
export async function PUT() {
  try {
    const session = await getXSession();
    if (await isXConnected()) return NextResponse.json({ connected: true });
    const request = await session.authorize(TOOLKIT.toUpperCase());
    return NextResponse.json({ connected: false, redirectUrl: request.redirectUrl });
  } catch (error) {
    if (error instanceof SetupRequiredError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/** Discard stored credentials so the wizard restarts at step 1. */
export async function DELETE() {
  try {
    const removed = await deleteAuthConfig();
    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
