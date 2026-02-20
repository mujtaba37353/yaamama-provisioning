import config from "../../config/index.js";
import logger from "../../utils/logger.js";

export async function execute({ storeId, stepContext }) {
  const storeDb = stepContext.setup_database?.store_db;
  if (!storeDb) throw new Error("No store_db from setup_database step");

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] Updated wp-config.php: DB_NAME=${storeDb}`);
    return { wp_config_updated: true };
  }

  // Real: SSH sed/wp-cli to update wp-config.php
  throw new Error("Real SSH execution not implemented yet");
}

export async function rollback({ storeId }) {
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: wp-config.php reverted`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
