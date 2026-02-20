import config from "../../config/index.js";
import logger from "../../utils/logger.js";

export async function execute({ storeId }) {
  const storeUrl = `https://${storeId}.${config.store.stagingDomain}`;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] wp option update siteurl/home -> ${storeUrl}`);
    return { store_url: storeUrl };
  }

  // Real: SSH wp-cli option update
  throw new Error("Real SSH execution not implemented yet");
}

export async function rollback({ storeId }) {
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: site URL reverted`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
