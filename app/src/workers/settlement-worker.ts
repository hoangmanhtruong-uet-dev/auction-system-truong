import { Job, Worker } from "bullmq";

import { processForfeitAuction } from "@/src/lib/auction-lifecycle";
import {
  ForfeitJobSchema,
  JOB_NAMES,
  QUEUE_NAMES,
  SettlementJobSchema,
  type ForfeitJob,
  type SettlementJob,
} from "@/src/lib/queue";
import { prisma } from "@/src/lib/prisma";
import { getBullMqConnection } from "@/src/lib/redis";
import { settleAuction } from "@/src/lib/settlement";

type FinancialJob = SettlementJob | ForfeitJob;

async function processFinancialJob(job: Job<FinancialJob>): Promise<void> {
  if (process.env.FINANCIAL_OPERATIONS_ENABLED !== "true") {
    throw new Error("Financial operations are disabled; settlement job was not executed");
  }

  if (job.name === JOB_NAMES.PROCESS_SETTLEMENT) {
    const data = SettlementJobSchema.parse(job.data);
    const result = await prisma.$transaction((tx) =>
      settleAuction(data.auctionId, data.winnerProfileId, data.sellerProfileId, BigInt(data.finalPrice), tx),
    );
    if (!result.ok && result.code !== "DUPLICATE_SETTLEMENT") {
      throw new Error(`Settlement failed (${result.code})`);
    }
    return;
  }

  if (job.name === JOB_NAMES.PROCESS_FORFEIT) {
    const data = ForfeitJobSchema.parse(job.data);
    const result = await prisma.$transaction((tx) => processForfeitAuction(data.auctionId, tx));
    if ("success" in result && result.success === false) throw new Error(`Forfeit failed (${result.code})`);
    return;
  }

  throw new Error(`Unsupported job: ${job.name}`);
}

export function createSettlementWorker(): Worker<FinancialJob> {
  const worker = new Worker<FinancialJob>(QUEUE_NAMES.SETTLEMENT, processFinancialJob, {
    connection: getBullMqConnection(),
    prefix: process.env.QUEUE_PREFIX ?? "autobid",
    concurrency: Number(process.env.SETTLEMENT_WORKER_CONCURRENCY ?? "1"),
    autorun: false,
    limiter: { max: 5, duration: 1000 },
  });
  worker.on("completed", (job) => console.info(JSON.stringify({ event: "job_completed", queue: QUEUE_NAMES.SETTLEMENT, jobId: job.id })));
  worker.on("failed", (job, error) => console.error(JSON.stringify({ event: "job_failed", queue: QUEUE_NAMES.SETTLEMENT, jobId: job?.id, auctionId: job?.data.auctionId, message: error.message })));
  worker.on("error", (error) => console.error(JSON.stringify({ event: "worker_error", queue: QUEUE_NAMES.SETTLEMENT, message: error.message })));
  return worker;
}
