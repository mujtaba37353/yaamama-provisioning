import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import db from "../../db/connection.js";
import { execRemote } from "../../utils/ssh.js";

export async function execute({ storeId }) {
  const store = await db("stores").where("store_id", storeId).first();
  if (!store) throw new Error(`Store ${storeId} not found`);

  const storePath = `/var/www/stores/${storeId}`;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] wp option update yamama_store_id=${storeId}, yamama_api_token=***`);
    return { meta_injected: true };
  }

  await execRemote(`wp option update yamama_store_id '${storeId}' --allow-root --path='${storePath}'`);
  await execRemote(`wp option update yamama_api_token '${store.api_token}' --allow-root --path='${storePath}'`);
  await execRemote(`wp option update yamama_factory_url '${config.controlPlane.url}' --allow-root --path='${storePath}'`);

  logger.info({ storeId }, "Store meta injected into WordPress");
  return { meta_injected: true };
}

export async function rollback({ storeId }) {
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: store meta removed`);
    return;
  }

  const storePath = `/var/www/stores/${storeId}`;
  try {
    await execRemote(`wp option delete yamama_store_id --allow-root --path='${storePath}'`, { ignoreError: true });
    await execRemote(`wp option delete yamama_api_token --allow-root --path='${storePath}'`, { ignoreError: true });
    await execRemote(`wp option delete yamama_factory_url --allow-root --path='${storePath}'`, { ignoreError: true });
  } catch (e) {
    logger.warn({ storeId }, "Meta rollback failed, non-critical");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
