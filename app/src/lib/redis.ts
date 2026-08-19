import Redis, { type RedisOptions } from "ioredis";

type RedisRole = "app" | "subscriber" | "read";

type RedisRegistry = Partial<Record<RedisRole, Redis>> & { closing?: Promise<void> };

declare global {
  var __autoBidRedisRegistry: RedisRegistry | undefined;
}

const connectionErrorState: Partial<Record<RedisRole, { lastLoggedAt: number; consecutive: number }>> = {};
const ERROR_LOG_DEBOUNCE_MS = 60_000;

function registry(): RedisRegistry {
  globalThis.__autoBidRedisRegistry ??= {};
  return globalThis.__autoBidRedisRegistry;
}

export function redisUrl(role: RedisRole): string {
  const raw = role === "read"
    ? process.env.REDIS_READ_URL ?? process.env.REDIS_URL
    : process.env.REDIS_URL;
  if (!raw) return "redis://localhost:6379";
  const cleaned = raw.trim().replace(/^["']|["']$/g, "").trim();
  return cleaned.length > 0 ? cleaned : "redis://localhost:6379";
}

export function isRedisConfigured(): boolean {
  const raw = process.env.REDIS_URL;
  if (!raw) return false;
  const cleaned = raw.trim().replace(/^["']|["']$/g, "").trim();
  if (cleaned.length === 0) return false;
  const lower = cleaned.toLowerCase();
  return !lower.includes("localhost") && !lower.includes("127.0.0.1") && !lower.includes("::1");
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
    showFriendlyErrorStack: process.env.NODE_ENV !== "production",
  };
}

function debouncedErrorLog(role: RedisRole, context: Record<string, unknown>, message: string) {
  const now = Date.now();
  const state = connectionErrorState[role] ?? { lastLoggedAt: 0, consecutive: 0 };
  state.consecutive += 1;
  if (now - state.lastLoggedAt >= ERROR_LOG_DEBOUNCE_MS) {
    state.lastLoggedAt = now;
    const total = state.consecutive;
    state.consecutive = 0;
    console.error(JSON.stringify({ ...context, event: "error", message, consecutiveSuppressed: total - 1 }));
  }
}

function createConnection(role: RedisRole): Redis {
  const client = new Redis(redisUrl(role), options(role));
  const context = { service: "redis", role };

  client.on("connect", () => {
    connectionErrorState[role] = { lastLoggedAt: 0, consecutive: 0 };
    console.info(JSON.stringify({ ...context, event: "connect" }));
  });
  client.on("ready", () => console.info(JSON.stringify({ ...context, event: "ready" })));
  client.on("reconnecting", () => {
    const state = connectionErrorState[role] ?? { lastLoggedAt: 0, consecutive: 0 };
    state.consecutive += 1;
    const now = Date.now();
    if (now - state.lastLoggedAt >= ERROR_LOG_DEBOUNCE_MS) {
      state.lastLoggedAt = now;
      const total = state.consecutive;
      state.consecutive = 0;
      console.warn(JSON.stringify({ ...context, event: "reconnecting", debouncedCount: total }));
    }
  });
  client.on("close", () => console.info(JSON.stringify({ ...context, event: "close" })));
  client.on("error", (error) => debouncedErrorLog(role, context, error.message));

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
