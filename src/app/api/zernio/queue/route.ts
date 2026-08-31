import { NextResponse } from "next/server";
import { createQueueSlots, listQueueSlots, previewQueue } from "@/lib/zernio-features";

export const runtime = "nodejs";

/** Recurring posting slots. Without these, `useQueue` has nowhere to put a post. */
export async function GET(request: Request) {
  const preview = new URL(request.url).searchParams.get("preview");
  const result = preview ? await previewQueue(Number(preview) || 5) : await listQueueSlots();
  if (!result.ok) {
    return NextResponse.json(
      { error: result.detail, needsSetup: result.needsSetup },
      { status: result.needsSetup ? 400 : 503 },
    );
  }
  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.timezone || !body?.slots?.length) {
    return NextResponse.json(
      { error: "timezone and slots are required." },
      { status: 400 },
    );
  }
  const result = await createQueueSlots({ name: body.name ?? "Default", ...body });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.detail, needsSetup: result.needsSetup },
      { status: result.needsSetup ? 400 : 503 },
    );
  }
  return NextResponse.json(result.data);
}
