import { NextResponse } from "next/server";
import { TOOLKIT, getYtSession, isYtConnected } from "@/lib/yt";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ connected: await isYtConnected() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/** Managed OAuth — Composio returns a hosted Connect Link. */
export async function POST() {
  try {
    const session = await getYtSession();
    if (await isYtConnected()) return NextResponse.json({ connected: true });
    const request = await session.authorize(TOOLKIT.toUpperCase());
    return NextResponse.json({ connected: false, redirectUrl: request.redirectUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
