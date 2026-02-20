import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { execRemote } from "../../utils/ssh.js";

export async function execute({ storeId }) {
  const serverName = `${storeId}.${config.store.stagingDomain}`;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId }, `[SIM] Created nginx vhost for ${serverName}, reload nginx`);
    return { vhost: serverName };
  }

  const templatePath = "/etc/nginx/templates/store.conf.template";
  const sitePath = `/etc/nginx/sites-available/${storeId}.conf`;
  const enabledPath = `/etc/nginx/sites-enabled/${storeId}.conf`;

  // Read template, replace placeholders, write to sites-available
  await execRemote(
    `sed -e 's/{{SERVER_NAME}}/${serverName}/g' -e 's/{{STORE_ID}}/${storeId}/g' ${templatePath} > ${sitePath}`
  );

  // Enable site
  await execRemote(`ln -sf ${sitePath} ${enabledPath}`);

  // Test nginx config
  await execRemote("nginx -t");

  // Reload nginx
  await execRemote("systemctl reload nginx");

  logger.info({ storeId, serverName }, "Nginx vhost created and enabled");
  return { vhost: serverName };
}

export async function rollback({ storeId }) {
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: nginx vhost removed`);
    return;
  }

  try {
    await execRemote(`rm -f /etc/nginx/sites-enabled/${storeId}.conf`, { ignoreError: true });
    await execRemote(`rm -f /etc/nginx/sites-available/${storeId}.conf`, { ignoreError: true });
    await execRemote("systemctl reload nginx", { ignoreError: true });
    logger.info({ storeId }, "Rolled back nginx vhost");
  } catch (e) {
    logger.warn({ storeId, err: e.message }, "Vhost rollback failed");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
