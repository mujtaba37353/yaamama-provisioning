import { EventEmitter } from "events";
import config from "../config/index.js";
import logger from "../utils/logger.js";

let provisionQueue;
let redisConnection = null;

if (config.nodeEnv === "production") {
  const { Queue } = await import("bullmq");
  redisConnection = {
    host: config.redis.host,
    port: config.redis.port,
  };
  provisionQueue = new Queue("provision", { connection: redisConnection });
} else {
  // In-process queue for local dev (no Redis required)
  const emitter = new EventEmitter();
  const handlers = new Map();

  provisionQueue = {
    add: async (name, data, opts) => {
      logger.debug({ name, jobId: opts?.jobId }, "Job added to local queue");
      // Process asynchronously so the API can return immediately
      setImmediate(() => emitter.emit("job", { name, data, opts }));
      return { id: opts?.jobId || data.jobId };
    },
    _emitter: emitter,
    onProcess: (handler) => {
      handlers.set("default", handler);
      emitter.on("job", async (job) => {
        try {
          await handler({ data: job.data, id: job.opts?.jobId });
        } catch (err) {
          logger.error({ err: err.message }, "Local queue job failed");
        }
      });
    },
  };
}

export { provisionQueue, redisConnection };
