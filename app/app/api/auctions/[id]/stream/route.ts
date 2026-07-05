import { NextRequest } from "next/server";

import { getAuctionById } from "@/src/actions/auction";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 2000;

function createSseMessage(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const encoder = new TextEncoder();

  let lastSignature = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let isClosed = false;

      const send = (event: string, data: unknown) => {
        if (isClosed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(createSseMessage(event, data)));
        } catch {
          isClosed = true;
        }
      };

      const pollAuction = async () => {
        if (isClosed) {
          return;
        }

        try {
          const result = await getAuctionById(id);

          if (!result.success || !result.data) {
            send("error", { message: result.error ?? "Không thể tải phiên đấu giá" });
            return;
          }

          const auction = result.data;
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
          send("error", { message: "Không thể cập nhật realtime" });
        }
      };

      send("connected", { auctionId: id });
      await pollAuction();

      const interval = setInterval(pollAuction, POLL_INTERVAL_MS);

      _request.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Connection may already be closed by the browser.
        }
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