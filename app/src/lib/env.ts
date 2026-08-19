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

export function getCanonicalAppOrigin(source: NodeJS.ProcessEnv = process.env): string | undefined {
  const origin = (source.APP_ORIGIN ?? source.NEXT_PUBLIC_APP_URL)?.trim().replace(/^["']|["']$/g, "").trim();
  return origin && origin.length > 0 ? origin : undefined;
}

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
  const origin = getCanonicalAppOrigin(source);
  const trustedProvider = (() => {
    const v = source.TRUSTED_PROXY_PROVIDER;
    return ["none", "vercel", "cloudflare", "nginx"].includes(v as string) ? (v as "none" | "vercel" | "cloudflare" | "nginx") : undefined;
  })();
  const invalid: string[] = [];
  if (!origin) invalid.push("APP_ORIGIN");
  else if (!z.string().url().safeParse(origin).success) invalid.push("APP_ORIGIN");
  if (!trustedProvider) invalid.push("TRUSTED_PROXY_PROVIDER");

  const commonResult = common.safeParse(source);
  if (!commonResult.success) {
    for (const issue of commonResult.error.issues) invalid.push(issue.path.join("."));
  }

  const sessionAbs = Number(source.SESSION_ABSOLUTE_TIMEOUT_SECONDS ?? "28800");
  if (!Number.isInteger(sessionAbs) || sessionAbs < 900 || sessionAbs > 86400) invalid.push("SESSION_ABSOLUTE_TIMEOUT_SECONDS");
  const sessionIdle = Number(source.SESSION_IDLE_TIMEOUT_SECONDS ?? "1800");
  if (!Number.isInteger(sessionIdle) || sessionIdle < 300 || sessionIdle > 14400) invalid.push("SESSION_IDLE_TIMEOUT_SECONDS");

  if (invalid.length > 0) return { ok: false as const, invalid: Array.from(new Set(invalid)) };
  if (!commonResult.success) return { ok: false as const, invalid: Array.from(new Set(invalid)) };
  if (commonResult.data.NODE_ENV === "production") {
    const secrets = productionSecrets.safeParse(source);
    if (!secrets.success) return { ok: false as const, invalid: secrets.error.issues.map((issue) => issue.path.join(".")) };
  }
  return {
    ok: true as const,
    data: {
      ...commonResult.data,
      APP_ORIGIN: origin as string,
      TRUSTED_PROXY_PROVIDER: trustedProvider as "none" | "vercel" | "cloudflare" | "nginx",
      SESSION_ABSOLUTE_TIMEOUT_SECONDS: sessionAbs,
      SESSION_IDLE_TIMEOUT_SECONDS: sessionIdle,
    },
  };
}
