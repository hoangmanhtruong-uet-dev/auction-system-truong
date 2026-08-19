import { bootstrapWorkers, shutdownWorkerProcess } from "../src/workers/index";

async function main(): Promise<void> {
  try {
    const runtime = await bootstrapWorkers();
    if (!runtime.isReady()) throw new Error("runtime did not become ready");
    await shutdownWorkerProcess("integration-probe");
    console.info(JSON.stringify({ event: "worker_probe_resources", resources: process.getActiveResourcesInfo() }));
  } catch (error) {
    console.error(JSON.stringify({ event: "worker_probe_failed", message: error instanceof Error ? error.message : String(error) }));
    await shutdownWorkerProcess("integration-probe-failed", 1);
  }
}

void main();
