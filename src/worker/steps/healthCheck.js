import config from "../../config/index.js";
import logger from "../../utils/logger.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export async function execute({ storeId, stepContext }) {
  const storeUrl = stepContext.update_site_url?.store_url;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] Health check passed for ${storeUrl || storeId}`);
    return { healthy: true, checked_url: storeUrl };
  }

  const checkUrl = storeUrl || `https://${storeId}.${config.store.stagingDomain}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(checkUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        logger.info({ storeId, status: res.status, attempt }, "Health check passed");
        return { healthy: true, checked_url: checkUrl, status: res.status };
      }

      logger.warn({ storeId, status: res.status, attempt }, "Health check non-200");
    } catch (err) {
      logger.warn({ storeId, err: err.message, attempt }, "Health check request failed");
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw new Error(`Health check failed after ${MAX_RETRIES} attempts for ${checkUrl}`);
}

export async function rollback() {
  // Read-only check, nothing to rollback
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
