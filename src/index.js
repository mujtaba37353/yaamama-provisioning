import app from "./api/index.js";
import config from "./config/index.js";
import logger from "./utils/logger.js";

// In dev mode, register the in-process worker so jobs execute automatically
if (config.nodeEnv !== "production") {
  await import("./worker/worker.js");
}

const server = app.listen(config.port, () => {
  logger.info(`Factory API running on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Simulation mode: ${config.simulation.enabled ? "ON" : "OFF"}`);
  logger.info(`Database: SQLite (local dev)`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down...");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down...");
  server.close(() => process.exit(0));
});
