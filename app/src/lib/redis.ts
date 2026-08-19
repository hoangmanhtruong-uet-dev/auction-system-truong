import Redis, { type RedisOptions } from "ioredis";

type RedisRole = "app" | "subscriber" | "read";

type RedisRegistry = Partial<Record<RedisRole, Redis>> & { closing?: Promise<void> };

declare global {
  var __autoBidRedisRegistry: RedisRegistry | undefined;
}

function registry(): RedisRegistry {
  globalThis.__autoBidRedisRegistry ??= {};
  return globalThis.__autoBidRedisRegistry;
}

function redisUrl(role: RedisRole): string {
  if (role === "read") {
    return process.env.REDIS_READ_URL ?? process.env.REDIS_URL ?? "redis://localhost:6379";
  }
  return process.env.REDIS_URL ?? "redis://localhost:6379";
}

function options(role: RedisRole): RedisOptions {
  const maxReconnectAttempts = Number(process.env.REDIS_MAX_RECONNECT_ATTEMPTS ?? "10");
  const url = redisUrl(role);
  const isTlsScheme = url.startsWith("rediss://");
  return {
    lazyConnect: true,
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? "5000"),
    commandTimeout: Number(process.env.REDIS_COMMAND_TIMEOUT_MS ?? "3000"),
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (attempt) => attempt > maxReconnectAttempts ? null : Math.min(attempt * 100, 3000),
    tls: isTlsScheme || process.env.REDIS_TLS_ENABLED === "true" ? {} : undefined,
  };
}

function createConnection(role: RedisRole): Redis {
  const client = new Redis(redisUrl(role), options(role));
  const context = { service: "redis", role };

  client.on("connect", () => console.info(JSON.stringify({ ...context, event: "connect" })));
  client.on("ready", () => console.info(JSON.stringify({ ...context, event: "ready" })));
  client.on("reconnecting", () => console.warn(JSON.stringify({ ...context, event: "reconnecting" })));
  client.on("close", () => console.info(JSON.stringify({ ...context, event: "close" })));
  client.on("error", (error) =>
    console.error(JSON.stringify({ ...context, event: "error", message: error.message })),
  );

  return client;
}

function getConnection(role: RedisRole): Redis {
  const current = registry()[role];
  if (current) return current;
  const connection = createConnection(role);
  registry()[role] = connection;
  return connection;
}

export function getRedisConnection(): Redis {
  return getConnection("app");
}

export function getRedisSubscriber(): Redis {
  return getConnection("subscriber");
}

export function getRedisReadConnection(): Redis {
  return getConnection("read");
}

export type BullMqConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  tls?: Record<string, never>;
  connectTimeout: number;
  maxRetriesPerRequest: null;
  retryStrategy: (attempt: number) => number | null;
};

export function getBullMqConnection(): BullMqConnectionOptions {
  const parsed = new URL(redisUrl("app"));
  const dbPath = parsed.pathname.replace(/^\//, "");
  const maxReconnectAttempts = Number(process.env.REDIS_MAX_RECONNECT_ATTEMPTS ?? "10");
  return {
    host: parsed.hostname,
    port: Number(parsed.port || (parsed.protocol === "rediss:" ? 6380 : 6379)),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: dbPath ? Number(dbPath) : Number(process.env.REDIS_DB ?? "0"),
    tls: parsed.protocol === "rediss:" || process.env.REDIS_TLS_ENABLED === "true" ? {} : undefined,
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? "5000"),
    maxRetriesPerRequest: null,
    retryStrategy: (attempt) => attempt > maxReconnectAttempts ? null : Math.min(attempt * 100, 3000),
  };
}

export async function ensureRedisReady(client: Redis = getRedisConnection()): Promise<void> {
  if (client.status === "wait") await client.connect();
  await client.ping();
}

export async function closeRedisConnections(): Promise<void> {
  const state = registry();
  if (state.closing) return state.closing;

  state.closing = (async () => {
    const clients = (["subscriber", "read", "app"] as const)
      .map((role) => state[role])
      .filter((client): client is Redis => Boolean(client));

    await Promise.allSettled(
      clients.map(async (client) => {
        if (client.status === "end") return;
        try {
          await client.quit();
        } catch (error) {
          client.disconnect(false);
          throw error;
        }
      }),
    );

    globalThis.__autoBidRedisRegistry = {};
  })();

  return state.closing;
}

// Backward-compatible lazy facades for cache, pub/sub and lock callers.
export const redis = new Proxy({} as Redis, {
  get: (_target, property) => Reflect.get(getRedisConnection(), property, getRedisConnection()),
});
export const redisSub = new Proxy({} as Redis, {
  get: (_target, property) => Reflect.get(getRedisSubscriber(), property, getRedisSubscriber()),
});
export const redisRead = new Proxy({} as Redis, {
  get: (_target, property) => Reflect.get(getRedisReadConnection(), property, getRedisReadConnection()),
});

export const Keys = {
  auction: (id: string) => `auction:${id}`,
  auctionBid: (id: string) => `auction:${id}:bid`,
  auctionLock: (id: string) => `lock:auction:${id}`,
  bidChannel: (id: string) => `channel:bid:${id}`,
  userWallet: (userId: string) => `wallet:${userId}`,
  workerHeartbeat: (instanceId: string) => `worker:heartbeat:${instanceId}`,
} as const;
