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

type InMemoryListener = (event: AuctionEvent) => void;
type InMemoryPatternListener = (auctionId: string, event: AuctionEvent) => void;

const inMemoryChannelListeners = new Map<string, Set<InMemoryListener>>();
let inMemoryPatternListeners: Set<InMemoryPatternListener> | null = null;

function dispatchInMemory(auctionId: string, event: AuctionEvent) {
  const channel = Keys.bidChannel(auctionId);
  const listeners = inMemoryChannelListeners.get(channel);
  if (listeners) {
    for (const l of listeners) {
      try { l(event); } catch (e) { console.error("[PubSub] In-memory listener error:", e); }
    }
  }
  if (inMemoryPatternListeners) {
    for (const l of inMemoryPatternListeners) {
      try { l(auctionId, event); } catch (e) { console.error("[PubSub] In-memory pattern listener error:", e); }
    }
  }
}

export async function publishBidEvent(event: BidEvent): Promise<void> {
  const channel = Keys.bidChannel(event.auctionId);
  const message: AuctionEvent = { type: "BID_PLACED", payload: event };
  const serialized = JSON.stringify(message);

  try {
    await redis.publish(channel, serialized);
  } catch (error) {
    console.warn(JSON.stringify({ event: "pubsub_publish_redis_failed", channel, reason: error instanceof Error ? error.message : String(error) }));
  }

  dispatchInMemory(event.auctionId, message);
}

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
  const serialized = JSON.stringify(message);

  try {
    await redis.publish(channel, serialized);
  } catch (error) {
    console.warn(JSON.stringify({ event: "pubsub_publish_redis_failed", channel, reason: error instanceof Error ? error.message : String(error) }));
  }

  dispatchInMemory(auctionId, message);
}

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

  try {
    redisSub.on("message", listener);
    await redisSub.subscribe(channel);
  } catch (error) {
    console.warn(JSON.stringify({ event: "pubsub_subscribe_redis_failed", channel, reason: error instanceof Error ? error.message : String(error) }));
  }

  const memListeners = inMemoryChannelListeners.get(channel) ?? new Set<InMemoryListener>();
  memListeners.add(handler);
  inMemoryChannelListeners.set(channel, memListeners);

  return async () => {
    try {
      await redisSub.unsubscribe(channel);
      redisSub.off("message", listener);
    } catch {
    }
    memListeners.delete(handler);
    if (memListeners.size === 0) inMemoryChannelListeners.delete(channel);
  };
}

export async function subscribeAllBids(
  handler: (auctionId: string, event: AuctionEvent) => void,
): Promise<() => Promise<void>> {
  const pattern = "channel:bid:*";

  const pListener = (_pattern: string, channel: string, message: string) => {
    try {
      const auctionId = channel.replace("channel:bid:", "");
      const event = JSON.parse(message) as AuctionEvent;
      handler(auctionId, event);
    } catch (err) {
      console.error("[PubSub] Failed to parse pattern message:", err);
    }
  };

  try {
    redisSub.on("pmessage", pListener);
    await redisSub.psubscribe(pattern);
  } catch (error) {
    console.warn(JSON.stringify({ event: "pubsub_psubscribe_redis_failed", pattern, reason: error instanceof Error ? error.message : String(error) }));
  }

  inMemoryPatternListeners ??= new Set();
  inMemoryPatternListeners.add(handler);

  return async () => {
    try {
      await redisSub.punsubscribe(pattern);
      redisSub.off("pmessage", pListener);
    } catch {
    }
    inMemoryPatternListeners?.delete(handler);
    if (inMemoryPatternListeners?.size === 0) inMemoryPatternListeners = null;
  };
}
