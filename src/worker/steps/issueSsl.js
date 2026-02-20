import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import db from "../../db/connection.js";

export async function execute({ storeId }) {
  const domain = `${storeId}.${config.store.stagingDomain}`;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] certbot --nginx -d ${domain}`);
    return { ssl_issued: true, domain };
  }

  // Real: SSH certbot
  throw new Error("Real SSH execution not implemented yet");
}

export async function rollback({ storeId }) {
  // SSL failure is non-fatal; store can run with ssl_pending status
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: SSL marked as pending (non-fatal)`);
  }
}

export const nonFatal = true;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
