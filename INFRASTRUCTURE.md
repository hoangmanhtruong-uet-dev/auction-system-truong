# Infrastructure Layer — AutoBid

**Mục lục**

1. [Tổng quan](#1-tổng-quan)
2. [Redis Cluster (In-Memory Database)](#2-redis-cluster)
3. [Distributed Lock (Redlock)](#3-distributed-lock)
4. [Pub/Sub (Real-time Events)](#4-pubsub)
5. [Message Queue (BullMQ)](#5-message-queue)
6. [Workers](#6-workers)
7. [Docker Compose](#7-docker-compose)
8. [Environment Variables](#8-environment-variables)
9. [Production Roadmap](#9-production-roadmap)

---

## 1. Tổng quan

Hạ tầng ngầm giải quyết các vấn đề thực tế:

| Vấn đề | Giải pháp |
|--------|-----------|
| Hàng vạn request đọc/ghi giá cùng lúc | Redis + Distributed Lock |
| Real-time cập nhật cho nhiều server | Redis Pub/Sub |
| Tác vụ nặng (notification, email, log) | BullMQ + Workers |
| Quá hạn chính xác mili-giây | BullMQ delayed jobs (TTL pattern) |
| DB quá tải đọc/ghi | Read-Write Splitting (Prisma) |

---

## 2. Redis Cluster

File: `app/src/lib/redis.ts`

Singleton Redis client dùng chung cho cache, lock, pub/sub.

```ts
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: true,
});
```

**Auction Cache** (`app/src/lib/auction-cache.ts`): Lưu thông tin phiên HOT trong RAM.

```
KEY: auction:{auctionId}
VALUE: hash (currentPrice, bidderCount, endsAt, highestBidderId, version)
TTL: cacheAuctionTTL = 300 giây (refresh on write)
```

Pattern:
- `getAuction(auctionId)` — đọc từ cache, fallback DB
- `setAuction(auctionId, data)` — ghi cache sau khi đọc từ DB
- `evictAuction(auctionId)` — xoá cache khi có update
- `incrementBidCount(auctionId)` — atomic `HINCRBY` cho bid count

**Cache through (sidecache)**: Dùng local mutex (`pending.get`) tránh dogpile khi cache miss.

---

## 3. Distributed Lock

File: `app/src/lib/distributed-lock.ts`

Dùng Redlock với Redis single-node (đủ cho single Redis instance).
Khi scale lên Redis Cluster, cần chuyển sang `redlock` package.

```ts
const PREAMBLE = `
-- KEYS[1]   auction:{auctionId}:lock
-- ARGV[1]   lockId (UUID)
-- ARGV[2]   ttl (ms)
-- return 1  if acquired, nil otherwise
`;

export async function acquireLock(auctionId: string, ttl = 2000): Promise<string | null> {
  const lockId = crypto.randomUUID();
  const ok = await redis.set(`auction:${auctionId}:lock`, lockId, "PX", ttl, "NX");
  return ok ? lockId : null;
}

export async function releaseLock(auctionId: string, lockId: string): Promise<boolean> {
  const script = `if redis.call("GET", KEYS[1]) == ARGV[1]
    then return redis.call("DEL", KEYS[1])
    else return 0 end`;
  const result = await redis.eval(script, 1, `auction:${auctionId}:lock`, lockId);
  return result === 1;
}
```

Lưu ý:
- TTL tối đa 2s (match Redis transaction window).
- Nếu transaction kéo dài hơn TTL → tăng TTL hoặc dùng watchdog (Redlock).

---

## 4. Pub/Sub

File: `app/src/lib/pubsub.ts`

Dùng Redis Pub/Sub để broadcast realtime event giữa các server.

**Channel naming**: `auction:{auctionId}:events`

Hai mode:

1. **Pull-based** (cho WebSocket server): subscribe channel, gửi xuống client.
2. **Publish** từ worker: gọi `publishBidEvent`, `publishAuctionEnded`.

```ts
// Server A (bid processor)
await publishBidEvent({ auctionId, bidId, amount, ... });
// → Redis PUBLISH auction:xxx:events { "type": "BID_PLACED", ... }

// Server B (WebSocket server)
const subscriber = redisSubscriber.duplicate();
subscriber.subscribe("auction:xxx:events", (err, count) => { ... });
subscriber.on("message", (channel, message) => {
  // push to WS clients
});
```

Trong production, thay bằng Kafka/RabbitMQ nếu cần durable + replay.

---

## 5. Message Queue

File: `app/src/lib/queue.ts`

Dùng BullMQ (backed by Redis) cho background job processing.

| Queue | Purpose | Concurrency |
|-------|---------|------------|
| `bid-side-effects` | Ghi lịch sử, gửi notif, pub/sub | 10 |
| `notifications` | Gửi in-app / push / email | 20 |
| `auction-expiry` | Đóng phiên khi hết giờ (delayed) | 5 |
| `settlement` | Kết toán + phí sàn + giải ngân seller | 3 |
| `reconciliation` | Đối soát tài chính giữa wallet & transaction | 1 |

**Enqueue helpers**: `enqueueBidSideEffects`, `enqueueNotification`, `scheduleAuctionExpiry`, `rescheduleAuctionExpiry`, `enqueueSettlement`, `enqueueReconciliation`.

**Delayed jobs for auction expiry**:
- Khi tạo phiên → gọi `scheduleAuctionExpiry(auctionId, endsAt)` với delay = `endsAt - now`.
- Khi gia hạn (anti-snipe) → gọi `rescheduleAuctionExpiry`:
  ```
  1. Xoá job cũ bằng jobId = "expiry:{auctionId}"
  2. Tạo job mới với delay mới
  ```

---

## 6. Workers

Mỗi worker chạy độc lập (dùng `npx tsx` hoặc PM2/forever).

### Bid Processor

`app/src/workers/bid-processor.ts`

```bash
npx tsx app/src/workers/bid-processor.ts
```

Xử lý:
1. Publish Pub/Sub event
2. Notify outbid user
3. Ghi in-app notification cho seller

### Notification Worker

`app/src/workers/notification-worker.ts`

```bash
npx tsx app/src/workers/notification-worker.ts
```

Xử lý:
1. Ghi notification vào DB
2. (placeholder) Push notification
3. (placeholder) Email notification

### Auction Expiry

`app/src/workers/auction-expiry.ts`

```bash
npx tsx app/src/workers/auction-expiry.ts
```

Xử lý:
1. Double-check endsAt (chống gia hạn)
2. Khoá pessimistic DB
3. Gọi `finishAuction` (atomic)
4. Evict cache, publish event, notify winner+seller

### Settlement Worker

`app/src/workers/settlement-worker.ts`

```bash
npx tsx app/src/workers/settlement-worker.ts
```

Xử lý:
1. `settleFreeze` → chuyển freeze→SETTLED, debit tiền thắng
2. `platformFee` → cắt % phí sàn vào admin wallet
3. `releaseToSeller` → chuyển phần còn lại cho seller
4. Mark auction COMPLETED + paidAt

### Reconciliation Worker

`app/src/workers/reconciliation-worker.ts`

```bash
npx tsx app/src/workers/reconciliation-worker.ts
```

Xử lý:
1. So khớp tổng balance wallet với tổng transaction
2. Phát hiện mismatch → ghi audit log + alert
3. Chạy định kỳ theo cron (mỗi 15 phút)

---

## 7. Docker Compose

`docker-compose.yml` gồm:

```yaml
services:
  mysql:    # Port 3306, volume persistent, healthcheck
  redis:    # Port 6379, redis:7-alpine, volume persistent, healthcheck

volumes:
  autobid_mysql_data:
  autobid_redis_data:
```

Chạy: `docker compose up -d`

---

## 8. Environment Variables

```env
# Redis
REDIS_URL=redis://localhost:6379
# hoặc từng phần:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

---

## 9. Production Roadmap

### Short-term (single server)

- Redis single instance (hiện tại)
- BullMQ queues cùng Redis instance
- Workers chạy cùng process hoặc PM2 fork

### Medium-term (multiple application servers)

- Redis Cluster (3 master + 3 slave)
- Redlock với `redlock` npm package
- API Gateway (Nginx / AWS ALB) trước WebSocket
- Read-Write Splitting: Master cho write, Slave replicas cho read
  - Prisma: `datasource db` với `directUrl` cho write, `url` cho read

### Long-term (high scale)

- Kafka thay Redis Pub/Sub (durable, replayable)
- RabbitMQ thay BullMQ (nếu cần AMQP + routing phức tạp)
- Database: MySQL Group Replication hoặc Vitess
- Circuit breaker + rate limiter cho từng microservice