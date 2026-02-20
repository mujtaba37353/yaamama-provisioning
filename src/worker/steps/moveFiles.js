import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { execRemote } from "../../utils/ssh.js";

export async function execute({ storeId, stepContext }) {
  const slotName = stepContext.reserve_slot?.slot_name;
  if (!slotName) throw new Error("No slot_name from previous step");

  const source = `/var/www/warm-pool/${slotName}`;
  const dest = `/var/www/stores/${storeId}`;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] mv ${source} -> ${dest}`);
    return { source, dest };
  }

  await execRemote(`mv ${source} ${dest}`);
  await execRemote(`chown -R www-data:www-data ${dest}`);

  logger.info({ storeId }, `Moved files: ${source} -> ${dest}`);
  return { source, dest };
}

export async function rollback({ storeId, stepContext }) {
  const slotName = stepContext.reserve_slot?.slot_name;
  if (!slotName) return;

  const source = `/var/www/stores/${storeId}`;
  const dest = `/var/www/warm-pool/${slotName}`;

  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: mv ${source} -> ${dest}`);
    return;
  }

  try {
    await execRemote(`mv ${source} ${dest}`, { ignoreError: true });
    logger.info({ storeId }, `Rolled back files: ${source} -> ${dest}`);
  } catch (e) {
    logger.warn({ storeId, err: e.message }, "File rollback failed");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
