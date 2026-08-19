import { NextResponse } from "next/server";

import { readiness } from "@/src/lib/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await readiness();
  return NextResponse.json(
    { status: result.ok ? "ready" : "not_ready", timestamp: new Date().toISOString(), ...result },
    { status: result.ok ? 200 : 503 },
  );
}
