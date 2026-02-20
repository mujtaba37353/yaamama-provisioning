import config from "../../config/index.js";
import logger from "../../utils/logger.js";

export async function execute({ storeId }) {
  const serverName = `${storeId}.${config.store.stagingDomain}`;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] Created nginx vhost for ${serverName}, reload nginx`);
    return { vhost: serverName };
  }

  // Real: SSH fill nginx template, symlink, reload
  throw new Error("Real SSH execution not implemented yet");
}

export async function rollback({ storeId }) {
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: nginx vhost removed`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
