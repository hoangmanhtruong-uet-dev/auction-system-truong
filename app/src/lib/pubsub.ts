/**
 * Redis Pub/Sub – Kênh broadcast giữa các Server
 *
 * Khi Server A nhận bid thành công → publish vào kênh Redis.
 * Server B, C, D đang subscribe → nhận message → đẩy xuống Client WebSocket.
 *
 * WARNING: Redis Pub/Sub is fire-and-forget (non-durable).
 * Messages are not persisted, so clients must refetch their state upon reconnection
 * to sync any missed events.
 *
 * ponytail: Dùng Redis Pub/Sub cơ bản. Khi cần message persistence
 *   hoặc replay, chuyển sang Redis Streams hoặc Kafka.
 */

import { redis, redisSub, Keys } from "@/src/lib/redis";

export type BidEvent = {
  auctionId: string;
  bidId: string;
  bidderId: string;
  bidderName: string;
  amount: string;
  previousPrice: string;
  endsAt: string | null;
  autoExtended: boolean;
  timestamp: string;
};

export type AuctionEvent =
  | { type: "BID_PLACED"; payload: BidEvent }
  | { type: "AUCTION_ENDED"; payload: { auctionId: string; winnerId: string | null; finalPrice: string } }
  | { type: "AUCTION_EXTENDED"; payload: { auctionId: string; newEndsAt: string } };

/**
 * Publish sự kiện bid mới đến tất cả server đang subscribe.
 */
export async function publishBidEvent(event: BidEvent): Promise<void> {
  const channel = Keys.bidChannel(event.auctionId);
  const message: AuctionEvent = { type: "BID_PLACED", payload: event };
  await redis.publish(channel, JSON.stringify(message));
}

/**
 * Publish sự kiện auction kết thúc.
 */
export async function publishAuctionEnded(
  auctionId: string,
  winnerId: string | null,
  finalPrice: string,
): Promise<void> {
  const channel = Keys.bidChannel(auctionId);
  const message: AuctionEvent = {
    type: "AUCTION_ENDED",
    payload: { auctionId, winnerId, finalPrice },
  };
  await redis.publish(channel, JSON.stringify(message));
}

/**
 * Subscribe vào kênh bid của một phiên đấu giá.
 * Trả về hàm unsubscribe.
 */
export async function subscribeToBids(
  auctionId: string,
  handler: (event: AuctionEvent) => void,
): Promise<() => Promise<void>> {
  const channel = Keys.bidChannel(auctionId);

  const listener = (_channel: string, message: string) => {
    try {
      const event = JSON.parse(message) as AuctionEvent;
      handler(event);
    } catch (err) {
      console.error("[PubSub] Failed to parse message:", err);
    }
  };

  redisSub.on("message", listener);
  await redisSub.subscribe(channel);

  return async () => {
    await redisSub.unsubscribe(channel);
    redisSub.off("message", listener);
  };
}

/**
 * Subscribe tất cả kênh bid (pattern subscribe).
 * Dùng cho WebSocket gateway server để fan-out tới clients.
 */
export async function subscribeAllBids(
  handler: (auctionId: string, event: AuctionEvent) => void,
): Promise<() => Promise<void>> {
  const pattern = "channel:bid:*";

  const listener = (_pattern: string, channel: string, message: string) => {
    try {
      const auctionId = channel.replace("channel:bid:", "");
      const event = JSON.parse(message) as AuctionEvent;
      handler(auctionId, event);
    } catch (err) {
      console.error("[PubSub] Failed to parse pattern message:", err);
    }
  };

  redisSub.on("pmessage", listener);
  await redisSub.psubscribe(pattern);

  return async () => {
    await redisSub.punsubscribe(pattern);
    redisSub.off("pmessage", listener);
  };
}