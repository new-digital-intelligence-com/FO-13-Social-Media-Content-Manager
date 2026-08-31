import { NextResponse } from "next/server";
import { getSettings, saveSettings, type Settings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(request: Request) {
  try {
    const patch = (await request.json()) as Partial<Settings>;
    return NextResponse.json({ settings: await saveSettings(patch) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
