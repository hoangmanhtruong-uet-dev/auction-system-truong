import { Job, Worker } from "bullmq";

import { evictAuction } from "@/src/lib/auction-cache";
import {
  AuctionClosedJobSchema,
  JOB_NAMES,
  QUEUE_NAMES,
  type AuctionClosedJob,
} from "@/src/lib/queue";
import { publishAuctionEnded } from "@/src/lib/pubsub";
import { getBullMqConnection } from "@/src/lib/redis";

export async function processAuctionClosed(job: Job<AuctionClosedJob>): Promise<void> {
  if (job.name !== JOB_NAMES.PROCESS_AUCTION_CLOSED) throw new Error(`Unsupported job: ${job.name}`);
  const data = AuctionClosedJobSchema.parse(job.data);
  await evictAuction(data.auctionId);
  await publishAuctionEnded(data.auctionId, data.winnerId, data.finalPrice);
}

export function createAuctionEventsWorker(): Worker<AuctionClosedJob> {
  const worker = new Worker<AuctionClosedJob>(QUEUE_NAMES.AUCTION_EVENTS, processAuctionClosed, {
    connection: getBullMqConnection(),
    prefix: process.env.QUEUE_PREFIX ?? "autobid",
    concurrency: Number(process.env.AUCTION_EVENTS_WORKER_CONCURRENCY ?? "5"),
    autorun: false,
  });
  worker.on("error", (error) => console.error(JSON.stringify({ event: "worker_error", queue: QUEUE_NAMES.AUCTION_EVENTS, message: error.message })));
  return worker;
}
