import { NextResponse } from "next/server";
import {
  automationLogs,
  createAutomation,
  deleteAutomation,
  listAutomations,
  setAutomationActive,
} from "@/lib/zernio-features";

export const runtime = "nodejs";

function respond(result: { ok: boolean; detail?: string; needsSetup?: boolean; data?: unknown }) {
  if (!result.ok) {
    return NextResponse.json(
      { error: result.detail, needsSetup: result.needsSetup },
      { status: result.needsSetup ? 400 : 503 },
    );
  }
  return NextResponse.json(result.data);
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("logsFor");
  return respond(id ? await automationLogs(id) : await listAutomations());
}

/**
 * Creating one arms a rule that messages real people unattended until it is
 * disabled, so the caller must have confirmed with the user first.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.keywords?.length || !body?.dmMessage) {
    return NextResponse.json(
      { error: "keywords and dmMessage are required." },
      { status: 400 },
    );
  }
  return respond(await createAutomation(body));
}

export async function PATCH(request: Request) {
  const { id, isActive } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  return respond(await setAutomationActive(id, Boolean(isActive)));
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  return respond(await deleteAutomation(id));
}
