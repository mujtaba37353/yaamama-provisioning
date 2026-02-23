import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import db from "../../db/connection.js";
import { execRemote } from "../../utils/ssh.js";

export async function execute({ storeId }) {
  const store = await db("stores").where("store_id", storeId).first();
  if (!store) throw new Error(`Store ${storeId} not found`);

  const storePath = `/var/www/stores/${storeId}`;
  const customerEmail = store.customer_email || "admin@yamama.local";
  const customerName = store.customer_name || "مدير المتجر";
  const newPassword = generatePassword();

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] Admin updated: ${customerEmail}`);
    return { admin_email: customerEmail, admin_password: newPassword };
  }

  await execRemote(
    `wp user update 1 --user_pass='${newPassword}' --user_email='${customerEmail}' --display_name='${customerName}' --allow-root --path='${storePath}'`
  );

  await db("stores").where("store_id", storeId).update({
    admin_password: newPassword,
  });

  logger.info({ storeId, email: customerEmail }, "Store admin credentials set");
  return { admin_email: customerEmail, admin_password: newPassword };
}

export async function rollback({ storeId }) {
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: admin credentials reverted`);
  }
}

function generatePassword() {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let pass = "";
  for (let i = 0; i < 24; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
