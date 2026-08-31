import { NextResponse } from "next/server";
import { crossPost } from "@/lib/zernio-features";

export const runtime = "nodejs";

/** One payload to several platforms, with per-platform wording. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.targets?.length) {
    return NextResponse.json({ error: "targets is required." }, { status: 400 });
  }
  const result = await crossPost(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.detail, needsSetup: result.needsSetup },
      { status: result.needsSetup ? 400 : 503 },
    );
  }
  return NextResponse.json(result.data);
}
