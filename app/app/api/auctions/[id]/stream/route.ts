import { NextRequest } from "next/server";

import { getAuctionById } from "@/src/actions/auction";
import { canReadAuctionDetail, requireApiPermission } from "@/src/lib/api-authorization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 2000;

function createSseMessage(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("auctions.read.detail");
  if (!guard.ok) {
    return guard.response;
  }

  const { id } = await params;
  const initialAuction = await getAuctionById(id);

  if (!initialAuction.success || !initialAuction.data) {
    return Response.json({ ok: false, error: initialAuction.error ?? "Auction not found" }, { status: 404 });
  }

  if (!canReadAuctionDetail(guard.user, initialAuction.data)) {
    return Response.json({ ok: false, error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const encoder = new TextEncoder();
  let lastSignature = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let isClosed = false;

      const send = (event: string, data: unknown) => {
        if (isClosed) return;

        try {
          controller.enqueue(encoder.encode(createSseMessage(event, data)));
        } catch {
          isClosed = true;
        }
      };

      const closeStream = () => {
        isClosed = true;
        try {
          controller.close();
        } catch {
          // Connection may already be closed.
        }
      };

      const pollAuction = async () => {
        if (isClosed) return;

        try {
          const result = await getAuctionById(id);

          if (!result.success || !result.data) {
            send("error", { message: result.error ?? "Cannot load auction" });
            return;
          }

          const auction = result.data;
          if (!canReadAuctionDetail(guard.user, auction)) {
            send("error", { message: "Forbidden", code: "FORBIDDEN" });
            closeStream();
            return;
          }

          const signature = [
            auction.updatedAt,
            auction.currentPrice,
            auction.bidCount,
            auction.endsAt,
            auction.status,
            auction.bids[0]?.id ?? "",
          ].join("|");

          if (signature !== lastSignature) {
            lastSignature = signature;
            send("auction:update", {
              id: auction.id,
              updatedAt: auction.updatedAt,
              currentPrice: auction.currentPrice,
              bidCount: auction.bidCount,
              endsAt: auction.endsAt,
              status: auction.status,
            });
          }
        } catch (error) {
          console.error("Auction stream polling error:", error);
          send("error", { message: "Cannot update realtime stream" });
        }
      };

      send("connected", { auctionId: id });
      await pollAuction();

      const interval = setInterval(pollAuction, POLL_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        closeStream();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
