import config from "../../config/index.js";
import logger from "../../utils/logger.js";

export async function execute({ storeId, stepContext }) {
  const dbName = stepContext.reserve_slot?.db_name;
  if (!dbName) throw new Error("No db_name from reserve_slot step");

  const newDbName = `wp_${storeId.replace(/-/g, "_")}`;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] Rename DB ${dbName} -> ${newDbName}`);
    return { original_db: dbName, store_db: newDbName };
  }

  // Real: SSH rename database
  throw new Error("Real SSH execution not implemented yet");
}

export async function rollback({ storeId }) {
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: database rename reverted`);
    return;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
