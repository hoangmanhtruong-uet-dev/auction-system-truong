import { z } from "zod";

const common = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  APP_VERSION: z.string().min(1).default("development"),
  QUEUE_PREFIX: z.string().min(1).default("autobid"),
});

const productionSecrets = z.object({
  JWT_SECRET: z.string().min(32).refine((value) => !/change-this|example|replace-me/i.test(value), "JWT_SECRET is a placeholder"),
  CRON_SECRET: z.string().min(32).refine((value) => !/change-this|example|replace-me/i.test(value), "CRON_SECRET is a placeholder"),
});

const webRuntime = z.object({
  APP_ORIGIN: z.string().url(),
  TRUSTED_PROXY_PROVIDER: z.enum(["none", "vercel", "cloudflare", "nginx"]),
  SESSION_ABSOLUTE_TIMEOUT_SECONDS: z.coerce.number().int().min(900).max(86400).default(28800),
  SESSION_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().min(300).max(14400).default(1800),
});

export const workerEnvSchema = common.extend({
  ADMIN_PROFILE_ID: z.string().min(1),
  PLATFORM_FEE_PERCENT: z.coerce.number().int().min(0).max(100).default(5),
  WORKER_NAME: z.string().min(1).default("workers"),
  WORKER_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(1000).default(10000),
  WORKER_HEARTBEAT_TTL_SECONDS: z.coerce.number().int().min(5).default(30),
  WORKER_SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),
  FINANCIAL_OPERATIONS_ENABLED: z.enum(["true", "false"]).default("false"),
  REAL_MONEY_PAYMENTS_ENABLED: z.literal("false").default("false"),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function validateWorkerEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  const parsed = workerEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid worker environment: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }
  if (parsed.data.NODE_ENV === "production") productionSecrets.parse(source);
  return parsed.data;
}

export function validateWebEnv(source: NodeJS.ProcessEnv = process.env) {
  const parsed = common.merge(webRuntime).safeParse(source);
  if (!parsed.success) return { ok: false as const, invalid: parsed.error.issues.map((issue) => issue.path.join(".")) };
  if (parsed.data.NODE_ENV === "production") {
    const secrets = productionSecrets.safeParse(source);
    if (!secrets.success) return { ok: false as const, invalid: secrets.error.issues.map((issue) => issue.path.join(".")) };
  }
  return { ok: true as const, data: parsed.data };
}
