import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { execRemote } from "../../utils/ssh.js";

export async function execute({ storeId, stepContext }) {
  const storeDb = stepContext.setup_database?.store_db;
  const dbUser = stepContext.setup_database?.db_user;
  const dbPass = stepContext.setup_database?.db_pass;
  if (!storeDb) throw new Error("No store_db from setup_database step");

  const storePath = `/var/www/stores/${storeId}`;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] Updated wp-config.php: DB_NAME=${storeDb}`);
    return { wp_config_updated: true };
  }

  await execRemote(`wp config set DB_NAME '${storeDb}' --allow-root --path='${storePath}'`);
  await execRemote(`wp config set DB_USER '${dbUser}' --allow-root --path='${storePath}'`);
  await execRemote(`wp config set DB_PASSWORD '${dbPass}' --allow-root --path='${storePath}'`);

  // Regenerate salts for security
  await execRemote(`wp config shuffle-salts --allow-root --path='${storePath}'`);

  logger.info({ storeId }, "wp-config.php updated");
  return { wp_config_updated: true };
}

export async function rollback({ storeId }) {
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: wp-config.php reverted`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
