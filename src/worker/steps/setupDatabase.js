import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { execRemote } from "../../utils/ssh.js";

export async function execute({ storeId, stepContext }) {
  const dbName = stepContext.reserve_slot?.db_name;
  if (!dbName) throw new Error("No db_name from reserve_slot step");

  const newDbName = `wp_${storeId.replace(/-/g, "_")}`;
  const newDbUser = `wp_${storeId.replace(/-/g, "_")}`;
  const newDbPass = generatePassword();

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] Rename DB ${dbName} -> ${newDbName}`);
    return { original_db: dbName, store_db: newDbName, db_user: newDbUser, db_pass: newDbPass };
  }

  // Create new database, copy data from slot DB, then drop old one
  await execRemote(`mysql -e "CREATE DATABASE IF NOT EXISTS \\\`${newDbName}\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`);
  await execRemote(`mysqldump ${dbName} | mysql ${newDbName}`);
  await execRemote(`mysql -e "CREATE USER IF NOT EXISTS '${newDbUser}'@'localhost' IDENTIFIED BY '${newDbPass}';"`);
  await execRemote(`mysql -e "GRANT ALL PRIVILEGES ON \\\`${newDbName}\\\`.* TO '${newDbUser}'@'localhost'; FLUSH PRIVILEGES;"`);
  await execRemote(`mysql -e "DROP DATABASE IF EXISTS \\\`${dbName}\\\`;"`);
  // Drop the old pool user too
  const oldUser = dbName.replace("wp_", "wp_");
  await execRemote(`mysql -e "DROP USER IF EXISTS '${oldUser}'@'localhost'; FLUSH PRIVILEGES;"`, { ignoreError: true });

  logger.info({ storeId, newDbName }, "Database setup complete");
  return { original_db: dbName, store_db: newDbName, db_user: newDbUser, db_pass: newDbPass };
}

export async function rollback({ storeId, stepContext }) {
  const newDbName = `wp_${storeId.replace(/-/g, "_")}`;

  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: drop DB ${newDbName}`);
    return;
  }

  try {
    await execRemote(`mysql -e "DROP DATABASE IF EXISTS \\\`${newDbName}\\\`;"`, { ignoreError: true });
    logger.info({ storeId }, `Rolled back database: ${newDbName}`);
  } catch (e) {
    logger.warn({ storeId, err: e.message }, "Database rollback failed");
  }
}

function generatePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let pass = "";
  for (let i = 0; i < 24; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
