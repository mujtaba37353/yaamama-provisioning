import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { execRemote } from "../../utils/ssh.js";

export async function execute({ storeId }) {
  const domain = `${storeId}.${config.store.stagingDomain}`;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] certbot --nginx -d ${domain}`);
    return { ssl_issued: true, domain };
  }

  await execRemote(
    `certbot --nginx -d ${domain} --non-interactive --agree-tos --email admin@${config.store.stagingDomain} --redirect`
  );

  logger.info({ storeId, domain }, "SSL certificate issued");
  return { ssl_issued: true, domain };
}

export async function rollback({ storeId }) {
  // SSL is non-fatal; on rollback just log
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: SSL marked as pending`);
    return;
  }

  const domain = `${storeId}.${config.store.stagingDomain}`;
  try {
    await execRemote(`certbot delete --cert-name ${domain} --non-interactive`, { ignoreError: true });
  } catch (e) {
    logger.warn({ storeId }, "SSL rollback (cert delete) failed, non-critical");
  }
}

export const nonFatal = true;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
