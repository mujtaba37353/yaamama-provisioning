import config from "../config/index.js";
import logger from "../utils/logger.js";
import { processProvisionJob } from "./processor.js";

if (config.nodeEnv === "production") {
  // Production: standalone BullMQ worker process
  const { Worker } = await import("bullmq");
  const { redisConnection } = await import("../utils/queue.js");

  const worker = new Worker("provision", processProvisionJob, {
    connection: redisConnection,
    concurrency: 2,
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "BullMQ job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "BullMQ job failed");
  });

  worker.on("error", (err) => {
    logger.error({ err: err.message }, "Worker error");
  });

  logger.info("BullMQ provisioning worker started");

  process.on("SIGTERM", async () => {
    await worker.close();
    process.exit(0);
  });
} else {
  // Development: register handler on in-process queue
  const { provisionQueue } = await import("../utils/queue.js");

  if (provisionQueue.onProcess) {
    provisionQueue.onProcess(processProvisionJob);
    logger.info("In-process provisioning worker registered");
  }
}
