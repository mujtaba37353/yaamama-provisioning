import config from "../../config/index.js";
import logger from "../../utils/logger.js";

export async function execute({ storeId, stepContext }) {
  const storeUrl = stepContext.update_site_url?.store_url;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] Health check passed for ${storeUrl || storeId}`);
    return { healthy: true, checked_url: storeUrl };
  }

  // Real: HTTP GET to store URL, check for 200
  // const res = await fetch(storeUrl); if (res.status !== 200) throw ...
  throw new Error("Real HTTP check not implemented yet");
}

export async function rollback() {
  // Nothing to rollback for a read-only check
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
