import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import db from "../../db/connection.js";

export async function execute({ storeId }) {
  const store = await db("stores").where("store_id", storeId).first();
  if (!store) throw new Error(`Store ${storeId} not found`);

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] wp option update yamama_store_id=${storeId}, yamama_api_token=***`);
    return { meta_injected: true };
  }

  // Real: SSH wp-cli option update
  throw new Error("Real SSH execution not implemented yet");
}

export async function rollback({ storeId }) {
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: store meta removed`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
