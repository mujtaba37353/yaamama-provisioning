import db from "../../db/connection.js";
import config from "../../config/index.js";
import logger from "../../utils/logger.js";

export async function execute({ storeId, stepContext }) {
  const slotName = stepContext.reserve_slot?.slot_name;
  if (!slotName) throw new Error("No slot_name from previous step");

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] mv /var/www/warm-pool/${slotName} -> /var/www/stores/${storeId}`);
    return { source: `/var/www/warm-pool/${slotName}`, dest: `/var/www/stores/${storeId}` };
  }

  // Real: SSH to store host and move files
  // ssh.execCommand(`mv /var/www/warm-pool/${slotName} /var/www/stores/${storeId}`)
  throw new Error("Real SSH execution not implemented yet");
}

export async function rollback({ storeId, stepContext }) {
  const slotName = stepContext.reserve_slot?.slot_name;
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: mv /var/www/stores/${storeId} -> /var/www/warm-pool/${slotName}`);
    return;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
