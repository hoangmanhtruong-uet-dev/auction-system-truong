import { NextRequest, NextResponse } from "next/server";

import { finalizeExpiredAuctions } from "@/src/lib/auction-lifecycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

async function finalize(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
