import { NextRequest, NextResponse } from "next/server";

import { requireCronSecret } from "@/src/lib/api-authorization";
import { finalizeExpiredAuctions } from "@/src/lib/auction-lifecycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function finalize(request: NextRequest) {
  const cronGuard = requireCronSecret(request);
  if (cronGuard) {
    return cronGuard;
  }

  const result = await finalizeExpiredAuctions();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: NextRequest) {
  return finalize(request);
}

export async function POST(request: NextRequest) {
  return finalize(request);
}
