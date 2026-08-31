import { NextResponse } from "next/server";
import { TOOLKIT, getSession, isConnected } from "@/lib/composio";

export const runtime = "nodejs";

/** Current Instagram connection state for this user. */
export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json({
      connected: await isConnected(session),
      sessionId: session.sessionId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * Start OAuth. Composio returns a hosted Connect Link -- never build a
 * provider OAuth flow yourself.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (await isConnected(session)) {
      return NextResponse.json({ connected: true });
    }
    const request = await session.authorize(TOOLKIT);
    return NextResponse.json({
      connected: false,
      redirectUrl: request.redirectUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
