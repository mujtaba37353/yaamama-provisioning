import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { execRemote } from "../../utils/ssh.js";

export async function execute({ storeId }) {
  const storeUrl = `https://${storeId}.${config.store.stagingDomain}`;
  const storePath = `/var/www/stores/${storeId}`;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] wp option update siteurl/home -> ${storeUrl}`);
    return { store_url: storeUrl };
  }

  await execRemote(`wp option update siteurl '${storeUrl}' --allow-root --path='${storePath}'`);
  await execRemote(`wp option update home '${storeUrl}' --allow-root --path='${storePath}'`);

  logger.info({ storeId, storeUrl }, "Site URL updated");
  return { store_url: storeUrl };
}

export async function rollback({ storeId }) {
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: site URL reverted`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
